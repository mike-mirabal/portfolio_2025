// api/chat.js

import { readFileSync } from "fs";
import path              from "path";
import fetch             from "node-fetch";
import Papa              from "papaparse";
import OpenAI            from "openai";

// initialize the OpenAI client using your env var
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end("Method Not Allowed");
  }

  try {
    // 1) Load your system.txt
    const systemPath = path.join(process.cwd(), "system.txt");
    const systemText = readFileSync(systemPath, "utf8");

    // 2) Fetch & parse your public Google Sheet (CSV)
    const sheetUrl = process.env.GOOGLE_SHEET_CSV_URL ||
      "https://docs.google.com/spreadsheets/d/e/2PACX-1vRAZz5mIVDN9q1EEapOvFb5RFNKN3VRrFK44KVQQlMa-HUmzEZWfseLnXpmaCQNfiXZIQjGcmLcTb1Q/pub?gid=0&single=true&output=csv";
    const csvResp = await fetch(sheetUrl);
    if (!csvResp.ok) throw new Error(`CSV fetch failed: ${csvResp.status}`);
    const csvText = await csvResp.text();
    const { data: rows } = Papa.parse(csvText, { header: true });

    // Build a one‐line summary per project
    const projectInfo = rows
      .map(r => `• ${r.Name} (${r.Year}): https://mikemirabal.com/projects.html?filter=${encodeURIComponent(r.Slug)}`)
      .join("\n");

    // 3) Combine into a system prompt
    const fullSystem = [
      systemText.trim(),
      "\n\nMY PROJECTS:\n" + projectInfo
    ].join("\n");

    // 4) Send to OpenAI
    const chatRes = await openai.chat.completions.create({
      model: "gpt-4o-mini",  // or your preferred
      messages: [
        { role: "system",  content: fullSystem },
        { role: "user",    content: req.body.message }
      ],
      temperature: 0.7,
      max_tokens: 500
    });

    const reply = chatRes.choices?.[0]?.message?.content?.trim() || "";

    // 5) Return the assistant’s reply
    return res.status(200).json({ reply });

  } catch (err) {
    console.error("🛑 /api/chat error:", err);
    return res.status(500).json({ error: err.message });
  }
}
