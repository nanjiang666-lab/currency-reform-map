// src/pages/api/upload.js

import { Blob } from '@vercel/blob';

export const config = {
  api: {
    bodyParser: false,  // 关闭内置解析
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end('Method Not Allowed');
  }

  const filename = decodeURIComponent(req.query.filename || 'upload.bin');
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const buffer = Buffer.concat(chunks);

  // 上传到 Vercel Blob 存储
  const blob = new Blob();
  const url = await blob.put(Buffer.from(buffer), {
    key: filename,
    contentType: req.headers['content-type'] || 'application/octet-stream'
  });

  // 返回可访问的 URL
  res.status(200).json({ url });
}
