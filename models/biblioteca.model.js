const { queryClient } = require('../config/sparql.config');

async function getAllObras() {
  const query = `
    PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    PREFIX owl: <http://www.w3.org/2002/07/owl#>
    PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
    PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
    PREFIX : <http://www.biblioteca.edu.co/ontologia#>

    SELECT ?obra ?titulo ?autorNombre ?autorApellidos ?genero ?isbn ?formato ?disponibilidad
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
      
      # Información de la manifestación (ISBN, formato)
      OPTIONAL {
        ?expresion :realizaDe ?obra .
        ?manifestacion :materializaDe ?expresion .
        ?manifestacion a :Manifestacion .
        OPTIONAL { ?manifestacion :isbn ?isbn . }
        OPTIONAL { ?manifestacion :formato ?formato . }
        
        # Disponibilidad del ítem
        OPTIONAL {
          ?item :ejemplificaDe ?manifestacion .
          ?item a :Item .
          OPTIONAL { ?item :disponibilidad ?disponibilidad . }
        }
      }
    }
    ORDER BY ?titulo
  `;

  try {    
    const resultados = await queryClient.query(query).execute();        
    
    // Transformar los resultados SPARQL a un formato similar al MySQL
    return resultados.results.bindings.map(item => {
      const idObra = item.obra.value.split('#').pop();
      const autorNombre = item.autorNombre?.value || '';
      const autorApellidos = item.autorApellidos?.value || '';
      const autorCompleto = autorNombre || autorApellidos 
        ? `${autorNombre} ${autorApellidos}`.trim() 
        : 'Autor desconocido';

      return {
        id_obra: idObra,
        titulo: item.titulo.value,
        autor: autorCompleto,
        genero: item.genero?.value || 'No especificado',
        isbn: item.isbn?.value || null,
        formato: item.formato?.value || null,
        disponibilidad: item.disponibilidad?.value || 'desconocida'        
      };
      
    });
    
  } catch (error) {
    console.error('Error en getAllObras:', error);
    throw new Error('Error al obtener obras desde la ontología');        
  }
}

module.exports = {
  getAllObras
};