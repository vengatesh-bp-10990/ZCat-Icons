import { Link, useLocation } from "react-router-dom";

export default function Header({ user, onLogout }) {
  const location = useLocation();

  return (
    <header className="border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-xl sticky top-0 z-50">
      <div className="max-w-[1400px] mx-auto px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 17l6-6-6-6" /><path d="M12 19h8" />
              </svg>
            </div>
            <span className="text-[15px] font-semibold text-zinc-100">
              ZCat<span className="text-violet-400"> Icons</span>
            </span>
          </Link>

          <nav className="flex items-center gap-1">
            <Link
              to="/"
              className={`px-3 py-1.5 rounded-md text-[13px] font-medium ${
                location.pathname === "/"
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
              }`}
            >
              Browse
            </Link>
            {user?.role_id === "1" && (
              <Link
                to="/admin"
                className={`px-3 py-1.5 rounded-md text-[13px] font-medium ${
                  location.pathname === "/admin"
                    ? "bg-zinc-800 text-zinc-100"
                    : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
                }`}
              >
                Upload
              </Link>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-zinc-800/50">
            <div className="w-5 h-5 rounded-full bg-violet-600/20 flex items-center justify-center text-[10px] font-semibold text-violet-400">
              {(user?.first_name || "U")[0]}
            </div>
            <span className="text-zinc-400 text-[13px]">
              {user?.first_name || user?.email_id}
            </span>
          </div>
          <button
            onClick={onLogout}
            className="text-zinc-600 hover:text-zinc-300 text-[13px] px-2 py-1"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          </button>
        </div>
      </div>
    </header>
  );
}
