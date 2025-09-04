// FILE: project.js

const sheetURL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRAZz5mIVDN9q1EEapOvFb5RFNKN3VRrFK44KVQQlMa-HUmzEZWfseLnXpmaCQNfiXZIQjGcmLcTb1Q/pub?gid=0&single=true&output=csv';

document.addEventListener('DOMContentLoaded', () => {
  fetch(sheetURL)
    .then(res => res.text())
    .then(csvText => {
      const { data: projects } = Papa.parse(csvText.trim(), { header: true, skipEmptyLines: true });

      const publishedProjects = projects.filter(p => p.published && p.published.toUpperCase() === "TRUE");

      publishedProjects.sort((a, b) => {
        const yearA = parseInt(a.year) || 0;
        const yearB = parseInt(b.year) || 0;
        return yearB - yearA;
      });

      const gridContainer = document.getElementById('projectGrid');
      const slug = new URLSearchParams(window.location.search).get('slug');

      if (gridContainer) {
        renderProjects(publishedProjects, gridContainer);
      }

      if (slug) {
        const p = publishedProjects.find(p => String(p.slug) === slug);
        if (p) renderDetail(p);
      }

      // Initialize chat modal viewport behavior after DOM and content are ready
      initProjectChatViewportBehavior();
    })
    .catch(err => console.error('CSV load error:', err));
});

/**
 * Escapes HTML special characters to avoid unintended HTML injection.
 */
function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Autolink plain URLs in text (http/https).
 */
function autoLink(text) {
  const urlRegex = /\bhttps?:\/\/[^\s<)]+/gi;
  return text.replace(urlRegex, (url) => {
    const safe = escapeHTML(url);
    return `<a href="${safe}" target="_blank" rel="noopener noreferrer">${safe}</a>`;
  });
}

/**
 * Apply lightweight inline formatting after escaping:
 * - Bold: **text** -> <strong>text</strong>
 * Then autolink URLs.
 */
function applyFormatting(text) {
  let safe = escapeHTML(text);
  safe = safe.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  return autoLink(safe);
}

/**
 * Render simple "rich" text from CSV into HTML with support for:
 * - paragraphs (blank line = new paragraph)
 * - unordered lists: lines starting with "- ", "* ", or "• "
 * - ordered lists: lines starting with "1. ", "2. ", etc.
 * - basic URL autolinking
 *
 * Examples for CSV cell (use \n to break lines):
 *   - Item one
 *   - Item two
 *
 *   A new paragraph after the list.
 */
function renderRichText(cellText) {
  if (!cellText) return '';
  const lines = String(cellText).split('\n');

  const blocks = [];
  let listBuffer = null; // { type: 'ul'|'ol', items: [] }

  const flushList = () => {
    if (!listBuffer) return;
    if (listBuffer.type === 'ul') {
      blocks.push(`<ul>${listBuffer.items.map(li => `<li>${li}</li>`).join('')}</ul>`);
    } else {
      blocks.push(`<ol>${listBuffer.items.map(li => `<li>${li}</li>`).join('')}</ol>`);
    }
    listBuffer = null;
  };

  for (let raw of lines) {
    const line = raw.replace(/\r/g, '').trimEnd();

    // Blank line => paragraph break
    if (line.trim() === '') {
      flushList();
      continue;
    }

    // Unordered list markers
    const ulMatch = /^(?:[-*•])\s+(.*)$/.exec(line);
    if (ulMatch) {
      const item = applyFormatting(ulMatch[1].trim());
      if (!listBuffer || listBuffer.type !== 'ul') {
        flushList();
        listBuffer = { type: 'ul', items: [] };
      }
      listBuffer.items.push(item);
      continue;
    }

    // Ordered list markers like "1. Item"
    const olMatch = /^(\d+)\.\s+(.*)$/.exec(line);
    if (olMatch) {
      const item = applyFormatting(olMatch[2].trim());
      if (!listBuffer || listBuffer.type !== 'ol') {
        flushList();
        listBuffer = { type: 'ol', items: [] };
      }
      listBuffer.items.push(item);
      continue;
    }

    // Normal paragraph line. If there's an open list, close it first.
    flushList();
    const paragraphHTML = applyFormatting(line.trim());
    blocks.push(`<p>${paragraphHTML}</p>`);
  }

  // Close any list still open
  flushList();

  // Join blocks; caller will set container.innerHTML
  return blocks.join('');
}

