#!/usr/bin/env node
/**
 * Figma → ZCat Icons batch importer — RETRY for remaining icons.
 * Reconnects SSE every BATCH_SIZE icons to avoid connection drops.
 */

const http = require("http");

const MCP_BASE = "http://127.0.0.1:3845";
const BATCH_SIZE = 30; // Reconnect SSE after this many icons

// Icons that FAILED in the first run (196-383)
const REMAINING_ICONS = [
  { id: "797:4863", name: "folder-x" },
  { id: "797:4865", name: "paperclip" },
  { id: "797:4867", name: "clipboard" },
  { id: "797:4869", name: "box" },
  { id: "797:4871", name: "user-right-01" },
  { id: "797:4873", name: "users-down" },
  { id: "797:4875", name: "users-edit" },
  { id: "797:4877", name: "user-down-01" },
  { id: "797:4879", name: "users-left" },
  { id: "797:4881", name: "user-up-01" },
  { id: "797:4883", name: "users-minus" },
  { id: "797:4885", name: "user-edit" },
  { id: "797:4887", name: "users-plus" },
  { id: "797:4889", name: "user-left-01" },
  { id: "797:4891", name: "user-x-01" },
  { id: "797:4893", name: "users-right" },
  { id: "797:4895", name: "users-up" },
  { id: "797:4897", name: "user-01" },
  { id: "797:4899", name: "user-minus-01" },
  { id: "797:4901", name: "users-01" },
  { id: "797:4903", name: "users-x" },
  { id: "797:4905", name: "user-plus-01" },
  { id: "797:4907", name: "user-check-01" },
  { id: "797:4909", name: "users-check" },
  { id: "797:4911", name: "alert-circle" },
  { id: "797:4913", name: "bell-02" },
  { id: "797:4915", name: "notification-text" },
  { id: "797:4917", name: "thumbs-down" },
  { id: "797:4919", name: "alert-triangle" },
  { id: "797:4921", name: "thumbs-up" },
  { id: "797:4923", name: "announcement-01" },
  { id: "797:4925", name: "bell-minus" },
  { id: "797:4927", name: "bell-off-01" },
  { id: "797:4929", name: "bell-ringing-04" },
  { id: "797:4931", name: "cube-02" },
  { id: "797:4933", name: "star-02" },
  { id: "797:4935", name: "cube-outline" },
  { id: "797:4937", name: "inbox-01" },
  { id: "797:4939", name: "mail-01" },
  { id: "797:4941", name: "mail-04" },
  { id: "797:4943", name: "message-text-square-01" },
  { id: "797:4945", name: "phone" },
  { id: "797:4947", name: "send-03" },
  { id: "797:4949", name: "airplay" },
  { id: "797:4951", name: "play-circle-start" },
  { id: "797:4953", name: "battery-charging-01" },
  { id: "797:4955", name: "laptop-02" },
  { id: "797:4957", name: "battery-charging-02" },
  { id: "797:4959", name: "lightbulb-01" },
  { id: "797:4961", name: "podcast" },
  { id: "797:4963", name: "battery-empty" },
  { id: "797:4965", name: "lightbulb-02" },
  { id: "797:4967", name: "battery-full" },
  { id: "797:4969", name: "power-02" },
  { id: "797:4971", name: "battery-low" },
  { id: "797:4973", name: "printer" },
  { id: "797:4975", name: "bluetooth-connect" },
  { id: "797:4977", name: "microphone-01" },
  { id: "797:4979", name: "tablet-01" },
  { id: "797:4981", name: "bluetooth-off" },
  { id: "797:4983", name: "bluetooth-on" },
  { id: "797:4985", name: "microphone-off-01" },
  { id: "797:4987", name: "bluetooth-signal" },
  { id: "797:4989", name: "tv-02" },
  { id: "797:4991", name: "chrome-cast" },
  { id: "797:4993", name: "clapperboard" },
  { id: "797:4995", name: "modem-02" },
  { id: "797:4997", name: "repeat-03" },
  { id: "797:4999", name: "disc-02" },
  { id: "797:5001", name: "monitor-02" },
  { id: "797:5003", name: "fast-backward" },
  { id: "797:5005", name: "rss-02" },
  { id: "797:5007", name: "voicemail" },
  { id: "797:5009", name: "fast-forward" },
  { id: "797:5011", name: "shuffle-01" },
  { id: "797:5013", name: "volume-max" },
  { id: "797:5015", name: "film-01" },
  { id: "797:5017", name: "volume-min" },
  { id: "797:5019", name: "mouse" },
  { id: "797:5021", name: "volume-minus" },
  { id: "797:5023", name: "signal-02" },
  { id: "797:5025", name: "volume-plus" },
  { id: "797:5027", name: "music-note-02" },
  { id: "797:5029", name: "signal-03" },
  { id: "797:5031", name: "volume-x" },
  { id: "797:5033", name: "music-note-plus" },
  { id: "797:5035", name: "hard-drive" },
  { id: "797:5037", name: "pause-circle" },
  { id: "797:5039", name: "skip-back" },
  { id: "797:5041", name: "skip-forward" },
  { id: "797:5043", name: "wifi" },
  { id: "797:5045", name: "headphones-02" },
  { id: "797:5047", name: "wifi-off" },
  { id: "797:5049", name: "keyboard-01" },
  { id: "797:5051", name: "sliders-02" },
  { id: "797:5053", name: "youtube" },
  { id: "797:5055", name: "face-id" },
  { id: "797:5057", name: "scan" },
  { id: "797:5059", name: "shield-03" },
  { id: "797:5061", name: "fingerprint-04" },
  { id: "797:5063", name: "file-lock-02" },
  { id: "797:5065", name: "folder-shield" },
  { id: "797:5067", name: "lock-unlocked-01" },
  { id: "797:5069", name: "shield-off" },
  { id: "797:5071", name: "key-01" },
  { id: "797:5073", name: "shield-plus" },
  { id: "797:5075", name: "shield-tick" },
  { id: "797:5077", name: "file-shield-02" },
  { id: "797:5079", name: "lock-01" },
  { id: "797:5081", name: "shield-zap" },
  { id: "797:5083", name: "passcode" },
  { id: "797:5085", name: "fingerprint-01" },
  { id: "797:5087", name: "passcode-lock" },
  { id: "797:5089", name: "align-center" },
  { id: "797:5091", name: "cursor-02" },
  { id: "797:5093", name: "letter-spacing-01" },
  { id: "797:5095", name: "right-indent-02" },
  { id: "797:5097", name: "align-justify" },
  { id: "797:5099", name: "letter-spacing-02" },
  { id: "797:5101", name: "roller-brush" },
  { id: "797:5103", name: "align-left" },
  { id: "797:5105", name: "line-height" },
  { id: "797:5107", name: "scale-01" },
  { id: "797:5109", name: "align-right" },
  { id: "797:5111", name: "attachment-01" },
  { id: "797:5113", name: "cursor-click-01" },
  { id: "797:5115", name: "magic-wand-02" },
  { id: "797:5117", name: "move" },
  { id: "797:5119", name: "bezier-curve-01" },
  { id: "797:5121", name: "delete" },
  { id: "797:5123", name: "dotpoints-01" },
  { id: "797:5125", name: "paint-pour" },
  { id: "797:5127", name: "dotpoints-02" },
  { id: "797:5129", name: "scissors-cut-02" },
  { id: "797:5131", name: "bold-01" },
  { id: "797:5133", name: "drop" },
  { id: "797:5135", name: "paragraph-spacing" },
  { id: "797:5137", name: "dropper" },
  { id: "797:5139", name: "paragraph-wrap" },
  { id: "797:5141", name: "eraser" },
  { id: "797:5143", name: "pen-tool-01" },
  { id: "797:5145", name: "brush-01" },
  { id: "797:5147", name: "pen-tool-02" },
  { id: "797:5149", name: "figma" },
  { id: "797:5151", name: "pen-tool-minus" },
  { id: "797:5153", name: "pen-tool-plus" },
  { id: "797:5155", name: "text-input" },
  { id: "797:5157", name: "hand" },
  { id: "797:5159", name: "transform" },
  { id: "797:5161", name: "code-snippet-01" },
  { id: "797:5163", name: "heading-01" },
  { id: "797:5165", name: "type-01" },
  { id: "797:5167", name: "code-snippet-02" },
  { id: "797:5169", name: "colors-02" },
  { id: "797:5171", name: "command" },
  { id: "797:5173", name: "image-indent-left" },
  { id: "797:5175", name: "perspective-02" },
  { id: "797:5177", name: "type-strikethrough-01" },
  { id: "797:5179", name: "image-indent-right" },
  { id: "797:5181", name: "italic-01" },
  { id: "797:5183", name: "underline-01" },
  { id: "797:5185", name: "contrast-03" },
  { id: "797:5187", name: "crop-01" },
  { id: "797:5189", name: "left-indent-01" },
  { id: "797:5191", name: "reflect-02" },
  { id: "797:5193", name: "zoom-in" },
  { id: "797:5195", name: "cursor-01" },
  { id: "797:5197", name: "left-indent-02" },
  { id: "797:5199", name: "right-indent-01" },
  { id: "797:5201", name: "zoom-out" },
  { id: "797:5203", name: "certificate-01" },
  { id: "797:5205", name: "graduation-hat-02" },
  { id: "797:5207", name: "atom-02" },
  { id: "797:5209", name: "beaker-02" },
  { id: "797:5211", name: "certificate-02" },
  { id: "797:5213", name: "book-closed" },
  { id: "797:5215", name: "ruler" },
  { id: "797:5217", name: "book-open-01" },
  { id: "797:5219", name: "stand" },
  { id: "797:5221", name: "award-03" },
  { id: "797:5223", name: "glasses-02" },
  { id: "797:5225", name: "award-04" },
  { id: "797:5227", name: "trophy-01" },
  { id: "797:5229", name: "briefcase-02" },
  { id: "797:5231", name: "calculator" },
  { id: "797:5233", name: "graduation-hat-01" },
  { id: "1496:24326", name: "moon" },
  { id: "1496:24328", name: "sun" },
];

