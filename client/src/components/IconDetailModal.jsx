import { useState, useMemo } from "react";
import { transformSvg, svgToReact, svgToVue, svgToBase64, copyToClipboard } from "../utils/svgHelpers";
import { getDownloadUrl, deleteIcon } from "../utils/api";

const SIZES = [16, 24, 32, 48, 64, 128, 256];
const FORMATS = [
  { label: "SVG", format: "svg" },
  { label: "PNG", format: "png" },
  { label: "WEBP", format: "webp" },
];

export default function IconDetailModal({ icon, onClose, onDelete, isAdmin }) {
  const [color, setColor] = useState("#FFFFFF");
  const [size, setSize] = useState(64);
  const [codeTab, setCodeTab] = useState("SVG");
  const [copied, setCopied] = useState("");
  const [activeStyle, setActiveStyle] = useState("outlined");

  const availableStyles = useMemo(() => {
    if (!icon.variants) return ["outlined"];
    return icon.variants.map((v) => v.style);
  }, [icon.variants]);

  const currentVariant = useMemo(() => {
    if (!icon.variants) return null;
    return icon.variants.find((v) => v.style === activeStyle) ||
      icon.variants.find((v) => v.style === "outlined") ||
      icon.variants[0];
  }, [icon.variants, activeStyle]);

  const rawSvg = currentVariant?.svg_code || "";
  const previewSvg = useMemo(() => transformSvg(rawSvg, { color, size }), [rawSvg, color, size]);

  const codeOutput = useMemo(() => {
    const svg = transformSvg(rawSvg, { color, size: 24 });
    switch (codeTab) {
      case "React": return svgToReact(svg, toPascalCase(icon.name || "Icon"));
      case "Vue": return svgToVue(svg, toPascalCase(icon.name || "Icon"));
      default: return svg;
    }
  }, [rawSvg, codeTab, color, icon.name]);

  const handleCopy = async (text, label) => {
    await copyToClipboard(text);
    setCopied(label);
    setTimeout(() => setCopied(""), 1500);
  };

  const handleDownload = (format) => {
    const url = getDownloadUrl(icon.ROWID, { style: activeStyle, format, size, color: color !== "#FFFFFF" ? color : undefined });
    window.open(url, "_blank");
  };

  const handleDelete = async () => {
    if (!confirm(`Delete "${icon.name}"? This cannot be undone.`)) return;
    try {
      await deleteIcon(icon.ROWID);
      onDelete?.(icon.ROWID);
      onClose();
    } catch (err) {
      alert("Failed to delete: " + err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-zinc-950 w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-xl border border-zinc-800 shadow-2xl animate-slideUp">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800/50">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 text-zinc-300 flex items-center justify-center"
              dangerouslySetInnerHTML={{
                __html: transformSvg(rawSvg, { color: "#e4e4e7", size: 32 }),
              }}
            />
            <div>
              <h2 className="text-[15px] font-semibold text-zinc-100">{icon.name}</h2>
              {icon.tags && <p className="text-[11px] text-zinc-600">{icon.tags}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <button
                onClick={handleDelete}
                className="text-[12px] text-red-400/70 hover:text-red-400 hover:bg-red-500/10 px-2.5 py-1.5 rounded-md"
              >
                Delete
              </button>
            )}
            <button onClick={onClose} className="text-zinc-600 hover:text-zinc-300 w-7 h-7 flex items-center justify-center rounded-md hover:bg-zinc-800">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_260px] divide-x divide-zinc-800/50">
          {/* Preview */}
          <div className="p-5">
            <div className="bg-zinc-900/50 rounded-lg border border-zinc-800/30 p-8 flex items-center justify-center mb-4 aspect-square max-h-52">
              <div dangerouslySetInnerHTML={{ __html: previewSvg }} />
            </div>

            {/* Style switcher */}
            {availableStyles.length > 1 && (
              <div className="flex gap-1 bg-zinc-900 rounded-md p-0.5 mb-4">
                {availableStyles.map((style) => (
                  <button key={style} onClick={() => setActiveStyle(style)}
                    className={`flex-1 py-1.5 rounded text-[11px] font-medium capitalize ${activeStyle === style ? "bg-zinc-800 text-zinc-200" : "text-zinc-600 hover:text-zinc-400"}`}
                  >{style}</button>
                ))}
              </div>
            )}

            {/* Controls */}
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <label className="text-[11px] text-zinc-600 uppercase tracking-wide">Color</label>
                <div className="relative flex items-center gap-1.5">
                  <input type="color" value={color} onChange={(e) => setColor(e.target.value)}
                    className="w-6 h-6 rounded border border-zinc-700 cursor-pointer appearance-none bg-transparent [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded [&::-webkit-color-swatch]:border-none"
                  />
                  <input type="text" value={color} onChange={(e) => setColor(e.target.value)}
                    className="w-[72px] bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-[11px] text-zinc-300 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-[11px] text-zinc-600 uppercase tracking-wide">Size</label>
                <select value={size} onChange={(e) => setSize(parseInt(e.target.value))}
                  className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-[11px] text-zinc-300"
                >
                  {SIZES.map((s) => <option key={s} value={s}>{s}px</option>)}
                </select>
              </div>

              <button onClick={() => { setColor("#FFFFFF"); setSize(64); }}
                className="text-[11px] text-zinc-600 hover:text-zinc-400 ml-auto"
              >Reset</button>
            </div>
          </div>

          {/* Code & Download */}
          <div className="p-4 flex flex-col gap-3">
            {/* Code tabs */}
            <div className="flex gap-1 bg-zinc-900 rounded-md p-0.5">
              {["SVG", "React", "Vue"].map((tab) => (
                <button key={tab} onClick={() => setCodeTab(tab)}
                  className={`flex-1 py-1.5 rounded text-[11px] font-medium ${codeTab === tab ? "bg-zinc-800 text-zinc-200" : "text-zinc-600 hover:text-zinc-400"}`}
                >{tab}</button>
              ))}
            </div>

            <div className="bg-zinc-900 rounded-md p-3 border border-zinc-800/50 max-h-32 overflow-auto">
              <pre className="text-[10px] text-zinc-500 whitespace-pre-wrap break-all font-mono leading-relaxed">
                {codeOutput.substring(0, 600)}{codeOutput.length > 600 ? "..." : ""}
              </pre>
            </div>

            <button onClick={() => handleCopy(codeOutput, "code")}
              className="w-full bg-violet-600 hover:bg-violet-700 text-white text-[12px] font-medium py-2 rounded-md"
            >{copied === "code" ? "Copied!" : `Copy ${codeTab}`}</button>

            {/* Downloads */}
            <p className="text-[11px] text-zinc-600 uppercase tracking-wide mt-1">Download</p>
            <div className="grid grid-cols-3 gap-1.5">
              {FORMATS.map(({ label, format }) => (
                <button key={format} onClick={() => handleDownload(format)}
                  className="bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 text-[11px] font-medium py-2 rounded-md border border-zinc-800/50"
                >{label}</button>
              ))}
            </div>

            {/* Quick copy */}
            <button onClick={() => handleCopy(svgToBase64(previewSvg), "b64")}
              className="w-full bg-zinc-900 hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 text-[11px] py-2 rounded-md border border-zinc-800/50"
            >{copied === "b64" ? "Copied!" : "Copy Base64"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function toPascalCase(str) {
  return str.replace(/[-_\s]+/g, " ").split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join("");
}
