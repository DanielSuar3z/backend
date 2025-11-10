const { queryClient, updateClient } = require('../config/sparql.config');
const { successResponse, errorResponse } = require('../utils/response');

async function queryOntology(req, res) {
  try {
    const consultaSPARQL = `
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      PREFIX owl: <http://www.w3.org/2002/07/owl#>
      PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
      PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
      PREFIX : <http://www.biblioteca.edu.co/ontologia#>

      SELECT ?obra 
             (STR(?titulo) AS ?Titulo_)
             (STR(?autorNombre) AS ?Autor_Nombre_)
             (STR(?autorApellidos) AS ?Autor_Apellidos_)
             (STR(?genero) AS ?Genero_)
             (STR(?isbn) AS ?ISBN_)
             (STR(?formato) AS ?Formato_)
             (STR(?disponibilidad) AS ?Disponibilidad_)
             (STR(?ubicacion) AS ?Ubicacion_)
      WHERE {
        ?obra a :Obra .
        ?obra :tituloOriginal ?titulo .
        
        # Información del autor
        OPTIONAL {
          ?obra :tieneAutor ?autor .
          ?autor :nombre ?autorNombre ;
                 :apellidos ?autorApellidos .
        }
        
        # Género literario
        OPTIONAL {
          ?obra :perteneceAGenero ?gen .
          ?gen :nombreGenero ?genero .
        }
        
        # Información de la manifestación
        OPTIONAL {
          ?expresion :realizaDe ?obra .
          ?manifestacion :materializaDe ?expresion .
          OPTIONAL { ?manifestacion :isbn ?isbn . }
          OPTIONAL { ?manifestacion :formato ?formato . }
          
          # Información del ítem físico
          OPTIONAL {
            ?item :ejemplificaDe ?manifestacion .
            OPTIONAL { ?item :disponibilidad ?disponibilidad . }
            
            # Ubicación
            OPTIONAL {
              ?item :ubicadoEn ?ubic .
              ?ubic :nombreUbicacion ?ubicacion .
            }
          }
        }
      }
      ORDER BY ?titulo
    `;

    // 1. Ejecutar consulta SPARQL
    const resultadosOntologia = await queryClient.query(consultaSPARQL).execute();

    // 2. Formatear los resultados para el frontend
    const obrasFormateadas = resultadosOntologia.results.bindings.map(item => {
      const idObra = item.obra ? item.obra.value.split('#').pop() : null;
      const autorNombre = item.Autor_Nombre_?.value || '';
      const autorApellidos = item.Autor_Apellidos_?.value || '';
      const autorCompleto = autorNombre || autorApellidos 
        ? `${autorNombre} ${autorApellidos}`.trim() 
        : 'Autor desconocido';

      return {
        id_obra: idObra,
        titulo: item.Titulo_ ? item.Titulo_.value : null,
        autor: autorCompleto,
        genero: item.Genero_ ? item.Genero_.value : null,
        isbn: item.ISBN_ ? item.ISBN_.value : null,
        formato: item.Formato_ ? item.Formato_.value : null,
        disponibilidad: item.Disponibilidad_ ? item.Disponibilidad_.value : 'desconocida',
        ubicacion: item.Ubicacion_ ? item.Ubicacion_.value : null
      };
    });

    // 3. Responder con los datos formateados
    return successResponse(res, obrasFormateadas, 'Obras de ontología obtenidas exitosamente');

  } catch (error) {
    console.error('Error consultando ontología de biblioteca:', error);
    return errorResponse(res, 'Error interno del servidor al consultar la ontología', error.message);
  }
}

