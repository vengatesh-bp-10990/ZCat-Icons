const { optimize } = require("svgo");
const cheerio = require("cheerio");

// Canonical style rules
const CANONICAL = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "#343C54",
  strokeWidth: "1.5",
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

// Max path data length to reject illustrations
const MAX_PATH_LENGTH = 5000;
const MAX_PATH_COUNT = 50;

/**
 * Normalize any SVG to our canonical stroke-based style (24x24).
 * - Fill-based → converted to stroke outlines
 * - Wrong viewBox → normalized to 0 0 24 24
 * - Wrong stroke-width → normalized to 1.5
 * - Illustrations (too complex) → rejected
 */
function normalizeSvg(svgString) {
  // Step 1: Optimize with SVGO first
  const optimized = optimize(svgString, {
    multipass: true,
    plugins: [
      "preset-default",
      "removeDimensions",
      { name: "removeAttrs", params: { attrs: ["class", "style", "data-*"] } },
    ],
  });

  const svg = optimized.data || svgString;
  const $ = cheerio.load(svg, { xmlMode: true });
  const $svg = $("svg");

  // Step 2: Validate complexity — reject illustrations
  const paths = $("path, circle, rect, line, polyline, polygon, ellipse");
  if (paths.length > MAX_PATH_COUNT) {
    throw new Error(
      `SVG too complex (${paths.length} shapes). Max ${MAX_PATH_COUNT} allowed. Icons only, not illustrations.`
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

  // Step 3: Normalize viewBox
  $svg.attr("viewBox", CANONICAL.viewBox);
  $svg.removeAttr("width");
  $svg.removeAttr("height");
  $svg.attr("fill", CANONICAL.fill);
  $svg.attr("xmlns", "http://www.w3.org/2000/svg");
  $svg.removeAttr("transform");
  $svg.removeAttr("class");
  $svg.removeAttr("style");

  // Step 4: Detect if fill-based or stroke-based
  const isFillBased = detectFillBased($, paths);

  if (isFillBased) {
    // Convert fill-based to stroke-based
    convertFillToStroke($, paths);
  } else {
    // Already stroke-based — normalize attributes
    normalizeStrokeAttributes($, paths);
  }

  // Step 5: Remove any remaining unwanted attributes
  $svg.find("*").each((_, el) => {
    $(el).removeAttr("class");
    $(el).removeAttr("style");
    $(el).removeAttr("id");
  });

  // Step 6: Final SVGO pass
  const finalOptimized = optimize($.xml($svg), {
    multipass: true,
    plugins: ["preset-default", "removeDimensions"],
  });

  return finalOptimized.data;
}

/**
 * Detect if SVG is primarily fill-based
 */
function detectFillBased($, paths) {
  let fillCount = 0;
  let strokeCount = 0;

  paths.each((_, el) => {
    const fill = $(el).attr("fill");
    const stroke = $(el).attr("stroke");
    const strokeWidth = $(el).attr("stroke-width");

    if (fill && fill !== "none") fillCount++;
    if (stroke && stroke !== "none") strokeCount++;
    if (strokeWidth) strokeCount++;
  });

  return fillCount > strokeCount;
}

/**
 * Convert fill-based paths to stroke-based outlines
 */
function convertFillToStroke($, paths) {
  paths.each((_, el) => {
    const $el = $(el);
    const tagName = el.tagName || el.name;

    // Remove fill, add stroke
    $el.removeAttr("fill");
    $el.removeAttr("fill-rule");
    $el.removeAttr("clip-rule");
    $el.removeAttr("fill-opacity");

    $el.attr("stroke", CANONICAL.stroke);
    $el.attr("stroke-width", CANONICAL.strokeWidth);
    $el.attr("stroke-linecap", CANONICAL.strokeLinecap);
    $el.attr("stroke-linejoin", CANONICAL.strokeLinejoin);
    $el.attr("fill", "none");

    // Handle opacity groups — remove wrapper, keep children
    if (tagName === "g") {
      $el.removeAttr("opacity");
    }
  });

  // Also handle <g> wrappers
  $("g").each((_, el) => {
    $(el).removeAttr("opacity");
    $(el).removeAttr("fill");
  });
}

/**
 * Normalize existing stroke attributes to canonical values
 */
function normalizeStrokeAttributes($, paths) {
  paths.each((_, el) => {
    const $el = $(el);
    const stroke = $el.attr("stroke");
    const fill = $el.attr("fill");

    // Normalize stroke color to canonical
    if (stroke && stroke !== "none") {
      $el.attr("stroke", CANONICAL.stroke);
    }

    // Normalize stroke-width
    if ($el.attr("stroke-width")) {
      $el.attr("stroke-width", CANONICAL.strokeWidth);
    }

    // Ensure round caps and joins
    if ($el.attr("stroke-linecap")) {
      $el.attr("stroke-linecap", CANONICAL.strokeLinecap);
    }
    if ($el.attr("stroke-linejoin")) {
      $el.attr("stroke-linejoin", CANONICAL.strokeLinejoin);
    }

    // If element has fill that isn't "none", make it "none" for stroke style
    if (fill && fill !== "none") {
      $el.attr("fill", "none");
      // Add stroke if missing
      if (!stroke) {
        $el.attr("stroke", CANONICAL.stroke);
        $el.attr("stroke-width", CANONICAL.strokeWidth);
        $el.attr("stroke-linecap", CANONICAL.strokeLinecap);
        $el.attr("stroke-linejoin", CANONICAL.strokeLinejoin);
      }
    }
  });
}

module.exports = { normalizeSvg, CANONICAL };
