const { client } = require('../config/sparql.config');
const { successResponse, errorResponse } = require('../utils/response');

async function getEnrichedBibliographicResources(req, res) {
  try {
    const consultaOntologia = `
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      PREFIX owl: <http://www.w3.org/2002/07/owl#>
      PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
      PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
      PREFIX : <http://www.biblioteca.edu.co/ontologia#>

      SELECT ?obra ?expresion ?manifestacion ?item
             (STR(?tituloOriginal) AS ?Titulo_)
             (STR(?anoCreacion) AS ?Ano_Creacion_)
             (STR(?idiomaOriginal) AS ?Idioma_Original_)
             (STR(?nombreAutor) AS ?Autor_Nombre_)
             (STR(?apellidosAutor) AS ?Autor_Apellidos_)
             (STR(?idiomaExpresion) AS ?Idioma_Expresion_)
             (STR(?tipoExpresion) AS ?Tipo_Expresion_)
             (STR(?isbn) AS ?ISBN_)
             (STR(?formato) AS ?Formato_)
             (STR(?anoPublicacion) AS ?Ano_Publicacion_)
             (STR(?numeroPaginas) AS ?Paginas_)
             (STR(?codigoBarras) AS ?Codigo_Barras_)
             (STR(?disponibilidad) AS ?Disponibilidad_)
             (STR(?estadoFisico) AS ?Estado_Fisico_)
             (STR(?signaturaTopografica) AS ?Signatura_)
             (STR(?nombreUbicacion) AS ?Ubicacion_)
             (STR(?terminoMateria) AS ?Materia_)
             (STR(?nombreGenero) AS ?Genero_)
      WHERE {
        # Obra principal
        ?obra a :Obra .
        ?obra :tituloOriginal ?tituloOriginal .
        OPTIONAL { ?obra :anoCreacion ?anoCreacion . }
        OPTIONAL { ?obra :idiomaOriginal ?idiomaOriginal . }
        
        # Autor de la obra
        OPTIONAL {
          ?obra :tieneAutor ?autor .
          ?autor :nombre ?nombreAutor ;
                 :apellidos ?apellidosAutor .
        }
        
        # Expresión de la obra
        OPTIONAL {
          ?expresion :realizaDe ?obra .
          ?expresion a :Expresion .
          OPTIONAL { ?expresion :idiomaExpresion ?idiomaExpresion . }
          OPTIONAL { ?expresion :tipoExpresion ?tipoExpresion . }
          
          # Traductor de la expresión
          OPTIONAL {
            ?expresion :tieneTraductor ?traductor .
            ?traductor :nombre ?nombreTraductor ;
                       :apellidos ?apellidosTraductor .
          }
        }
        
        # Manifestación de la expresión
        OPTIONAL {
          ?manifestacion :materializaDe ?expresion .
          ?manifestacion a :Manifestacion .
          OPTIONAL { ?manifestacion :isbn ?isbn . }
          OPTIONAL { ?manifestacion :formato ?formato . }
          OPTIONAL { ?manifestacion :anoPublicacion ?anoPublicacion . }
          OPTIONAL { ?manifestacion :numeroPaginas ?numeroPaginas . }
          OPTIONAL { ?manifestacion :numeroEdicion ?numeroEdicion . }
          
          # Editorial/publicador
          OPTIONAL {
            ?manifestacion :publicadaPor ?editorial .
            ?editorial :nombreEntidad ?nombreEditorial .
          }
        }
        
        # Item físico
        OPTIONAL {
          ?item :ejemplificaDe ?manifestacion .
          ?item a :Item .
          OPTIONAL { ?item :codigoBarras ?codigoBarras . }
          OPTIONAL { ?item :disponibilidad ?disponibilidad . }
          OPTIONAL { ?item :estadoFisico ?estadoFisico . }
          OPTIONAL { ?item :signaturaTopografica ?signaturaTopografica . }
          
          # Ubicación física
          OPTIONAL {
            ?item :ubicadoEn ?ubicacion .
            ?ubicacion :nombreUbicacion ?nombreUbicacion .
            OPTIONAL { ?ubicacion :piso ?piso . }
          }
        }
        
        # Materias tratadas en la obra
        OPTIONAL {
          ?obra :trataSobre ?materia .
          ?materia :terminoMateria ?terminoMateria .
          OPTIONAL { ?materia :clasificacionDewey ?clasificacionDewey . }
        }
        
        # Género literario
        OPTIONAL {
          ?obra :perteneceAGenero ?genero .
          ?genero :nombreGenero ?nombreGenero .
        }
      }
    `;

    // 1. Ejecutar consulta SPARQL
    const resultadosOntologia = await client.query(consultaOntologia).execute();

    // 2. Formatear los resultados de la ontología
    const recursosBibliograficos = resultadosOntologia.results.bindings.map(item => {
      // Extraer IDs limpios de las URIs
      const idObra = item.obra ? item.obra.value.split('#').pop() : null;
      const idExpresion = item.expresion ? item.expresion.value.split('#').pop() : null;
      const idManifestacion = item.manifestacion ? item.manifestacion.value.split('#').pop() : null;
      const idItem = item.item ? item.item.value.split('#').pop() : null;

      return {
        // Identificadores
        id_obra: idObra,
        id_expresion: idExpresion,
        id_manifestacion: idManifestacion,
        id_item: idItem,
        
        // Información de la obra
        titulo: item.Titulo_?.value || 'Sin título',
        ano_creacion: item.Ano_Creacion_?.value || null,
        idioma_original: item.Idioma_Original_?.value || null,
        
        // Autor
        autor: item.Autor_Nombre_?.value || item.Autor_Apellidos_?.value 
               ? `${item.Autor_Nombre_?.value || ''} ${item.Autor_Apellidos_?.value || ''}`.trim()
               : 'Autor desconocido',
        
        // Expresión
        idioma_expresion: item.Idioma_Expresion_?.value || null,
        tipo_expresion: item.Tipo_Expresion_?.value || null,
        
        // Manifestación
        isbn: item.ISBN_?.value || null,
        formato: item.Formato_?.value || null,
        ano_publicacion: item.Ano_Publicacion_?.value || null,
        numero_paginas: item.Paginas_?.value ? parseInt(item.Paginas_.value) : null,
        
        // Item físico
        codigo_barras: item.Codigo_Barras_?.value || null,
        disponibilidad: item.Disponibilidad_?.value || null,
        estado_fisico: item.Estado_Fisico_?.value || null,
        signatura_topografica: item.Signatura_?.value || null,
        ubicacion: item.Ubicacion_?.value || null,
        
        // Clasificación
        materia: item.Materia_?.value || null,
        genero: item.Genero_?.value || null
      };
    });

    return successResponse(res, recursosBibliograficos, 'Recursos bibliográficos obtenidos exitosamente desde la ontología');

  } catch (error) {
    console.error('Error al obtener recursos bibliográficos desde la ontología:', error);
    return errorResponse(res, 'Error al obtener datos de recursos bibliográficos desde la ontología');
  }
}

module.exports = {
  getEnrichedBibliographicResources
};