// Category map (name → icon names)
const CATEGORY_MAP = {
  "General": ["box", "clipboard", "paperclip", "cube-02", "star-02", "cube-outline", "hand", "command", "zoom-in", "zoom-out"],
  "Files and Folders": ["folder-x", "folder-shield", "file-lock-02", "file-shield-02"],
  "Users": [
    "user-right-01", "users-down", "users-edit", "user-down-01", "users-left",
    "user-up-01", "users-minus", "user-edit", "users-plus", "user-left-01",
    "user-x-01", "users-right", "users-up", "user-01", "user-minus-01",
    "users-01", "users-x", "user-plus-01", "user-check-01", "users-check",
  ],
  "Alerts": [
    "alert-circle", "alert-triangle", "bell-02", "bell-minus", "bell-off-01",
    "bell-ringing-04", "thumbs-down", "thumbs-up", "notification-text",
    "announcement-01",
  ],
  "Communication": ["inbox-01", "mail-01", "mail-04", "message-text-square-01", "phone", "send-03"],
  "Media": [
    "airplay", "play-circle-start", "clapperboard", "disc-02", "fast-backward",
    "fast-forward", "film-01", "music-note-02", "music-note-plus", "pause-circle",
    "podcast", "repeat-03", "shuffle-01", "skip-back", "skip-forward", "youtube",
  ],
  "Devices": [
    "battery-charging-01", "battery-charging-02", "battery-empty", "battery-full",
    "battery-low", "bluetooth-connect", "bluetooth-off", "bluetooth-on",
    "bluetooth-signal", "chrome-cast", "hard-drive", "headphones-02",
    "keyboard-01", "laptop-02", "lightbulb-01", "lightbulb-02",
    "microphone-01", "microphone-off-01", "modem-02", "monitor-02", "mouse",
    "power-02", "printer", "rss-02", "signal-02", "signal-03", "sliders-02",
    "tablet-01", "tv-02", "voicemail", "volume-max", "volume-min",
    "volume-minus", "volume-plus", "volume-x", "wifi", "wifi-off",
  ],
  "Security": [
    "face-id", "fingerprint-01", "fingerprint-04", "key-01", "lock-01",
    "lock-unlocked-01", "passcode", "passcode-lock", "scan", "shield-03",
    "shield-off", "shield-plus", "shield-tick", "shield-zap",
  ],
  "Design": [
    "align-center", "align-justify", "align-left", "align-right",
    "attachment-01", "bezier-curve-01", "bold-01", "brush-01", "colors-02",
    "contrast-03", "crop-01", "cursor-01", "cursor-02", "cursor-click-01",
    "delete", "dotpoints-01", "dotpoints-02", "drop", "dropper", "eraser",
    "figma", "hand", "heading-01", "image-indent-left", "image-indent-right",
    "italic-01", "left-indent-01", "left-indent-02", "letter-spacing-01",
    "letter-spacing-02", "line-height", "magic-wand-02", "move",
    "paint-pour", "paragraph-spacing", "paragraph-wrap", "pen-tool-01",
    "pen-tool-02", "pen-tool-minus", "pen-tool-plus", "perspective-02",
    "reflect-02", "right-indent-01", "right-indent-02", "roller-brush",
    "scale-01", "scissors-cut-02", "text-input", "transform",
    "type-01", "type-strikethrough-01", "underline-01",
    "code-snippet-01", "code-snippet-02", "command",
  ],
  "Education": [
    "atom-02", "award-03", "award-04", "beaker-02", "book-closed",
    "book-open-01", "briefcase-02", "calculator", "certificate-01",
    "certificate-02", "glasses-02", "graduation-hat-01", "graduation-hat-02",
    "ruler", "stand", "trophy-01",
  ],
  "Weather": ["moon", "sun"],
  "Actions": ["delete"],
};

