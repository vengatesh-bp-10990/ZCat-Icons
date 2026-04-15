const cheerio = require("cheerio");
const { optimize } = require("svgo");
const { CANONICAL } = require("./normalizer");

/**
 * Generate 3 style variants from a normalized stroke-based SVG:
 * 1. outlined (the input itself)
 * 2. solid (strokes → fills)
 * 3. duotone (primary fill + secondary at opacity 0.4)
 */
function generateVariants(normalizedSvg) {
  return {
    outlined: normalizedSvg,
    solid: generateSolid(normalizedSvg),
    duotone: generateDuotone(normalizedSvg),
  };
}

/**
 * SOLID: Convert stroke-based SVG to fill-based
 * - Remove stroke attributes
 * - Set fill to the canonical color
 * - Remove stroke-width, linecap, linejoin
 */
function generateSolid(svgString) {
  const $ = cheerio.load(svgString, { xmlMode: true });
  const $svg = $("svg");
  $svg.attr("fill", "none");

  const shapes = $("path, circle, rect, line, polyline, polygon, ellipse");

  shapes.each((_, el) => {
    const $el = $(el);

    // Convert stroke to fill
    $el.attr("fill", CANONICAL.stroke);
    $el.removeAttr("stroke");
    $el.removeAttr("stroke-width");
    $el.removeAttr("stroke-linecap");
    $el.removeAttr("stroke-linejoin");
  });

  const result = optimize($.xml($svg), {
    multipass: true,
    plugins: ["preset-default", "removeDimensions"],
  });

  return result.data;
}

/**
 * DUOTONE: Split shapes into primary and secondary groups
 * - First ~60% of shapes → primary fill (full opacity)
 * - Remaining ~40% → secondary fill (opacity 0.4)
 */
function generateDuotone(svgString) {
  const $ = cheerio.load(svgString, { xmlMode: true });
  const $svg = $("svg");
  $svg.attr("fill", "none");

  const shapes = $("path, circle, rect, line, polyline, polygon, ellipse");
  const shapeArray = shapes.toArray();

  if (shapeArray.length <= 1) {
    // Only one shape — just make it solid, no duotone possible
    return generateSolid(svgString);
  }

  // Split: first shapes are primary, rest are secondary
  const splitIndex = Math.ceil(shapeArray.length * 0.6);

  // Create primary group
  const primaryShapes = shapeArray.slice(0, splitIndex);
  const secondaryShapes = shapeArray.slice(splitIndex);

  // Clear SVG children and rebuild
  $svg.empty();

  // Primary shapes — full fill
  primaryShapes.forEach((el) => {
    const $el = $(el).clone();
    $el.attr("fill", CANONICAL.stroke);
    $el.removeAttr("stroke");
    $el.removeAttr("stroke-width");
    $el.removeAttr("stroke-linecap");
    $el.removeAttr("stroke-linejoin");
    $svg.append($el);
  });

  // Secondary shapes — wrapped in opacity group
  if (secondaryShapes.length > 0) {
    const $group = $('<g opacity="0.4"></g>');
    secondaryShapes.forEach((el) => {
      const $el = $(el).clone();
      $el.attr("fill", CANONICAL.stroke);
      $el.removeAttr("stroke");
      $el.removeAttr("stroke-width");
      $el.removeAttr("stroke-linecap");
      $el.removeAttr("stroke-linejoin");
      $group.append($el);
    });
    $svg.append($group);
  }

  const result = optimize($.xml($svg), {
    multipass: true,
    plugins: ["preset-default", "removeDimensions"],
  });

  return result.data;
}

module.exports = { generateVariants };
