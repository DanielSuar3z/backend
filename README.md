Biblioteca Digital - Backend

Sistema backend para la gestión integral de una biblioteca digital, implementando un modelo de conocimiento basado en ontologías FRBR y gestión tradicional de bases de datos.

Características Principales

- Autenticación JWT - Sistema seguro de usuarios y roles
- Gestión Ontológica - Integración con Fuseki para conocimiento semántico
- Préstamos y Reservas - Sistema completo de gestión de préstamos
- Sincronización Dual - Base de datos MySQL + Ontología Fuseki
- Modelo FRBR - Implementación del modelo conceptual IFLA FRBR
- Búsqueda Semántica - Consultas SPARQL avanzadas

Tecnologías Utilizadas

### Backend
- **Node.js** v18+ - Entorno de ejecución
- **Express.js** - Framework web
- **MySQL2** - Cliente de base de datos
- **JWT** - Autenticación por tokens
- **SPARQL HTTP Client** - Conexión a ontologías

Base de Datos
- **MySQL 8.0** - Base de datos relacional
- **Apache Jena Fuseki 4.0** - Servidor SPARQL
- **Ontología FRBR** - Modelo conceptual bibliográfico

Instalación y Configuración

Prerrequisitos
- Node.js 18 o superior
- MySQL 8.0+
- Apache Jena Fuseki 4.0
- Git

1. Clonar el Repositorio
```bash
git clone https://github.com/tu-usuario/biblioteca-backend.git
cd biblioteca-backend
```

2. Instalar Dependencias
```bash
npm install
```

3. Configurar Variables de Entorno
Crea un archivo `.env` en la raíz del proyecto:

```env
# Servidor
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:3001

# Base de Datos MySQL
DB_HOST=localhost
DB_PORT=3306
DB_NAME=biblioteca_sistema
DB_USER=root
DB_PASSWORD=tu_password

# Autenticación JWT
JWT_SECRET=tu_clave_secreta_jwt
JWT_EXPIRE=24h

# Fuseki (Ontología)
FUSEKI_HOST=localhost
FUSEKI_PORT=3030
FUSEKI_DATASET=Biblioteca
FUSEKI_QUERY_ENDPOINT=http://localhost:3030/Biblioteca/query
FUSEKI_UPDATE_ENDPOINT=http://localhost:3030/Biblioteca/update
```

4. Configurar Base de Datos
```sql
-- Ejecutar en MySQL
CREATE DATABASE biblioteca_sistema CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Las tablas se crearán automáticamente al iniciar la aplicación
```

5. Configurar Fuseki
1. Descargar e instalar Apache Jena Fuseki
2. Crear dataset llamado "Biblioteca"
3. Cargar la ontología `Biblioteca.ttl`
4. Asegurar que el servidor esté en `http://localhost:3030`

6. Iniciar el Servidor
```bash
# Modo desarrollo
npm run dev

# Modo producción
npm start
```

Estructura del Proyecto

```
backend/
├── src/
│   ├── config/
│   │   ├── db.config.js          # Configuración MySQL
│   │   └── sparql.config.js      # Configuración Fuseki
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── libros.controller.js
│   │   └── prestamos.controller.js
│   ├── middleware/
│   │   ├── auth.middleware.js
│   │   └── error.middleware.js
│   ├── models/
│   │   ├── usuario.model.js
│   │   ├── prestamo.model.js
│   │   └── reserva.model.js
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── libros.routes.js
│   │   ├── prestamos.routes.js
│   │   └── ontologia.routes.js
│   ├── services/
│   │   ├── ontologia.service.js  # Servicio de ontología
│   │   └── email.service.js
│   └── utils/
│       └── validators.js
├── .env.example
├── package.json
├── server.js
└── README.md
```

API Endpoints

Autenticación
```
POST   /api/auth/register          # Registrar usuario
POST   /api/auth/login             # Iniciar sesión
POST   /api/auth/logout            # Cerrar sesión
GET    /api/auth/profile           # Perfil de usuario
```

Libros y Ontología
```
GET    /api/ontologia/libros       # Listar libros desde ontología
GET    /api/ontologia/libros/:id   # Obtener libro específico
POST   /api/ontologia/query        # Consulta SPARQL personalizada
GET    /api/ontologia/ciudades     # Obtener ciudades disponibles
```

