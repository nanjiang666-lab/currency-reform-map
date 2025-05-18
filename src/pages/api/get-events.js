// src/pages/api/get-events.js
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end('Method Not Allowed');
  }

  const { year } = req.query;
  if (!year) {
    return res.status(400).json({ error: 'Missing year parameter' });
  }

  // hgetall 取出所有 countryCode:year -> JSON-string
  let all: Record<string,string>;
  try {
    all = await redis.hgetall('events');
  } catch (e) {
    console.error('Redis hgetall error:', e);
    return res.status(500).json({ error: 'Redis error' });
  }

  // 只保留后缀是当前 year 的记录
  const list = Object.entries(all)
    .filter(([key, val]) => {
      // key 格式 countryCode:year
      const parts = key.split(':');
      return parts[1] === String(year);
    })
    .map(([key, val]) => {
      const [countryCode] = key.split(':');
      let data: any = null;
      try {
        data = JSON.parse(val);
      } catch (e) {
        // 如果某条不是合法 JSON，跳过
        console.warn(`Skipping invalid JSON for ${key}:`, val);
        return null;
      }
      return {
        countryCode,
        year: Number(year),
        type: data.type,
        title: data.title,
        desc: data.desc,
        fileUrl: data.fileUrl || '',
      };
    })
    .filter((x) => x !== null);

  return res.status(200).json(list);
}
