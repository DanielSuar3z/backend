const { updateClient, queryClient } = require('../config/sparql.config');

class OntologiaService {
    
    // Método para inicializar entidades básicas si no existen
    static async inicializarEntidadesBasicas() {
        try {
            const updateQuery = `
                PREFIX : <http://www.biblioteca.edu.co/ontologia#>
                INSERT DATA {
                    # Crear Editoriales
                    <http://www.biblioteca.edu.co/ontologia#Editorial_Sudamericana> a :EntidadCorporativa ;
                        :nombreEntidad "Editorial Sudamericana" ;
                        :paisEntidad "Argentina" .
                        
                    <http://www.biblioteca.edu.co/ontologia#Editorial_Alfaguara> a :EntidadCorporativa ;
                        :nombreEntidad "Alfaguara" ;
                        :paisEntidad "España" .

                    # Crear Ubicaciones
                    <http://www.biblioteca.edu.co/ontologia#Estanteria_A1> a :Estanteria ;
                        :nombreUbicacion "Estantería A-1 - Literatura Latinoamericana" ;
                        :piso 1 .
                }
            `;
            
            await updateClient.update(updateQuery).execute();
            console.log('✅ Entidades básicas inicializadas');
        } catch (error) {
            console.log('ℹ️ Entidades básicas ya existen o error al crearlas:', error.message);
        }
    }

    // Crear la estructura FRBR completa para una obra si no existe
    static async crearEstructuraFaltante(uriObra) {
        try {
            console.log('🏗️ Creando estructura FRBR para:', uriObra);
            
            const uriBase = 'http://www.biblioteca.edu.co/ontologia#';
            const obraId = uriObra.split('#')[1];
            
            // URIs para las nuevas entidades
            const uriExpresion = `${uriBase}Expresion_${obraId}`;
            const uriManifestacion = `${uriBase}Manifestacion_${obraId}`;
            const uriItem = `${uriBase}Item_${obraId}_1`;

            // Consulta SPARQL UPDATE para crear la estructura completa
            const updateQuery = `
                PREFIX : <http://www.biblioteca.edu.co/ontologia#>
                INSERT DATA {
                    # Crear Expresión
                    <${uriExpresion}> a :Expresion ;
                         :realizaDe <${uriObra}> ;
                         :idiomaExpresion "Español" ;
                         :tipoExpresion "original" .

                    # Crear Manifestación  
                    <${uriManifestacion}> a :Manifestacion ;
                         :materializaDe <${uriExpresion}> ;
                         :formato "impreso" ;
                         :isbn "978-843-972-332-1" ;
                         :anoPublicacion "1967" ;
                         :numeroPaginas "471" ;
                         :publicadaPor <${uriBase}Editorial_Sudamericana> .

                    # Crear Item
                    <${uriItem}> a :Item ;
                         :ejemplificaDe <${uriManifestacion}> ;
                         :disponibilidad "disponible" ;
                         :codigoBarras "ITEM-${obraId}-001" ;
                         :estadoFisico "bueno" ;
                         :ubicadoEn <${uriBase}Estanteria_A1> .
                }
            `;

            console.log('🔨 Ejecutando creación de estructura FRBR...');
            await updateClient.update(updateQuery).execute();
            console.log('✅ Estructura FRBR creada exitosamente');
            
            return uriItem;

        } catch (error) {
            console.error('❌ Error al crear estructura FRBR:', error);
            throw error;
        }
    }

    // Buscar o crear Item para una obra
    static async obtenerOCrearItem(uriObra) {
        try {
            // Primero intentar encontrar Item existente
            const itemExistente = await this.encontrarUriItemPorObra(uriObra);
            
            if (itemExistente) {
                console.log('✅ Item existente encontrado:', itemExistente);
                return itemExistente;
            }
            
            // Si no existe, crear estructura completa
            console.log('📦 No se encontró Item, creando estructura FRBR...');
            const nuevoItem = await this.crearEstructuraFaltante(uriObra);
            return nuevoItem;

        } catch (error) {
            console.error('❌ Error en obtenerOCrearItem:', error);
            throw error;
        }
    }

    // Actualizar disponibilidad
    static async actualizarDisponibilidad(uriItem, nuevoEstado) {
        try {
            const updateQuery = `
                PREFIX : <http://www.biblioteca.edu.co/ontologia#>
                DELETE {
                    ?item :disponibilidad ?estadoAnterior .
                }
                INSERT {
                    ?item :disponibilidad "${nuevoEstado}" .
                }
                WHERE {
                    ?item a :Item .
                    ?item :disponibilidad ?estadoAnterior .
                    FILTER(?item = <${uriItem}>)
                }
            `;

            console.log('🔄 Actualizando disponibilidad a:', nuevoEstado);
            await updateClient.update(updateQuery).execute();
            console.log('✅ Disponibilidad actualizada correctamente');
            
            return true;
        } catch (error) {
            console.error('❌ Error al actualizar disponibilidad:', error);
            throw error;
        }
    }

    // Encontrar Item existente (versión mejorada)
    static async encontrarUriItemPorObra(uriObra) {
        try {
            const query = `
                PREFIX : <http://www.biblioteca.edu.co/ontologia#>
                SELECT DISTINCT ?item WHERE {
                    ?item a :Item .
                    ?item :ejemplificaDe ?manifestacion .
                    ?manifestacion :materializaDe ?expresion .
                    ?expresion :realizaDe <${uriObra}> .
                }
                LIMIT 1
            `;

            const result = await queryClient.query(query).execute();
            
            if (result && result.length > 0) {
                const uriItem = result[0].item.value;
                return uriItem;
            }
            return null;

        } catch (error) {
            console.error('❌ Error al buscar Item:', error);
            return null;
        }
    }
}

module.exports = OntologiaService;