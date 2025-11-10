//const bibliotecaModel = require('./models/biblioteca.model');

//async function testModelo() {
  //console.log('Probando getAllObras...');
  //const obras = await bibliotecaModel.getAllObras();
  //console.log('Obras encontradas:', obras.length);
  //obras.forEach(obra => console.log(`- ${obra.titulo} por ${obra.autor}`));
//}

//testModelo();

const { testConnection, executeQuery } = require('./config/db.config.js');
const userModel = require('./models/user.model'); // Asegúrate de que la ruta sea correcta

async function runTests() {
  console.log('🧪 SISTEMA DE PRUEBA MYSQL Y LOGIN\n');

  try {
    // 1. Probar conexión
    console.log('1. 🔌 Probando conexión a MySQL...');
    const connectionSuccess = await testConnection();
    
    if (!connectionSuccess) {
      console.log('💥 Error en la conexión a la base de datos');
      return;
    }

    // 2. Verificar estructura de la base de datos
    console.log('2. 📊 Verificando estructura de la base de datos...');
    try {
      const tablas = await executeQuery('SHOW TABLES');
      console.log('   ✅ Tablas encontradas:');
      
      if (Array.isArray(tablas)) {
        tablas.forEach(tabla => {
          const tableName = Object.values(tabla)[0];
          console.log(`      - ${tableName}`);
        });
      } else {
        console.log('      No se pudieron listar las tablas');
      }
    } catch (error) {
      console.log(`   ❌ Error verificando estructura: ${error.message}`);
    }

    // 3. Obtener usuarios
    console.log('3. 👥 Probando obtención de usuarios...');
    try {
      const usuarios = await executeQuery('SELECT id_usuario, nombres, apellidos, email, id_rol, fecha_registro FROM usuario');
      console.log(`   ✅ Usuarios encontrados: ${usuarios.length}`);
      usuarios.forEach(usuario => {
        const nombreCompleto = `${usuario.nombres} ${usuario.apellidos}`;
        console.log(`      - ${nombreCompleto} (${usuario.email}) - Rol: ${usuario.id_rol}`);
      });
    } catch (error) {
      console.log(`   ❌ Error obteniendo usuarios: ${error.message}`);
    }

    // 4. Buscar usuario por email
    console.log('4. 📧 Probando búsqueda de usuario por email...');
    try {
      const usuario = await userModel.findUserByEmail('jaime1234@gmail.com');
      if (usuario) {
        console.log(`   ✅ Usuario encontrado: ${usuario.nombres} ${usuario.apellidos} (${usuario.email})`);
      } else {
        console.log('   ℹ️  Usuario no encontrado');
      }
    } catch (error) {
      console.log(`   ❌ Error buscando usuario: ${error.message}`);
    }

    // 5. Probar login con credenciales
    console.log('5. 🔐 Probando credenciales de usuario...');
    try {
      const usuario = await userModel.findUserByEmail('jaime1234@gmail.com');
      if (usuario) {
        const bcrypt = require('bcrypt');
        const passwordMatch = await bcrypt.compare('1234', usuario.password_hash);
        
        if (passwordMatch) {
          console.log(`   ✅ Credenciales correctas para: ${usuario.nombres} ${usuario.apellidos}`);
        } else {
          console.log('   ❌ Contraseña incorrecta');
        }
      } else {
        console.log('   ❌ Usuario no encontrado');
      }
    } catch (error) {
      console.log(`   ❌ Error verificando credenciales: ${error.message}`);
    }

    // 6. Probar obtención de roles
    console.log('6. 🏷️ Probando obtención de roles...');
    try {
      const roles = await executeQuery('SELECT * FROM rol');
      console.log(`   ✅ Roles encontrados: ${roles.length}`);
      roles.forEach(rol => {
        console.log(`      - ${rol.nombre_rol} (ID: ${rol.id})`);
      });
    } catch (error) {
      console.log(`   ❌ Error obteniendo roles: ${error.message}`);
    }

    // 7. Consultas adicionales
    console.log('7. 📈 Probando consultas adicionales...');
    try {
      // Préstamos activos
      const prestamosActivos = await executeQuery('SELECT COUNT(*) as count FROM prestamos WHERE estado = "activo"');
      console.log(`   ✅ Préstamos activos: ${prestamosActivos[0].count}`);

      // Configuraciones del sistema
      const configuraciones = await executeQuery('SELECT * FROM configuracion_sistema');
      console.log(`   ⚙️  Configuraciones del sistema: ${configuraciones.length}`);
      configuraciones.forEach(config => {
        console.log(`      ${config.clave}: ${config.valor} - ${config.descripcion}`);
      });
    } catch (error) {
      console.log(`   ❌ Error en consultas adicionales: ${error.message}`);
    }

    console.log('\n🎉 PRUEBAS COMPLETADAS!');

  } catch (error) {
    console.log(`\n💥 ERROR GENERAL EN LAS PRUEBAS: ${error.message}`);
  }
}

runTests();