/* ---------------------------------------------------------------------------
   MEDIA POSITION HELPER
   Allows CSV to control whether media renders at the top or bottom of a section.

   CSV options per section (overview/problem/process/solution/results):
   - <key>_media_type: 'image'|'video'|'audio'|'link'|'embed' (also accepts 'image-top', 'link-bottom', etc.)
   - <key>_media_position: 'top'|'bottom' (optional; overrides suffix if both provided)
--------------------------------------------------------------------------- */
function getMediaConfig(p, key) {
  let rawType = (p[`${key}_media_type`] || '').toLowerCase().trim();
  let position = (p[`${key}_media_position`] || '').toLowerCase().trim();

  // If author used "image-top" / "link-bottom" / "video-before" etc., extract suffix
  const m = rawType.match(/-(top|bottom|before|after)$/);
  if (m) {
    const suffix = m[1] === 'before' ? 'top' : (m[1] === 'after' ? 'bottom' : m[1]);
    if (!position) position = suffix;
    rawType = rawType.replace(/-(top|bottom|before|after)$/, '');
  }

  if (position !== 'top' && position !== 'bottom') position = 'bottom';

  return { type: rawType, position };
}

/**
 * Renders optional supporting media for a given section key.
 * CSV fields supported (all optional, per section key: 'problem'|'process'|'solution'|'results'|'overview'):
 *   <key>_media_type: 'image' | 'video' | 'link' | 'embed' | 'audio'
 *   <key>_media_position: 'top' | 'bottom' (optional; defaults to 'bottom')
 *   <key>_media_url: URL string (for image/link/video/embed)
 *   <key>_media_caption: optional caption string
 *   <key>_media_alt: optional alt text for images
 *
 * Notes:
 * - image: renders <figure><img/><figcaption/></figure>
 * - video: if YouTube/Vimeo URL, embeds via iframe; otherwise renders simple <video controls> if it looks like a file
 * - audio: renders <audio controls>
 * - link: renders an anchor with underline
 * - embed: renders an iframe with the given URL
 */
function renderSectionMedia(p, key) {
  // Use the parsed type (position is handled in renderDetail)
  const { type } = getMediaConfig(p, key);
  const url = (p[`${key}_media_url`] || '').trim();
  const caption = p[`${key}_media_caption`] ? escapeHTML(p[`${key}_media_caption`]) : '';
  const alt = p[`${key}_media_alt`] ? escapeHTML(p[`${key}_media_alt`]) : `${key} media`;

  if ((!type && !url) || !url) return '';

  const isYouTube = /(?:youtube\.com\/watch\?v=|youtu\.be\/)/i.test(url);
  const isVimeo = /vimeo\.com\/\d+/i.test(url);
  const looksLikeVideoFile = /\.(mp4|webm|ogg)(\?.*)?$/i.test(url);
  const looksLikeImageFile = /\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i.test(url);
  const looksLikeAudioFile = /\.(mp3|wav|ogg|m4a|aac)(\?.*)?$/i.test(url);

  // IMAGE
  if (type === 'image' || (!type && looksLikeImageFile)) {
    const safeUrl = escapeHTML(url);
    return `
      <figure class="full-width-image">
        <img src="${safeUrl}" alt="${alt}" />
        ${caption ? `<figcaption class="caption">${caption}</figcaption>` : ''}
      </figure>
    `;
  }

  // VIDEO
  if (type === 'video' || (!type && (isYouTube || isVimeo || looksLikeVideoFile))) {
    if (isYouTube) {
      let videoId = '';
      const m1 = url.match(/[?&]v=([^&]+)/);
      const m2 = url.match(/youtu\.be\/([^?&]+)/);
      videoId = m1 ? m1[1] : (m2 ? m2[1] : '');
      if (videoId) {
        const embed = `https://www.youtube.com/embed/${encodeURIComponent(videoId)}`;
        return `
          <div class="video-embed">
            <iframe width="560" height="315" src="${embed}" title="YouTube video" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe>
            ${caption ? `<div class="caption">${caption}</div>` : ''}
          </div>
        `;
      }
    }
    if (isVimeo) {
      const idMatch = url.match(/vimeo\.com\/(\d+)/);
      const vimeoId = idMatch ? idMatch[1] : '';
      if (vimeoId) {
        const embed = `https://player.vimeo.com/video/${encodeURIComponent(vimeoId)}`;
        return `
          <div class="video-embed">
            <iframe src="${embed}" width="640" height="360" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" title="Vimeo video" allowfullscreen></iframe>
            ${caption ? `<div class="caption">${caption}</div>` : ''}
          </div>
        `;
      }
    }
    if (looksLikeVideoFile) {
      const safeUrl = escapeHTML(url);
      return `
        <figure class="video-file">
          <video src="${safeUrl}" controls playsinline preload="metadata" style="max-width:100%; height:auto;"></video>
          ${caption ? `<figcaption class="caption">${caption}</figcaption>` : ''}
        </figure>
      `;
    }
  }

  // AUDIO (new)
  if (type === 'audio' || (!type && looksLikeAudioFile)) {
    const safeUrl = escapeHTML(url);
    const mime =
      /\.mp3(\?.*)?$/i.test(url) ? 'audio/mpeg' :
      /\.m4a|\.aac(\?.*)?$/i.test(url) ? 'audio/mp4' :
      /\.wav(\?.*)?$/i.test(url) ? 'audio/wav' :
      /\.ogg(\?.*)?$/i.test(url) ? 'audio/ogg' :
      '';
    return `
      <figure class="audio-file">
        <audio controls preload="metadata" ${mime ? `type="${mime}"` : ''} src="${safeUrl}"></audio>
        ${caption ? `<figcaption class="caption">${caption}</figcaption>` : ''}
      </figure>
    `;
  }

  // LINK
  if (type === 'link') {
    const safeUrl = escapeHTML(url);
    return `
      <p style="margin: 0.4rem 0 1rem">
        <a href="${safeUrl}" target="_blank" rel="noopener noreferrer" style="text-decoration: underline; color: var(--accent);">
          ${caption || safeUrl}
        </a>
      </p>
    `;
  }

  // EMBED
  if (type === 'embed') {
    const safeUrl = escapeHTML(url);
    return `
      <div class="embed-iframe" style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;">
        <iframe src="${safeUrl}" style="position:absolute;top:0;left:0;width:100%;height:100%;" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe>
      </div>
      ${caption ? `<div class="caption" style="margin-top:.5rem;">${caption}</div>` : ''}
    `;
  }

  // Fallback
  const safeUrl = escapeHTML(url);
  return `
    <p style="margin: 0.4rem 0 1rem">
      <a href="${safeUrl}" target="_blank" rel="noopener noreferrer" style="text-decoration: underline; color: var(--accent);">
        ${caption || safeUrl}
      </a>
    </p>
  `;
}


