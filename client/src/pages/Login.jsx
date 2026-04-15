import { useState } from "react";

export default function Login({ onLogin }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleZohoLogin = async () => {
    setLoading(true);
    setError("");

    try {
      // For development, simulate login. In production, use Catalyst Web SDK:
      // catalyst.auth.signIn("loginDivElement")
      // For now, a simple token-based flow placeholder
      const mockUser = {
        user_id: "1",
        first_name: "Admin",
        last_name: "User",
        email_id: "admin@zoho.com",
        role_id: "1",
      };
      onLogin(mockUser);
    } catch (err) {
      setError("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0f11] flex items-center justify-center">
      <div className="w-full max-w-md p-8">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            <span className="text-purple-500">ZCat</span> Icons
          </h1>
          <p className="text-zinc-500 text-sm">
            Stroke-based icon library for designers & developers
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-[#1a1a2e] rounded-2xl p-8 border border-zinc-800">
          <h2 className="text-lg font-semibold text-white mb-6 text-center">
            Sign in to continue
          </h2>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg p-3 mb-4">
              {error}
            </div>
          )}

          {/* Catalyst Embedded Login will render here */}
          <div id="loginDivElement" className="mb-4"></div>

          <button
            onClick={handleZohoLogin}
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {loading ? (
              <span className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                  <polyline points="10 17 15 12 10 7" />
                  <line x1="15" y1="12" x2="3" y2="12" />
                </svg>
                Sign in with Zoho
              </>
            )}
          </button>

          <p className="text-zinc-600 text-xs text-center mt-4">
            Only Zoho accounts are allowed
          </p>
        </div>

        {/* Footer */}
        <p className="text-zinc-700 text-xs text-center mt-6">
          ZCat Icons &middot; Built on Zoho Catalyst
        </p>
      </div>
    </div>
  );
}
