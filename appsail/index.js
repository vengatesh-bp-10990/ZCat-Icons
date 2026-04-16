try { require("dotenv").config({ path: require("path").join(__dirname, ".env") }); } catch(e) { /* dotenv optional */ }
const express = require("express");
const cors = require("cors");
const catalyst = require("zcatalyst-sdk-node");
const path = require("path");

// Catch startup crashes
process.on("uncaughtException", (err) => {
  console.error("[FATAL]", err.message, err.stack);
});

const iconsRouter = require("./routes/icons");
const categoriesRouter = require("./routes/categories");
const downloadRouter = require("./routes/download");

const IS_LOCAL = !process.env.X_ZOHO_CATALYST_LISTEN_PORT;
const app = express();
const PORT = process.env.X_ZOHO_CATALYST_LISTEN_PORT || 3000;

// CORS — only needed locally; Catalyst proxy handles CORS in production
if (IS_LOCAL) {
  app.use(cors());
}

// Security headers
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

// Initialize Catalyst SDK for each request
app.use((req, res, next) => {
  try {
    req.catalyst = catalyst.initialize(req);
  } catch (err) {
    // SDK init may fail for unauthenticated requests
  }
  next();
});

// Health check
app.get("/", (req, res) => {
  res.json({ status: "ok", service: "ZCat Icons API", version: "1.0.0" });
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", uptime: process.uptime(), memory: process.memoryUsage().rss });
});

// Serve static files in production (client build output)
if (!IS_LOCAL) {
  // Catalyst deploy: copied into appsail/public; local prod: ../client/dist
  const clientDist = require("fs").existsSync(path.join(__dirname, "public", "index.html"))
    ? path.join(__dirname, "public")
    : path.join(__dirname, "..", "client", "dist");
  app.use(express.static(clientDist));
}

// API Routes
app.use("/api/icons", iconsRouter);
app.use("/api/categories", categoriesRouter);
app.use("/api/download", downloadRouter);

// SPA fallback — serve index.html for client-side routes (production)
if (!IS_LOCAL) {
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    const idx = require("fs").existsSync(path.join(__dirname, "public", "index.html"))
      ? path.join(__dirname, "public", "index.html")
      : path.join(__dirname, "..", "client", "dist", "index.html");
    res.sendFile(idx);
  });
}

// Error handler
app.use((err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] Error:`, err.message);
  const status = err.status || 500;
  res.status(status).json({
    error: status === 500 ? "Internal server error" : err.message,
  });
});

app.listen(PORT, () => {
  console.log(`ZCat Icons API running on port ${PORT} (${IS_LOCAL ? "local" : "production"})`);
});
