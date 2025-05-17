import fs from 'fs';
import path from 'path';

const EVENTS_FILE = path.join(process.cwd(), 'events.json');

export default function handler(req, res) {
  const { year } = req.query;
  let events = [];
  try {
    events = JSON.parse(fs.readFileSync(EVENTS_FILE, 'utf-8'));
  } catch (e) {
    events = [];
  }
  // 过滤出指定年份
  const filtered = events.filter(e => String(e.year) === String(year));
  res.status(200).json(filtered);
}
