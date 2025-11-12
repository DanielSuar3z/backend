const express = require('express');
const cors = require('cors');
const SparqlClient = require('sparql-client-2');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const secretKey = 'jaimebeltran0610';
const authRoutes = require('./routes/auth.routes'); 
const bibliotecaRoutes = require('./routes/biblioteca.routes');
const ontologyRoutes = require('./routes/ontology.routes'); 
const prestamosRoutes = require('./routes/prestamos');
const devolucionesRoutes = require('./routes/devoluciones');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 🔥 AGREGAR ESTA RUTA RAÍZ - SOLUCIÓN AL 404
app.get('/', (req, res) => {
  res.json({ 
    message: 'Backend Biblioteca API',
    status: 'Online',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: '/api/auth',
      biblioteca: '/api/biblioteca',
      ontologia: '/api/ontologia',
      prestamos: '/api/prestamos',
      devoluciones: '/api/devoluciones',
      status: '/api/status'
    }
  });
});

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/biblioteca', bibliotecaRoutes);
app.use('/api/ontologia', ontologyRoutes);
app.use('/api/prestamos', prestamosRoutes);
app.use('/api/devoluciones', devolucionesRoutes);

// Ruta para verificar estado
app.get('/api/status', (req, res) => {
  res.json({ status: 'online', message: 'API funcionando correctamente' });
});

// Iniciar servidor
app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});

module.exports = app;