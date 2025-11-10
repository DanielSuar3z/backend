const express = require('express');
const router = express.Router();
const db = require('../config/db.config');
const { authenticateUser } = require('../middleware/auth.middleware');
const OntologiaService = require('../services/ontologiaService');

// PUT /api/devoluciones/:id_prestamo - Marcar préstamo como devuelto
router.put('/:id_prestamo', authenticateUser, async (req, res) => {
    try {
        const { id_prestamo } = req.params;

        // 1. Actualizar el préstamo en MySQL
        const result = await db.executeQuery(
            `UPDATE prestamos 
             SET estado = 'devuelto', fecha_devolucion_real = NOW() 
             WHERE id_prestamo = ?`,
            [id_prestamo]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                error: 'Préstamo no encontrado'
            });
        }

        // 2. Obtener el URI de la obra para actualizar la ontología
        const [prestamo] = await db.executeQuery(
            'SELECT uri_item_ontologia FROM prestamos WHERE id_prestamo = ?',
            [id_prestamo]
        );

        // 3. Actualizar la ontología - CAMBIO DE ESTADO A "disponible"
        try {
            const uriItem = await OntologiaService.encontrarUriItemPorObra(prestamo.uri_item_ontologia);
            
            if (uriItem) {
                await OntologiaService.actualizarDisponibilidad(uriItem, 'disponible');
                console.log('🔄 Estado actualizado en ontología: disponible');
            }
        } catch (ontologiaError) {
            console.error('⚠️ Error al actualizar ontología:', ontologiaError);
        }

        res.json({
            success: true,
            message: 'Devolución registrada exitosamente'
        });

    } catch (error) {
        console.error('❌ Error al registrar devolución:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

module.exports = router;