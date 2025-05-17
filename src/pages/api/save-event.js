// src/pages/api/save-event.js

import fs from 'fs';
import path from 'path';

// events.json sits at the project root
const EVENTS_PATH = path.join(process.cwd(), 'events.json');

export default function handler(req, res) {
  // 1) only POST
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // 2) require authentication
  // (assuming you’re using NextAuth and session cookie)
  // You can replace this with your own logic if needed
  // import { getToken } from 'next-auth/jwt';
  // const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  // if (!token) return res.status(401).json({ error: 'Unauthorized' });

  // 3) parse body
  const { countryCode, year, type, title, desc, fileUrl } = req.body;
  if (!countryCode || !year || !type) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // 4) read existing
  let events = [];
  try {
    const raw = fs.readFileSync(EVENTS_PATH, 'utf-8');
    events = JSON.parse(raw);
  } catch (e) {
    events = [];
  }

  // 5) append or replace
  // If you want only one event per country/year, filter out old:
  events = events.filter(
    (e) => !(e.countryCode === countryCode && e.year === year)
  );
  events.push({ countryCode, year, type, title, desc, fileUrl });

  // 6) write back
  fs.writeFileSync(EVENTS_PATH, JSON.stringify(events, null, 2));

  // 7) respond
  res.status(200).json({ ok: true });
}
