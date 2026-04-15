// Auth middleware - validates Catalyst auth token and extracts user info
async function requireAuth(req, res, next) {
  try {
    if (!req.catalyst) {
      return res.status(401).json({ error: "Authentication required" });
    }
    const userManagement = req.catalyst.userManagement();
    const user = await userManagement.getCurrentUser();
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

// Admin-only middleware - checks if user has admin role
async function requireAdmin(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }
    // Check role_id: 1 = Admin in Catalyst Authentication
    const roleId = req.user.role_id;
    if (roleId !== "1") {
      return res.status(403).json({ error: "Admin access required" });
    }
    next();
  } catch (err) {
    return res.status(403).json({ error: "Access denied" });
  }
}

module.exports = { requireAuth, requireAdmin };
