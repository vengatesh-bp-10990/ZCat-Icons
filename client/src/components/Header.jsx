import { Link, useLocation } from "react-router-dom";

export default function Header({ user, onLogout }) {
  const location = useLocation();

  return (
    <header className="bg-[#1a1a2e] border-b border-zinc-800 px-6 py-3 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-6">
        <Link to="/" className="text-xl font-bold text-white">
          <span className="text-purple-500">ZCat</span> Icons
        </Link>

        <nav className="flex items-center gap-1">
          <Link
            to="/"
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              location.pathname === "/"
                ? "bg-purple-600/20 text-purple-400"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Icons
          </Link>
          {user?.role_id === "1" && (
            <Link
              to="/admin"
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                location.pathname === "/admin"
                  ? "bg-purple-600/20 text-purple-400"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Admin
            </Link>
          )}
        </nav>
      </div>

      <div className="flex items-center gap-4">
        <span className="text-zinc-500 text-sm">
          {user?.first_name || user?.email_id}
        </span>
        <button
          onClick={onLogout}
          className="text-zinc-500 hover:text-white text-sm transition-colors"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