/**
 * Renders project cards into grid container
 */
function renderProjects(projects, container) {
  container.innerHTML = '';
  projects.forEach(p => {
    const href    = `project.html?slug=${encodeURIComponent(p.slug)}`;
    const company = p.company || '';
    const year    = p.year || '';
    const heroImg = p.card_img || p.hero_url || '';
    const iconUrl = p.icon || p.logo || p.icon_url || '';
    const title   = p.card_title || p.title || '';
    const desc    = p.short_desc || p.description || p.subtitle || (p.overview ? String(p.overview).split('\n')[0] : '') || '';

    const tagsLower = (p.tags || '').toLowerCase();
    const tagsHtml = (p.tags || '')
      .split(',')
      .filter(Boolean)
      .map(t => `<span>${t.trim()}</span>`)
      .join('');

    const card = document.createElement('a');
    card.href = href;
    card.className = 'card card-v03';
    card.dataset.tags = tagsLower;
    card.setAttribute('aria-label', `${title} – ${company} ${year}`);

    card.innerHTML = `
      <div class="top-meta">
        <div class="company-icon" aria-hidden="true">
          ${iconUrl ? `<img src="${iconUrl}" alt="">` : `<span class="icon-fallback">${(company || '?').charAt(0)}</span>`}
        </div>
        <div class="company-and-year">
          <div class="company">${company}</div>
          <div class="year">${year}</div>
        </div>

        <button
          class="card-action ask-ai-btn"
          type="button"
          aria-label="Ask AI about this project"
          title="Ask AI about this project"
          data-slug="${p.slug || ''}"
          data-title="${(p.card_title || p.title || '').replace(/"/g,'&quot;')}"
          data-overview="${(p.overview || '').replace(/"/g,'&quot;')}"
          data-icon="${iconUrl}"
          onclick="openProjectChatModal(event, this)"
        >
          <img src="/assets/icons/icon_chat_3B82F6.svg" alt="Chat Icon" width="24" height="24">
        </button>
      </div>

      <div class="hero-img">
        <img src="${heroImg}" alt="${title} card image">
      </div>

      <div class="card-content">
        <h4 class="title">${title}</h4>
        ${desc ? `<p class="desc">${escapeHTML(desc)}</p>` : ''}
        ${tagsHtml ? `<div class="tags">${tagsHtml}</div>` : ''}
      </div>
    `;

    container.appendChild(card);
  });
}

