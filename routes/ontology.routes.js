const express = require('express');
const {
  queryOntology,
  createObra,
  getGenerosLiterarios,
  getMaterias,
  buscarObras,
  getUbicacionesUnicas,
  getAutoresUnicos,
  getObraById
} = require('../controllers/ontology.controller');

const router = express.Router();

// Rutas de ontología de biblioteca
router.get('/query', queryOntology);                    // Para obtener todas las obras
router.post('/obra', createObra);                       // Para insertar una obra
router.get('/generos', getGenerosLiterarios);           // Para obtener los géneros literarios
router.get('/materias', getMaterias);                   // Para obtener las materias/temas
router.get('/buscar', buscarObras);                     // Para búsqueda de obras con filtros
router.get('/ubicaciones', getUbicacionesUnicas);       // Para obtener ubicaciones únicas
router.get('/autores', getAutoresUnicos);               // Para obtener autores únicos
router.get('/obra/:id', getObraById);                   // Para obtener una obra específica por ID

module.exports = router;