async function createObra(req, res) {
  try {
    if (!req.body || Object.keys(req.body).length === 0) {
      return errorResponse(res, 'No se recibieron datos en el cuerpo de la petición', 400);
    }

    const {
      titulo,
      autorNombre,
      autorApellidos,
      genero,
      materia,
      idiomaOriginal,
      anoCreacion,
      isbn,
      formato,
      numeroPaginas,
      editorial,
      codigoBarras,
      ubicacion
    } = req.body;

    // Validación básica
    if (!titulo || !autorNombre || !autorApellidos) {
      return errorResponse(res, 'Título, nombre y apellidos del autor son obligatorios', 400);
    }

    // Generar URIs únicas
    const obraUri = `Obra_${Date.now()}`;
    const autorUri = `Autor_${Date.now()}`;
    const expresionUri = `Expresion_${Date.now()}`;
    const manifestacionUri = `Manifestacion_${Date.now()}`;
    const itemUri = `Item_${Date.now()}`;

    // Construir la consulta INSERT
    const insertQuery = `
      PREFIX : <http://www.biblioteca.edu.co/ontologia#>
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

      INSERT DATA {
        # Autor
        :${autorUri} rdf:type :Persona ;
                    :nombre "${autorNombre}" ;
                    :apellidos "${autorApellidos}" .

        # Obra
        :${obraUri} rdf:type :Obra ;
                   :tituloOriginal "${titulo}" ;
                   :tieneAutor :${autorUri} .

        # Expresión
        :${expresionUri} rdf:type :Expresion ;
                        :realizaDe :${obraUri} ;
                        :idiomaExpresion "${idiomaOriginal || 'Español'}" ;
                        :tipoExpresion "original" .

        # Manifestación
        :${manifestacionUri} rdf:type :Manifestacion ;
                            :materializaDe :${expresionUri} ;
                            :formato "${formato || 'impreso'}" .

        # Item
        :${itemUri} rdf:type :Item ;
                   :ejemplificaDe :${manifestacionUri} ;
                   :disponibilidad "disponible" .
    `;

    // Añadir propiedades opcionales
    let optionalProperties = '';

    if (genero) {
      const generoUri = `Genero_${Date.now()}`;
      optionalProperties += `
        :${generoUri} rdf:type :Genero ;
                     :nombreGenero "${genero}" .
        :${obraUri} :perteneceAGenero :${generoUri} .`;
    }

    if (materia) {
      const materiaUri = `Materia_${Date.now()}`;
      optionalProperties += `
        :${materiaUri} rdf:type :Materia ;
                      :terminoMateria "${materia}" .
        :${obraUri} :trataSobre :${materiaUri} .`;
    }

    if (anoCreacion) {
      optionalProperties += `
        :${obraUri} :anoCreacion "${anoCreacion}"^^xsd:gYear .`;
    }

    if (idiomaOriginal) {
      optionalProperties += `
        :${obraUri} :idiomaOriginal "${idiomaOriginal}" .`;
    }

    if (isbn) {
      optionalProperties += `
        :${manifestacionUri} :isbn "${isbn}" .`;
    }

    if (numeroPaginas) {
      optionalProperties += `
        :${manifestacionUri} :numeroPaginas "${parseInt(numeroPaginas)}"^^xsd:integer .`;
    }

    if (editorial) {
      const editorialUri = `Editorial_${Date.now()}`;
      optionalProperties += `
        :${editorialUri} rdf:type :EntidadCorporativa ;
                        :nombreEntidad "${editorial}" .
        :${manifestacionUri} :publicadaPor :${editorialUri} .`;
    }

    if (codigoBarras) {
      optionalProperties += `
        :${itemUri} :codigoBarras "${codigoBarras}" .`;
    }

    if (ubicacion) {
      const ubicacionUri = `Ubicacion_${Date.now()}`;
      optionalProperties += `
        :${ubicacionUri} rdf:type :UbicacionFisica ;
                        :nombreUbicacion "${ubicacion}" .
        :${itemUri} :ubicadoEn :${ubicacionUri} .`;
    }

    const finalInsertQuery = insertQuery + optionalProperties + '\n}';

    console.log("Consulta INSERT SPARQL para obra:\n", finalInsertQuery);

    // Ejecutar la consulta INSERT
    await updateClient.query(finalInsertQuery).execute();

    return successResponse(res, { 
      message: 'Obra creada exitosamente en la ontología', 
      uri: obraUri 
    });

  } catch (error) {
    console.error('Error al crear obra en la ontología:', error);
    return errorResponse(res, `Error al crear obra: ${error.message}`);
  }
}

