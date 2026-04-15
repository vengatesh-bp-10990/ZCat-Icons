#!/usr/bin/env node
/**
 * Figma → ZCat Icons batch importer
 * Reads downloaded SVGs from /tmp/figma_svgs/ and uploads to the local API.
 * Categories are auto-detected from icon names.
 */

const fs = require("fs");
const path = require("path");
const http = require("http");

const SVG_DIR = "/tmp/figma_svgs";
const API_BASE = "http://127.0.0.1:3000";

// Category mapping — maps icon name patterns to categories
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

// Tag mapping — generates relevant tags from icon names
function generateTags(name) {
  const base = name.replace(/-\d+$/, "");
  const parts = base.split("-");
  const tags = [...new Set([name, ...parts])];

  if (name.includes("arrow") || name.includes("chevron")) tags.push("direction");
  if (name.includes("check")) tags.push("success", "done", "complete");
  if (name.includes("x") || name.includes("close")) tags.push("close", "remove");
  if (name.includes("plus") || name.includes("add")) tags.push("add", "new", "create");
  if (name.includes("minus") || name.includes("remove")) tags.push("remove", "subtract");
  if (name.includes("edit") || name.includes("pen")) tags.push("edit", "write");
  if (name.includes("search")) tags.push("find", "lookup");
  if (name.includes("download")) tags.push("save", "export");
  if (name.includes("upload")) tags.push("import", "send");
  if (name.includes("trash") || name.includes("delete")) tags.push("delete", "remove");
  if (name.includes("lock")) tags.push("secure", "private");
  if (name.includes("eye")) tags.push("view", "visibility");
  if (name.includes("settings") || name.includes("gear")) tags.push("config", "preferences");
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
  if (name.includes("link")) tags.push("url", "connection");
  if (name.includes("share")) tags.push("social");
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

function httpRequest(method, urlPath, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, API_BASE);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {},
    };

    const jsonBody = JSON.stringify(body);
    options.headers["Content-Type"] = "application/json";
    options.headers["Content-Length"] = Buffer.byteLength(jsonBody);
    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });
    req.on("error", reject);
    req.write(jsonBody);
    req.end();
  });
}

function uploadIcon(name, svgContent, categoryId, tags) {
  return new Promise((resolve, reject) => {
    const boundary = "----FormBoundary" + Date.now().toString(36);
    const parts = [];

    parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="name"\r\n\r\n${name}`);
    parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="tags"\r\n\r\n${tags}`);
    if (categoryId) {
      parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="category_id"\r\n\r\n${categoryId}`);
    }
    parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${name}.svg"\r\nContent-Type: image/svg+xml\r\n\r\n${svgContent}`);
    parts.push(`--${boundary}--`);

    const body = parts.join("\r\n");

    const options = {
      hostname: "127.0.0.1",
      port: 3000,
      path: "/api/icons/upload",
      method: "POST",
      headers: {
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
        "Content-Length": Buffer.byteLength(body),
      },
    };

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  const files = fs.readdirSync(SVG_DIR).filter((f) => f.endsWith(".svg"));
  console.log(`Found ${files.length} SVG files to import\n`);

  // Step 1: Create categories
  const categories = [...new Set(files.map((f) => getCategory(f.replace(".svg", ""))))].sort();
  console.log(`Creating ${categories.length} categories...`);
  const categoryIds = {};

  for (const cat of categories) {
    const result = await httpRequest("POST", "/api/categories", { name: cat });
    if (result.status === 201 || result.status === 200) {
      categoryIds[cat] = result.data.ROWID;
      console.log(`  ✓ ${cat} (ID: ${result.data.ROWID})`);
    } else {
      console.log(`  ✗ ${cat}: ${JSON.stringify(result.data)}`);
    }
  }

  // Step 2: Upload icons
  console.log(`\nUploading ${files.length} icons...`);
  let success = 0;
  let failed = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const name = file.replace(".svg", "");
    const svgContent = fs.readFileSync(path.join(SVG_DIR, file), "utf8");
    const category = getCategory(name);
    const categoryId = categoryIds[category] || null;
    const tags = generateTags(name);

    try {
      const result = await uploadIcon(name, svgContent, categoryId, tags);
      if (result.status === 201) {
        success++;
        if ((i + 1) % 50 === 0 || i === files.length - 1) {
          console.log(`  Progress: ${i + 1}/${files.length} (${success} ok, ${failed} failed)`);
        }
      } else {
        failed++;
        console.log(`  ✗ ${name}: ${JSON.stringify(result.data)}`);
      }
    } catch (err) {
      failed++;
      console.log(`  ✗ ${name}: ${err.message}`);
    }
  }

  console.log(`\n=== Import Complete ===`);
  console.log(`Success: ${success}`);
  console.log(`Failed: ${failed}`);
  console.log(`Categories: ${categories.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
