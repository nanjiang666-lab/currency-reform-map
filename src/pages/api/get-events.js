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
  // 拿出所有记录
  const all = await redis.hgetall('currencyReformEvents');
  const events = Object.values(all).map(JSON.parse);

  // 如果有指定 ?year，则过滤
  const filtered = year
    ? events.filter(e => String(e.year) === String(year))
    : events;

  res.status(200).json(filtered);
}