async function getGenerosLiterarios(req, res) {
  try {
    const queryGeneros = `
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      PREFIX owl: <http://www.w3.org/2002/07/owl#>
      PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
      PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
      PREFIX : <http://www.biblioteca.edu.co/ontologia#>
      
      SELECT DISTINCT ?genero (STR(?nombreGenero) AS ?nombre)
      WHERE {
        ?genero rdf:type :Genero .
        ?genero :nombreGenero ?nombreGenero .
      }
      ORDER BY ?nombreGenero
    `;

    const result = await queryClient.query(queryGeneros).execute();

    const generos = result.results.bindings.map(binding => {
      const idGenero = binding.genero.value.split('#').pop();
      return { 
        id: idGenero, 
        name: binding.nombre.value 
      };
    });

    return successResponse(res, generos, 'Géneros literarios obtenidos exitosamente');

  } catch (error) {
    console.error('Error al obtener géneros literarios:', error);
    return errorResponse(res, 'Error al obtener géneros literarios', error.message);
  }
}

async function getMaterias(req, res) {
  try {
    const queryMaterias = `
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      PREFIX owl: <http://www.w3.org/2002/07/owl#>
      PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
      PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
      PREFIX : <http://www.biblioteca.edu.co/ontologia#>
      
      SELECT DISTINCT ?materia (STR(?terminoMateria) AS ?nombre)
      WHERE {
        ?materia rdf:type :Materia .
        ?materia :terminoMateria ?terminoMateria .
      }
      ORDER BY ?terminoMateria
    `;

    const result = await queryClient.query(queryMaterias).execute();

    const materias = result.results.bindings.map(binding => {
      const idMateria = binding.materia.value.split('#').pop();
      return { 
        id: idMateria, 
        name: binding.nombre.value 
      };
    });

    return successResponse(res, materias, 'Materias obtenidas exitosamente');

  } catch (error) {
    console.error('Error al obtener materias:', error);
    return errorResponse(res, 'Error al obtener materias', error.message);
  }
}

const PREFIXES = `
    PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
    PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
    PREFIX : <http://www.biblioteca.edu.co/ontologia#>
`;

async function buscarObras(req, res) {
    try {
        const { titulo, autor, genero, materia, disponibilidad } = req.query;

        let sparqlQuery = `
            ${PREFIXES}

            SELECT ?obra 
                  (STR(?tituloOriginal) AS ?Titulo_)
                  (STR(?autorNombre) AS ?Autor_Nombre_)
                  (STR(?autorApellidos) AS ?Autor_Apellidos_)
                  (STR(?generoNombre) AS ?Genero_)
                  (STR(?materiaNombre) AS ?Materia_)
                  (STR(?isbn) AS ?ISBN_)
                  (STR(?formato) AS ?Formato_)
                  (STR(?disponibilidadItem) AS ?Disponibilidad_)
                  (STR(?ubicacionNombre) AS ?Ubicacion_)
            WHERE {
              ?obra a :Obra .
              ?obra :tituloOriginal ?tituloOriginal .
              
              # Información del autor
              OPTIONAL {
                ?obra :tieneAutor ?autorObj .
                ?autorObj :nombre ?autorNombre ;
                         :apellidos ?autorApellidos .
              }
              
              # Género
              OPTIONAL {
                ?obra :perteneceAGenero ?generoObj .
                ?generoObj :nombreGenero ?generoNombre .
              }
              
              # Materia
              OPTIONAL {
                ?obra :trataSobre ?materiaObj .
                ?materiaObj :terminoMateria ?materiaNombre .
              }
              
              # Información de la manifestación e ítem
              OPTIONAL {
                ?expresion :realizaDe ?obra .
                ?manifestacion :materializaDe ?expresion .
                OPTIONAL { ?manifestacion :isbn ?isbn . }
                OPTIONAL { ?manifestacion :formato ?formato . }
                
                ?item :ejemplificaDe ?manifestacion .
                OPTIONAL { ?item :disponibilidad ?disponibilidadItem . }
                
                # Ubicación
                OPTIONAL {
                  ?item :ubicadoEn ?ubicacionObj .
                  ?ubicacionObj :nombreUbicacion ?ubicacionNombre .
                }
              }
        `;

        // Aplicar filtros
        if (titulo) {
            sparqlQuery += ` FILTER regex(lcase(str(?tituloOriginal)), lcase("${titulo}"), "i") .`;
        }

        if (autor) {
            sparqlQuery += ` FILTER (regex(lcase(str(?autorNombre)), lcase("${autor}"), "i") || 
                                 regex(lcase(str(?autorApellidos)), lcase("${autor}"), "i")) .`;
        }

        if (genero) {
            sparqlQuery += ` FILTER regex(lcase(str(?generoNombre)), lcase("${genero}"), "i") .`;
        }

        if (materia) {
            sparqlQuery += ` FILTER regex(lcase(str(?materiaNombre)), lcase("${materia}"), "i") .`;
        }

        if (disponibilidad) {
            sparqlQuery += ` FILTER (?disponibilidadItem = "${disponibilidad}") .`;
        }

        sparqlQuery += `} ORDER BY ?tituloOriginal`;

        console.log("Consulta SPARQL para búsqueda de obras:", sparqlQuery);

        const resultadosOntologia = await queryClient.query(sparqlQuery).execute();

        const obrasFormateadas = resultadosOntologia.results.bindings.map(item => {
            const idObra = item.obra ? item.obra.value.split('#').pop() : null;
            const autorNombre = item.Autor_Nombre_?.value || '';
            const autorApellidos = item.Autor_Apellidos_?.value || '';
            const autorCompleto = autorNombre || autorApellidos 
                ? `${autorNombre} ${autorApellidos}`.trim() 
                : 'Autor desconocido';

            return {
                id_obra: idObra,
                titulo: item.Titulo_ ? item.Titulo_.value : null,
                autor: autorCompleto,
                genero: item.Genero_ ? item.Genero_.value : null,
                materia: item.Materia_ ? item.Materia_.value : null,
                isbn: item.ISBN_ ? item.ISBN_.value : null,
                formato: item.Formato_ ? item.Formato_.value : null,
                disponibilidad: item.Disponibilidad_ ? item.Disponibilidad_.value : 'desconocida',
                ubicacion: item.Ubicacion_ ? item.Ubicacion_.value : null
            };
        });

        return successResponse(res, obrasFormateadas, 'Búsqueda de obras completada exitosamente');

    } catch (error) {
        console.error('Error al buscar obras:', error);
        return errorResponse(res, 'Error al buscar obras', error.message);
    }
}

