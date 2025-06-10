// scripts/download_and_generate_cards.js
// Robust DM-01 downloader + metadata generator
// Usage:
//   npm install
//   npm run generate

const fetch = require('node-fetch');       // v2
const fs    = require('fs').promises;
const path  = require('path');

const API_BASE    = 'https://duelmasters.fandom.com/api.php';
const GALLERY     = 'DM-01_Base_Set_Gallery_(TCG)';
const PUBLIC_DIR  = path.join(__dirname, '..', 'public');
const IMAGES_DIR  = path.join(PUBLIC_DIR, 'dm01_images');
const OUTPUT_JSON = path.join(PUBLIC_DIR, 'cardData.json');
const CHUNK_SIZE  = 50;

// keywords to detect abilities in the wikitext
const abilityKeywords = [
  'Blocker',
  'Charger',
  'Charge',
  'Speed Attacker',
  'Double Breaker',
  'Triple Breaker',
  'Shield Trigger',
  'Slayer'
];

// fetch JSON helper
async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.json();
}

// download binary
async function downloadImage(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed download ${res.status}`);
  const buf = await res.buffer();
  await fs.writeFile(dest, buf);
}

// extract infobox fields
function parseField(wikitext, keys) {
  for (const key of keys) {
    const re = new RegExp(
      `\\|\\s*${key}\\s*=\\s*([\\s\\S]*?)(?=\\n\\||$)`,
      'i'
    );
    const m = wikitext.match(re);
    if (m) {
      return m[1]
        .replace(/\r?\n/g, ' ')
        .replace(/\[\[([^\]|]+\|)?([^\]]+)\]\]/g, '$2')
        .trim();
    }
  }
  return null;
}

(async () => {
  console.log('⏳ Fetching gallery image list…');
  const listUrl = `${API_BASE}?action=query&titles=${encodeURIComponent(
    GALLERY
  )}&prop=images&imlimit=500&format=json`;
  const listData = await fetchJSON(listUrl);
  const page = listData.query.pages[Object.keys(listData.query.pages)[0]];
  let titles = (page.images || [])
    .map(i => i.title)
    .filter(t => /\.(png|jpe?g)$/i.test(t));
  titles = Array.from(new Set(titles));

  console.log(`✅ Found ${titles.length} images.`);
  console.log('⏳ Resolving URLs…');
  const resolved = [];
  for (let i = 0; i < titles.length; i += CHUNK_SIZE) {
    const chunk = titles.slice(i, i + CHUNK_SIZE).join('|');
    const url = `${API_BASE}?action=query&titles=${encodeURIComponent(
      chunk
    )}&prop=imageinfo&iiprop=url&format=json`;
    const info = await fetchJSON(url);
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
    // strip query string + revision suffix
    const cleanUrl = url.split('?')[0].replace(/\/revision\/latest.*$/, '');
    const fileName = path.basename(new URL(cleanUrl).pathname);
    const filePath = path.join(IMAGES_DIR, fileName);

    try {
      await downloadImage(cleanUrl, filePath);
    } catch (e) {
      console.warn(`⚠️ Failed download ${fileName}: ${e.message}`);
      continue;
    }

    const cardName = fileName.replace(/\.(png|jpe?g)$/i, '').replace(/_/g, ' ');
    let wikitext = '';
    try {
      const wj = await fetchJSON(
        `${API_BASE}?action=query&titles=${encodeURIComponent(
          cardName
        )}&prop=revisions&rvprop=content&format=json`
      );
      const pg = wj.query.pages[Object.keys(wj.query.pages)[0]];
      wikitext = pg.revisions?.[0]['*'] || '';
    } catch {
      console.warn(`⚠️ No wikitext for ${cardName}`);
    }

    // parse fields
    const cost = parseField(wikitext, ['cost', 'mana cost']);
    const power = parseField(wikitext, ['power', 'power value']);
    const type = parseField(wikitext, ['type', 'card type']);
    const civ  = parseField(wikitext, ['civilization', 'civil']);
    const tribe= parseField(wikitext, ['tribe', 'race', 'subtype']);

    // detect abilities by keyword presence in wikitext
    const abilitiesFound = abilityKeywords.filter(kw =>
      new RegExp(`\\b${kw}\\b`, 'i').test(wikitext)
    );
    const abilities = abilitiesFound.length ? abilitiesFound : ['None'];

    cards.push({
      id: cardName.replace(/\s+/g, '_'),
      name: cardName,
      img: `dm01_images/${fileName}`,
      cost: cost != null ? Number(cost) : 0,
      power: power != null ? Number(power) : 0,
      type: type || '',
      civilization: civ || '',
      tribe: tribe || '',
      abilities
    });

    console.log(`✔️  ${cardName} [abilities: ${abilities.join(', ')}]`);
  }

  console.log('💾 Writing public/cardData.json…');
  await fs.writeFile(OUTPUT_JSON, JSON.stringify(cards, null, 2), 'utf8');
  console.log(`🎉 Done! Generated ${cards.length} cards.`);
})();
