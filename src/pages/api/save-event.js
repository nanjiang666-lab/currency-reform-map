// src/pages/api/save-event.js

import fs from 'fs';
import path from 'path';

// Path to events.json at project root
const EVENTS_PATH = path.join(process.cwd(), 'events.json');

export default function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Parse body
  const { countryCode, year, type, title, desc, fileUrl } = req.body;
  if (!countryCode || !year || !type) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Read existing events
  let events = [];
  try {
    const raw = fs.readFileSync(EVENTS_PATH, 'utf-8');
    events = JSON.parse(raw);
  } catch {
    events = [];
  }

  // Remove any existing event for same country+year
  events = events.filter(
    (e) => !(e.countryCode === countryCode && e.year === year)
  );

  // Append new
  events.push({ countryCode, year, type, title, desc, fileUrl });

  // Write back
  fs.writeFileSync(EVENTS_PATH, JSON.stringify(events, null, 2));

  // Success
  return res.status(200).json({ ok: true });
}
