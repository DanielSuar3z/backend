const { executeQuery } = require('../config/db.config');
const bcrypt = require('bcrypt');

async function findUserByEmail(email) {
  const query = 'SELECT * FROM usuario WHERE email = ?';
  const results = await executeQuery(query, [email]);
  return results[0] || null;
}

async function createUser(userData) {
  const {
    codigo_estudiante,
    nombres,
    apellidos,
    email,
    password_hash,
    telefono,
    direccion,
    id_rol
  } = userData;

  const hashedPassword = await bcrypt.hash(password_hash, 10);

  await executeQuery(
    'CALL sp_registrar_usuario(?, ?, ?, ?, ?, ?, ?)',
    [
    codigo_estudiante,
    nombres,
    apellidos,
    email,
    hashedPassword,
    telefono,
    direccion,
    id_rol
    ]
  );

  return { email };
}

async function getRoles(roleNames = []) {
  try {
    let query;
    let params = [];
    
    if (roleNames.length === 0) {
      // Si no se especifican roles, obtener todos
      query = 'SELECT id_rol, nombre_rol FROM rol';
    } else {
      // Si se especifican roles, filtrar
      const placeholders = roleNames.map(() => '?').join(',');
      query = `SELECT id_rol, nombre_rol FROM rol WHERE nombre_rol IN (${placeholders})`;
      params = roleNames;
    }

    console.log('Ejecutando query de roles:', query, 'con parámetros:', params);
    
    const results = await executeQuery(query, params);
    console.log('Roles obtenidos de la BD:', results);
    
    return results;
  } catch (error) {
    console.error('Error en getRoles:', error);
    throw error;
  }
}

module.exports = {
  findUserByEmail,
  createUser,
  getRoles
};