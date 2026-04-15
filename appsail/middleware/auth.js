const IS_LOCAL = !process.env.X_ZOHO_CATALYST_LISTEN_PORT;

// Dev mode mock user (only used locally)
const DEV_USER = {
  user_id: "1",
  first_name: "Admin",
  last_name: "Dev",
  email_id: "admin@zoho.com",
  role_id: "1",
  role_details: { role_name: "App Administrator" },
};

// Admin role constants in Catalyst
const ADMIN_ROLE_IDS = ["1"]; // App Administrator

// Auth middleware - validates Catalyst auth token and extracts user info
async function requireAuth(req, res, next) {
  // Local dev: bypass auth
  if (IS_LOCAL) {
    req.user = DEV_USER;
    return next();
  }

  try {
    if (!req.catalyst) {
      return res.status(401).json({ error: "Authentication required" });
    }
    const userManagement = req.catalyst.userManagement();
    const user = await userManagement.getCurrentUser();
    if (!user || !user.user_id) {
      return res.status(401).json({ error: "Invalid user session" });
    }
    req.user = user;
    next();
  } catch (err) {
    console.error("[Auth] Token validation failed:", err.message);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

// Admin-only middleware - checks if user has admin role
async function requireAdmin(req, res, next) {
  // Local dev: bypass admin check
  if (IS_LOCAL) {
    return next();
  }

  try {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }
    const roleId = String(req.user.role_id || "");
    const roleName = req.user.role_details?.role_name || "";
    if (!ADMIN_ROLE_IDS.includes(roleId) && roleName !== "App Administrator") {
      return res.status(403).json({ error: "Admin access required" });
    }
    next();
  } catch (err) {
    return res.status(403).json({ error: "Access denied" });
  }
}

module.exports = { requireAuth, requireAdmin };
