// src/pages/api/save-event.js

import fs from 'fs';
import path from 'path';

// Path to your events.json sitting at the project root
const EVENTS_PATH = path.join(process.cwd(), 'events.json');

export default function handler(req, res) {
  // 1) Only accept POST
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // 2) Parse & validate payload
  const { countryCode, year, type, title, desc, fileUrl } = req.body;
  if (!countryCode || !year || !type) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // 3) Read existing events (or start with empty array)
  let events = [];
  try {
    const raw = fs.readFileSync(EVENTS_PATH, 'utf-8');
    events = JSON.parse(raw);
  } catch (e) {
    events = [];
  }

  // 4) Remove any previous entry for this country/year
  events = events.filter(
    (e) => !(e.countryCode === countryCode && e.year === year)
  );

  // 5) Append the new event
  events.push({ countryCode, year, type, title, desc, fileUrl });

  // 6) Write back to disk
  fs.writeFileSync(EVENTS_PATH, JSON.stringify(events, null, 2), 'utf-8');

  // 7) Return success
  return res.status(200).json({ ok: true });
}
