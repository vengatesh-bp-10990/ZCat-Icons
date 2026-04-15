const { optimize } = require("svgo");
const cheerio = require("cheerio");

// Canonical style rules
const CANONICAL = {
  viewBox: "0 0 24 24",
  fill: "none",
  color: "#343C54",
  strokeWidth: "1.5",
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

// Max path data length to reject illustrations
const MAX_PATH_LENGTH = 5000;
const MAX_PATH_COUNT = 50;

// SVGO config that preserves important attributes
const SVGO_SAFE = {
  multipass: true,
  plugins: [
    {
      name: "preset-default",
      params: {
        overrides: {
          removeUselessStrokeAndFill: false,
          convertShapeToPath: false,
          moveElemsAttrsToGroup: false,
          moveGroupAttrsToElems: false,
          collapseGroups: false,
        },
      },
    },
  ],
};

/**
 * Detect whether SVG is primarily stroke-based or fill-based.
 */
function detectType(svgString) {
  const $ = cheerio.load(svgString, { xmlMode: true });
  const shapes = $("path, circle, rect, line, polyline, polygon, ellipse");

  let fillCount = 0;
  let strokeCount = 0;

  shapes.each((_, el) => {
    const fill = $(el).attr("fill");
    const stroke = $(el).attr("stroke");
    const strokeWidth = $(el).attr("stroke-width");

    if (stroke && stroke !== "none") strokeCount++;
    if (strokeWidth) strokeCount++;
    if (fill && fill !== "none") fillCount++;
  });

  // Also check root <svg> for stroke attributes (some icons put stroke on root)
  const $svg = $("svg");
  if ($svg.attr("stroke") && $svg.attr("stroke") !== "none") strokeCount += 2;

  return strokeCount > fillCount ? "stroke" : "fill";
}

/**
 * Normalize any SVG to our canonical style (24x24).
 * Returns { svg, type } where type is "stroke" or "fill".
 *
 * Stroke-based: normalizes stroke color, width, linecap, linejoin.
 * Fill-based: normalizes fill color, preserves fill-rule, clip-rule, opacity.
 */
function normalizeSvg(svgString) {
  const type = detectType(svgString);

  // Step 1: Initial SVGO pass
  const optimized = optimize(svgString, {
    multipass: true,
    plugins: [
      {
        name: "preset-default",
        params: {
          overrides: {
            removeUselessStrokeAndFill: false,
            moveElemsAttrsToGroup: false,
            moveGroupAttrsToElems: false,
            collapseGroups: false,
          },
        },
      },
      { name: "removeAttrs", params: { attrs: ["class", "style", "data-*"] } },
    ],
  });

  const svg = optimized.data || svgString;
  const $ = cheerio.load(svg, { xmlMode: true });
  const $svg = $("svg");

  // Step 2: Validate complexity — reject illustrations
  const shapes = $("path, circle, rect, line, polyline, polygon, ellipse");
  if (shapes.length > MAX_PATH_COUNT) {
    throw new Error(
      `SVG too complex (${shapes.length} shapes). Max ${MAX_PATH_COUNT} allowed.`
    );
  }

  let totalPathLength = 0;
  $("path").each((_, el) => {
    const d = $(el).attr("d") || "";
    totalPathLength += d.length;
  });
  if (totalPathLength > MAX_PATH_LENGTH) {
    throw new Error(
      `SVG paths too complex (${totalPathLength} chars). This looks like an illustration, not an icon.`
    );
  }

  // Step 3: Normalize root <svg> attributes
  $svg.attr("viewBox", CANONICAL.viewBox);
  $svg.removeAttr("width");
  $svg.removeAttr("height");
  $svg.attr("fill", CANONICAL.fill);
  $svg.attr("xmlns", "http://www.w3.org/2000/svg");
  $svg.removeAttr("transform");
  $svg.removeAttr("class");
  $svg.removeAttr("style");

  if (type === "stroke") {
    normalizeStrokeSvg($, $svg, shapes);
  } else {
    normalizeFillSvg($, $svg, shapes);
  }

  // Clean up all elements
  $svg.find("*").each((_, el) => {
    $(el).removeAttr("class");
    $(el).removeAttr("style");
    $(el).removeAttr("id");
  });

  // Final SVGO pass
  const finalOptimized = optimize($.xml($svg), SVGO_SAFE);
  return { svg: finalOptimized.data, type };
}

/**
 * Normalize stroke-based SVG:
 * - Move stroke attrs from <svg> root to individual shapes
 * - Normalize stroke color, width, linecap, linejoin
 * - Ensure fill="none" on shapes
 */
function normalizeStrokeSvg($, $svg, shapes) {
  // Some SVGs put stroke attributes on root — capture and remove them
  const rootStroke = $svg.attr("stroke");
  $svg.removeAttr("stroke");
  $svg.removeAttr("stroke-width");
  $svg.removeAttr("stroke-linecap");
  $svg.removeAttr("stroke-linejoin");

  shapes.each((_, el) => {
    const $el = $(el);
    const stroke = $el.attr("stroke") || rootStroke;

    // Set canonical stroke attributes on each shape
    if (stroke && stroke !== "none") {
      $el.attr("stroke", CANONICAL.color);
    } else {
      // Shape without explicit stroke inherits from root — add it
      $el.attr("stroke", CANONICAL.color);
    }

    $el.attr("stroke-width", CANONICAL.strokeWidth);
    $el.attr("stroke-linecap", CANONICAL.strokeLinecap);
    $el.attr("stroke-linejoin", CANONICAL.strokeLinejoin);

    // Ensure fill is none for stroke icons
    const fill = $el.attr("fill");
    if (!fill || fill === "none" || fill === CANONICAL.fill) {
      $el.attr("fill", "none");
    }
    // Remove fill-rule/clip-rule (not needed for stroke icons)
    $el.removeAttr("fill-rule");
    $el.removeAttr("clip-rule");
  });
}

/**
 * Normalize fill-based SVG:
 * - Normalize fill color to canonical
 * - Preserve fill-rule, clip-rule, opacity
 * - Remove stroke attributes
 */
function normalizeFillSvg($, $svg, shapes) {
  // Remove root stroke attributes if any
  $svg.removeAttr("stroke");
  $svg.removeAttr("stroke-width");
  $svg.removeAttr("stroke-linecap");
  $svg.removeAttr("stroke-linejoin");

  shapes.each((_, el) => {
    const $el = $(el);

    // Normalize fill color
    const fill = $el.attr("fill");
    if (fill && fill !== "none") {
      $el.attr("fill", CANONICAL.color);
    }

    // Remove stroke attributes (pure fill icon)
    $el.removeAttr("stroke");
    $el.removeAttr("stroke-width");
    $el.removeAttr("stroke-linecap");
    $el.removeAttr("stroke-linejoin");
  });

  // Normalize <g> groups
  $("g").each((_, el) => {
    $(el).removeAttr("class");
    $(el).removeAttr("style");
    $(el).removeAttr("id");
  });
}

module.exports = { normalizeSvg, CANONICAL };