async function getUbicacionesUnicas(req, res) {
    try {
        const consultaSPARQL = `
            ${PREFIXES}

            SELECT DISTINCT (STR(?nombreUbicacion) AS ?Ubicacion_)
            WHERE {
                ?ubicacion :nombreUbicacion ?nombreUbicacion .
            }
            ORDER BY ?nombreUbicacion
        `;

        const resultadosOntologia = await queryClient.query(consultaSPARQL).execute();
        const bindings = resultadosOntologia.results.bindings;

        const ubicacionesFormateadas = bindings.map(item => {
            return item.Ubicacion_ ? item.Ubicacion_.value : null;
        }).filter(ubicacion => ubicacion !== null);

        return successResponse(res, ubicacionesFormateadas, 'Ubicaciones obtenidas exitosamente');

    } catch (error) {
        console.error('Error consultando ubicaciones:', error);
        return errorResponse(res, 'Error al obtener ubicaciones', error.message);
    }
}

async function getAutoresUnicos(req, res) {
    try {
        const consultaSPARQL = `
            ${PREFIXES}

            SELECT DISTINCT 
                  (STR(?nombre) AS ?Nombre_)
                  (STR(?apellidos) AS ?Apellidos_)
            WHERE {
                ?autor a :Persona .
                ?autor :nombre ?nombre ;
                       :apellidos ?apellidos .
            }
            ORDER BY ?apellidos ?nombre
        `;

        const resultadosOntologia = await queryClient.query(consultaSPARQL).execute();
        const bindings = resultadosOntologia.results.bindings;

        const autoresFormateados = bindings.map(item => {
            const nombre = item.Nombre_?.value || '';
            const apellidos = item.Apellidos_?.value || '';
            return `${nombre} ${apellidos}`.trim();
        }).filter(autor => autor !== '');

        return successResponse(res, autoresFormateados, 'Autores obtenidos exitosamente');

    } catch (error) {
        console.error('Error consultando autores:', error);
        return errorResponse(res, 'Error al obtener autores', error.message);
    }
}

