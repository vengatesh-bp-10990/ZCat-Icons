const express = require("express");
const { requireAuth } = require("../middleware/auth");
const { IS_LOCAL, localStore } = require("../localStore");

const router = express.Router();
const VARIANTS_TABLE = "IconVariants";
const ICONS_TABLE = "Icons";

const VALID_SIZES = [16, 24, 32, 48, 64, 80, 128, 256, 512];

/**
 * GET /api/download/:iconId — Download icon as SVG
 * Query params: style, size, color
 */
router.get("/:iconId", requireAuth, async (req, res, next) => {
  try {
    const { iconId } = req.params;
    const {
      style = "outlined",
      size = "16",
      color,
    } = req.query;

    const sizeNum = parseInt(size);

    if (!VALID_SIZES.includes(sizeNum)) {
      return res.status(400).json({ error: `Invalid size. Use: ${VALID_SIZES.join(", ")}` });
    }

    // Fetch icon name for filename
    let icon, svgCode;

    if (IS_LOCAL) {
      icon = localStore.icons.find((i) => String(i.ROWID) === String(iconId));
      if (!icon) {
        return res.status(404).json({ error: "Icon not found" });
      }
      const variant = localStore.variants.find(
        (v) => String(v.icon_id) === String(iconId) && v.style === style
      );
      if (!variant) {
        return res.status(404).json({ error: `No ${style} variant found` });
      }
      svgCode = variant.svg_code;
    } else {
      const zcql = req.catalyst.zcql();
      const iconResult = await zcql.executeZCQLQuery(
        `SELECT name, slug FROM ${ICONS_TABLE} WHERE ROWID = ${iconId}`
      );
      if (!iconResult.length) {
        return res.status(404).json({ error: "Icon not found" });
      }
      icon = iconResult[0][ICONS_TABLE] || iconResult[0];

      const variantResult = await zcql.executeZCQLQuery(
        `SELECT svg_code FROM ${VARIANTS_TABLE} WHERE icon_id = ${iconId} AND style = '${style}'`
      );
      if (!variantResult.length) {
        return res.status(404).json({ error: `No ${style} variant found` });
      }
      svgCode = (variantResult[0][VARIANTS_TABLE] || variantResult[0]).svg_code;
    }

    const filename = `${icon.slug}-${style}`;

    // Return SVG with optional color override and size
    let svg = svgCode;
    if (color) {
      svg = svg.replace(/stroke="[^"]*"/g, `stroke="${color}"`);
      svg = svg.replace(/fill="(?!none)[^"]*"/g, `fill="${color}"`);
    }
    svg = svg.replace(/ width="[^"]*"/g, "");
    svg = svg.replace(/ height="[^"]*"/g, "");
    svg = svg.replace(/<svg/, `<svg width="${sizeNum}" height="${sizeNum}"`);

    res.setHeader("Content-Type", "image/svg+xml");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}.svg"`);
    return res.send(svg);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