// Build reverse map
const nameToCat = {};
for (const [cat, names] of Object.entries(CATEGORY_MAP)) {
  for (const name of names) {
    nameToCat[name] = cat;
  }
}

function generateTags(name) {
  const parts = name.replace(/-\d+$/, "").split("-");
  const tags = [...new Set(parts.filter((p) => p.length > 1))];
  const extras = {
    "trash": ["delete", "remove"], "edit": ["pencil", "write"], "eye": ["view", "visible"],
    "heart": ["love", "favorite"], "star": ["favorite", "rating"], "bell": ["notification", "alert"],
    "mail": ["email", "envelope"], "phone": ["call", "mobile"], "lock": ["security", "password"],
    "user": ["person", "account"], "users": ["people", "group"], "file": ["document"],
    "folder": ["directory"], "calendar": ["date", "schedule"], "clock": ["time"],
    "camera": ["photo", "capture"], "image": ["photo", "picture"], "search": ["find"],
    "settings": ["gear", "config"], "shield": ["security", "protection"],
    "download": ["save"], "upload": ["send"], "share": ["social"],
    "bookmark": ["save", "favorite"], "check": ["success", "done"],
    "alert": ["warning", "danger"], "arrow": ["direction"], "chevron": ["arrow", "caret"],
    "volume": ["sound", "audio"], "bluetooth": ["wireless"], "battery": ["power", "charge"],
    "wifi": ["wireless", "internet"], "key": ["access", "unlock"],
  };
  for (const [key, extra] of Object.entries(extras)) {
    if (name.includes(key)) tags.push(...extra);
  }
  return [...new Set(tags)].slice(0, 6).join(", ");
}

