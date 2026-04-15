import { useState, useEffect, useRef } from "react";

export default function SearchBar({ value, onChange }) {
  const [inputValue, setInputValue] = useState(value || "");
  const debounceRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { setInputValue(value || ""); }, [value]);

  // Keyboard shortcut: / to focus (like GitHub)
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "/" && document.activeElement.tagName !== "INPUT" && document.activeElement.tagName !== "TEXTAREA") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleChange = (e) => {
    const val = e.target.value;
    setInputValue(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onChange(val), 250);
  };

  return (
    <div className="relative group">
      <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleChange}
        placeholder="Search icons..."
        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-10 pr-16 py-2.5 text-[13px] text-zinc-200 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 placeholder-zinc-600"
      />
      {inputValue ? (
        <button
          onClick={() => { setInputValue(""); onChange(""); }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-300 text-sm"
        >
          ✕
        </button>
      ) : (
        <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-zinc-600 border border-zinc-700 rounded px-1.5 py-0.5 font-mono">/</kbd>
      )}
    </div>
  );
}
