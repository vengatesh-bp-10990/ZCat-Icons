/**
 * Apply color and size to an SVG string for preview/copy
 */
export function transformSvg(svgString, { color, size, rotate } = {}) {
  let svg = svgString;

  if (color) {
    svg = svg.replace(/stroke="[^"]*"/g, `stroke="${color}"`);
    svg = svg.replace(/fill="(?!none)[^"]*"/g, `fill="${color}"`);
  }

  if (size) {
    // Remove existing width/height, add new ones
    // Use leading space to avoid matching stroke-width, stroke-height etc.
    svg = svg.replace(/ width="[^"]*"/g, "");
    svg = svg.replace(/ height="[^"]*"/g, "");
    svg = svg.replace(/<svg/, `<svg width="${size}" height="${size}"`);
  }

  if (rotate) {
    svg = svg.replace(
      /transform="[^"]*"/g,
      ""
    );
    svg = svg.replace(
      /<svg/,
      `<svg transform="rotate(${rotate} 0 0)"`
    );
  }

  return svg;
}

/**
 * Convert SVG string to various code formats
 */
export function svgToReact(svgString, componentName = "Icon") {
  let jsx = svgString
    .replace(/class=/g, "className=")
    .replace(/stroke-width=/g, "strokeWidth=")
    .replace(/stroke-linecap=/g, "strokeLinecap=")
    .replace(/stroke-linejoin=/g, "strokeLinejoin=")
    .replace(/fill-rule=/g, "fillRule=")
    .replace(/clip-rule=/g, "clipRule=")
    .replace(/xmlns:xlink=/g, "xmlnsXlink=");

  return `const ${componentName} = (props) => (\n  ${jsx}\n);\n\nexport default ${componentName};`;
}

export function svgToVue(svgString, componentName = "Icon") {
  return `<template>\n  ${svgString}\n</template>\n\n<script>\nexport default {\n  name: '${componentName}',\n};\n</script>`;
}

export function svgToHtml(svgString) {
  return svgString;
}

export function svgToBase64(svgString) {
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgString)))}`;
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
    return true;
  }
}