// ── HTTP helpers ─────────────────────────────────────────────────

function httpGet(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => resolve(data));
    }).on("error", reject);
  });
}

function httpPost(url, body) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = http.request({
      hostname: parsed.hostname, port: parsed.port,
      path: parsed.pathname + parsed.search,
      method: "POST",
      headers: { "Content-Type": "application/json" },
    }, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => resolve({ status: res.statusCode, data }));
    });
    req.on("error", reject);
    req.write(JSON.stringify(body));
    req.end();
  });
}

function normalizeFigmaSvg(svgString) {
  if (!svgString || !svgString.includes("<svg")) return null;
  let svg = svgString;
  svg = svg.replace(/var\(--[^,]+,\s*([^)]+)\)/g, "$1");
  const vbMatch = svg.match(/viewBox="([^"]+)"/);
  let origW = 16, origH = 16;
  if (vbMatch) {
    const parts = vbMatch[1].split(/\s+/).map(Number);
    if (parts.length === 4) { origW = parts[2]; origH = parts[3]; }
  }
  const innerMatch = svg.match(/<svg[^>]*>([\s\S]*)<\/svg>/i);
  if (!innerMatch) return null;
  let inner = innerMatch[1].trim();
  inner = inner.replace(/<g\s+id="[^"]*"\s*>/g, "");
  const openGs = (inner.match(/<g[\s>]/g) || []).length;
  const closeGs = (inner.match(/<\/g>/g) || []).length;
  if (closeGs > openGs) {
    for (let i = 0; i < closeGs - openGs; i++) {
      inner = inner.replace(/<\/g>/, "");
    }
  }
  const scale = Math.min(24 / origW, 24 / origH);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
