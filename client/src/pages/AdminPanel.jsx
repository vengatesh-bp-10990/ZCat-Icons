import { useState, useEffect, useCallback } from "react";
import { uploadIcon, fetchCategories, createCategory } from "../utils/api";
import Header from "../components/Header";

export default function AdminPanel({ user, onLogout }) {
  const [categories, setCategories] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [uploadError, setUploadError] = useState("");
  const [newCategory, setNewCategory] = useState("");

  // Form state
  const [iconName, setIconName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [tags, setTags] = useState("");
  const [files, setFiles] = useState([]);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    fetchCategories()
      .then(setCategories)
      .catch(() => {});
  }, []);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const droppedFiles = Array.from(e.dataTransfer.files).filter((f) =>
      f.type === "image/svg+xml" || f.name.endsWith(".svg")
    );
    if (droppedFiles.length) {
      setFiles(droppedFiles);
      if (!iconName && droppedFiles.length === 1) {
        setIconName(droppedFiles[0].name.replace(".svg", ""));
      }
    }
  }, [iconName]);

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files).filter((f) =>
      f.type === "image/svg+xml" || f.name.endsWith(".svg")
    );
    setFiles(selectedFiles);
    if (!iconName && selectedFiles.length === 1) {
      setIconName(selectedFiles[0].name.replace(".svg", ""));
    }
  };

  const handleUpload = async () => {
    if (!files.length || !iconName) return;

    setUploading(true);
    setUploadError("");
    setUploadResult(null);

    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("name", files.length === 1 ? iconName : file.name.replace(".svg", ""));
        if (categoryId) formData.append("category_id", categoryId);
        if (tags) formData.append("tags", tags);

        const result = await uploadIcon(formData);
        setUploadResult(result);
      }

      // Reset form
      setFiles([]);
      setIconName("");
      setTags("");
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategory.trim()) return;
    try {
      const cat = await createCategory(newCategory.trim());
      setCategories((prev) => [...prev, cat]);
      setNewCategory("");
    } catch (err) {
      setUploadError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0f11]">
      <Header user={user} onLogout={onLogout} />

      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-bold text-white mb-6">Admin Panel</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upload Section */}
          <div className="bg-[#1a1a2e] rounded-2xl p-6 border border-zinc-800">
            <h2 className="text-lg font-semibold text-white mb-4">Upload Icons</h2>

            {/* Drop Zone */}
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
                dragActive
                  ? "border-purple-500 bg-purple-500/10"
                  : "border-zinc-700 hover:border-zinc-500"
              }`}
              onClick={() => document.getElementById("file-input").click()}
            >
              <input
                id="file-input"
                type="file"
                accept=".svg"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
              <svg className="w-10 h-10 mx-auto mb-3 text-zinc-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <p className="text-zinc-400 text-sm">
                Drag & drop SVG files here, or click to browse
              </p>
              {files.length > 0 && (
                <p className="text-purple-400 text-sm mt-2">
                  {files.length} file{files.length > 1 ? "s" : ""} selected
                </p>
              )}
            </div>

            {/* Form Fields */}
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-zinc-400 text-xs block mb-1">Icon Name</label>
                <input
                  type="text"
                  value={iconName}
                  onChange={(e) => setIconName(e.target.value)}
                  placeholder="e.g., cloud-download"
                  className="w-full bg-[#0f0f11] border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-zinc-400 text-xs block mb-1">Category</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full bg-[#0f0f11] border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                >
                  <option value="">Select category</option>
                  {categories.map((cat) => (
                    <option key={cat.ROWID} value={cat.ROWID}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-zinc-400 text-xs block mb-1">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="e.g., cloud, download, storage"
                  className="w-full bg-[#0f0f11] border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                />
              </div>

              <button
                onClick={handleUpload}
                disabled={uploading || !files.length || !iconName}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2.5 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <>
                    <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    Processing...
                  </>
                ) : (
                  "Upload & Generate Variants"
                )}
              </button>
            </div>

            {/* Results */}
            {uploadError && (
              <div className="mt-3 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg p-3">
                {uploadError}
              </div>
            )}
            {uploadResult && (
              <div className="mt-3 bg-green-500/10 border border-green-500/30 text-green-400 text-sm rounded-lg p-3">
                <p className="font-medium">Uploaded successfully!</p>
                <p className="text-xs mt-1">
                  {uploadResult.variants?.length} variants generated: {uploadResult.variants?.map((v) => v.style).join(", ")}
                </p>
              </div>
            )}
          </div>

          {/* Categories Section */}
          <div className="bg-[#1a1a2e] rounded-2xl p-6 border border-zinc-800">
            <h2 className="text-lg font-semibold text-white mb-4">Categories</h2>

            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="New category name"
                className="flex-1 bg-[#0f0f11] border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                onKeyDown={(e) => e.key === "Enter" && handleCreateCategory()}
              />
              <button
                onClick={handleCreateCategory}
                className="bg-purple-600 hover:bg-purple-700 text-white text-sm px-4 py-2 rounded-lg transition-colors"
              >
                Add
              </button>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto">
              {categories.map((cat) => (
                <div
                  key={cat.ROWID}
                  className="flex items-center justify-between bg-[#0f0f11] rounded-lg px-3 py-2"
                >
                  <span className="text-zinc-300 text-sm">{cat.name}</span>
                  <span className="text-zinc-600 text-xs">{cat.icon_count || 0} icons</span>
                </div>
              ))}
              {categories.length === 0 && (
                <p className="text-zinc-600 text-sm text-center py-4">No categories yet</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
