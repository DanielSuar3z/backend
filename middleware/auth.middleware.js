const { verifyToken } = require('../config/jwt.config');

function authenticateUser(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ 
        success: false,
        message: 'Token de autenticación no proporcionado'
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    
    // Add user info to request object
    req.usuario = decoded;
    
    next();
  } catch (error) {
    return res.status(403).json({ 
      success: false,
      message: 'Token inválido o expirado' 
    });
  }
}

function authorizeRole(rol = []) {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({ 
        success: false,
        message: 'Usuario no autenticado' 
      });
    }

    const hasRole = rol.includes(req.usuario.rolId);
    
    if (!hasRole) {
      return res.status(403).json({ 
        success: false,
        message: 'No tiene permisos para acceder a este recurso' 
      });
    }

    next();
  };
}

module.exports = {
  authenticateUser,
  authorizeRole
};