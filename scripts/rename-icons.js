#!/usr/bin/env node
/**
 * Rename Figma-downloaded SVGs to clean, meaningful names.
 * - Strips numeric suffixes (-01, -02) when only one variant exists
 * - Re-numbers multi-variant icons sequentially (-1, -2)
 * - Removes non-SVG files (manifest.json etc.)
 */
const fs = require("fs");
const path = require("path");

const DIR = "/tmp/figma_svgs";

// Get all SVG files
const files = fs.readdirSync(DIR).filter((f) => f.endsWith(".svg")).sort();
console.log(`Found ${files.length} SVG files`);

// Remove non-SVG files
const nonSvg = fs.readdirSync(DIR).filter((f) => !f.endsWith(".svg"));
for (const f of nonSvg) {
  console.log(`  Removing non-SVG: ${f}`);
  fs.unlinkSync(path.join(DIR, f));
}

// Parse base names and numeric suffixes
// e.g. "server-03.svg" → base="server", suffix=3
// e.g. "arrow-narrow-down.svg" → base="arrow-narrow-down", suffix=null
const SUFFIX_RE = /^(.+)-(\d{2})$/;
const parsed = files.map((f) => {
  const name = f.replace(".svg", "");
  const m = name.match(SUFFIX_RE);
  return {
    file: f,
    name,
    base: m ? m[1] : name,
    suffix: m ? parseInt(m[2], 10) : null,
  };
});

// Group by base name to detect multi-variant icons
const groups = {};
for (const p of parsed) {
  if (!groups[p.base]) groups[p.base] = [];
  groups[p.base].push(p);
}

// Build rename map
const renames = [];
for (const [base, items] of Object.entries(groups)) {
  // Count how many have numeric suffixes
  const withSuffix = items.filter((i) => i.suffix !== null);
  const withoutSuffix = items.filter((i) => i.suffix === null);

  if (withSuffix.length === 0) {
    // No numeric suffix — keep as-is
    continue;
  }

  if (withSuffix.length === 1 && withoutSuffix.length === 0) {
    // Single icon with numeric suffix — strip it
    const item = withSuffix[0];
    const newName = base + ".svg";
    if (item.file !== newName) {
      renames.push({ from: item.file, to: newName });
    }
  } else if (withSuffix.length > 1 && withoutSuffix.length === 0) {
    // Multiple numbered variants, no base — renumber sequentially
    withSuffix.sort((a, b) => a.suffix - b.suffix);
    if (withSuffix.length === 2) {
      // For 2 variants, use -1 and -2
      withSuffix.forEach((item, idx) => {
        const newName = `${base}-${idx + 1}.svg`;
        if (item.file !== newName) {
          renames.push({ from: item.file, to: newName });
        }
      });
    } else {
      // For 3+ variants, renumber 1-based
      withSuffix.forEach((item, idx) => {
        const newName = `${base}-${idx + 1}.svg`;
        if (item.file !== newName) {
          renames.push({ from: item.file, to: newName });
        }
      });
    }
  } else if (withSuffix.length >= 1 && withoutSuffix.length >= 1) {
    // Mix of suffixed and unsuffixed — renumber all with suffixes
    withSuffix.sort((a, b) => a.suffix - b.suffix);
    withSuffix.forEach((item, idx) => {
      const newName = `${base}-${idx + 2}.svg`; // Start at 2 since base name (no suffix) is effectively "1"
      if (item.file !== newName) {
        renames.push({ from: item.file, to: newName });
      }
    });
  }
}

// Also apply specific semantic renames for clarity
const SEMANTIC_RENAMES = {
  "search-md.svg": "search.svg",
  "play-circle-start.svg": "play-circle.svg",
  "message-text-square.svg": "message.svg",
  "cloud-blank.svg": "cloud.svg",
  "filter-funnel.svg": "filter.svg",
  "scissors-cut.svg": "scissors.svg",
  "check-circle-broken.svg": "check-circle-dashed.svg",
  "check-square-broken.svg": "check-square-dashed.svg",
  "slash-circle.svg": "ban.svg",
  "dots-grid.svg": "grid.svg",
  "dots-horizontal.svg": "ellipsis-horizontal.svg",
  "dots-vertical.svg": "ellipsis-vertical.svg",
  "dotpoints.svg": "list.svg",
  "chrome-cast.svg": "chromecast.svg",
  "marker-pin.svg": "map-pin.svg",
  "navigation-pointer.svg": "cursor-pointer.svg",
  "navigation-pointer-off.svg": "cursor-pointer-off.svg",
};

// Apply semantic renames (post-suffix-strip names)
for (const [from, to] of Object.entries(SEMANTIC_RENAMES)) {
  // Check if the source exists (either original or already queued for rename)
  const existingRename = renames.find((r) => r.to === from);
  if (existingRename) {
    existingRename.to = to;
  } else if (fs.existsSync(path.join(DIR, from))) {
    renames.push({ from, to });
  }
}

// Check for conflicts
const allTargets = new Set();
const existing = new Set(files);
for (const r of renames) {
  if (allTargets.has(r.to)) {
    console.error(`CONFLICT: Multiple renames target "${r.to}"`);
    process.exit(1);
  }
  allTargets.add(r.to);
}

// Execute renames using temp names to avoid conflicts
console.log(`\nRenaming ${renames.length} files:\n`);

// First pass: rename to temp names
for (const r of renames) {
  const tmp = r.from + ".tmp";
  fs.renameSync(path.join(DIR, r.from), path.join(DIR, tmp));
  r._tmp = tmp;
}

// Second pass: rename to final names
for (const r of renames) {
  fs.renameSync(path.join(DIR, r._tmp), path.join(DIR, r.to));
  const fromBase = r.from.replace(".svg", "");
  const toBase = r.to.replace(".svg", "");
  if (fromBase !== toBase) {
    console.log(`  ${fromBase} → ${toBase}`);
  }
}

// Final count
const finalFiles = fs.readdirSync(DIR).filter((f) => f.endsWith(".svg"));
console.log(`\nDone! ${finalFiles.length} SVG files after rename.`);
