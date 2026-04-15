import { useState, useEffect } from "react";
import useIcons from "../hooks/useIcons";
import { fetchCategories } from "../utils/api";
import SearchBar from "../components/SearchBar";
import Sidebar from "../components/Sidebar";
import IconGrid from "../components/IconGrid";
import IconDetailModal from "../components/IconDetailModal";
import Header from "../components/Header";

export default function Gallery({ user, onLogout }) {
  const { icons, loading, error, filters, updateFilters, reload } = useIcons();
  const [categories, setCategories] = useState([]);
  const [selectedIcon, setSelectedIcon] = useState(null);
  const [selectedStyles, setSelectedStyles] = useState([]);

  useEffect(() => {
    fetchCategories()
      .then(setCategories)
      .catch(() => {});
  }, []);

  const handleStyleToggle = (style) => {
    setSelectedStyles((prev) => {
      const next = prev.includes(style)
        ? prev.filter((s) => s !== style)
        : [...prev, style];
      updateFilters({ style: next.length === 1 ? next[0] : null });
      return next;
    });
  };

  const handleCategorySelect = (categoryId) => {
    updateFilters({
      category_id: filters.category_id === categoryId ? null : categoryId,
    });
  };

  const handleSearch = (search) => {
    updateFilters({ search });
  };

  return (
    <div className="min-h-screen bg-[#0f0f11]">
      <Header user={user} onLogout={onLogout} />

      <div className="flex">
        {/* Main Content */}
        <div className="flex-1 p-6">
          <SearchBar
            value={filters.search}
            onChange={handleSearch}
            selectedStyles={selectedStyles}
            onResetStyles={() => {
              setSelectedStyles([]);
              updateFilters({ style: null });
            }}
          />

          {/* Icon Count */}
          <div className="mb-6">
            <h2 className="text-zinc-300 text-sm">
              <span className="text-white font-semibold">{icons.length}</span>{" "}
              Icons
              {filters.search && (
                <span className="text-zinc-500">
                  {" "}matching &quot;{filters.search}&quot;
                </span>
              )}
            </h2>

            {/* Active filters */}
            <div className="flex gap-2 mt-2 flex-wrap">
              {selectedStyles.map((style) => (
                <span
                  key={style}
                  className="inline-flex items-center gap-1 bg-purple-600/20 text-purple-400 text-xs px-3 py-1 rounded-full"
                >
                  {style}
                  <button
                    onClick={() => handleStyleToggle(style)}
                    className="hover:text-white ml-1"
                  >
                    &times;
                  </button>
                </span>
              ))}
              {filters.category_id && (
                <span className="inline-flex items-center gap-1 bg-purple-600/20 text-purple-400 text-xs px-3 py-1 rounded-full">
                  {categories.find((c) => c.ROWID === filters.category_id)?.name || "Category"}
                  <button
                    onClick={() => handleCategorySelect(null)}
                    className="hover:text-white ml-1"
                  >
                    &times;
                  </button>
                </span>
              )}
              {(selectedStyles.length > 0 || filters.category_id) && (
                <button
                  onClick={() => {
                    setSelectedStyles([]);
                    updateFilters({ style: null, category_id: null, search: "" });
                  }}
                  className="text-zinc-500 hover:text-zinc-300 text-xs px-3 py-1"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Loading / Error / Grid */}
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full" />
            </div>
          ) : error ? (
            <div className="text-red-400 text-center py-12">{error}</div>
          ) : icons.length === 0 ? (
            <div className="text-zinc-500 text-center py-12">
              No icons found. {user.role_id === "1" && "Upload some from the Admin panel."}
            </div>
          ) : (
            <IconGrid icons={icons} onSelect={setSelectedIcon} />
          )}
        </div>

        {/* Sidebar */}
        <Sidebar
          categories={categories}
          selectedCategory={filters.category_id}
          onCategorySelect={handleCategorySelect}
          selectedStyles={selectedStyles}
          onStyleToggle={handleStyleToggle}
        />
      </div>

      {/* Detail Modal */}
      {selectedIcon && (
        <IconDetailModal
          icon={selectedIcon}
          onClose={() => setSelectedIcon(null)}
        />
      )}
    </div>
  );
}
