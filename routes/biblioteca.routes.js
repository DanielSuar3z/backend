const express = require('express');
const router = express.Router();
const bibliotecaController = require('../controllers/ontology.controller');

// Rutas principales
router.get('/obras', bibliotecaController.queryOntology);
router.get('/obras/buscar', bibliotecaController.buscarObras);
router.get('/obras/:id', bibliotecaController.getObraById);
router.post('/obras', bibliotecaController.createObra);

// Rutas para datos de apoyo
router.get('/generos', bibliotecaController.getGenerosLiterarios);
router.get('/materias', bibliotecaController.getMaterias);
router.get('/ubicaciones', bibliotecaController.getUbicacionesUnicas);
router.get('/autores', bibliotecaController.getAutoresUnicos);

module.exports = router;