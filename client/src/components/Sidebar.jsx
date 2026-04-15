const STYLES = ["outlined", "solid", "duotone"];

export default function Sidebar({
  categories,
  selectedCategory,
  onCategorySelect,
  selectedStyles,
  onStyleToggle,
  iconCount,
}) {
  return (
    <aside className="w-56 shrink-0 border-r border-zinc-800/50 hidden lg:flex flex-col sticky top-14 h-[calc(100vh-56px)] overflow-y-auto py-5 px-4">
      {/* Stats */}
      <div className="mb-6 px-2">
        <p className="text-[11px] uppercase tracking-wider font-medium text-zinc-600 mb-1">Library</p>
        <p className="text-2xl font-semibold text-zinc-100">{iconCount || 0}</p>
        <p className="text-[11px] text-zinc-600">icons available</p>
      </div>

      {/* Style Filter */}
      <div className="mb-6">
        <p className="text-[11px] uppercase tracking-wider font-medium text-zinc-600 mb-2 px-2">Style</p>
        {STYLES.map((style) => (
          <button
            key={style}
            onClick={() => onStyleToggle(style)}
            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] ${
              selectedStyles.includes(style)
                ? "bg-violet-600/10 text-violet-400"
                : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
            }`}
          >
            <div className={`w-4 h-4 rounded border flex items-center justify-center ${
              selectedStyles.includes(style) ? "border-violet-500 bg-violet-600" : "border-zinc-700"
            }`}>
              {selectedStyles.includes(style) && (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              )}
            </div>
            <span className="capitalize">{style}</span>
          </button>
        ))}
      </div>

      {/* Categories */}
      <div className="flex-1">
        <p className="text-[11px] uppercase tracking-wider font-medium text-zinc-600 mb-2 px-2">Categories</p>
        <div className="space-y-0.5">
          <button
            onClick={() => onCategorySelect(null)}
            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-md text-[13px] ${
              !selectedCategory
                ? "bg-zinc-800 text-zinc-100"
                : "text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-300"
            }`}
          >
            <span>All</span>
          </button>
          {categories.map((cat) => (
            <button
              key={cat.ROWID}
              onClick={() => onCategorySelect(cat.ROWID)}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-md text-[13px] ${
                selectedCategory === cat.ROWID
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-300"
              }`}
            >
              <span>{cat.name}</span>
              <span className="text-[11px] text-zinc-700">{cat.icon_count || 0}</span>
            </button>
          ))}
          {categories.length === 0 && (
            <p className="text-zinc-700 text-[12px] px-2.5 py-2">No categories</p>
          )}
        </div>
      </div>
    </aside>
  );
}
