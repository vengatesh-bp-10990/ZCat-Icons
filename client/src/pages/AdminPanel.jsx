import { useState, useEffect, useCallback } from "react";
import { uploadIcon, analyzeIcon, fetchCategories, createCategory } from "../utils/api";
import Header from "../components/Header";

const STEPS = { UPLOAD: 0, ANALYZING: 1, REVIEW: 2, SAVING: 3, DONE: 4 };

export default function AdminPanel({ user, onLogout }) {
  const [categories, setCategories] = useState([]);
  const [step, setStep] = useState(STEPS.UPLOAD);
  const [file, setFile] = useState(null);
  const [originalSvgText, setOriginalSvgText] = useState("");
  const [dragActive, setDragActive] = useState(false);

  // Analysis results
  const [analysis, setAnalysis] = useState(null);
  const [analyzeError, setAnalyzeError] = useState("");

  // Editable fields (populated by AI, user can override)
  const [iconName, setIconName] = useState("");
  const [tags, setTags] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [newCategory, setNewCategory] = useState("");

  // Upload result
  const [uploadResult, setUploadResult] = useState(null);
  const [uploadError, setUploadError] = useState("");

  // Duplicate handling
  const [showDuplicates, setShowDuplicates] = useState(false);
  // Track which upload type triggered duplicate check
  const [pendingUploadType, setPendingUploadType] = useState(null);

  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => {});
  }, []);

  const resetForm = () => {
    setStep(STEPS.UPLOAD);
    setFile(null);
    setOriginalSvgText("");
    setAnalysis(null);
    setAnalyzeError("");
    setIconName("");
    setTags("");
    setCategoryId("");
    setNewCategory("");
    setUploadResult(null);
    setUploadError("");
    setShowDuplicates(false);
    setPendingUploadType(null);
  };

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  }, []);

  const handleFile = (f) => {
    if (!f || (!f.type.includes("svg") && !f.name.endsWith(".svg"))) return;
    setFile(f);
    // Read the raw SVG text for preview
    const reader = new FileReader();
    reader.onload = (e) => setOriginalSvgText(e.target.result);
    reader.readAsText(f);
    startAnalysis(f);
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const f = Array.from(e.dataTransfer.files).find((f) => f.type === "image/svg+xml" || f.name.endsWith(".svg"));
    if (f) handleFile(f);
  }, []);

  const startAnalysis = async (f) => {
    setStep(STEPS.ANALYZING);
    setAnalyzeError("");
    try {
      const formData = new FormData();
      formData.append("file", f);
      const result = await analyzeIcon(formData);
      setAnalysis(result);

      // Pre-fill fields from AI suggestion
      if (result.suggestion) {
        setIconName(result.suggestion.name || f.name.replace(".svg", ""));
        setTags((result.suggestion.tags || []).join(", "));
        // Match category
        if (result.suggestion.category) {
          const match = categories.find(
            (c) => c.name.toLowerCase() === result.suggestion.category.toLowerCase()
          );
          if (match) setCategoryId(match.ROWID);
          else setNewCategory(result.suggestion.category);
        }
      } else {
        setIconName(f.name.replace(".svg", ""));
      }
      setStep(STEPS.REVIEW);
    } catch (err) {
      setAnalyzeError(err.message);
      setIconName(f.name.replace(".svg", ""));
      setStep(STEPS.REVIEW);
    }
  };

  const handleUpload = async (skipDuplicate = false, useOriginal = false) => {
    if (!file || !iconName) return;

    // Check duplicates
    if (!skipDuplicate && analysis?.duplicates?.length > 0) {
      setPendingUploadType(useOriginal ? "original" : "ai");
      setShowDuplicates(true);
      return;
    }

    setStep(STEPS.SAVING);
    setUploadError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("name", iconName);
      if (categoryId) formData.append("category_id", categoryId);
      if (tags) formData.append("tags", tags);

      // If we have a new category, create it first
      if (newCategory && !categoryId) {
        try {
          const cat = await createCategory(newCategory.trim());
          setCategories((prev) => [...prev, cat]);
          formData.append("category_id", cat.ROWID);
        } catch {}
      }

      const result = await uploadIcon(formData, { skipAI: useOriginal });
      setUploadResult(result);
      setStep(STEPS.DONE);
    } catch (err) {
      setUploadError(err.message);
      setStep(STEPS.REVIEW);
    }
  };

  const SvgPreview = ({ svg, size = 48, className = "" }) => (
    <div
      className={`flex items-center justify-center ${className}`}
      dangerouslySetInnerHTML={{
        __html: (svg || "")
          .replace(/ width="[^"]*"/g, "")
          .replace(/ height="[^"]*"/g, "")
          .replace(/<svg/, `<svg width="${size}" height="${size}"`)
          .replace(/stroke="#[^"]*"/g, 'stroke="currentColor"')
          .replace(/fill="(?!none)[^"]*"/g, 'fill="currentColor"'),
      }}
    />
  );

  return (
    <div className="min-h-screen bg-zinc-950">
      <Header user={user} onLogout={onLogout} />

      <div className="max-w-2xl mx-auto px-6 py-8">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {["Drop SVG", "AI Analysis", "Review & Edit", "Upload"].map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div className={`flex items-center gap-1.5 ${i <= step ? "text-violet-400" : "text-zinc-700"}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold ${
                  i < step ? "bg-violet-600 text-white" : i === step ? "border-2 border-violet-500 text-violet-400" : "border border-zinc-700 text-zinc-700"
                }`}>
                  {i < step ? "✓" : i + 1}
                </div>
                <span className="text-[12px] font-medium hidden sm:block">{label}</span>
              </div>
              {i < 3 && <div className={`w-8 h-px ${i < step ? "bg-violet-600" : "bg-zinc-800"}`} />}
            </div>
          ))}
        </div>

        {/* Step 0: Upload */}
        {step === STEPS.UPLOAD && (
          <div className="animate-fadeIn">
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => document.getElementById("file-input").click()}
              className={`border-2 border-dashed rounded-xl p-16 text-center cursor-pointer transition-all ${
                dragActive ? "border-violet-500 bg-violet-500/5" : "border-zinc-800 hover:border-zinc-600"
              }`}
            >
              <input id="file-input" type="file" accept=".svg" onChange={(e) => handleFile(e.target.files[0])} className="hidden" />
              <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto mb-4">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#71717a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
              </div>
              <p className="text-[14px] text-zinc-400 mb-1">Drop an SVG file here</p>
              <p className="text-[12px] text-zinc-700">or click to browse · SVG only · max 1MB</p>
            </div>
          </div>
        )}

        {/* Step 1: Analyzing */}
        {step === STEPS.ANALYZING && (
          <div className="animate-fadeIn text-center py-16">
            <div className="w-14 h-14 rounded-2xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center mx-auto mb-4">
              <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            </div>
            <p className="text-[14px] text-zinc-300 mb-1">Analyzing your icon...</p>
            <p className="text-[12px] text-zinc-600">AI is suggesting metadata and processing the SVG</p>
          </div>
        )}

        {/* Step 2: Review */}
        {step === STEPS.REVIEW && (
          <div className="animate-fadeIn space-y-5">
            {analyzeError && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-4 py-3 text-[12px] text-amber-400 flex items-start gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 shrink-0"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                AI analysis partially failed: {analyzeError}. You can still fill in details manually.
              </div>
            )}

            {/* Preview comparison — Original is primary (left, larger), AI is secondary (right, smaller) */}
            <div className="grid grid-cols-5 gap-4">
              <div className="col-span-3 bg-zinc-900 rounded-lg border-2 border-zinc-700 p-5">
                <p className="text-[11px] text-zinc-300 uppercase tracking-wider mb-3 font-semibold">Your Original</p>
                <div className="aspect-square flex items-center justify-center">
                  <SvgPreview svg={originalSvgText || analysis?.originalSvg || ""} size={80} className="text-zinc-300" />
                </div>
              </div>
              <div className="col-span-2 bg-zinc-900/60 rounded-lg border border-zinc-800/50 p-4">
                <p className="text-[11px] text-zinc-500 uppercase tracking-wider mb-3 flex items-center gap-1">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
                  AI Version
                </p>
                <div className="aspect-square flex items-center justify-center">
                  {analysis?.processedSvg ? (
                    <SvgPreview svg={analysis.processedSvg} size={56} className="text-zinc-400" />
                  ) : (
                    <p className="text-[11px] text-zinc-600">N/A</p>
                  )}
                </div>
              </div>
            </div>

            {/* Duplicates warning */}
            {analysis?.duplicates?.length > 0 && (
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                  <p className="text-[13px] text-amber-400 font-medium">Similar icons found</p>
                </div>
                <div className="flex gap-3 flex-wrap">
                  {analysis.duplicates.map((dup) => (
                    <div key={dup.ROWID} className="flex items-center gap-2 bg-zinc-900 rounded-md px-3 py-2 border border-zinc-800/50">
                      <SvgPreview svg={dup.svg_code} size={20} className="text-zinc-400" />
                      <span className="text-[12px] text-zinc-400">{dup.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Form */}
            <div className="space-y-3">
              <div>
                <label className="text-[11px] text-zinc-500 uppercase tracking-wider block mb-1.5">
                  Icon Name {analysis?.suggestion && <span className="text-violet-400 normal-case tracking-normal">· AI suggested</span>}
                </label>
                <input type="text" value={iconName} onChange={(e) => setIconName(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-[13px] text-zinc-200 focus:outline-none focus:border-zinc-600"
                  placeholder="e.g., cloud-download"
                />
              </div>

              <div>
                <label className="text-[11px] text-zinc-500 uppercase tracking-wider block mb-1.5">
                  Tags {analysis?.suggestion && <span className="text-violet-400 normal-case tracking-normal">· AI suggested</span>}
                </label>
                <input type="text" value={tags} onChange={(e) => setTags(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-[13px] text-zinc-200 focus:outline-none focus:border-zinc-600"
                  placeholder="cloud, download, storage"
                />
              </div>

              <div>
                <label className="text-[11px] text-zinc-500 uppercase tracking-wider block mb-1.5">
                  Category {analysis?.suggestion?.category && <span className="text-violet-400 normal-case tracking-normal">· AI suggested: {analysis.suggestion.category}</span>}
                </label>
                <div className="flex gap-2">
                  <select value={categoryId} onChange={(e) => { setCategoryId(e.target.value); setNewCategory(""); }}
                    className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-[13px] text-zinc-200 focus:outline-none focus:border-zinc-600"
                  >
                    <option value="">No category</option>
                    {categories.map((cat) => (
                      <option key={cat.ROWID} value={cat.ROWID}>{cat.name}</option>
                    ))}
                  </select>
                  <input type="text" value={newCategory} onChange={(e) => { setNewCategory(e.target.value); setCategoryId(""); }}
                    placeholder="or new category"
                    className="w-40 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-[13px] text-zinc-200 focus:outline-none focus:border-zinc-600"
                  />
                </div>
              </div>
            </div>

            {uploadError && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-[12px] text-red-400">
                {uploadError}
              </div>
            )}

            {/* Actions — Original is primary, AI is secondary */}
            <div className="flex gap-3 pt-2">
              <button onClick={resetForm}
                className="px-4 py-2.5 rounded-lg text-[13px] text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 border border-zinc-800"
              >Start Over</button>
              <button onClick={() => handleUpload(false, true)} disabled={!iconName}
                className="flex-1 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-[13px] font-medium py-2.5 rounded-lg flex items-center justify-center gap-2"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                Upload Original
              </button>
              {analysis?.processedSvg && (
                <button onClick={() => handleUpload(false, false)} disabled={!iconName}
                  className="px-4 py-2.5 rounded-lg text-[13px] font-medium text-violet-400 hover:text-violet-300 border border-violet-500/30 hover:border-violet-500/50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
                  Upload AI Version
                </button>
              )}
            </div>

            {/* Duplicate modal */}
            {showDuplicates && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="fixed inset-0 bg-black/60" onClick={() => setShowDuplicates(false)} />
                <div className="relative bg-zinc-950 rounded-xl border border-zinc-800 p-6 max-w-md w-full animate-slideUp">
                  <h3 className="text-[15px] font-semibold text-zinc-100 mb-3">Similar icons exist</h3>
                  <div className="space-y-2 mb-5">
                    {analysis.duplicates.map((dup) => (
                      <div key={dup.ROWID} className="flex items-center gap-3 bg-zinc-900 rounded-lg p-3 border border-zinc-800/50">
                        <SvgPreview svg={dup.svg_code} size={28} className="text-zinc-400 shrink-0" />
                        <div>
                          <p className="text-[13px] text-zinc-300">{dup.name}</p>
                          <p className="text-[11px] text-zinc-600">{dup.slug}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setShowDuplicates(false)}
                      className="flex-1 px-4 py-2 rounded-lg text-[13px] text-zinc-400 hover:text-zinc-200 bg-zinc-900 border border-zinc-800"
                    >Cancel</button>
                    <button onClick={() => { setShowDuplicates(false); handleUpload(true, pendingUploadType === "original"); }}
                      className="flex-1 px-4 py-2 rounded-lg text-[13px] font-medium text-white bg-violet-600 hover:bg-violet-700"
                    >Upload Anyway</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Saving */}
        {step === STEPS.SAVING && (
          <div className="animate-fadeIn text-center py-16">
            <div className="w-14 h-14 rounded-2xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center mx-auto mb-4">
              <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            </div>
            <p className="text-[14px] text-zinc-300 mb-1">Uploading...</p>
            <p className="text-[12px] text-zinc-600">Generating variants and saving</p>
          </div>
        )}

        {/* Step 4: Done */}
        {step === STEPS.DONE && uploadResult && (
          <div className="animate-fadeIn text-center py-12">
            <div className="w-14 h-14 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <p className="text-[16px] font-semibold text-zinc-200 mb-1">Uploaded successfully!</p>
            <p className="text-[13px] text-zinc-500 mb-2">{uploadResult.icon?.name}</p>
            <p className="text-[12px] text-zinc-600 mb-6">
              {uploadResult.variants?.length} variant{uploadResult.variants?.length !== 1 ? "s" : ""} generated
            </p>
            <button onClick={resetForm}
              className="px-6 py-2.5 rounded-lg text-[13px] font-medium bg-violet-600 hover:bg-violet-700 text-white"
            >Upload Another</button>
          </div>
        )}
      </div>
    </div>
  );
}
