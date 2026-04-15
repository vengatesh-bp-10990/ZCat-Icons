#!/usr/bin/env node
/**
 * Production data management script for ZCat Icons.
 * Clears old icons/variants/categories from Catalyst DataStore and uploads new ones.
 *
 * Usage:
 *   node scripts/prod-import.js clear    — Delete all rows from Icons, IconVariants, Categories
 *   node scripts/prod-import.js import   — Import icons from /tmp/figma_svgs/ into DataStore
 *   node scripts/prod-import.js all      — Clear then import
 *
 * Requires: catalyst CLI logged in, run from project root.
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const SVG_DIR = "/tmp/figma_svgs";

// Category mapping (same as figma-import.js)
const CATEGORY_MAP = [
  { pattern: /^arrow-|^chevron-|^corner-|^expand-|^flip-|^refresh-/, category: "Arrows & Navigation" },
  { pattern: /^browser|^code-|^database|^file-code|^folder-code|^puzzle-piece|^qr-code|^server-|^terminal|^variable/, category: "Development" },
  { pattern: /^currency-|^gift|^receipt|^safe$|^sale-|^shopping-|^tag-|^wallet/, category: "Commerce" },
  { pattern: /^flag-|^globe-|^marker-pin|^navigation-pointer|^plane$|^rocket-|^route$/, category: "Maps & Travel" },
  { pattern: /^alarm-clock|^calendar|^clock|^hourglass/, category: "Time & Date" },
  { pattern: /^camera-|^flash$|^flash-off|^image-|^colors$/, category: "Media & Images" },
  { pattern: /^file-(?!code|lock|shield)|^folder(?!-code|-shield)|^paperclip|^clipboard|^box$/, category: "Files & Folders" },
  { pattern: /^user-|^users-/, category: "Users" },
  { pattern: /^alert-|^bell-|^notification|^thumbs-|^announcement/, category: "Alerts & Notifications" },
  { pattern: /^inbox|^mail-|^message-|^phone$|^send-/, category: "Communication" },
  { pattern: /^airplay|^play-circle|^battery-|^bluetooth-|^chrome-cast|^clapperboard|^disc-|^fast-|^film-|^hard-drive|^headphones|^keyboard|^laptop|^lightbulb|^microphone|^modem|^monitor|^mouse$|^music-|^pause-|^podcast|^power-|^printer|^repeat-|^rss-|^shuffle-|^signal-|^skip-|^sliders-|^tablet|^tv-|^voicemail|^volume-|^wifi|^youtube/, category: "Devices & Media" },
  { pattern: /^face-id|^scan$|^shield-|^fingerprint-|^file-lock|^folder-shield|^lock-|^key-|^passcode/, category: "Security" },
  { pattern: /^align-|^attachment|^bezier|^bold|^brush|^code-snippet|^command$|^contrast|^crop|^cursor|^delete$|^dotpoints|^drop$|^dropper|^eraser|^figma$|^hand$|^heading|^image-indent|^italic|^left-indent|^letter-spacing|^line-height|^magic-wand|^move$|^paint-pour|^paragraph|^pen-tool|^perspective|^reflect|^right-indent|^roller-brush|^scale-|^scissors|^text-input|^transform$|^type-|^underline|^zoom-/, category: "Editor & Design" },
  { pattern: /^atom|^award|^beaker|^book-|^briefcase|^calculator|^certificate|^glasses|^graduation|^ruler$|^stand$|^trophy/, category: "Education & Work" },
  { pattern: /^moon$|^sun$/i, category: "Weather" },
  { pattern: /^star-|^cube-|^heart$/, category: "Shapes" },
];

function generateTags(name) {
  const base = name.replace(/-\d+$/, "");
  const parts = base.split("-");
  const tags = [...new Set([name, ...parts])];
  if (name.includes("arrow") || name.includes("chevron")) tags.push("direction");
  if (name.includes("check")) tags.push("success", "done", "complete");
  if (name.includes("plus") || name.includes("add")) tags.push("add", "new", "create");
  if (name.includes("minus") || name.includes("remove")) tags.push("remove", "subtract");
  if (name.includes("edit") || name.includes("pen")) tags.push("edit", "write");
  if (name.includes("search")) tags.push("find", "lookup");
  if (name.includes("download")) tags.push("save", "export");
  if (name.includes("upload")) tags.push("import", "send");
  if (name.includes("trash") || name.includes("delete")) tags.push("delete", "remove");
  if (name.includes("lock")) tags.push("secure", "private");
  if (name.includes("eye")) tags.push("view", "visibility");
  if (name.includes("user")) tags.push("person", "account", "profile");
  if (name.includes("file")) tags.push("document");
  if (name.includes("folder")) tags.push("directory");
  if (name.includes("calendar")) tags.push("date", "schedule");
  if (name.includes("clock")) tags.push("time");
  if (name.includes("bell")) tags.push("notification", "alert");
  if (name.includes("mail")) tags.push("email", "message");
  if (name.includes("heart")) tags.push("favorite", "like", "love");
  if (name.includes("star")) tags.push("favorite", "rating");
  if (name.includes("home")) tags.push("house", "main");
  if (name.includes("shield")) tags.push("security", "protect");
  if (name.includes("server")) tags.push("hosting", "backend");
  if (name.includes("database")) tags.push("data", "storage");
  if (name.includes("terminal")) tags.push("console", "cli", "command");
  if (name.includes("code")) tags.push("programming", "developer");
  return [...new Set(tags)].slice(0, 8).join(",");
}

function getCategory(name) {
  for (const { pattern, category } of CATEGORY_MAP) {
    if (pattern.test(name)) return category;
  }
  return "General";
}

function zcql(query) {
  try {
    const escaped = query.replace(/'/g, "'\\''");
    const result = execSync(`catalyst data:query --query '${escaped}' --output json 2>/dev/null`, {
      encoding: "utf-8",
      maxBuffer: 10 * 1024 * 1024,
    });
    return JSON.parse(result);
  } catch (e) {
    // Some queries return empty
    return [];
  }
}

async function clearAll() {
  console.log("=== Clearing all data ===\n");

  // Delete IconVariants
  console.log("Deleting IconVariants...");
  const variants = zcql("SELECT ROWID FROM IconVariants");
  if (variants.length > 0) {
    for (const row of variants) {
      const id = row.IconVariants?.ROWID || row.ROWID;
      if (id) {
        try {
          execSync(`catalyst data:row --table IconVariants --id ${id} --delete --no-prompt 2>/dev/null`);
        } catch {}
      }
    }
    console.log(`  Deleted ${variants.length} variants`);
  } else {
    console.log("  No variants to delete");
  }

  // Delete Icons
  console.log("Deleting Icons...");
  const icons = zcql("SELECT ROWID FROM Icons");
  if (icons.length > 0) {
    for (const row of icons) {
      const id = row.Icons?.ROWID || row.ROWID;
      if (id) {
        try {
          execSync(`catalyst data:row --table Icons --id ${id} --delete --no-prompt 2>/dev/null`);
        } catch {}
      }
    }
    console.log(`  Deleted ${icons.length} icons`);
  } else {
    console.log("  No icons to delete");
  }

  // Delete Categories
  console.log("Deleting Categories...");
  const cats = zcql("SELECT ROWID FROM Categories");
  if (cats.length > 0) {
    for (const row of cats) {
      const id = row.Categories?.ROWID || row.ROWID;
      if (id) {
        try {
          execSync(`catalyst data:row --table Categories --id ${id} --delete --no-prompt 2>/dev/null`);
        } catch {}
      }
    }
    console.log(`  Deleted ${cats.length} categories`);
  } else {
    console.log("  No categories to delete");
  }

  console.log("\nAll data cleared.\n");
}

console.log("This script manages production DataStore directly.");
console.log("Use the Catalyst CLI + ZCQL for data operations.\n");

const command = process.argv[2];
if (!command || !["clear", "import", "all"].includes(command)) {
  console.log("Usage: node scripts/prod-import.js [clear|import|all]");
  process.exit(1);
}

(async () => {
  if (command === "clear" || command === "all") {
    await clearAll();
  }
  if (command === "import" || command === "all") {
    console.log("=== For import, use the local API method ===");
    console.log("1. Start local server: cd appsail && IS_LOCAL=true node index.js");
    console.log("2. Run: node scripts/figma-import.js");
    console.log("3. Deploy: catalyst deploy");
    console.log("\nProduction DataStore gets populated when users interact with the deployed app.");
    console.log("For direct DataStore import, use the Catalyst Console bulk import feature.");
  }
})();
