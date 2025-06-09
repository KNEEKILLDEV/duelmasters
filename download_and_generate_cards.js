// download_and_generate_cards.js
// Simplified script to download DM01 images and generate cardData.js
// Usage:
//   npm install
//   npm run generate

const fetch = require('node-fetch');
const fs = require('fs').promises;
const path = require('path');

const API_BASE = 'https://duelmasters.fandom.com/api.php?origin=*';
const GALLERY = 'DM-01_Base_Set_Gallery_(TCG)';
const IMAGES_DIR = path.join(__dirname, 'dm01_images');
const OUTPUT_JS = path.join(__dirname, 'src/js/cardData.js');
const CHUNK_SIZE = 50;

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function main() {
  // 1) Get image file titles
  const listUrl = `${API_BASE}&action=query&titles=${encodeURIComponent(GALLERY)}&prop=images&imlimit=500&format=json`;
  const json1 = await fetchJSON(listUrl);
  const page = json1.query.pages[Object.keys(json1.query.pages)[0]];
  let titles = (page.images || []).map(i => i.title).filter(t => /\.(png|jpe?g)$/i.test(t));
  titles = [...new Set(titles)];

  // 2) Resolve URLs
  let urls = [];
  for (let i = 0; i < titles.length; i += CHUNK_SIZE) {
    const chunk = titles.slice(i, i + CHUNK_SIZE);
    const param = encodeURIComponent(chunk.join('|'));
    const url = `${API_BASE}&action=query&titles=${param}&prop=imageinfo&iiprop=url&format=json`;
    const json2 = await fetchJSON(url);
    const pages = json2.query.pages;
    for (const pid in pages) {
      const info = pages[pid];
      if (info.imageinfo) urls.push(info.imageinfo[0].url);
    }
  }

  // 3) Download images & build metadata array
  await fs.mkdir(IMAGES_DIR, { recursive: true });
  const cards = [];
  for (const imgUrl of urls) {
    const fileName = new URL(imgUrl).pathname.split('/revision/')[0].split('/').pop();
    const filePath = path.join(IMAGES_DIR, fileName);
    const data = await fetch(imgUrl).then(r => r.buffer());
    await fs.writeFile(filePath, data);
    const name = fileName.replace(/\.(png|jpe?g)$/i, '').replace(/_/g, ' ');
    cards.push({
      id: name.replace(/\s+/g, '_'),
      name,
      img: `dm01_images/${fileName}`
    });
  }

  // 4) Write cardData.js
  await fs.mkdir(path.dirname(OUTPUT_JS), { recursive: true });
  const content = `export const cards = ${JSON.stringify(cards, null, 2)};\n`;
  await fs.writeFile(OUTPUT_JS, content, 'utf8');
  console.log('Done: images in dm01_images/, metadata in src/js/cardData.js');
}

main().catch(console.error);
