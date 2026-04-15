import { useState, useEffect, useRef } from "react";

const IS_LOCAL = window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost";

export default function Login({ onLogin }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const loginDivRef = useRef(null);
  const sdkInitialized = useRef(false);

  // Production: Initialize Catalyst Web SDK login (SDK loaded globally via index.html)
  useEffect(() => {
    if (IS_LOCAL || sdkInitialized.current) return;

    try {
      if (!window.catalyst) {
        setError("Authentication SDK not loaded");
        return;
      }
      const auth = window.catalyst.auth;
      const loginDiv = document.getElementById("loginDivElement");
      if (!loginDiv) return;

      auth.signIn("loginDivElement", {
        project_id: "20508000000125077",
      });

      sdkInitialized.current = true;

      // Check for existing auth session
      auth.isUserAuthenticated().then((result) => {
        if (result?.content) {
          handleCatalystUser(result.content);
        }
      }).catch(() => {});
    } catch (err) {
      console.error("Catalyst SDK init error:", err);
      setError("Failed to initialize authentication");
    }
  }, []);

  const handleCatalystUser = async (userToken) => {
    try {
      // Fetch current user info from our backend
      const res = await fetch("/api/icons?page=1&limit=1", {
        headers: { Authorization: `Zoho-oauthtoken ${userToken}` },
      });
      if (res.ok) {
        // Get user details from Catalyst
        const userRes = await fetch("/__catalyst/api/v1/userManagement/currentuser", {
          headers: { Authorization: `Zoho-oauthtoken ${userToken}` },
        });
        const userData = userRes.ok ? await userRes.json() : {};
        const user = userData.data || {
          user_id: "unknown",
          first_name: "User",
          email_id: "",
          role_id: "2",
        };
        sessionStorage.setItem("zcat_token", userToken);
        onLogin(user);
      }
    } catch (err) {
      setError("Authentication failed");
    }
  };

  // Local dev: mock login
  const handleLocalLogin = async () => {
    setLoading(true);
    try {
      // Test backend connectivity
      const res = await fetch("/api/icons?page=1&limit=1");
      if (!res.ok) throw new Error("Backend not reachable");
      const mockUser = {
        user_id: "1",
        first_name: "Admin",
        last_name: "Dev",
        email_id: "admin@zoho.com",
        role_id: "1",
      };
      sessionStorage.setItem("zcat_token", "local-dev-token");
      onLogin(mockUser);
    } catch (err) {
      setError("Cannot connect to backend. Is the server running?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-violet-600 flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 17l6-6-6-6" /><path d="M12 19h8" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-zinc-100 mb-1">Welcome to ZCat Icons</h1>
          <p className="text-[13px] text-zinc-600">Consistent stroke-based icon library</p>
        </div>

        <div className="bg-zinc-900/50 rounded-xl border border-zinc-800/50 p-6">
          {/* Catalyst Web SDK renders its login form here in production */}
          <div id="loginDivElement" ref={loginDivRef} className={IS_LOCAL ? "hidden" : "mb-4"} />

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-[12px] text-red-400 mb-4">
              {error}
            </div>
          )}

          {IS_LOCAL ? (
            <>
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg px-3 py-2 text-[11px] text-amber-400/80 mb-4">
                Local dev mode — using mock admin login
              </div>
              <button
                onClick={handleLocalLogin}
                disabled={loading}
                className="w-full bg-violet-600 hover:bg-violet-700 text-white text-[13px] font-medium py-3 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
                    Sign in as Admin (Dev)
                  </>
                )}
              </button>
            </>
          ) : (
            <p className="text-[12px] text-zinc-600 text-center">Sign in with your Zoho account above</p>
          )}
          <p className="text-[11px] text-zinc-700 text-center mt-3">Zoho accounts only</p>
        </div>
      </div>
    </div>
  );
}
