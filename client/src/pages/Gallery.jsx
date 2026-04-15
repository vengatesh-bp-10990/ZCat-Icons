import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import useIcons from "../hooks/useIcons";
import { fetchCategories } from "../utils/api";
import SearchBar from "../components/SearchBar";
import Sidebar from "../components/Sidebar";
import IconGrid from "../components/IconGrid";
import IconDetailModal from "../components/IconDetailModal";
import Header from "../components/Header";

export default function Gallery({ user, onLogout }) {
  const { icons, loading, error, filters, updateFilters, reload, hasMore, loadMore } = useIcons();
  const [categories, setCategories] = useState([]);
  const [selectedIcon, setSelectedIcon] = useState(null);
  const [selectedStyles, setSelectedStyles] = useState([]);

  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => {});
  }, []);

  const handleStyleToggle = (style) => {
    setSelectedStyles((prev) => {
      const next = prev.includes(style) ? prev.filter((s) => s !== style) : [...prev, style];
      updateFilters({ style: next.length === 1 ? next[0] : null });
      return next;
    });
  };

  const handleCategorySelect = (categoryId) => {
    updateFilters({ category_id: filters.category_id === categoryId ? null : categoryId });
  };

  return (
    <div className="min-h-screen bg-zinc-950">
      <Header user={user} onLogout={onLogout} />

      <div className="flex">
        <Sidebar
          categories={categories}
          selectedCategory={filters.category_id}
          onCategorySelect={handleCategorySelect}
          selectedStyles={selectedStyles}
          onStyleToggle={handleStyleToggle}
          iconCount={icons.length}
        />

        {/* Main */}
        <main className="flex-1 min-w-0">
          <div className="max-w-[1200px] mx-auto px-6 py-5">
            {/* Search */}
            <div className="mb-5">
              <SearchBar value={filters.search} onChange={(search) => updateFilters({ search })} />
            </div>

            {/* Status bar */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <p className="text-[13px] text-zinc-500">
                  <span className="text-zinc-200 font-medium">{icons.length}</span> icons
                  {filters.search && <span className="text-zinc-600"> matching "{filters.search}"</span>}
                </p>
                {/* Active filters */}
                {(selectedStyles.length > 0 || filters.category_id) && (
                  <div className="flex gap-1.5">
                    {selectedStyles.map((s) => (
                      <span key={s} className="inline-flex items-center gap-1 bg-violet-600/10 text-violet-400 text-[11px] px-2 py-0.5 rounded-full">
                        {s}
                        <button onClick={() => handleStyleToggle(s)} className="hover:text-white ml-0.5">×</button>
                      </span>
                    ))}
                    {filters.category_id && (
                      <span className="inline-flex items-center gap-1 bg-violet-600/10 text-violet-400 text-[11px] px-2 py-0.5 rounded-full">
                        {categories.find((c) => c.ROWID === filters.category_id)?.name}
                        <button onClick={() => handleCategorySelect(null)} className="hover:text-white ml-0.5">×</button>
                      </span>
                    )}
                  </div>
                )}
              </div>
              {user?.role_id === "1" && (
                <Link
                  to="/admin"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium bg-violet-600 hover:bg-violet-700 text-white transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  Upload
                </Link>
              )}
            </div>

            {/* Content */}
            {loading ? (
              <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-8 xl:grid-cols-10 gap-px bg-zinc-800/30 rounded-lg overflow-hidden border border-zinc-800/50">
                {Array.from({ length: 30 }).map((_, i) => (
                  <div key={i} className="bg-zinc-950 aspect-square animate-shimmer" />
                ))}
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-3">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                </div>
                <p className="text-[13px] text-red-400">{error}</p>
              </div>
            ) : icons.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-12 h-12 rounded-full bg-zinc-800/50 flex items-center justify-center mb-3">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#71717a" strokeWidth="1.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                </div>
                <p className="text-[13px] text-zinc-500 mb-1">No icons found</p>
                <p className="text-[12px] text-zinc-700">
                  {user.role_id === "1" ? "Upload icons from the Upload tab." : "Try a different search."}
                </p>
              </div>
            ) : (
              <div className="animate-fadeIn">
                <IconGrid icons={icons} onSelect={setSelectedIcon} />
                {hasMore && (
                  <div className="flex justify-center mt-6">
                    <button onClick={loadMore}
                      className="px-5 py-2 rounded-lg text-[13px] font-medium text-zinc-400 hover:text-zinc-200 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800"
                    >Load More</button>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      {selectedIcon && (
        <IconDetailModal
          icon={selectedIcon}
          onClose={() => setSelectedIcon(null)}
          isAdmin={user?.role_id === "1"}
          onDelete={() => { setSelectedIcon(null); reload(); }}
        />
      )}
    </div>
  );
}
