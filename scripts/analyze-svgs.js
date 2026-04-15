const fs = require('fs');
const path = require('path');

const SVG_DIR = '/tmp/figma_svgs';
const files = fs.readdirSync(SVG_DIR).filter(f => f.endsWith('.svg'));

const stats = {
  strokeWidths: {},
  viewBoxes: {},
  linecaps: {},
  linejoins: {},
  fills: {},
  strokeColors: {},
  hasFillPaths: 0,
  multiPath: 0,
  widths: {},
  heights: {}
};

for (const f of files) {
  const svg = fs.readFileSync(path.join(SVG_DIR, f), 'utf8');

  // ViewBox
  const vb = svg.match(/viewBox="([^"]+)"/);
  if (vb) stats.viewBoxes[vb[1]] = (stats.viewBoxes[vb[1]] || 0) + 1;

  // Width/Height
  const w = svg.match(/width="([^"]+)"/);
  if (w) stats.widths[w[1]] = (stats.widths[w[1]] || 0) + 1;
  const h = svg.match(/height="([^"]+)"/);
  if (h) stats.heights[h[1]] = (stats.heights[h[1]] || 0) + 1;

  // Stroke width
  const sw = svg.match(/stroke-width="([^"]+)"/g);
  if (sw) sw.forEach(s => {
    const v = s.match(/"([^"]+)"/)[1];
    stats.strokeWidths[v] = (stats.strokeWidths[v] || 0) + 1;
  });

  // Linecap
  const lc = svg.match(/stroke-linecap="([^"]+)"/g);
  if (lc) lc.forEach(s => {
    const v = s.match(/"([^"]+)"/)[1];
    stats.linecaps[v] = (stats.linecaps[v] || 0) + 1;
  });

  // Linejoin
  const lj = svg.match(/stroke-linejoin="([^"]+)"/g);
  if (lj) lj.forEach(s => {
    const v = s.match(/"([^"]+)"/)[1];
    stats.linejoins[v] = (stats.linejoins[v] || 0) + 1;
  });

  // Stroke color
  const sc = svg.match(/stroke="([^"]+)"/g);
  if (sc) sc.forEach(s => {
    const v = s.match(/"([^"]+)"/)[1];
    stats.strokeColors[v] = (stats.strokeColors[v] || 0) + 1;
  });

  // Fill paths (check for fill-rule or explicit fill that is NOT "none")
  const fillRule = svg.match(/fill-rule="evenodd"/);
  if (fillRule) stats.hasFillPaths++;

  // Multiple paths
  const paths = svg.match(/<path /g);
  if (paths && paths.length > 1) stats.multiPath++;

  // Fill on svg root
  const rootFill = svg.match(/<svg[^>]*fill="([^"]+)"/);
  if (rootFill) stats.fills[rootFill[1]] = (stats.fills[rootFill[1]] || 0) + 1;
}

console.log('=== SVG STYLE ANALYSIS ===');
console.log('Total SVGs:', files.length);
console.log('\nViewBoxes:', JSON.stringify(stats.viewBoxes));
console.log('\nWidths:', JSON.stringify(stats.widths));
console.log('\nHeights:', JSON.stringify(stats.heights));
console.log('\nStroke Widths:', JSON.stringify(stats.strokeWidths));
console.log('\nStroke Linecap:', JSON.stringify(stats.linecaps));
console.log('\nStroke Linejoin:', JSON.stringify(stats.linejoins));
console.log('\nStroke Colors:', JSON.stringify(stats.strokeColors));
console.log('\nRoot fill attr:', JSON.stringify(stats.fills));
console.log('\nIcons with fill-rule (evenodd):', stats.hasFillPaths);
console.log('Icons with multiple paths:', stats.multiPath);
