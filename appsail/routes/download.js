const express = require("express");
const { requireAuth } = require("../middleware/auth");
const { convertSvg, getMimeType } = require("../services/svgConverter");

const router = express.Router();
const VARIANTS_TABLE = "IconVariants";
const ICONS_TABLE = "Icons";

const VALID_FORMATS = ["svg", "png", "jpeg", "jpg", "gif", "webp"];
const VALID_SIZES = [16, 24, 32, 48, 64, 80, 128, 256, 512];

/**
 * GET /api/download/:iconId — Download icon in specified format/style/size
 * Query params: style, format, size, color
 */
router.get("/:iconId", requireAuth, async (req, res, next) => {
  try {
    const { iconId } = req.params;
    const {
      style = "outlined",
      format = "svg",
      size = "24",
      color,
    } = req.query;

    const sizeNum = parseInt(size);

    // Validate params
    if (!VALID_FORMATS.includes(format)) {
      return res.status(400).json({ error: `Invalid format. Use: ${VALID_FORMATS.join(", ")}` });
    }
    if (!VALID_SIZES.includes(sizeNum)) {
      return res.status(400).json({ error: `Invalid size. Use: ${VALID_SIZES.join(", ")}` });
    }

    // Fetch icon name for filename
    const zcql = req.catalyst.zcql();
    const iconResult = await zcql.executeZCQLQuery(
      `SELECT name, slug FROM ${ICONS_TABLE} WHERE ROWID = ${iconId}`
    );
    if (!iconResult.length) {
      return res.status(404).json({ error: "Icon not found" });
    }
    const icon = iconResult[0][ICONS_TABLE] || iconResult[0];

    // Fetch the variant SVG
    const variantResult = await zcql.executeZCQLQuery(
      `SELECT svg_code FROM ${VARIANTS_TABLE} WHERE icon_id = ${iconId} AND style = '${style}'`
    );
    if (!variantResult.length) {
      return res.status(404).json({ error: `No ${style} variant found` });
    }
    const svgCode = (variantResult[0][VARIANTS_TABLE] || variantResult[0]).svg_code;

    const filename = `${icon.slug}-${style}-${sizeNum}`;

    // Return SVG directly
    if (format === "svg") {
      let svg = svgCode;
      if (color) {
        svg = svg.replace(/stroke="[^"]*"/g, `stroke="${color}"`);
        svg = svg.replace(/fill="(?!none)[^"]*"/g, `fill="${color}"`);
      }
      // Add width/height for download
      svg = svg.replace(/<svg/, `<svg width="${sizeNum}" height="${sizeNum}"`);

      res.setHeader("Content-Type", "image/svg+xml");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}.svg"`);
      return res.send(svg);
    }

    // Convert to raster format
    const buffer = await convertSvg(svgCode, {
      format,
      size: sizeNum,
      color,
    });

    res.setHeader("Content-Type", getMimeType(format));
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}.${format}"`
    );
    res.send(buffer);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
