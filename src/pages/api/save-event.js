// src/pages/api/save-event.js

import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  const { countryCode, year, type, title, desc, fileUrl } = req.body;
  if (!countryCode || !year || !type) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  const key = `${countryCode}:${year}`;
  const record = JSON.stringify({ countryCode, year, type, title, desc, fileUrl });
  await redis.hset('currencyReformEvents', key, record);
  return res.status(200).json({ ok: true });
}
