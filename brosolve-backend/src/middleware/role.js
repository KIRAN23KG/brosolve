// src/middleware/role.js
function permit(...allowed) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Not authenticated' });
    if (allowed.includes(req.user.role)) return next();
    return res.status(403).json({ message: 'Forbidden: insufficient role' });
  };
}

// Check if user has admin or superadmin role
function isAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ message: 'Not authenticated' });
  if (['admin', 'superadmin'].includes(req.user.role)) return next();
  return res.status(403).json({ message: 'Forbidden: admin access required' });
}

// Check if user is superadmin
function isSuperAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ message: 'Not authenticated' });
  if (req.user.role === 'superadmin') return next();
  return res.status(403).json({ message: 'Forbidden: superadmin access required' });
}

module.exports = { permit, isAdmin, isSuperAdmin };
