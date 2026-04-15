const sharp = require("sharp");

/**
 * Convert SVG string to raster format (PNG, JPEG, GIF, WEBP)
 * with specified size and optional color override.
 */
async function convertSvg(svgString, { format = "png", size = 24, color }) {
  // Apply color override if provided
  let svg = svgString;
  if (color) {
    svg = svg.replace(/stroke="[^"]*"/g, `stroke="${color}"`);
    svg = svg.replace(/fill="(?!none)[^"]*"/g, `fill="${color}"`);
  }

  // Set dimensions on SVG for sharp
  svg = svg.replace(
    /<svg/,
    `<svg width="${size}" height="${size}"`
  );

  const svgBuffer = Buffer.from(svg);

  let pipeline = sharp(svgBuffer, { density: 300 });

  pipeline = pipeline.resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } });

  switch (format) {
    case "png":
      pipeline = pipeline.png();
      break;
    case "jpeg":
    case "jpg":
      pipeline = pipeline.flatten({ background: "#ffffff" }).jpeg({ quality: 95 });
      break;
    case "gif":
      pipeline = pipeline.gif();
      break;
    case "webp":
      pipeline = pipeline.webp({ quality: 95 });
      break;
    default:
      pipeline = pipeline.png();
  }

  return pipeline.toBuffer();
}

/**
 * Get MIME type for a format
 */
function getMimeType(format) {
  const types = {
    png: "image/png",
    jpeg: "image/jpeg",
    jpg: "image/jpeg",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
  };
  return types[format] || "application/octet-stream";
}

module.exports = { convertSvg, getMimeType };
