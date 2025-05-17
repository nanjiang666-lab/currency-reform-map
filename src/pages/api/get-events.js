// src/pages/api/get-events.js

import fs from 'fs';
import path from 'path';

const EVENTS_PATH = path.join(process.cwd(), 'events.json');

export default function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { year } = req.query;
  let events = [];
  try {
    const raw = fs.readFileSync(EVENTS_PATH, 'utf-8');
    events = JSON.parse(raw);
  } catch (e) {
    events = [];
  }

  if (year) {
    events = events.filter((e) => String(e.year) === String(year));
  }

  return res.status(200).json(events);
}
