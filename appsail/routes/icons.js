const express = require("express");
const multer = require("multer");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const { normalizeSvg } = require("../services/normalizer");
const { generateVariants } = require("../services/variantGenerator");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 1024 * 1024 } }); // 1MB max

const ICONS_TABLE = "Icons";
const VARIANTS_TABLE = "IconVariants";
const BUCKET_NAME = "designer-icons";

/**
 * GET /api/icons — List icons with pagination, search, category filter
 */
router.get("/", requireAuth, async (req, res, next) => {
  try {
    const { page = 1, limit = 50, search, category_id, style } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const zcql = req.catalyst.zcql();

    let query = `SELECT * FROM ${ICONS_TABLE}`;
    const conditions = [];

    if (search) {
      conditions.push(
        `(name LIKE '%${search}%' OR tags LIKE '%${search}%' OR slug LIKE '%${search}%')`
      );
    }
    if (category_id) {
      conditions.push(`category_id = ${category_id}`);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(" AND ")}`;
    }

    query += ` ORDER BY CREATEDTIME DESC LIMIT ${offset}, ${parseInt(limit)}`;

    const result = await zcql.executeZCQLQuery(query);
    const icons = result.map((row) => row[ICONS_TABLE] || row);

    // If style filter, fetch variants for matching style
    if (style) {
      const iconIds = icons.map((i) => i.ROWID).filter(Boolean);
      if (iconIds.length > 0) {
        const variantQuery = `SELECT * FROM ${VARIANTS_TABLE} WHERE icon_id IN (${iconIds.join(",")}) AND style = '${style}'`;
        const variants = await zcql.executeZCQLQuery(variantQuery);
        const variantMap = {};
        variants.forEach((v) => {
          const variant = v[VARIANTS_TABLE] || v;
          variantMap[variant.icon_id] = variant;
        });
        icons.forEach((icon) => {
          icon.variant = variantMap[icon.ROWID] || null;
        });
      }
    }

    res.json({ icons, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/icons/:slug — Get single icon with all variants
 */
router.get("/:slug", requireAuth, async (req, res, next) => {
  try {
    const { slug } = req.params;
    const zcql = req.catalyst.zcql();

    const iconResult = await zcql.executeZCQLQuery(
      `SELECT * FROM ${ICONS_TABLE} WHERE slug = '${slug}'`
    );

    if (!iconResult.length) {
      return res.status(404).json({ error: "Icon not found" });
    }

    const icon = iconResult[0][ICONS_TABLE] || iconResult[0];

    // Fetch all variants
    const variantResult = await zcql.executeZCQLQuery(
      `SELECT * FROM ${VARIANTS_TABLE} WHERE icon_id = ${icon.ROWID}`
    );
    icon.variants = variantResult.map((v) => v[VARIANTS_TABLE] || v);

    res.json(icon);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/icons/upload — Upload SVG, normalize, generate variants, store
 * Admin only. Accepts multipart form with: file (SVG), name, category_id, tags
 */
router.post(
  "/upload",
  requireAuth,
  requireAdmin,
  upload.single("file"),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "SVG file is required" });
      }

      const svgString = req.file.buffer.toString("utf-8");
      const { name, category_id, tags } = req.body;

      if (!name) {
        return res.status(400).json({ error: "Icon name is required" });
      }

      // Step 1: Normalize SVG to our canonical style
      let normalizedSvg;
      try {
        normalizedSvg = normalizeSvg(svgString);
      } catch (normalizeErr) {
        return res.status(400).json({
          error: `SVG normalization failed: ${normalizeErr.message}`,
        });
      }

      // Step 2: Generate slug
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

      // Step 3: Save icon metadata to DataStore
      const datastore = req.catalyst.datastore();
      const iconsTable = datastore.table(ICONS_TABLE);

      const iconRecord = await iconsTable.insertRow({
        name,
        slug,
        category_id: category_id || null,
        tags: tags || "",
        is_free: true,
        created_by: req.user.user_id,
      });

      const iconId = iconRecord.ROWID;

      // Step 4: Generate variants (outlined, solid, duotone)
      const variants = generateVariants(normalizedSvg);

      // Step 5: Store variants in Stratus + DataStore
      const stratus = req.catalyst.stratus();
      const bucket = stratus.bucket(BUCKET_NAME);
      const variantsTable = datastore.table(VARIANTS_TABLE);
      const savedVariants = [];

      for (const [style, svgCode] of Object.entries(variants)) {
        // Upload to Stratus
        const objectPath = `icons/${slug}/${style}.svg`;
        let stratusUrl = "";

        try {
          const uploaded = await bucket.putObject({
            path: objectPath,
            data: Buffer.from(svgCode),
            contentType: "image/svg+xml",
          });
          stratusUrl = uploaded.url || "";
        } catch (stratusErr) {
          console.error(`Stratus upload failed for ${style}:`, stratusErr.message);
        }

        // Save variant to DataStore
        const variantRecord = await variantsTable.insertRow({
          icon_id: iconId,
          style,
          svg_code: svgCode,
          stratus_url: stratusUrl,
        });

        savedVariants.push({
          style,
          ROWID: variantRecord.ROWID,
          stratus_url: stratusUrl,
        });
      }

      // Step 6: Update category icon count
      if (category_id) {
        try {
          const zcql = req.catalyst.zcql();
          const countResult = await zcql.executeZCQLQuery(
            `SELECT COUNT(ROWID) AS cnt FROM ${ICONS_TABLE} WHERE category_id = ${category_id}`
          );
          const count =
            countResult[0]?.[ICONS_TABLE]?.cnt ||
            countResult[0]?.cnt ||
            0;

          const categoriesTable = datastore.table("Categories");
          await categoriesTable.updateRow({
            ROWID: category_id,
            icon_count: parseInt(count),
          });
        } catch (countErr) {
          console.error("Category count update failed:", countErr.message);
        }
      }

      res.status(201).json({
        message: "Icon uploaded and processed successfully",
        icon: { ROWID: iconId, name, slug },
        variants: savedVariants,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * DELETE /api/icons/:id — Delete icon and all variants
 * Admin only.
 */
router.delete("/:id", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const datastore = req.catalyst.datastore();
    const zcql = req.catalyst.zcql();

    // Get icon info
    const iconResult = await zcql.executeZCQLQuery(
      `SELECT * FROM ${ICONS_TABLE} WHERE ROWID = ${id}`
    );
    if (!iconResult.length) {
      return res.status(404).json({ error: "Icon not found" });
    }
    const icon = iconResult[0][ICONS_TABLE] || iconResult[0];

    // Delete variants from DataStore
    const variantResult = await zcql.executeZCQLQuery(
      `SELECT ROWID FROM ${VARIANTS_TABLE} WHERE icon_id = ${id}`
    );
    const variantsTable = datastore.table(VARIANTS_TABLE);
    for (const row of variantResult) {
      const variant = row[VARIANTS_TABLE] || row;
      await variantsTable.deleteRow(variant.ROWID);
    }

    // Delete Stratus objects
    try {
      const stratus = req.catalyst.stratus();
      const bucket = stratus.bucket(BUCKET_NAME);
      const styles = ["outlined", "solid", "duotone"];
      for (const style of styles) {
        try {
          await bucket.deleteObject(`icons/${icon.slug}/${style}.svg`);
        } catch (e) {
          // Object may not exist
        }
      }
    } catch (e) {
      console.error("Stratus cleanup failed:", e.message);
    }

    // Delete icon record
    const iconsTable = datastore.table(ICONS_TABLE);
    await iconsTable.deleteRow(id);

    res.json({ message: "Icon deleted successfully" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