async function getObraById(req, res) {
    try {
        const { id } = req.params;

        const consultaSPARQL = `
            ${PREFIXES}

            SELECT ?obra ?titulo ?autorNombre ?autorApellidos ?genero ?materia 
                   ?isbn ?formato ?anoPublicacion ?numeroPaginas ?disponibilidad 
                   ?ubicacion ?codigoBarras ?estadoFisico ?idiomaOriginal ?anoCreacion
            WHERE {
              ?obra a :Obra ;
                    :tituloOriginal ?titulo .
              
              FILTER (STRENDS(STR(?obra), "#${id}"))
              
              # Información básica de la obra
              OPTIONAL { ?obra :idiomaOriginal ?idiomaOriginal . }
              OPTIONAL { ?obra :anoCreacion ?anoCreacion . }
              
              # Autor
              OPTIONAL {
                ?obra :tieneAutor ?autor .
                ?autor :nombre ?autorNombre ;
                       :apellidos ?autorApellidos .
              }
              
              # Género
              OPTIONAL {
                ?obra :perteneceAGenero ?gen .
                ?gen :nombreGenero ?genero .
              }
              
              # Materias
              OPTIONAL {
                ?obra :trataSobre ?mat .
                ?mat :terminoMateria ?materia .
              }
              
              # Información de la manifestación
              OPTIONAL {
                ?expresion :realizaDe ?obra .
                ?manifestacion :materializaDe ?expresion .
                ?manifestacion a :Manifestacion .
                OPTIONAL { ?manifestacion :isbn ?isbn . }
                OPTIONAL { ?manifestacion :formato ?formato . }
                OPTIONAL { ?manifestacion :anoPublicacion ?anoPublicacion . }
                OPTIONAL { ?manifestacion :numeroPaginas ?numeroPaginas . }
                
                # Información del ítem físico
                OPTIONAL {
                  ?item :ejemplificaDe ?manifestacion .
                  ?item a :Item .
                  OPTIONAL { ?item :disponibilidad ?disponibilidad . }
                  OPTIONAL { ?item :codigoBarras ?codigoBarras . }
                  OPTIONAL { ?item :estadoFisico ?estadoFisico . }
                  
                  # Ubicación
                  OPTIONAL {
                    ?item :ubicadoEn ?ubic .
                    ?ubic :nombreUbicacion ?ubicacion .
                  }
                }
              }
            }
        `;

        const resultados = await queryClient.query(consultaSPARQL).execute();
        
        if (resultados.results.bindings.length === 0) {
            return errorResponse(res, 'Obra no encontrada', 404);
        }

        const item = resultados.results.bindings[0];
        const autorNombre = item.autorNombre?.value || '';
        const autorApellidos = item.autorApellidos?.value || '';
        const autorCompleto = autorNombre || autorApellidos 
            ? `${autorNombre} ${autorApellidos}`.trim() 
            : 'Autor desconocido';

        const obraDetallada = {
            id_obra: id,
            titulo: item.titulo.value,
            autor: autorCompleto,
            genero: item.genero?.value || 'No especificado',
            materia: item.materia?.value || null,
            isbn: item.isbn?.value || null,
            formato: item.formato?.value || null,
            ano_publicacion: item.anoPublicacion?.value || null,
            numero_paginas: item.numeroPaginas?.value ? parseInt(item.numeroPaginas.value) : null,
            disponibilidad: item.disponibilidad?.value || 'desconocida',
            ubicacion: item.ubicacion?.value || null,
            codigo_barras: item.codigoBarras?.value || null,
            estado_fisico: item.estadoFisico?.value || null,
            idioma_original: item.idiomaOriginal?.value || null,
            ano_creacion: item.anoCreacion?.value || null
        };

        return successResponse(res, obraDetallada, 'Obra obtenida exitosamente');

    } catch (error) {
        console.error('Error al obtener obra por ID:', error);
        return errorResponse(res, 'Error al obtener obra', error.message);
    }
}

module.exports = {
  queryOntology,
  getGenerosLiterarios,
  getMaterias,
  createObra,
  buscarObras,
  getUbicacionesUnicas,
  getAutoresUnicos,
  getObraById
};