<g transform="scale(${scale})">
${inner}
</g>
</svg>`;
}

function uploadToApp(name, svgContent, tags, categoryId) {
  return new Promise((resolve, reject) => {
    const boundary = "----FormBoundary" + Math.random().toString(36).slice(2);
    let body = "";
    body += `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${name}.svg"\r\nContent-Type: image/svg+xml\r\n\r\n${svgContent}\r\n`;
    body += `--${boundary}\r\nContent-Disposition: form-data; name="name"\r\n\r\n${name}\r\n`;
    body += `--${boundary}\r\nContent-Disposition: form-data; name="tags"\r\n\r\n${tags}\r\n`;
    if (categoryId) body += `--${boundary}\r\nContent-Disposition: form-data; name="category_id"\r\n\r\n${categoryId}\r\n`;
    body += `--${boundary}--\r\n`;
    const req = http.request({
      hostname: "127.0.0.1", port: 3000,
      path: "/api/icons/upload?skip_ai=true", method: "POST",
      headers: {
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
        "Content-Length": Buffer.byteLength(body),
      },
    }, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, data }); }
      });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

function fetchCategories() {
  return new Promise((resolve, reject) => {
    http.get("http://127.0.0.1:3000/api/categories", (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => { try { resolve(JSON.parse(data)); } catch { resolve([]); } });
    }).on("error", reject);
  });
}

// ── MCP SSE Session ─────────────────────────────────────────────

class MCPSession {
  constructor() {
    this.msgEndpoint = null;
    this.pendingResolvers = {};
    this.sseRequest = null;
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.sseRequest = http.get(`${MCP_BASE}/sse`, (res) => {
        let buffer = "";
        res.on("data", (chunk) => {
          buffer += chunk.toString();
          const lines = buffer.split("\n");
          buffer = lines.pop();
          let currentEvent = null;
          for (const line of lines) {
            if (line.startsWith("event: ")) {
              currentEvent = line.slice(7).trim();
            } else if (line.startsWith("data: ")) {
              const data = line.slice(6).trim();
              if (currentEvent === "endpoint") {
                this.msgEndpoint = `${MCP_BASE}${data}`;
                resolve();
              } else if (currentEvent === "message") {
                try {
                  const msg = JSON.parse(data);
                  if (msg.id !== undefined && this.pendingResolvers[msg.id]) {
                    this.pendingResolvers[msg.id](msg);
                    delete this.pendingResolvers[msg.id];
                  }
                } catch {}
              }
              currentEvent = null;
            }
          }
        });
        res.on("error", reject);
      });
      this.sseRequest.on("error", reject);
    });
  }

  async initialize() {
    const result = await this.callMethod(0, "initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "figma-import-retry", version: "1.0.0" },
    });
    await httpPost(this.msgEndpoint, {
      jsonrpc: "2.0", method: "notifications/initialized",
    });
    return result;
  }

  callMethod(id, method, params) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        delete this.pendingResolvers[id];
        reject(new Error("timeout"));
      }, 20000);
      this.pendingResolvers[id] = (msg) => {
        clearTimeout(timer);
        resolve(msg);
      };
      httpPost(this.msgEndpoint, { jsonrpc: "2.0", id, method, params });
    });
  }

  async getDesignContext(nodeId, reqId) {
    const result = await this.callMethod(reqId, "tools/call", {
      name: "get_design_context", arguments: { nodeId },
    });
    const text = result?.result?.content?.[0]?.text || "";
    const urlMatch = text.match(/http:\/\/localhost:3845\/assets\/[a-f0-9]+\.svg/);
    return urlMatch ? urlMatch[0] : null;
  }

  destroy() {
    if (this.sseRequest) {
      this.sseRequest.destroy();
      this.sseRequest = null;
    }
    // Reject all pending
    for (const [id, resolver] of Object.entries(this.pendingResolvers)) {
      // just clean up
    }
    this.pendingResolvers = {};
  }
}

