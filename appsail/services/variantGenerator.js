const cheerio = require("cheerio");
const { optimize } = require("svgo");
const { CANONICAL } = require("./normalizer");

const SVGO_CONFIG = {
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
  ],
};

/**
 * Generate 3 style variants from a normalized SVG.
 * Branches based on type: "stroke" or "fill".
 *
 * STROKE-BASED icons:
 *   outlined = stroke paths (the normalized input)
 *   solid    = strokes converted to fills
 *   duotone  = largest path filled at 0.4 opacity + remaining strokes at full
 *
 * FILL-BASED icons:
 *   outlined = fill with fill-rule="evenodd" (creates holes/outlines)
 *   solid    = plain fill (no fill-rule, everything solid)
 *   duotone  = largest path at 0.4 opacity, rest at full opacity
 */
function generateVariants(normalizedSvg, type) {
  if (type === "stroke") {
    return {
      outlined: normalizedSvg,
      solid: strokeToSolid(normalizedSvg),
      duotone: strokeToDuotone(normalizedSvg),
    };
  }
  // fill-based
  return {
    outlined: fillOutlined(normalizedSvg),
    solid: fillSolid(normalizedSvg),
    duotone: fillDuotone(normalizedSvg),
  };
}

// ─── STROKE-BASED VARIANTS ────────────────────────────────────────────

/**
 * SOLID from stroke: Convert stroke paths to filled paths.
 * Remove stroke attributes, set fill to canonical color.
 */
function strokeToSolid(svgString) {
  const $ = cheerio.load(svgString, { xmlMode: true });
  const $svg = $("svg");
  $svg.attr("fill", "none");
  // Remove any root-level stroke attrs
  $svg.removeAttr("stroke");
  $svg.removeAttr("stroke-width");
  $svg.removeAttr("stroke-linecap");
  $svg.removeAttr("stroke-linejoin");

  const shapes = $svg.find("path, circle, rect, line, polyline, polygon, ellipse");

  shapes.each((_, el) => {
    const $el = $(el);
    $el.attr("fill", CANONICAL.color);
    $el.removeAttr("stroke");
    $el.removeAttr("stroke-width");
    $el.removeAttr("stroke-linecap");
    $el.removeAttr("stroke-linejoin");
  });

  return optimize($.xml($svg), SVGO_CONFIG).data;
}

/**
 * DUOTONE from stroke: Largest path filled at opacity 0.4,
 * remaining paths keep strokes at full opacity.
 */
function strokeToDuotone(svgString) {
  const $ = cheerio.load(svgString, { xmlMode: true });
  const $svg = $("svg");
  $svg.attr("fill", "none");
  $svg.removeAttr("stroke");
  $svg.removeAttr("stroke-width");
  $svg.removeAttr("stroke-linecap");
  $svg.removeAttr("stroke-linejoin");

  const shapes = $svg.find("path, circle, rect, line, polyline, polygon, ellipse").toArray();

  if (shapes.length === 0) return svgString;

  if (shapes.length === 1) {
    // Single path — can't split meaningfully, use filled at 0.4 + stroke at full
    const $path = $(shapes[0]);
    const d = $path.attr("d") || "";

    $svg.empty();

    // Background: filled at 0.4
    const $bg = $("<path/>");
    $bg.attr("d", d);
    $bg.attr("fill", CANONICAL.color);
    $bg.attr("opacity", "0.4");
    $svg.append($bg);

    // Foreground: stroke at full opacity
    const $fg = $("<path/>");
    $fg.attr("d", d);
    $fg.attr("stroke", CANONICAL.color);
    $fg.attr("stroke-width", CANONICAL.strokeWidth);
    $fg.attr("stroke-linecap", CANONICAL.strokeLinecap);
    $fg.attr("stroke-linejoin", CANONICAL.strokeLinejoin);
    $fg.attr("fill", "none");
    $svg.append($fg);

    return optimize($.xml($svg), SVGO_CONFIG).data;
  }

  // Multi-path: sort by path data length (longest = background)
  const sorted = shapes
    .map((el) => ({ el, len: ($(el).attr("d") || "").length }))
    .sort((a, b) => b.len - a.len);

  $svg.empty();

  sorted.forEach((item, i) => {
    const $el = $(item.el).clone();

    if (i === 0) {
      // Largest path → filled at 0.4 opacity (background)
      $el.attr("fill", CANONICAL.color);
      $el.attr("opacity", "0.4");
      $el.removeAttr("stroke");
      $el.removeAttr("stroke-width");
      $el.removeAttr("stroke-linecap");
      $el.removeAttr("stroke-linejoin");
    }
    // Rest keep their stroke attributes (foreground)

    $svg.append($el);
  });

  return optimize($.xml($svg), SVGO_CONFIG).data;
}

// ─── FILL-BASED VARIANTS ──────────────────────────────────────────────

