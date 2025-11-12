const express = require('express');
const router = express.Router();
const db = require('../config/db.config');
const { authenticateUser } = require('../middleware/auth.middleware');

// POST /api/prestamos - Crear un nuevo préstamo
router.post('/', authenticateUser, async (req, res) => {
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

// GET /api/prestamos - Obtener préstamos del usuario
router.get('/', authenticateUser, async (req, res) => {
    try {
        const usuarioId = req.user.usuarioId;

        const prestamos = await db.executeQuery(
            `SELECT p.*, u.nombres, u.apellidos 
             FROM prestamos p
             JOIN usuario u ON p.id_usuario = u.id_usuario
             WHERE p.id_usuario = ? AND p.estado = 'activo'
             ORDER BY p.fecha_prestamo DESC`,
            [usuarioId]
        );

        res.json({
            success: true,
            data: prestamos
        });

    } catch (error) {
        console.error('❌ Error al obtener préstamos:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// GET /api/prestamos/:id - Obtener un préstamo específico
router.get('/:id', authenticateUser, async (req, res) => {
    try {
        const { id } = req.params;
        const usuarioId = req.user.usuarioId;

        const prestamo = await db.executeQuery(
            `SELECT p.*, u.nombres, u.apellidos 
             FROM prestamos p
             JOIN usuario u ON p.id_usuario = u.id_usuario
             WHERE p.id_prestamo = ? AND p.id_usuario = ?`,
            [id, usuarioId]
        );

        if (prestamo.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Préstamo no encontrado'
            });
        }

        res.json({
            success: true,
            data: prestamo[0]
        });

    } catch (error) {
        console.error('❌ Error al obtener préstamo:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// PUT /api/prestamos/:id - Actualizar un préstamo (para devoluciones)
router.put('/:id', authenticateUser, async (req, res) => {
    try {
        const { id } = req.params;
        const { estado, fecha_devolucion_real } = req.body;
        const usuarioId = req.user.usuarioId;

        // Verificar que el préstamo existe y pertenece al usuario
        const prestamoExistente = await db.executeQuery(
            'SELECT * FROM prestamos WHERE id_prestamo = ? AND id_usuario = ?',
            [id, usuarioId]
        );

        if (prestamoExistente.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Préstamo no encontrado'
            });
        }

        // Actualizar el préstamo
        await db.executeQuery(
            `UPDATE prestamos 
             SET estado = ?, fecha_devolucion_real = ?
             WHERE id_prestamo = ? AND id_usuario = ?`,
            [estado || 'devuelto', fecha_devolucion_real || new Date(), id, usuarioId]
        );

        res.json({
            success: true,
            message: 'Préstamo actualizado exitosamente'
        });

    } catch (error) {
        console.error('❌ Error al actualizar préstamo:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

module.exports = router;