async function createSession() {
  const session = new MCPSession();
  await session.connect();
  await session.initialize();
  return session;
}

// ── Main ────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🎨 ZCat Icons — Retry Import (${REMAINING_ICONS.length} remaining icons)\n`);

  // Get category IDs
  const cats = await fetchCategories();
  const catMap = {};
  for (const c of cats) catMap[c.name] = c.ROWID;

  let success = 0, failed = 0;
  let session = null;

  // Process in batches with SSE reconnection
  for (let batchStart = 0; batchStart < REMAINING_ICONS.length; batchStart += BATCH_SIZE) {
    const batchEnd = Math.min(batchStart + BATCH_SIZE, REMAINING_ICONS.length);
    const batch = REMAINING_ICONS.slice(batchStart, batchEnd);

    // Create fresh SSE session for each batch
    if (session) session.destroy();
    console.log(`\n--- Batch ${Math.floor(batchStart / BATCH_SIZE) + 1} (icons ${batchStart + 1}-${batchEnd}) — reconnecting SSE...`);
    try {
      session = await createSession();
      console.log("    SSE connected ✓");
    } catch (err) {
      console.log(`    SSE connection failed: ${err.message}`);
      failed += batch.length;
      continue;
    }

    for (let i = 0; i < batch.length; i++) {
      const icon = batch[i];
      const globalIdx = batchStart + i + 1;
      const category = nameToCat[icon.name] || "General";
      const categoryId = catMap[category] || "";
      const tags = generateTags(icon.name);
      const reqId = globalIdx + 1000;

      process.stdout.write(`\r  [${globalIdx}/${REMAINING_ICONS.length}] ${icon.name.padEnd(30)}`);

      try {
        // Get SVG URL from MCP
        const svgUrl = await session.getDesignContext(icon.id, reqId);
        if (!svgUrl) {
          console.log(` ✗ No SVG URL`);
          failed++;
          continue;
        }

        // Fetch SVG
        const rawSvg = await httpGet(svgUrl);
        if (!rawSvg || !rawSvg.includes("<svg")) {
          console.log(` ✗ Bad SVG`);
          failed++;
          continue;
        }

        // Normalize and upload
        const normalized = normalizeFigmaSvg(rawSvg);
        if (!normalized) {
          console.log(` ✗ Normalize failed`);
          failed++;
          continue;
        }

        const result = await uploadToApp(icon.name, normalized, tags, categoryId);
        if (result.status === 201) {
          success++;
        } else {
          console.log(` ✗ Upload ${result.status}`);
          failed++;
        }

        // Small delay
        await new Promise((r) => setTimeout(r, 150));
      } catch (err) {
        console.log(` ✗ ${err.message}`);
        failed++;
      }
    }
  }

  if (session) session.destroy();

  console.log(`\n\n✅ Retry complete!`);
  console.log(`   ${success} uploaded`);
  console.log(`   ${failed} failed`);
  console.log(`   Total attempted: ${REMAINING_ICONS.length}`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
