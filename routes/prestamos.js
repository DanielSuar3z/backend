const express = require('express');
const router = express.Router();
const db = require('../config/db.config');
const { authenticateUser } = require('../middleware/auth.middleware');
const { queryClient, updateClient } = require('../config/sparql.config');

// POST /api/prestamos - Crear un nuevo préstamo
router.post('/', authenticateUser, async (req, res) => {
    try {
        const { id_usuario, codigo_barras, fecha_devolucion_esperada } = req.body;

        console.log('📦 Datos recibidos:', { id_usuario, codigo_barras, fecha_devolucion_esperada });

        // Validaciones básicas
        //if (!id_usuario || !codigo_barras || !fecha_devolucion_esperada) {
         //   return res.status(400).json({
         //       success: false,
         //       error: 'Todos los campos son requeridos'
          //  });
      //  }

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

        // 1. BUSCAR EL ÍTEM POR CÓDIGO DE BARRAS en la ontología
        let itemURI = null;
        let obraInfo = null;
        
        try {
            console.log('🔍 Buscando ítem por código de barras en ontología...');
            
            const findItemQuery = `
                PREFIX : <http://www.biblioteca.edu.co/ontologia#>
                SELECT ?item ?codigoBarras ?disponibilidad ?tituloObra ?autor ?obra
                WHERE {
                  ?item a :Item ;
                        :codigoBarras "${codigo_barras}" ;
                        :disponibilidad ?disponibilidad .
                  
                  ?manifestacion :esEjemplificadaPor ?item .
                  ?expresion :esMaterializadaPor ?manifestacion .
                  ?obra :esRealizadaPor ?expresion ;
                        :tituloOriginal ?tituloObra .
                  
                  OPTIONAL {
                    ?obra :tieneAutor ?autorObj .
                    ?autorObj :nombreCompleto ?autor .
                  }
                }
                LIMIT 1
            `;

            console.log('🔧 Ejecutando consulta SPARQL para encontrar ítem:', findItemQuery);
            
            const results = await queryClient.query(findItemQuery).execute();
            
            if (results.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'No se encontró el ítem con el código de barras proporcionado'
                });
            }

            itemURI = results[0].item.value;
            const disponibilidad = results[0].disponibilidad.value;
            obraInfo = {
                titulo: results[0].tituloObra.value,
                autor: results[0].autor?.value || 'Desconocido',
                obraURI: results[0].obra.value
            };
            
            if (disponibilidad !== 'disponible') {
                return res.status(400).json({
                    success: false,
                    error: `El ítem no está disponible. Estado actual: ${disponibilidad}`
                });
            }
            
            console.log('✅ Ítem encontrado:', { itemURI, codigo_barras, disponibilidad, obraInfo });

        } catch (sparqlError) {
            console.error('❌ Error al buscar ítem en ontología:', sparqlError);
            return res.status(500).json({
                success: false,
                error: 'Error al verificar disponibilidad en la ontología'
            });
        }

        // 2. Insertar el préstamo en MySQL (guardando el código de barras)
        const result = await db.executeQuery(
            `INSERT INTO prestamos 
             (id_usuario, uri_item_ontologia, fecha_devolucion_esperada, estado, id_usuario_registro) 
             VALUES (?, ?, ?, 'activo', ?)`,
            [id_usuario, codigo_barras, fecha_devolucion_esperada, id_usuario]
        );

        console.log('✅ Préstamo creado exitosamente. ID:', result.insertId);

        // 3. ACTUALIZAR EL ÍTEM en la ontología a "prestado"
        try {
            console.log('🔄 Actualizando disponibilidad del ítem en ontología...');
            
            const updateItemQuery = `
                PREFIX : <http://www.biblioteca.edu.co/ontologia#>
                DELETE { 
                    <${itemURI}> :disponibilidad "disponible" .
                }
                INSERT {
                    <${itemURI}> :disponibilidad "prestado" .
                }
                WHERE {
                    <${itemURI}> :disponibilidad "disponible" .
                }
            `;

            console.log('🔧 Ejecutando actualización del ítem:', updateItemQuery);
            await updateClient.query(updateItemQuery).execute();
            console.log('✅ Estado del ítem actualizado: prestado');

        } catch (updateError) {
            console.error('❌ Error al actualizar ontología:', updateError);
            // Aunque falle la actualización de la ontología, el préstamo ya está guardado en MySQL
        }

        res.json({
            success: true,
            data: {
                id_prestamo: result.insertId,
                id_usuario,
                codigo_barras: codigo_barras,
                item_uri: itemURI,
                obra_info: obraInfo,
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