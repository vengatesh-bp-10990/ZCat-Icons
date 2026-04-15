import { useState, useEffect, useRef } from "react";

export default function SearchBar({ value, onChange, selectedStyles, onResetStyles }) {
  const [inputValue, setInputValue] = useState(value || "");
  const debounceRef = useRef(null);

  useEffect(() => {
    setInputValue(value || "");
  }, [value]);

  const handleChange = (e) => {
    const val = e.target.value;
    setInputValue(val);

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onChange(val);
    }, 300);
  };

  return (
    <div className="mb-6">
      <div className="relative">
        <svg
          className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          value={inputValue}
          onChange={handleChange}
          placeholder="Search Icons..."
          className="w-full bg-[#1a1a2e] border border-zinc-800 rounded-xl pl-12 pr-4 py-3 text-white text-sm focus:outline-none focus:border-purple-500 placeholder-zinc-600"
        />
        {inputValue && (
          <button
            onClick={() => {
              setInputValue("");
              onChange("");
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
          >
            &times;
          </button>
        )}
      </div>
    </div>
  );
}
