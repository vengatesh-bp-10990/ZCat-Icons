import { fetchIcon } from "../utils/api";

export default function IconGrid({ icons, onSelect }) {
  const handleClick = async (icon) => {
    try {
      const fullIcon = await fetchIcon(icon.slug);
      onSelect(fullIcon);
    } catch {
      onSelect(icon);
    }
  };

  return (
    <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-8 xl:grid-cols-10 gap-px bg-zinc-800/30 rounded-lg overflow-hidden border border-zinc-800/50">
      {icons.map((icon) => (
        <button
          key={icon.ROWID}
          onClick={() => handleClick(icon)}
          className="group flex flex-col items-center justify-center bg-zinc-950 p-3 hover:bg-zinc-900 aspect-square relative"
          title={icon.name}
        >
          <div
            className="w-6 h-6 text-zinc-100 group-hover:text-white flex items-center justify-center"
            dangerouslySetInnerHTML={{
              __html: (icon.variant?.svg_code || icon.variants?.[0]?.svg_code || "")
                .replace(/ width="[^"]*"/g, "")
                .replace(/ height="[^"]*"/g, "")
                .replace(/<svg/, '<svg width="24" height="24"')
                .replace(/stroke="#[^"]*"/g, 'stroke="currentColor"')
                .replace(/fill="(?!none)[^"]*"/g, 'fill="currentColor"'),
            }}
          />
          <span className="text-[9px] text-zinc-700 group-hover:text-zinc-500 truncate max-w-full mt-1.5 leading-tight">
            {icon.name}
          </span>
        </button>
      ))}
    </div>
  );
}
