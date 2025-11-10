const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

// Cargar variables de entorno desde el archivo .env
dotenv.config();

const pool = mysql.createPool({
  host: process.env.hostDB || 'localhost',
  user: process.env.userDB || 'root',
  password: process.env.passwordDB || 'root',
  database: process.env.databaseDB || 'biblioteca_sistema',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Función para probar la conexión a la base de datos
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('Conexión a MySQL establecida correctamente');
    connection.release();
    return true;
  } catch (error) {
    console.error('Error al conectar a MySQL:', error.message);
    return false;
  }
}


// Helper function to execute MySQL queries
async function executeQuery(query, params = []) {
  try {
    const [rows] = await pool.execute(query, params);
    return rows;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

module.exports = {
  pool,
  testConnection,
  executeQuery
};