const express = require("express");
const cors = require("cors");
const catalyst = require("zcatalyst-sdk-node");

const iconsRouter = require("./routes/icons");
const categoriesRouter = require("./routes/categories");
const downloadRouter = require("./routes/download");

const app = express();
const PORT = process.env.X_ZOHO_CATALYST_LISTEN_PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

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
  res.json({ status: "ok", service: "ZCat Icons API" });
});

// Routes
app.use("/api/icons", iconsRouter);
app.use("/api/categories", categoriesRouter);
app.use("/api/download", downloadRouter);

// Error handler
app.use((err, req, res, next) => {
  console.error("Error:", err.message);
  res.status(err.status || 500).json({
    error: err.message || "Internal server error",
  });
});

app.listen(PORT, () => {
  console.log(`ZCat Icons API running on port ${PORT}`);
});
