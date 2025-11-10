const express = require('express');
const router = express.Router();
const db = require('../config/db.config');
const { authenticateUser } = require('../middleware/auth.middleware');
const OntologiaService = require('../services/ontologiaService'); // ← NUEVO

// POST /api/prestamos - Crear un nuevo préstamo
router.post('/', authenticateUser, async (req, res) => {

        const inicializar = async () => {
        try {
            await OntologiaService.inicializarEntidadesBasicas();
        } catch (error) {
            console.log('ℹ️ Inicialización de entidades:', error.message);
            }
        };
inicializar();

    try {
        const { id_usuario, uri_item_ontologia, fecha_devolucion_esperada } = req.body;

        console.log('📦 Datos recibidos:', { id_usuario, uri_item_ontologia, fecha_devolucion_esperada });

        // Validaciones básicas
        if (!id_usuario || !uri_item_ontologia || !fecha_devolucion_esperada) {
            return res.status(400).json({
                success: false,
                error: 'Todos los campos son requeridos'
            });
        }

        // Verificar que el usuario existe
        const usuario = await db.executeQuery(
            'SELECT id_usuario FROM usuario WHERE id_usuario = ?',
            [id_usuario]
        );

        if (usuario.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Usuario no encontrado'
            });
        }

        // 1. Insertar el préstamo en MySQL
        const result = await db.executeQuery(
            `INSERT INTO prestamos 
             (id_usuario, uri_item_ontologia, fecha_devolucion_esperada, estado, id_usuario_registro) 
             VALUES (?, ?, ?, 'activo', ?)`,
            [id_usuario, uri_item_ontologia, fecha_devolucion_esperada, id_usuario]
        );

        console.log('✅ Préstamo creado exitosamente. ID:', result.insertId);

        // 2. Actualizar la ontología - CAMBIO DE ESTADO A "prestado"
        try {
            console.log('🔄 Sincronizando con ontología...');
            
            // Obtener o crear el Item para esta obra
            const uriItem = await OntologiaService.obtenerOCrearItem(uri_item_ontologia);
            
            if (uriItem) {
                // Actualizar la disponibilidad a "prestado"
                await OntologiaService.actualizarDisponibilidad(uriItem, 'prestado');
                console.log('✅ Estado actualizado en ontología: prestado');
            } else {
                console.log('⚠️ No se pudo crear la estructura en la ontología');
            }
        } catch (ontologiaError) {
            console.error('⚠️ Error al actualizar ontología, pero préstamo guardado en MySQL:', ontologiaError.message);
        }

        res.json({
            success: true,
            data: {
                id_prestamo: result.insertId,
                id_usuario,
                uri_item_ontologia,
                fecha_prestamo: new Date(),
                fecha_devolucion_esperada,
                estado: 'activo'
            },
            message: 'Préstamo creado exitosamente'
        });

    } catch (error) {
        console.error('❌ Error al crear préstamo:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor: ' + error.message
        });
    }
});

module.exports = router;