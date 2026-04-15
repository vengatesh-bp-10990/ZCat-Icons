import { fetchIcon } from "../utils/api";

export default function IconGrid({ icons, onSelect }) {
  const handleClick = async (icon) => {
    try {
      const fullIcon = await fetchIcon(icon.slug);
      onSelect(fullIcon);
    } catch {
      // Fallback: open with basic info
      onSelect(icon);
    }
  };

  return (
    <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8 gap-1">
      {icons.map((icon) => (
        <button
          key={icon.ROWID}
          onClick={() => handleClick(icon)}
          className="group flex flex-col items-center justify-center p-4 rounded-xl border border-transparent hover:border-zinc-700 hover:bg-[#1a1a2e] transition-all"
        >
          {/* Icon Preview */}
          <div
            className="w-8 h-8 mb-2 flex items-center justify-center text-zinc-300 group-hover:text-white transition-colors"
            dangerouslySetInnerHTML={{
              __html: (icon.variant?.svg_code || icon.variants?.[0]?.svg_code || "")
                .replace(/width="[^"]*"/g, 'width="32"')
                .replace(/height="[^"]*"/g, 'height="32"')
                .replace(/stroke="#[^"]*"/g, 'stroke="currentColor"'),
            }}
          />
          {/* Name */}
          <span className="text-[10px] text-zinc-600 group-hover:text-zinc-400 truncate max-w-full transition-colors">
            {icon.name}
          </span>
        </button>
      ))}
    </div>
  );
}
