import { useState, useMemo } from "react";
import { HexColorPicker } from "react-colorful";
import { transformSvg, svgToReact, svgToVue, svgToBase64, copyToClipboard } from "../utils/svgHelpers";
import { getDownloadUrl } from "../utils/api";

const STYLES = ["outlined", "solid", "duotone"];
const SIZES = [16, 24, 32, 48, 64, 80, 128, 256, 512];
const CODE_TABS = ["SVG", "HTML", "REACT", "VUE"];
const DOWNLOAD_FORMATS = [
  { label: "SVG", format: "svg" },
  { label: "PNG", format: "png" },
  { label: "JPEG", format: "jpeg" },
  { label: "WEBP", format: "webp" },
];

export default function IconDetailModal({ icon, onClose }) {
  const [activeStyle, setActiveStyle] = useState("outlined");
  const [color, setColor] = useState("#343C54");
  const [size, setSize] = useState(80);
  const [rotate, setRotate] = useState(0);
  const [codeTab, setCodeTab] = useState("SVG");
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [copied, setCopied] = useState("");

  // Get current variant SVG
  const currentVariant = useMemo(() => {
    if (!icon.variants) return null;
    return icon.variants.find((v) => v.style === activeStyle) || icon.variants[0];
  }, [icon.variants, activeStyle]);

  const rawSvg = currentVariant?.svg_code || "";

  // Transform SVG with current settings
  const previewSvg = useMemo(
    () => transformSvg(rawSvg, { color, size, rotate }),
    [rawSvg, color, size, rotate]
  );

  // Generate code for each tab
  const codeOutput = useMemo(() => {
    const svg = transformSvg(rawSvg, { color, size: 24 });
    switch (codeTab) {
      case "SVG":
        return svg;
      case "HTML":
        return svg;
      case "REACT":
        return svgToReact(svg, toPascalCase(icon.name || "Icon"));
      case "VUE":
        return svgToVue(svg, toPascalCase(icon.name || "Icon"));
      default:
        return svg;
    }
  }, [rawSvg, codeTab, color, icon.name]);

  const handleCopy = async (text, label) => {
    await copyToClipboard(text);
    setCopied(label);
    setTimeout(() => setCopied(""), 2000);
  };

  const handleReset = () => {
    setColor("#343C54");
    setSize(80);
    setRotate(0);
    setActiveStyle("outlined");
  };

  const handleDownload = (format) => {
    const url = getDownloadUrl(icon.ROWID, {
      style: activeStyle,
      format,
      size,
      color: color !== "#343C54" ? color : undefined,
    });
    window.open(url, "_blank");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-[#1a1a2e] w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-zinc-800 shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-500 hover:text-white w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-800 transition-colors z-10"
        >
          &times;
        </button>

        <div className="p-6">
          {/* Icon Info */}
          <div className="flex items-start gap-4 mb-6">
            <span className="text-lg font-semibold text-white">{icon.name}</span>
            {icon.tags && (
              <span className="text-xs text-zinc-500 mt-1">
                {icon.tags}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6">
            {/* Left: Preview */}
            <div>
              {/* Large Preview */}
              <div className="bg-[#0f0f11] rounded-xl p-8 flex items-center justify-center mb-4 border border-zinc-800">
                <div
                  dangerouslySetInnerHTML={{ __html: previewSvg }}
                  className="flex items-center justify-center"
                />
              </div>

              {/* Style Switcher */}
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs text-zinc-500 mr-2">Style</span>
                {STYLES.map((style) => {
                  const hasVariant = icon.variants?.some((v) => v.style === style);
                  return (
                    <button
                      key={style}
                      onClick={() => hasVariant && setActiveStyle(style)}
                      disabled={!hasVariant}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                        activeStyle === style
                          ? "bg-purple-600 text-white"
                          : hasVariant
                          ? "bg-zinc-800 text-zinc-400 hover:text-white"
                          : "bg-zinc-900 text-zinc-700 cursor-not-allowed"
                      }`}
                    >
                      {style}
                    </button>
                  );
                })}
              </div>

              {/* Controls Row */}
              <div className="flex flex-wrap items-center gap-4 mb-4">
                {/* Color */}
                <div className="relative">
                  <label className="text-xs text-zinc-500 block mb-1">Color</label>
                  <button
                    onClick={() => setShowColorPicker(!showColorPicker)}
                    className="flex items-center gap-2 bg-zinc-800 rounded-lg px-3 py-1.5"
                  >
                    <div
                      className="w-4 h-4 rounded-full border border-zinc-600"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-xs text-zinc-300">{color}</span>
                  </button>
                  {showColorPicker && (
                    <div className="absolute top-full left-0 mt-2 z-20">
                      <div
                        className="fixed inset-0"
                        onClick={() => setShowColorPicker(false)}
                      />
                      <div className="relative bg-[#0f0f11] rounded-xl p-3 border border-zinc-700 shadow-xl">
                        <HexColorPicker color={color} onChange={setColor} />
                        <input
                          type="text"
                          value={color}
                          onChange={(e) => setColor(e.target.value)}
                          className="w-full mt-2 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-white text-center"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Size */}
                <div>
                  <label className="text-xs text-zinc-500 block mb-1">Icon Size</label>
                  <select
                    value={size}
                    onChange={(e) => setSize(parseInt(e.target.value))}
                    className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white"
                  >
                    {SIZES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                {/* Rotate */}
                <div>
                  <label className="text-xs text-zinc-500 block mb-1">Rotate</label>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setRotate((r) => r - 90)}
                      className="bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-lg w-8 h-8 flex items-center justify-center text-sm"
                    >
                      &#8634;
                    </button>
                    <button
                      onClick={() => setRotate((r) => r + 90)}
                      className="bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-lg w-8 h-8 flex items-center justify-center text-sm"
                    >
                      &#8635;
                    </button>
                    {rotate !== 0 && (
                      <span className="text-xs text-zinc-500 ml-1">{rotate}&deg;</span>
                    )}
                  </div>
                </div>

                {/* Reset */}
                <button
                  onClick={handleReset}
                  className="text-xs text-zinc-500 hover:text-white mt-4 transition-colors"
                >
                  Reset All
                </button>
              </div>
            </div>

            {/* Right: Code & Download */}
            <div className="w-full lg:w-72">
              {/* Code Tabs */}
              <div className="flex items-center gap-1 mb-2">
                {CODE_TABS.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setCodeTab(tab)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                      codeTab === tab
                        ? "bg-purple-600/20 text-purple-400"
                        : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Code Preview */}
              <div className="bg-[#0f0f11] rounded-lg p-3 mb-3 border border-zinc-800 max-h-40 overflow-auto">
                <pre className="text-[10px] text-zinc-400 whitespace-pre-wrap break-all font-mono">
                  {codeOutput.substring(0, 500)}{codeOutput.length > 500 ? "..." : ""}
                </pre>
              </div>

              {/* Copy Button */}
              <button
                onClick={() => handleCopy(codeOutput, "code")}
                className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs py-2 rounded-lg mb-4 transition-colors"
              >
                {copied === "code" ? "Copied!" : `Copy ${codeTab}`}
              </button>

              {/* Download Buttons */}
              <h4 className="text-xs text-zinc-500 font-semibold mb-2">Copy / Download</h4>
              <div className="grid grid-cols-2 gap-2 mb-3">
                {DOWNLOAD_FORMATS.map(({ label, format }) => (
                  <div key={format} className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        if (format === "svg") {
                          handleCopy(previewSvg, format);
                        }
                      }}
                      className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-xs py-1.5 rounded-l-lg transition-colors"
                    >
                      {copied === format ? "Copied!" : label}
                    </button>
                    <button
                      onClick={() => handleDownload(format)}
                      className="bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-xs py-1.5 px-2 rounded-r-lg transition-colors border-l border-zinc-700"
                    >
                      &darr;
                    </button>
                  </div>
                ))}
              </div>

              {/* Base64 */}
              <button
                onClick={() => handleCopy(svgToBase64(previewSvg), "base64")}
                className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-xs py-2 rounded-lg transition-colors"
              >
                {copied === "base64" ? "Copied!" : "Base64 String"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function toPascalCase(str) {
  return str
    .replace(/[-_\s]+/g, " ")
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("");
}
