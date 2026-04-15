const express = require("express");
const { requireAuth, requireAdmin } = require("../middleware/auth");

const router = express.Router();
const CATEGORIES_TABLE = "Categories";
const IS_LOCAL = !process.env.X_ZOHO_CATALYST_LISTEN_PORT;

// In-memory store for local dev
const localCategories = [];
let nextCatId = 1;

/**
 * GET /api/categories — List all categories with icon counts
 */
router.get("/", async (req, res, next) => {
  try {
    if (IS_LOCAL) {
      return res.json(localCategories);
    }

    const zcql = req.catalyst.zcql();
    const result = await zcql.executeZCQLQuery(
      `SELECT * FROM ${CATEGORIES_TABLE} ORDER BY name ASC`
    );
    const categories = result.map((row) => row[CATEGORIES_TABLE] || row);
    res.json(categories);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/categories — Create a new category (admin only)
 */
router.post("/", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Category name is required" });
    }

    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    if (IS_LOCAL) {
      const record = { ROWID: String(nextCatId++), name, slug, icon_count: 0 };
      localCategories.push(record);
      return res.status(201).json(record);
    }

    const datastore = req.catalyst.datastore();
    const table = datastore.table(CATEGORIES_TABLE);

    const record = await table.insertRow({
      name,
      slug,
      icon_count: 0,
    });

    res.status(201).json(record);
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/categories/:id — Delete a category (admin only)
 */
router.delete("/:id", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;

    if (IS_LOCAL) {
      const idx = localCategories.findIndex((c) => String(c.ROWID) === String(id));
      if (idx === -1) return res.status(404).json({ error: "Category not found" });
      localCategories.splice(idx, 1);
      return res.json({ message: "Category deleted" });
    }

    const datastore = req.catalyst.datastore();
    const table = datastore.table(CATEGORIES_TABLE);
    await table.deleteRow(id);
    res.json({ message: "Category deleted" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
