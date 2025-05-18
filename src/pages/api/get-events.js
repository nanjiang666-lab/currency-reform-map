// src/pages/api/get-events.js

import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  const { year } = req.query;
  const all = await redis.hgetall('currencyReformEvents');
  const events = Object.values(all).map(JSON.parse);
  const filtered = year ? events.filter(e => String(e.year) === String(year)) : events;
  return res.status(200).json(filtered);
}
