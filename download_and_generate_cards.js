// download_and_generate_cards.js
// Robust DM-01 downloader + metadata generator with improved parsing
// Usage:
//   npm install node-fetch@2
//   npm run generate

const fetch = require('node-fetch'); // v2
const fs    = require('fs').promises;
const path  = require('path');

const API_BASE   = 'https://duelmasters.fandom.com/api.php?origin=*';
const GALLERY    = 'DM-01_Base_Set_Gallery_(TCG)';
const IMAGES_DIR = path.join(__dirname, 'dm01_images');
const OUTPUT_JS  = path.join(__dirname, 'src/js/cardData.js');
const CHUNK_SIZE = 50;

// Simple JSON fetcher
async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.json();
}

// Download image as binary
async function downloadImage(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed download ${res.status}`);
  const buf = await res.buffer();
  await fs.writeFile(dest, buf);
}

// Enhanced infobox parser: captures up to next parameter or end
function parseField(wikitext, keys) {
  for (const key of keys) {
    // match e.g. "| cost = 5" or "| Mana Cost = 5" capturing even multiline until next "\n|"
    const re = new RegExp(
      `\\|\\s*${key}\\s*=\\s*([\\s\\S]*?)(?=\\n\\||$)`,
      'i'
    );
    const m = wikitext.match(re);
    if (m) {
      // collapse newlines to spaces, strip wiki markup
      return m[1]
        .replace(/\r?\n/g, ' ')
        .replace(/\[\[([^\]|]+\\|)?([^\]]+)\]\]/g, '$2') // [[Link|Text]] or [[Text]]
        .trim();
    }
  }
  return null;
}

(async () => {
  console.log('⏳ Fetching gallery image list…');
  const listUrl = `${API_BASE}&action=query&titles=${encodeURIComponent(GALLERY)}` +
                  `&prop=images&imlimit=500&format=json`;
  const listData = await fetchJSON(listUrl);
  const page = listData.query.pages[Object.keys(listData.query.pages)[0]];
  let titles = (page.images || [])
    .map(i => i.title)
    .filter(t => /\.(png|jpe?g)$/i.test(t));
  titles = Array.from(new Set(titles));
  console.log(`✅ Found ${titles.length} images.`);

  console.log('🔍 Resolving image URLs…');
  const resolved = [];
  for (let i = 0; i < titles.length; i += CHUNK_SIZE) {
    const chunk = titles.slice(i, i + CHUNK_SIZE).join('|');
    const url   = `${API_BASE}&action=query&titles=${encodeURIComponent(chunk)}` +
                  `&prop=imageinfo&iiprop=url&format=json`;
    const info  = await fetchJSON(url);
    for (const pid in info.query.pages) {
      const p = info.query.pages[pid];
      const imgurl = p.imageinfo?.[0]?.url;
      if (imgurl) resolved.push({ title: p.title, url: imgurl });
    }
  }
  console.log(`✅ Resolved ${resolved.length} URLs.`);

  console.log('⏳ Downloading images & scraping metadata…');
  await fs.mkdir(IMAGES_DIR, { recursive: true });
  const cards = [];

  for (const { title, url } of resolved) {
    // derive filename
    let cleanUrl = url.split('?')[0].replace(/\/revision\/latest.*$/, '');
    const fileName = path.basename(new URL(cleanUrl).pathname);
    const filePath = path.join(IMAGES_DIR, fileName);

    // download
    try {
      await downloadImage(cleanUrl, filePath);
    } catch (e) {
      console.warn(`⚠️ Failed to download ${fileName}: ${e.message}`);
      continue;
    }

    // derive card name & fetch wikitext
    const cardName = fileName.replace(/\.(png|jpe?g)$/i, '').replace(/_/g, ' ');
    let wikitext = '';
    try {
      const wj = await fetchJSON(
        `${API_BASE}&action=query&titles=${encodeURIComponent(cardName)}` +
        `&prop=revisions&rvprop=content&format=json`
      );
      const pg = wj.query.pages[Object.keys(wj.query.pages)[0]];
      wikitext = pg.revisions?.[0]['*'] || '';
    } catch {
      console.warn(`⚠️ Could not fetch wikitext for ${cardName}`);
    }

    // parse metadata
    const cost  = parseField(wikitext, ['cost','mana cost','Mana Cost']);
    const power = parseField(wikitext, ['power','power value']);
    const type  = parseField(wikitext, ['type','card type']);
    const civ   = parseField(wikitext, ['civilization','civil']);
    const tribe = parseField(wikitext, ['tribe','race','subtype']);
    const text  = parseField(wikitext, ['ability text','text','power text','effect']);

    // warn if still missing
    if (cost===null || power===null || tribe===null || text===null)
      console.warn(`⚠️ Missing fields for ${cardName}: cost=${cost}, power=${power}, tribe=${tribe}, text=${text}`);

    cards.push({
      id:           cardName.replace(/\s+/g,'_'),
      name:         cardName,
      img:          `dm01_images/${fileName}`,
      cost:         cost   != null ? Number(cost)   : 0,
      power:        power  != null ? Number(power)  : 0,
      type:         type   || '',
      civilization: civ    || '',
      tribe:        tribe  || '',
      text:         text   || ''
    });

    console.log(`✔ ${cardName}`);
  }

  console.log('💾 Writing src/js/cardData.js…');
  await fs.mkdir(path.dirname(OUTPUT_JS), { recursive: true });
  const module = [
    '// AUTO-GENERATED by download_and_generate_cards.js',
    'export const cards = ' + JSON.stringify(cards, null, 2) + ';',
    ''
  ].join('\n');
  await fs.writeFile(OUTPUT_JS, module, 'utf8');

  console.log(`\n🎉 All done! ${cards.length} cards generated.`);
})();
