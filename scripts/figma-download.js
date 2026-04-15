const https = require('https');
const fs = require('fs');
const path = require('path');

const TOKEN = process.env.FIGMA_TOKEN;
if (!TOKEN) {
  console.error('Set FIGMA_TOKEN env variable: FIGMA_TOKEN=figd_xxx node scripts/figma-download.js');
  process.exit(1);
}
const FILE_KEY = 'dwQLnT4eJ3zCaOwhk7JXIn';
const NODE_ID = '797-4472';
const SVG_DIR = '/tmp/figma_svgs';

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'X-Figma-Token': TOKEN } }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch(e) { reject(new Error('JSON parse error: ' + data.substring(0, 200))); }
      });
    });
    req.on('error', reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

function fetchText(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : require('http');
    const req = mod.get(url, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchText(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

async function main() {
  // Step 1: Get all icon nodes
  console.log('Fetching icon nodes from Figma...');
  const nodesUrl = `https://api.figma.com/v1/files/${FILE_KEY}/nodes?ids=${NODE_ID}&depth=2`;
  const nodesData = await fetchJSON(nodesUrl);
  const frame = nodesData.nodes[NODE_ID.replace('-', ':')].document;
  const icons = frame.children.map(c => ({ id: c.id, name: c.name }));
  console.log(`Found ${icons.length} icons`);

  // Step 2: Download SVGs in batches
  fs.mkdirSync(SVG_DIR, { recursive: true });
  // Clear old SVGs
  for (const f of fs.readdirSync(SVG_DIR)) {
    fs.unlinkSync(path.join(SVG_DIR, f));
  }

  const batchSize = 50;
  let totalDownloaded = 0;
  const failed = [];

  for (let i = 0; i < icons.length; i += batchSize) {
    const batch = icons.slice(i, i + batchSize);
    const idsStr = batch.map(ic => ic.id).join(',');
    const imgUrl = `https://api.figma.com/v1/images/${FILE_KEY}?ids=${idsStr}&format=svg&svg_include_id=false&svg_simplify_stroke=true`;

    let data;
    try {
      data = await fetchJSON(imgUrl);
    } catch(e) {
      console.log(`Batch ${Math.floor(i/batchSize)+1} fetch error:`, e.message);
      failed.push(...batch.map(ic => ic.name));
      continue;
    }

    if (data.err) {
      console.log(`Batch error: ${data.err}`);
      failed.push(...batch.map(ic => ic.name));
      continue;
    }

    const images = data.images || {};
    let downloaded = 0;

    for (const ic of batch) {
      const svgUrl = images[ic.id];
      if (svgUrl) {
        try {
          const svg = await fetchText(svgUrl);
          const safeName = ic.name.replace(/ /g, '-').replace(/\//g, '-').toLowerCase();
          fs.writeFileSync(path.join(SVG_DIR, safeName + '.svg'), svg);
          downloaded++;
        } catch(e) {
          console.log(`  Failed ${ic.name}: ${e.message}`);
          failed.push(ic.name);
        }
      } else {
        failed.push(ic.name);
      }
    }

    totalDownloaded += downloaded;
    console.log(`Batch ${Math.floor(i/batchSize)+1}/${Math.ceil(icons.length/batchSize)}: ${downloaded}/${batch.length} downloaded`);

    if (i + batchSize < icons.length) {
      await new Promise(r => setTimeout(r, 1500));
    }
  }

  console.log(`\nTotal SVGs downloaded: ${totalDownloaded}/${icons.length}`);
  if (failed.length > 0) {
    console.log(`Failed (${failed.length}): ${failed.join(', ')}`);
  }

  // Save manifest
  const manifest = icons.map(ic => ({
    id: ic.id,
    name: ic.name.replace(/ /g, '-').replace(/\//g, '-').toLowerCase(),
    file: ic.name.replace(/ /g, '-').replace(/\//g, '-').toLowerCase() + '.svg'
  }));
  fs.writeFileSync('/tmp/figma_svgs/manifest.json', JSON.stringify(manifest, null, 2));
  console.log('Manifest saved to /tmp/figma_svgs/manifest.json');
}

main().catch(e => { console.error(e); process.exit(1); });
