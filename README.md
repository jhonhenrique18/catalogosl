# Catálogo de Bolsos

Un catálogo web elegante para mostrar bolsos con variaciones de color. Diseñado para el mercado paraguayo con precios en Guaraníes y contenido en español.

## Características

✅ **Catálogo Público**
- Diseño elegante y responsivo (mobile-first)
- Grid de productos con preview de colores
- Modal de producto con selector de variaciones
- Búsqueda de productos
- Filtro por categorías
- Precios en Guaraníes (₲)

✅ **Panel de Administración**
- Login seguro con usuario y contraseña
- CRUD completo de productos
- Gestión de variaciones de color con imágenes
- Subida de imágenes
- Cambio de contraseña

✅ **Backend**
- Node.js + Express
- SQLite (base de datos en archivo)
- Sesiones para autenticación
- API REST

## Requisitos

- Node.js 18 o superior

## Instalación

```bash
# Clonar o descargar el proyecto
cd Catalogosanta

# Instalar dependencias
npm install

# Iniciar el servidor
npm start
```

## Acceso

- **Catálogo:** http://localhost:3000
- **Admin:** http://localhost:3000/admin

### Credenciales por defecto
- **Usuario:** `jhonatan`
- **Contraseña:** `27270374`

> ⚠️ **Importante:** Cambia la contraseña después del primer login en la sección de Configuración.

## Estructura del Proyecto

```
Catalogosanta/
├── server.js           # Servidor Express + API
├── package.json        # Dependencias
├── database.sqlite     # Base de datos SQLite
├── public/
│   ├── index.html      # Catálogo público
│   ├── css/
│   │   └── style.css   # Estilos del catálogo
│   ├── js/
│   │   └── app.js      # JavaScript del catálogo
│   ├── img/
│   │   └── placeholder.svg
│   └── uploads/        # Imágenes subidas
├── admin/
│   ├── index.html      # Panel de administración
│   ├── login.html      # Página de login
│   ├── css/
│   │   └── admin.css   # Estilos del admin
│   └── js/
│       └── admin.js    # JavaScript del admin
└── README.md
```

## Deploy en Railway

### 1. Subir a GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin tu-repositorio.git
git push -u origin main
```

### 2. Configurar Railway
1. Crea una cuenta en [Railway](https://railway.app)
2. Conecta tu repositorio de GitHub
3. Railway detectará automáticamente que es un proyecto Node.js
4. El proyecto se desplegará automáticamente

### Variables de entorno (opcional)
```
PORT=3000
SESSION_SECRET=tu-clave-secreta-segura
NODE_ENV=production
```

## API Endpoints

### Públicos
- `GET /api/productos` - Lista todos los productos activos
- `GET /api/productos/:id` - Detalle de un producto

### Admin (requieren autenticación)
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/check` - Verificar sesión
- `POST /api/auth/change-password` - Cambiar contraseña

- `GET /api/admin/productos` - Lista todos los productos
- `POST /api/admin/productos` - Crear producto
- `PUT /api/admin/productos/:id` - Actualizar producto
- `DELETE /api/admin/productos/:id` - Eliminar producto

- `POST /api/admin/variaciones` - Agregar variación (con imagen)
- `PUT /api/admin/variaciones/:id` - Actualizar variación
- `DELETE /api/admin/variaciones/:id` - Eliminar variación

## Tecnologías

- **Frontend:** HTML5, CSS3, JavaScript Vanilla
- **Backend:** Node.js, Express
- **Base de Datos:** SQLite (better-sqlite3)
- **Autenticación:** express-session, bcryptjs
- **Uploads:** multer

## Licencia

MIT

