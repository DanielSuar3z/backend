const { findUserByEmail, createUser, getRoles } = require('../models/user.model');
const { generateToken } = require('../config/jwt.config');
const { successResponse, errorResponse } = require('../utils/response');
const bcrypt = require('bcrypt');
const mysqlPool = require('../config/db.config'); 
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'jaimebeltran0610'; // Asegúrate de que esta variable esté definida en tu entorno

async function login(req, res) {
  try {
    const { email, password_hash } = req.body;

    if (!email || !password_hash) {
      return errorResponse(res, 'Email y contraseña son requeridos', 400);
    }

    const usuario = await findUserByEmail(email);

    if (!usuario) {
      return errorResponse(res, 'Email no encontrado', 401);
    }

    const contrasenaValida = await bcrypt.compare(password_hash, usuario.password_hash);

    if (!contrasenaValida) {
      return errorResponse(res, 'Contraseña incorrecta', 401);
    }

    console.log('Valor de usuario.id_usuario antes de generar token:', usuario.id_usuario);
    console.log('Valor de usuario.email antes de generar token:', usuario.email);
    console.log('Valor de usuario.id_rol antes de generar token:', usuario.id_rol); // <-- Aquí sigue siendo undefined

    const token = generateToken({
      usuarioId: usuario.id_usuario,
      email: usuario.email,
      rolId: usuario.id_rol // <-- Si es undefined, el token lo incluirá como undefined
    });

    console.log('TOKEN GENERADO (backend):', token);

    return successResponse(res, {
      token,
      usuarioId: usuario.id_usuario,
      email: usuario.email,
      rol: usuario.id_rol
    }, 'Inicio de sesión exitoso');

  } catch (error) {
    console.error('Error en login:', error);
    return errorResponse(res, 'Error al procesar el inicio de sesión');
  }
}

async function register(req, res) {
  try {
    const {
    codigo_estudiante,
    nombres,
    apellidos,
    email,
    password_hash,
    telefono,
    direccion,
    id_rol
    } = req.body;

    console.log('Datos recibidos en register:', req.body);
    console.log('Datos recibidos en register:', email, password_hash, nombres, apellidos, id_rol);
    if (!email || !password_hash || !nombres || !apellidos || !id_rol) {
      return errorResponse(res, 'Faltan campos obligatorios', 400);
    }

    const existingUser = await findUserByEmail(email);

    if (existingUser) {
      return errorResponse(res, 'El email ya está registrado', 409);
    }

    await createUser({
    codigo_estudiante,
    nombres,
    apellidos,
    email,
    password_hash,
    telefono,
    direccion,
    id_rol
    });

    return successResponse(res, null, 'Usuario registrado con éxito', 201);

  } catch (error) {
    console.error('Error en registro:', error);
    return errorResponse(res, 'Error al registrar usuario');
  }
}

async function getUserRoles(req, res) {
  try {
    const roles = await getRoles(['administrador', 'bibliotecario', 'profesor', 'estudiante', 'visitante']);

    const rolesMap = {};
    roles.forEach(rol => {
      rolesMap[rol.nombre_rol] = rol.id_rol;
    });

    return successResponse(res, rolesMap);
  } catch (error) {
    console.error('Error al obtener roles:', error);
    return errorResponse(res, 'Error al obtener roles de usuario');
  }
}

async function findUserById(userId) {
  let connection;
  try {
    connection = await mysqlPool.pool.getConnection();

    const [rows] = await connection.execute(
      `SELECT
           id_usuario,
           codigo_estudiante,           
           nombres,          
           apellidos,       
           email,    
           password_hash,           
           Telefono,
           direccion 
           -- Quita o comenta la línea de rol_id si no la quieres traer:
           -- , id_rol
         FROM usuario
         WHERE id_usuario = ?`,
       [userId]
    );
    return rows[0] || null;
  } catch (error) {
    console.error('Error al buscar usuario por ID en la base de datos (findUserById):', error);
    throw error;
  } finally {
    if (connection) connection.release();
  }
}

async function getUserProfile(req, res) {
  try {
    
    const userId = req.user.usuarioId;

    console.log('req.user en getUserProfile:', req.user);
    console.log('userId extraído:', userId);

    if (!userId) {
      // Esta validación es buena, aunque si authenticateToken funciona bien, rara vez se alcanzará.
      return errorResponse(res, 'ID de usuario no disponible en el token o no encontrado.', 400);
    }

    const user = await findUserById(userId);

    if (!user) {
      return errorResponse(res, 'Usuario no encontradooo.', 404);
    }

    // Excluir la contraseña del objeto de perfil antes de enviarlo al cliente
    const { password_hash, ...profileData } = user;

    return successResponse(res, profileData, 'Perfil de usuario obtenido exitosamente.');

  } catch (error) {
    console.error('Error al obtener el perfil del usuario (getUserProfile):', error);
    return errorResponse(res, 'Error interno del servidor al obtener el perfil del usuario.');
  }
}



function authenticateToken(req, res, next) {
    
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Formato: Bearer TOKEN


    if (!token) {
        console.log('Backend - NO TOKEN PROPORCIONADO. Regresando 401.'); // NUEVO LOG
        return errorResponse(res, 'Acceso denegado. Token no proporcionado.', 401);
    }

    try {
        console.log('Backend - Intentando jwt.verify()...'); // NUEVO LOG
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        console.log('Backend - ¡ÉXITO! Token decodificado y req.user asignado:', req.user); // NUEVO LOG
        console.log('Backend - Llamando a next()...'); // NUEVO LOG
        next();
    } catch (error) {
        console.error('Backend - ¡¡¡ERROR CRÍTICO VERIFICANDO TOKEN (JWT)!!!:', error); // LOG MEJORADO
        console.log('Backend - Regresando 403 debido a error de token.'); // NUEVO LOG
        return errorResponse(res, 'Token inválido o expirado.', 403);
    }
    // Este log no debería ejecutarse si los retornos de error o next() funcionan bien
    console.log('--- SALIENDO DE AUTHENTICATETOKEN (EJECUCIÓN INESPERADA) ---'); // NUEVO LOG
}


module.exports = {
  login,
  register,
  getUserRoles,
  findUserById,
  getUserProfile,
  authenticateToken
};