Préstamos y Reservas
```
POST   /api/prestamos              # Crear nuevo préstamo
GET    /api/prestamos/usuario/:id  # Préstamos por usuario
PUT    /api/devoluciones/:id       # Registrar devolución
POST   /api/reservas               # Crear reserva
GET    /api/reservas/usuario/:id   # Reservas por usuario
```

Health Checks
```
GET    /                           # Estado del servidor
GET    /health                     # Health check completo
GET    /health/db                  # Verificación MySQL
GET    /health/fuseki              # Verificación Fuseki
```

Uso de la Ontología

Modelo FRBR Implementado
```
Obra → Expresión → Manifestación → Item
```

Consultas SPARQL Ejemplo
```sparql
# Obtener todas las obras con sus autores
PREFIX : <http://www.biblioteca.edu.co/ontologia#>
SELECT ?obra ?titulo ?autor WHERE {
  ?obra a :Obra .
  ?obra :tituloOriginal ?titulo .
  ?obra :tieneAutor ?autor .
}

# Verificar disponibilidad de un item
PREFIX : <http://www.biblioteca.edu.co/ontologia#>
SELECT ?item ?disponibilidad WHERE {
  ?item a :Item .
  ?item :disponibilidad ?disponibilidad .
  FILTER(?item = :Item_CienAnosdeSoledad_1)
}
```

Despliegue

Docker (Recomendado)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

Variables de Entorno en Producción
```env
NODE_ENV=production
PORT=3000
DB_HOST=mysql-host
DB_PASSWORD=secure_password
JWT_SECRET=very_secure_secret_key
FUSEKI_QUERY_ENDPOINT=http://fuseki:3030/Biblioteca/query
```

Testing

```bash
# Ejecutar tests
npm test

# Tests con cobertura
npm run test:coverage

# Tests de integración
npm run test:integration
```

Base de Datos

Esquema Principal
```sql
-- Tabla de préstamos
CREATE TABLE prestamos (
    id_prestamo INT PRIMARY KEY AUTO_INCREMENT,
    id_usuario INT NOT NULL,
    uri_item_ontologia VARCHAR(255) NOT NULL,
    fecha_prestamo TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_devolucion_esperada DATE NOT NULL,
    fecha_devolucion_real TIMESTAMP NULL,
    estado ENUM('activo', 'devuelto', 'atrasado', 'extraviado') DEFAULT 'activo',
    FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario)
);

-- Tabla de reservas
CREATE TABLE reservas (
    id_reserva INT PRIMARY KEY AUTO_INCREMENT,
    id_usuario INT NOT NULL,
    uri_manifestacion_ontologia VARCHAR(255) NOT NULL,
    fecha_solicitud TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_expiracion TIMESTAMP NOT NULL,
    estado ENUM('pendiente', 'disponible', 'prestado', 'cancelada', 'expirada') DEFAULT 'pendiente',
    FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario)
);
```

Troubleshooting

 Problemas Comunes

1. Error de conexión a MySQL
   ```bash
   # Verificar que MySQL esté corriendo
   sudo systemctl status mysql
   
   # Verificar credenciales en .env
   ```

2. Error de conexión a Fuseki
   ```bash
   # Verificar que Fuseki esté corriendo
   http://localhost:3030
   
   # Verificar nombre del dataset
   ```

3. Error JWT
   ```bash
   # Asegurar que JWT_SECRET esté configurado
   # En producción, usar una clave segura
   ```

Logs y Monitoreo
```bash
# Ver logs en desarrollo
npm run dev

# Ver logs en producción
pm2 logs biblioteca-backend

# Monitorear endpoints
curl http://localhost:3000/health
```

Contribuir

1. Fork el proyecto
2. Crear una rama (`git checkout -b feature/AmazingFeature`)
3. Commit cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir un Pull Request

Autores

- Jaime Beltrán - Desarrollo inicial

Agradecimientos

- **IFLA** - Por el modelo FRBR
- **Apache Jena** - Por Fuseki
- **Comunidad Open Source**

Soporte

Para soporte, abrir un issue en GitHub o contactar a jaime.beltran@ejemplo.com

---

Si este proyecto te ayuda, ¡dale una estrella en GitHub!

Estado del Proyecto

![Estado del Build](https://img.shields.io/badge/build-passing-brightgreen)
![Versión](https://img.shields.io/badge/version-1.0.0-blue)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-success)

----

Nota: Este proyecto está en desarrollo activo. Consulte los issues abiertos para ver el progreso de las funcionalidades.