/**
 * OUTLINED from fill: Add fill-rule="evenodd" + clip-rule="evenodd"
 * so overlapping sub-paths create holes (outline effect).
 */
function fillOutlined(svgString) {
  const $ = cheerio.load(svgString, { xmlMode: true });
  const $svg = $("svg");
  $svg.attr("fill", "none");

  const shapes = $svg.find("path, circle, rect, polygon, ellipse");

  shapes.each((_, el) => {
    const $el = $(el);
    $el.removeAttr("opacity");

    const fill = $el.attr("fill");
    if (!fill || fill === "none") {
      $el.attr("fill", CANONICAL.color);
    }

    $el.attr("fill-rule", "evenodd");
    $el.attr("clip-rule", "evenodd");
  });

  unwrapGroups($, $svg);
  return optimize($.xml($svg), SVGO_CONFIG).data;
}

/**
 * SOLID from fill: Plain fill without fill-rule.
 * All sub-paths fill completely — no holes.
 */
function fillSolid(svgString) {
  const $ = cheerio.load(svgString, { xmlMode: true });
  const $svg = $("svg");
  $svg.attr("fill", "none");

  const shapes = $svg.find("path, circle, rect, polygon, ellipse");

  shapes.each((_, el) => {
    const $el = $(el);
    $el.removeAttr("fill-rule");
    $el.removeAttr("clip-rule");
    $el.removeAttr("opacity");

    const fill = $el.attr("fill");
    if (!fill || fill === "none") {
      $el.attr("fill", CANONICAL.color);
    }
  });

  unwrapGroups($, $svg);
  return optimize($.xml($svg), SVGO_CONFIG).data;
}

/**
 * DUOTONE from fill: Largest path at 0.4 opacity, rest at full.
 */
function fillDuotone(svgString) {
  const $ = cheerio.load(svgString, { xmlMode: true });
  const $svg = $("svg");
  $svg.attr("fill", "none");

  unwrapGroups($, $svg);
  const shapes = $svg.find("path, circle, rect, polygon, ellipse").toArray();

  if (shapes.length === 0) return svgString;

  if (shapes.length === 1) {
    return fillDuotoneFromSinglePath($, $svg, shapes[0]);
  }

  // Multi-path: sort by path data length (longest = background)
  const sorted = shapes
    .map((el) => ({ el, len: ($(el).attr("d") || "").length }))
    .sort((a, b) => b.len - a.len);

  $svg.empty();

  sorted.forEach((item, i) => {
    const $el = $(item.el).clone();
    $el.removeAttr("fill-rule");
    $el.removeAttr("clip-rule");

    const fill = $el.attr("fill");
    if (!fill || fill === "none") {
      $el.attr("fill", CANONICAL.color);
    }

    if (i === 0 && sorted.length > 1) {
      $el.attr("opacity", "0.4");
    } else {
      $el.removeAttr("opacity");
    }

    $svg.append($el);
  });

  return optimize($.xml($svg), SVGO_CONFIG).data;
}

/**
 * For a single-path fill SVG, split sub-paths into bg (0.4) and fg (full).
 */
function fillDuotoneFromSinglePath($, $svg, pathEl) {
  const $path = $(pathEl);
  const d = $path.attr("d") || "";
  const subPaths = splitSubPaths(d);

  if (subPaths.length <= 1) {
    $path.removeAttr("fill-rule");
    $path.removeAttr("clip-rule");
    $path.removeAttr("opacity");
    const fill = $path.attr("fill");
    if (!fill || fill === "none") {
      $path.attr("fill", CANONICAL.color);
    }
    return optimize($.xml($svg), SVGO_CONFIG).data;
  }

  const sorted = subPaths.sort((a, b) => b.length - a.length);

  $svg.empty();

  const $bg = $("<path/>");
  $bg.attr("opacity", "0.4");
  $bg.attr("d", sorted[0]);
  $bg.attr("fill", CANONICAL.color);
  $svg.append($bg);

  const $fg = $("<path/>");
  $fg.attr("d", sorted.slice(1).join(" "));
  $fg.attr("fill", CANONICAL.color);
  $svg.append($fg);

  return optimize($.xml($svg), SVGO_CONFIG).data;
}

// ─── HELPERS ──────────────────────────────────────────────────────────

function splitSubPaths(d) {
  const subPaths = [];
  const regex = /M[^M]*/gi;
  let match;
  while ((match = regex.exec(d)) !== null) {
    subPaths.push(match[0].trim());
  }
  return subPaths;
}

function unwrapGroups($, $svg) {
  $svg.find("g").each((_, gEl) => {
    const $g = $(gEl);
    const groupOpacity = $g.attr("opacity");

    $g.children().each((_, child) => {
      const $child = $(child);
      if (groupOpacity) {
        $child.attr("opacity", groupOpacity);
      }
      $g.before($child);
    });

    $g.remove();
  });
}

module.exports = { generateVariants };
