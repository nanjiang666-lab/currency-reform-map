// pages/api/save-event.js

import fs from 'fs';
import path from 'path';
import { getToken } from 'next-auth/jwt';

const EVENTS_FILE = path.join(process.cwd(), 'events.json');
const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  // 验证用户已登录
  const token = await getToken({ req, secret: NEXTAUTH_SECRET });
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // 读取已有事件
  let events = [];
  try {
    events = JSON.parse(fs.readFileSync(EVENTS_FILE, 'utf-8'));
  } catch (e) {
    events = [];
  }

  // 构造新事件
  const { countryCode, year, type, title, desc, fileUrl } = req.body;
  const newEvent = {
    countryCode,
    year,
    type,
    title,
    desc,
    fileUrl: fileUrl || '',
    savedBy: token.email,
    timestamp: new Date().toISOString()
  };

  // 写入并保存
  events.push(newEvent);
  fs.writeFileSync(EVENTS_FILE, JSON.stringify(events, null, 2), 'utf-8');

  return res.status(200).json({ ok: true });
}
