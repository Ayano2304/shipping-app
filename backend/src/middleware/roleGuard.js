const roleGuard = (...allowedRoles) => {
  const roles = allowedRoles.flat();
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Akses ditolak. Role '${req.user.role}' tidak diizinkan.`
      });
    }
    next();
  };
};

module.exports = roleGuard;