/**
 * Renders project detail page content
 * Supports:
 *  - Bullet lists and paragraphs via renderRichText
 *  - Optional media per section via renderSectionMedia
 *    CSV columns you can add per section (overview/problem/process/solution/results):
 *      <key>_media_type, <key>_media_url, <key>_media_caption, <key>_media_alt, <key>_media_position
 *
 * CHANGE REQUESTED: Media now renders at the TOP or BOTTOM of each section based on <key>_media_position ('top'|'bottom'), default 'bottom'.
 * Also: Apply **markdown-style bold** and autolinks to interactive text fields via applyFormatting().
 */
function renderDetail(p) {
  document.title = `${p.title} | Mike Mirabal`;
  const titleEl = document.getElementById('project-title');
  const metaEl  = document.getElementById('project-meta');

  if (titleEl) titleEl.textContent = p.title || '';
  if (metaEl)  metaEl.textContent  = `${p.company || ''} | ${p.year || ''}`;

  // --- set hero image (overlay background) ---
  const heroImg = document.getElementById('caseHeroImg');
  if (heroImg && p.hero_url) {
    heroImg.src = escapeHTML(p.hero_url);
    heroImg.alt = p.hero_alt ? escapeHTML(p.hero_alt) : 'Project hero image';
  }

  const contentContainer = document.getElementById('project-content');
  if (contentContainer) {

    // ---------- Inject Section Title & Sticky Subnav ----------
    const headerHTML = `
      <h4 class="subnav-label">Explore this Project</h4>
      <nav class="sticky-controls project-subnav">
        <div class="sticky-inner">
          <div class="filters">
            <a href="#overview"><button>Overview</button></a>
            <a href="#interactive"><button>Interactive</button></a>
            <a href="#problem"><button>Problem</button></a>
            <a href="#process"><button>Process</button></a>
            <a href="#solution"><button>Solution</button></a>
            <a href="#results"><button>Results</button></a>
          </div>
        </div>
      </nav>
    `;
    contentContainer.insertAdjacentHTML('beforebegin', headerHTML);
    // ------------------------------------------------------------

    const sections = [
      { key: 'overview', title: 'Overview' },
      { key: 'problem',  title: 'Problem'  },
      { key: 'process',  title: 'Process'  },
      { key: 'solution', title: 'Solution' },
      { key: 'results',  title: 'Results'  }
    ];

    sections.forEach(({ key, title }) => {
      if (p[key]) {
        const section = document.createElement('section');

        const heading = document.createElement('h3');
        heading.textContent = title;
        heading.setAttribute('id', key);
        section.appendChild(heading);

        const { position } = getMediaConfig(p, key);
        const mediaHTML = renderSectionMedia(p, key);

        if (position === 'top' && mediaHTML) {
          const mediaWrapperTop = document.createElement('div');
          mediaWrapperTop.innerHTML = mediaHTML;
          section.appendChild(mediaWrapperTop);
        }

        const richHTML = renderRichText(p[key]);
        if (richHTML) {
          const richDiv = document.createElement('div');
          richDiv.innerHTML = richHTML;
          section.appendChild(richDiv);
        }

        if (key === 'overview' && p.role && p.role.trim()) {
          const roleHeading = document.createElement('h4');
          roleHeading.textContent = 'My Role';
          section.appendChild(roleHeading);

          const rolePara = document.createElement('div');
          rolePara.innerHTML = renderRichText(p.role.trim());
          section.appendChild(rolePara);
        }

        if (position === 'bottom' && mediaHTML) {
          const mediaWrapperBottom = document.createElement('div');
          mediaWrapperBottom.innerHTML = mediaHTML;
          section.appendChild(mediaWrapperBottom);
        }

        const hr = document.createElement('hr');
        hr.style.marginTop = '2rem';
        hr.style.marginBottom = '2rem';
        section.appendChild(hr);

        contentContainer.appendChild(section);

        if (key === 'overview' && p.interactive_link && p.interactive_text) {
          const icon = p.interactive_icon || '';
          const headingText = p.interactive_heading || 'Further Reading';
          const interactiveHTML = `
            <div class="interactive-link-block">
              <h3 id="interactive" style="margin-bottom: 0.5rem;">${applyFormatting(headingText)}</h3>
              <p class="slide-caption">
                ${icon ? `<img src="${escapeHTML(icon)}" class="interactive-icon" alt="icon" style="vertical-align: middle; margin-right: 0.4em; height: 1em;">` : ''}
                ${p.interactive_supporting ? applyFormatting(p.interactive_supporting) : ''}
              </p>
              <p style="margin: 0.4rem 0 1rem">
                <a href="${escapeHTML(p.interactive_link)}" target="_blank" rel="noopener noreferrer" style="text-decoration: underline; color: var(--accent);">
                  ${applyFormatting(p.interactive_text)}
                </a>
              </p>
              <hr />
            </div>
          `;
          contentContainer.insertAdjacentHTML('beforeend', interactiveHTML);
        }
      }
    });

    if (p.extra_resource_link) {
      const linkHTML = `
        <p>
          <a href="${escapeHTML(p.extra_resource_link)}" target="_blank" rel="noopener noreferrer">
            ${p.extra_resource_text ? applyFormatting(p.extra_resource_text) : 'View More Details'}
          </a>
        </p>
      `;
      contentContainer.insertAdjacentHTML('beforeend', linkHTML);
    }
  }
}


    if (p.extra_resource_link) {
      const linkHTML = `
        <p>
          <a href="${escapeHTML(p.extra_resource_link)}" target="_blank" rel="noopener noreferrer">
            ${p.extra_resource_text ? applyFormatting(p.extra_resource_text) : 'View More Details'}
          </a>
        </p>
      `;
      contentContainer.insertAdjacentHTML('beforeend', linkHTML);
    }
  

 

