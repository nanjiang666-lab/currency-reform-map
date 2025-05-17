import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

const URL =
  'https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson';
const OUT_DIR = path.join(process.cwd(), 'public');
const OUT_FILE = path.join(OUT_DIR, 'countries.geojson');

async function download() {
  console.log('开始下载 countries.geojson ...');
  const res = await fetch(URL);
  if (!res.ok) throw new Error(`下载失败：${res.status}`);
  const text = await res.text();

  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, text, 'utf8');
  console.log(`下载完成，文件已保存到: ${OUT_FILE}`);
}

download().catch(err => {
  console.error(err);
  process.exit(1);
});
