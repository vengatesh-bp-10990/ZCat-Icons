const express = require("express");
const multer = require("multer");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const { normalizeSvg } = require("../services/normalizer");
const { generateVariants } = require("../services/variantGenerator");
const { rewriteSvgWithAI, suggestMetadata } = require("../services/aiRewriter");

const { IS_LOCAL, localStore } = require("../localStore");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 1024 * 1024 } }); // 1MB max

const ICONS_TABLE = "Icons";
const VARIANTS_TABLE = "IconVariants";
const BUCKET_NAME = "designer-icons";

// Sanitize string for ZCQL queries — strip anything that could break out
function sanitize(str) {
  if (!str) return "";
  return String(str)
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/;/g, "")
    .replace(/--/g, "")
    .replace(/\/\*/g, "")
    .replace(/\*\//g, "")
    .slice(0, 200); // limit length
}

/**
 * POST /api/icons/analyze — AI analyzes an SVG, suggests metadata, checks duplicates
 */
router.post(
  "/analyze",
  requireAuth,
  requireAdmin,
  upload.single("file"),
  async (req, res, next) => {
    try {
      if (!req.file) return res.status(400).json({ error: "SVG file is required" });
      const svgString = req.file.buffer.toString("utf-8");

      // Get existing categories
      let categoryNames = [];
      if (IS_LOCAL) {
        // No categories in local store yet, pass empty
      } else {
        try {
          const zcql = req.catalyst.zcql();
          const catResult = await zcql.executeZCQLQuery("SELECT name FROM Categories");
          categoryNames = catResult.map((r) => r.Categories?.name || r.name).filter(Boolean);
        } catch {}
      }

      // Run AI metadata & SVG rewrite in parallel
      const filename = req.file.originalname || "";
      const [metadata, rewrittenSvg] = await Promise.allSettled([
        suggestMetadata(svgString, categoryNames, filename),
        rewriteSvgWithAI(svgString),
      ]);

      const suggestion = metadata.status === "fulfilled" ? metadata.value : null;
      const processedSvg = rewrittenSvg.status === "fulfilled" ? rewrittenSvg.value : null;

      // Check for duplicate icons by suggested name
      let duplicates = [];
      const suggestedName = suggestion?.name || "";
      if (suggestedName) {
        if (IS_LOCAL) {
          duplicates = localStore.icons
            .filter((i) => {
              const a = i.name.toLowerCase().replace(/[^a-z0-9]/g, "");
              const b = suggestedName.toLowerCase().replace(/[^a-z0-9]/g, "");
              return a === b || a.includes(b) || b.includes(a);
            })
            .map((i) => {
              const variant = localStore.variants.find(
                (v) => v.icon_id === i.ROWID && v.style === "outlined"
              );
              return { ROWID: i.ROWID, name: i.name, slug: i.slug, svg_code: variant?.svg_code || "" };
            });
        } else {
          try {
            const zcql = req.catalyst.zcql();
            const searchTerm = sanitize(suggestedName.replace(/-/g, "%"));
            const dupResult = await zcql.executeZCQLQuery(
              `SELECT * FROM ${ICONS_TABLE} WHERE name LIKE '%${searchTerm}%' OR slug LIKE '%${searchTerm}%'`
            );
            const dupIcons = dupResult.map((r) => r[ICONS_TABLE] || r);
            for (const dup of dupIcons) {
              const varResult = await zcql.executeZCQLQuery(
                `SELECT svg_code FROM ${VARIANTS_TABLE} WHERE icon_id = ${dup.ROWID} AND style = 'outlined' LIMIT 1`
              );
              const svgCode = varResult[0]?.[VARIANTS_TABLE]?.svg_code || varResult[0]?.svg_code || "";
              duplicates.push({ ROWID: dup.ROWID, name: dup.name, slug: dup.slug, svg_code: svgCode });
            }
          } catch {}
        }
      }

      // Also search by tags for broader duplicate check
      if (suggestion?.tags?.length && duplicates.length === 0) {
        if (IS_LOCAL) {
          const tagSet = new Set(suggestion.tags.map((t) => t.toLowerCase()));
          duplicates = localStore.icons
            .filter((i) => {
              const iconTags = (i.tags || "").toLowerCase().split(",").map((t) => t.trim());
              const overlap = iconTags.filter((t) => tagSet.has(t));
              return overlap.length >= 2;
            })
            .map((i) => {
              const variant = localStore.variants.find(
                (v) => v.icon_id === i.ROWID && v.style === "outlined"
              );
              return { ROWID: i.ROWID, name: i.name, slug: i.slug, svg_code: variant?.svg_code || "" };
            });
        }
      }

      res.json({
        suggestion,
        processedSvg,
        duplicates,
        originalSvg: svgString,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/icons — List icons with pagination, search, category filter
 */
router.get("/", requireAuth, async (req, res, next) => {
  try {
    const { page = 1, limit = 50, search, category_id, style } = req.query;

    if (IS_LOCAL) {
      let icons = [...localStore.icons];
      if (search) {
        const q = search.toLowerCase();
        icons = icons.filter(
          (i) => i.name.toLowerCase().includes(q) || (i.tags || "").toLowerCase().includes(q)
        );
      }
      if (category_id) {
        icons = icons.filter((i) => i.category_id === category_id);
      }
      // Attach default variant for grid preview
      icons = icons.map((icon) => {
        const variant = localStore.variants.find(
          (v) => v.icon_id === icon.ROWID && v.style === (style || "outlined")
        );
        return { ...icon, variant };
      });
      return res.json({ icons, page: parseInt(page), limit: parseInt(limit) });
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const zcql = req.catalyst.zcql();

    let query = `SELECT * FROM ${ICONS_TABLE}`;
    const conditions = [];

    if (search) {
      const s = sanitize(search);
      conditions.push(
        `(name LIKE '%${s}%' OR tags LIKE '%${s}%' OR slug LIKE '%${s}%')`
      );
    }
    if (category_id) {
      conditions.push(`category_id = ${parseInt(category_id) || 0}`);
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
        const variantQuery = `SELECT * FROM ${VARIANTS_TABLE} WHERE icon_id IN (${iconIds.join(",")}) AND style = '${sanitize(style)}'`;
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

    if (IS_LOCAL) {
      const icon = localStore.icons.find((i) => i.slug === slug);
      if (!icon) return res.status(404).json({ error: "Icon not found" });
      const variants = localStore.variants.filter((v) => v.icon_id === icon.ROWID);
      return res.json({ ...icon, variants });
    }

    const zcql = req.catalyst.zcql();

    const iconResult = await zcql.executeZCQLQuery(
      `SELECT * FROM ${ICONS_TABLE} WHERE slug = '${sanitize(slug)}'`
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
      const skipAI = req.query.skip_ai === "true";

      if (!name) {
        return res.status(400).json({ error: "Icon name is required" });
      }

      // Step 1: Normalize the SVG (AI rewrite or basic normalization)
      let normalizedSvg;
      if (skipAI) {
        // User chose to upload original — basic normalization only
        try {
          const normalized = normalizeSvg(svgString);
          normalizedSvg = normalized.svg;
        } catch (normalizeErr) {
          // If basic normalizer also fails, use SVG as-is
          normalizedSvg = svgString;
        }
      } else {
        try {
          normalizedSvg = await rewriteSvgWithAI(svgString);
        } catch (aiErr) {
          console.error("[Upload] AI rewrite failed, falling back to basic normalizer:", aiErr.message);
          try {
            const normalized = normalizeSvg(svgString);
            normalizedSvg = normalized.svg;
          } catch (normalizeErr) {
            return res.status(400).json({
              error: `SVG processing failed: ${normalizeErr.message}`,
            });
          }
        }
      }

      // Step 2: Generate slug
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

      // Step 3: Generate variants (outlined only for now)
      const variants = generateVariants(normalizedSvg, "stroke");

      // LOCAL DEV: store in memory
      if (IS_LOCAL) {
        const iconId = String(localStore.nextId++);
        const iconRecord = {
          ROWID: iconId,
          name,
          slug,
          category_id: category_id || null,
          tags: tags || "",
          is_free: true,
          created_by: "1",
        };
        localStore.icons.push(iconRecord);

        const savedVariants = [];
        for (const [style, svgCode] of Object.entries(variants)) {
          const variantId = String(localStore.nextId++);
          const variant = {
            ROWID: variantId,
            icon_id: iconId,
            style,
            svg_code: svgCode,
            stratus_url: "",
          };
          localStore.variants.push(variant);
          savedVariants.push({ style, ROWID: variantId, stratus_url: "" });
        }

        return res.status(201).json({
          message: "Icon uploaded and processed successfully",
          icon: { ROWID: iconId, name, slug },
          variants: savedVariants,
        });
      }

      // PRODUCTION: Save to DataStore + Stratus
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
 * PUT /api/icons/:id — Update icon metadata
 * Admin only. Accepts JSON: name, category_id, tags
 */
router.put("/:id", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, category_id, tags } = req.body;

    if (IS_LOCAL) {
      const icon = localStore.icons.find((i) => String(i.ROWID) === String(id));
      if (!icon) return res.status(404).json({ error: "Icon not found" });
      if (name) {
        icon.name = name;
        icon.slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      }
      if (category_id !== undefined) icon.category_id = category_id || null;
      if (tags !== undefined) icon.tags = tags || "";
      return res.json(icon);
    }

    const datastore = req.catalyst.datastore();
    const iconsTable = datastore.table(ICONS_TABLE);
    const updateData = { ROWID: id };
    if (name) {
      updateData.name = name;
      updateData.slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    }
    if (category_id !== undefined) updateData.category_id = category_id || null;
    if (tags !== undefined) updateData.tags = tags || "";

    const updated = await iconsTable.updateRow(updateData);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/icons/:id — Delete icon and all variants
 * Admin only.
 */
router.delete("/:id", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;

    if (IS_LOCAL) {
      const idx = localStore.icons.findIndex((i) => String(i.ROWID) === String(id));
      if (idx === -1) return res.status(404).json({ error: "Icon not found" });
      localStore.icons.splice(idx, 1);
      localStore.variants = localStore.variants.filter((v) => String(v.icon_id) !== String(id));
      return res.json({ message: "Icon deleted successfully" });
    }

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
