const STYLES = ["outlined", "solid", "duotone"];

export default function Sidebar({
  categories,
  selectedCategory,
  onCategorySelect,
  selectedStyles,
  onStyleToggle,
}) {
  return (
    <aside className="w-64 shrink-0 border-l border-zinc-800 p-6 hidden lg:block sticky top-[57px] h-[calc(100vh-57px)] overflow-y-auto">
      {/* Style Filter */}
      <div className="mb-8">
        <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
          Style
        </h3>
        <div className="space-y-1">
          {STYLES.map((style) => (
            <label
              key={style}
              className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-zinc-800/50 transition-colors"
            >
              <input
                type="checkbox"
                checked={selectedStyles.includes(style)}
                onChange={() => onStyleToggle(style)}
                className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-purple-600 focus:ring-purple-500 focus:ring-offset-0"
              />
              <span className="text-sm text-zinc-300 capitalize">{style}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Categories */}
      <div>
        <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
          Categories
        </h3>
        <div className="space-y-0.5">
          {categories.map((cat) => (
            <button
              key={cat.ROWID}
              onClick={() => onCategorySelect(cat.ROWID)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                selectedCategory === cat.ROWID
                  ? "bg-purple-600/20 text-purple-400"
                  : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
              }`}
            >
              <span>{cat.name}</span>
              <span className="text-xs text-zinc-600">{cat.icon_count || 0}</span>
            </button>
          ))}
          {categories.length === 0 && (
            <p className="text-zinc-700 text-xs px-3">No categories yet</p>
          )}
        </div>
      </div>
    </aside>
  );
}
