#!/usr/bin/env node
const http = require("http");

function req(method, path, body) {
  return new Promise((resolve, reject) => {
    const opts = { hostname: "127.0.0.1", port: 3000, path, method, headers: { "Content-Type": "application/json" } };
    const r = http.request(opts, (res) => {
      let d = ""; res.on("data", c => d += c); res.on("end", () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(d) }); }
        catch { resolve({ status: res.statusCode, data: d }); }
      });
    });
    r.on("error", reject);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

function uploadFile(path, fields, fileName, fileContent) {
  return new Promise((resolve, reject) => {
    const boundary = "----FormBoundary" + Date.now();
    let body = "";
    for (const [key, val] of Object.entries(fields)) {
      body += `--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${val}\r\n`;
    }
    body += `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${fileName}"\r\nContent-Type: image/svg+xml\r\n\r\n${fileContent}\r\n`;
    body += `--${boundary}--\r\n`;
    const opts = {
      hostname: "127.0.0.1", port: 3000, path, method: "POST",
      headers: { "Content-Type": `multipart/form-data; boundary=${boundary}`, "Content-Length": Buffer.byteLength(body) }
    };
    const r = http.request(opts, (res) => {
      let d = ""; res.on("data", c => d += c); res.on("end", () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(d) }); }
        catch { resolve({ status: res.statusCode, data: d }); }
      });
    });
    r.on("error", reject);
    r.write(body);
    r.end();
  });
}

async function test() {
  let pass = 0, fail = 0;
  const check = (name, ok) => { if (ok) { pass++; console.log("  ✓", name); } else { fail++; console.log("  ✗", name); } };

  console.log("=== API E2E Tests ===\n");

  const h = await req("GET", "/health");
  check("Health check", h.status === 200 && h.data.status === "ok");

  const cat = await req("POST", "/api/categories", { name: "Test Category" });
  check("Create category", cat.status === 201 && cat.data.name === "Test Category");
  const catId = cat.data.ROWID;

  const cats = await req("GET", "/api/categories");
  check("List categories", cats.status === 200 && cats.data.length >= 1);

  const svg = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 16 16"><path stroke="#343C54" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 1v14M1 8h14"/></svg>';
  const upload = await uploadFile("/api/icons/upload?skip_ai=true", { name: "test-plus", category_id: catId, tags: "test, plus, add" }, "test-plus.svg", svg);
  check("Upload icon (" + upload.status + ")", upload.status === 201 && upload.data.icon?.slug === "test-plus");
  const iconId = upload.data.icon?.ROWID;

  const list = await req("GET", "/api/icons?limit=10");
  check("List icons (" + list.data.icons?.length + ")", list.status === 200 && list.data.icons.length >= 1);

  const detail = await req("GET", "/api/icons/test-plus");
  check("Get icon by slug", detail.status === 200 && detail.data.name === "test-plus");
  check("Has 3 variants (" + detail.data.variants?.length + ")", detail.data.variants?.length === 3);
  const styles = detail.data.variants?.map(v => v.style).sort().join(",");
  check("Variants: " + styles, styles === "duotone,outlined,solid");

  const search = await req("GET", "/api/icons?search=plus&limit=5");
  check("Search icons (" + search.data.icons?.length + ")", search.status === 200 && search.data.icons.length >= 1);

  const dlSvg = await req("GET", "/api/download/" + iconId + "?style=outlined&format=svg&size=24");
  check("Download SVG (" + dlSvg.status + ")", dlSvg.status === 200 && typeof dlSvg.data === "string" && dlSvg.data.includes("<svg"));

  const dlPng = await req("GET", "/api/download/" + iconId + "?style=outlined&format=png&size=48");
  check("Download PNG (" + dlPng.status + ")", dlPng.status === 200);

  const upd = await req("PUT", "/api/icons/" + iconId, { tags: "test, plus, add, updated" });
  check("Update icon (" + upd.status + ")", upd.status === 200);

  const del = await req("DELETE", "/api/icons/" + iconId);
  check("Delete icon (" + del.status + ")", del.status === 200);

  const gone = await req("GET", "/api/icons/test-plus");
  check("Icon deleted (404)", gone.status === 404);

  const delCat = await req("DELETE", "/api/categories/" + catId);
  check("Delete category (" + delCat.status + ")", delCat.status === 200);

  const headers = await new Promise((resolve) => { http.get("http://127.0.0.1:3000/", (res) => { resolve(res.headers); }); });
  check("X-Content-Type-Options", headers["x-content-type-options"] === "nosniff");
  check("X-Frame-Options", headers["x-frame-options"] === "DENY");
  check("Referrer-Policy", headers["referrer-policy"] === "strict-origin-when-cross-origin");

  console.log("\n=== Results: " + pass + " passed, " + fail + " failed ===");
  process.exit(fail > 0 ? 1 : 0);
}
test().catch(e => { console.error(e); process.exit(1); });
