const express = require("express");
const { requireAuth, requireAdmin } = require("../middleware/auth");

const router = express.Router();
const CATEGORIES_TABLE = "Categories";

/**
 * GET /api/categories — List all categories with icon counts
 */
router.get("/", requireAuth, async (req, res, next) => {
  try {
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
    const datastore = req.catalyst.datastore();
    const table = datastore.table(CATEGORIES_TABLE);
    await table.deleteRow(id);
    res.json({ message: "Category deleted" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