/**
 * Project Chat Modal viewport behavior:
 * - Keeps the dialog sized to the visible viewport (accounts for mobile keyboards)
 * - Ensures header and input remain visible
 * - Scrolls chat window to bottom when focusing the input
 */
function initProjectChatViewportBehavior() {
  const modal = document.querySelector('.projchat-modal');
  const dialog = document.querySelector('.projchat-dialog');

  if (!modal || !dialog) return;

  // Compute the dialog height using the visible viewport and subtract modal block padding
  const setDialogHeightFromViewport = () => {
    // Sum of the actual computed padding top + bottom on the modal container
    const styles = getComputedStyle(modal);
    const padTop = parseFloat(styles.paddingTop) || 0;
    const padBottom = parseFloat(styles.paddingBottom) || 0;
    const padBlock = padTop + padBottom;

    const vv = window.visualViewport;
    const visibleHeight = vv && typeof vv.height === 'number' ? vv.height : window.innerHeight;

    const h = Math.max(0, visibleHeight - padBlock);
    dialog.style.height = h + 'px';
    dialog.style.maxHeight = h + 'px';
  };

  // Observe aria-hidden changes to react right when the modal opens/closes
  const mo = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.type === 'attributes' && m.attributeName === 'aria-hidden') {
        const isOpen = modal.getAttribute('aria-hidden') === 'false';
        if (isOpen) {
          setDialogHeightFromViewport();
          // After opening, scroll chat to bottom so last message is visible
          const win = modal.querySelector('.projchat-window');
          if (win) {
            requestAnimationFrame(() => win.scrollTo({ top: win.scrollHeight }));
          }
        }
      }
    }
  });
  mo.observe(modal, { attributes: true, attributeFilter: ['aria-hidden'] });

  // Update height while keyboard animates / device rotates
  if (window.visualViewport) {
    visualViewport.addEventListener('resize', setDialogHeightFromViewport);
    visualViewport.addEventListener('scroll', setDialogHeightFromViewport);
  } else {
    window.addEventListener('resize', setDialogHeightFromViewport);
  }

  // Ensure the input is visible and not covered by keyboard on focus
  document.addEventListener('focusin', (e) => {
    const form = e.target && e.target.closest && e.target.closest('.projchat-form');
    if (form) {
      const win = modal.querySelector('.projchat-window');
      if (win) {
        requestAnimationFrame(() => win.scrollTo({ top: win.scrollHeight, behavior: 'smooth' }));
      }
      setDialogHeightFromViewport();
    }
  });

  // If the modal starts open for any reason, size it immediately
  if (modal.getAttribute('aria-hidden') === 'false') {
    setDialogHeightFromViewport();
  }
}
