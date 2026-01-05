const express = require('express');
const session = require('express-session');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const initSqlJs = require('sql.js');

const app = express();
const PORT = process.env.PORT || 3000;

// Variables globales para la base de datos
let db = null;
const DB_PATH = path.join(__dirname, 'database.sqlite');

// Crear carpeta uploads si no existe
const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configuración de multer para subir imágenes
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|webp|gif/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (extname && mimetype) {
            return cb(null, true);
        }
        cb(new Error('Solo se permiten imágenes (jpeg, jpg, png, webp, gif)'));
    }
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Servir logo desde la raíz del proyecto
app.get('/img/logo.png', (req, res) => {
    const logoPath = path.join(__dirname, 'Logo Santa Lolla.png');
    if (fs.existsSync(logoPath)) {
        res.sendFile(logoPath);
    } else {
        res.status(404).send('Logo no encontrado');
    }
});

// Servir imagen de capa mobile
app.get('/img/capa-mobile.webp', (req, res) => {
    const capaPath = path.join(__dirname, 'Capa Mobile.webp');
    if (fs.existsSync(capaPath)) {
        res.sendFile(capaPath);
    } else {
        res.status(404).send('Capa no encontrada');
    }
});

// Servir imagen de capa desktop
app.get('/img/capa-desktop.webp', (req, res) => {
    const capaPath = path.join(__dirname, 'Capa desktop.webp');
    if (fs.existsSync(capaPath)) {
        res.sendFile(capaPath);
    } else {
        res.status(404).send('Capa desktop no encontrada');
    }
});

// Trust proxy para Railway/Heroku (necessário para cookies seguros atrás de proxy)
app.set('trust proxy', 1);

// Sesiones
app.use(session({
    secret: process.env.SESSION_SECRET || 'catalogo-bolsas-secret-key-2024',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 24 * 60 * 60 * 1000 // 24 horas
    }
}));

// Guardar base de datos en disco
function saveDatabase() {
    if (db) {
        const data = db.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(DB_PATH, buffer);
    }
}

// Helpers para queries
function dbRun(sql, params = []) {
    try {
        // Ejecutar la query
        const stmt = db.prepare(sql);
        stmt.bind(params);
        stmt.step();
        stmt.free();
        
        // Obtener el último ID insertado
        const result = db.exec("SELECT last_insert_rowid() as id");
        const lastID = result[0]?.values[0]?.[0] || 0;
        
        // Guardar en disco
        saveDatabase();
        
        console.log('dbRun - SQL:', sql.substring(0, 50) + '...');
        console.log('dbRun - last_insert_rowid:', lastID);
        
        return { lastID: lastID };
    } catch (error) {
        console.error('DB Run Error:', error);
        console.error('SQL:', sql);
        console.error('Params:', params);
        throw error;
    }
}

function dbGet(sql, params = []) {
    try {
        const stmt = db.prepare(sql);
        stmt.bind(params);
        if (stmt.step()) {
            const row = stmt.getAsObject();
            stmt.free();
            return row;
        }
        stmt.free();
        return null;
    } catch (error) {
        console.error('DB Get Error:', error);
        throw error;
    }
}

function dbAll(sql, params = []) {
    try {
        const stmt = db.prepare(sql);
        stmt.bind(params);
        const results = [];
        while (stmt.step()) {
            results.push(stmt.getAsObject());
        }
        stmt.free();
        return results;
    } catch (error) {
        console.error('DB All Error:', error);
        throw error;
    }
}

// Inicializar base de datos
async function initDatabase() {
    const SQL = await initSqlJs();
    
    // Cargar base de datos existente o crear nueva
    if (fs.existsSync(DB_PATH)) {
        const fileBuffer = fs.readFileSync(DB_PATH);
        db = new SQL.Database(fileBuffer);
        console.log('Base de datos cargada desde archivo');
    } else {
        db = new SQL.Database();
        console.log('Nueva base de datos creada');
    }

    // Crear tablas
    db.run(`
        CREATE TABLE IF NOT EXISTS usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS productos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            descripcion TEXT,
            precio INTEGER NOT NULL,
            categoria TEXT DEFAULT 'Bolsa',
            activo INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS variaciones (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            producto_id INTEGER NOT NULL,
            color TEXT NOT NULL,
            imagen TEXT,
            stock INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS imagenes_producto (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            variacion_id INTEGER NOT NULL,
            imagen TEXT NOT NULL,
            orden INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (variacion_id) REFERENCES variaciones(id) ON DELETE CASCADE
        )
    `);

    // Crear usuario admin por defecto si no existe
    const adminExists = dbGet('SELECT id FROM usuarios WHERE username = ?', ['jhonatan']);
    if (!adminExists) {
        const hashedPassword = bcrypt.hashSync('27270374', 10);
        dbRun('INSERT INTO usuarios (username, password) VALUES (?, ?)', ['jhonatan', hashedPassword]);
        console.log('Usuario admin creado: jhonatan / 27270374');
    }

    saveDatabase();
    console.log('Base de datos inicializada correctamente');
}

// Middleware de autenticación
const requireAuth = (req, res, next) => {
    if (req.session && req.session.userId) {
        next();
    } else {
        res.status(401).json({ error: 'No autorizado' });
    }
};

// ============== RUTAS PÚBLICAS ==============

// Página principal del catálogo
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API: Obtener todos los productos activos con sus variaciones
app.get('/api/productos', (req, res) => {
    try {
        const productos = dbAll(`
            SELECT p.*, 
                   (SELECT COUNT(*) FROM variaciones WHERE producto_id = p.id) as total_variaciones
            FROM productos p 
            WHERE p.activo = 1 
            ORDER BY p.created_at DESC
        `);

        // Obtener variaciones para cada producto con imágenes de galería
        const productosConVariaciones = productos.map(producto => {
            const variaciones = dbAll(`
                SELECT * FROM variaciones WHERE producto_id = ?
            `, [producto.id]);
            
            // Incluir imágenes de galería para cada variación
            const variacionesConGaleria = variaciones.map(variacion => {
                const imagenes = dbAll(`
                    SELECT * FROM imagenes_producto WHERE variacion_id = ? ORDER BY orden
                `, [variacion.id]);
                return { ...variacion, imagenes_galeria: imagenes };
            });
            
            return { ...producto, variaciones: variacionesConGaleria };
        });

        res.json(productosConVariaciones);
    } catch (error) {
        console.error('Error al obtener productos:', error);
        res.status(500).json({ error: 'Error al obtener productos' });
    }
});

// API: Obtener producto por ID con todas sus variaciones e imágenes
app.get('/api/productos/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id);
        console.log('=== BUSCAR PRODUCTO ===');
        console.log('ID solicitado:', id);
        
        const producto = dbGet(`
            SELECT * FROM productos WHERE id = ? AND activo = 1
        `, [id]);

        console.log('Producto encontrado:', producto);

        if (!producto) {
            console.log('Producto no encontrado o inactivo');
            return res.status(404).json({ error: 'Producto no encontrado' });
        }

        const variaciones = dbAll(`
            SELECT * FROM variaciones WHERE producto_id = ?
        `, [producto.id]);

        console.log('Variaciones:', variaciones.length);

        // Obtener imágenes adicionales para cada variación
        const variacionesConImagenes = variaciones.map(variacion => {
            const imagenes = dbAll(`
                SELECT * FROM imagenes_producto WHERE variacion_id = ? ORDER BY orden
            `, [variacion.id]);
            return { ...variacion, imagenes, imagenes_galeria: imagenes };
        });

        const response = { ...producto, variaciones: variacionesConImagenes };
        console.log('Respuesta enviada');
        
        res.json(response);
    } catch (error) {
        console.error('Error al obtener producto:', error);
        res.status(500).json({ error: 'Error al obtener producto: ' + error.message });
    }
});

// ============== RUTAS DE ADMIN ==============

// Página de login
app.get('/admin/login', (req, res) => {
    if (req.session && req.session.userId) {
        return res.redirect('/admin');
    }
    res.sendFile(path.join(__dirname, 'admin', 'login.html'));
});

// Página principal del admin
app.get('/admin', (req, res) => {
    if (!req.session || !req.session.userId) {
        return res.redirect('/admin/login');
    }
    res.sendFile(path.join(__dirname, 'admin', 'index.html'));
});

// Archivos estáticos del admin
app.use('/admin', express.static(path.join(__dirname, 'admin')));

// Login
app.post('/api/auth/login', (req, res) => {
    try {
        const { username, password } = req.body;
        
        const user = dbGet('SELECT * FROM usuarios WHERE username = ?', [username]);
        
        if (!user || !bcrypt.compareSync(password, user.password)) {
            return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
        }

        req.session.userId = user.id;
        req.session.username = user.username;
        
        res.json({ success: true, message: 'Login exitoso' });
    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// Logout
app.post('/api/auth/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

// Verificar sesión
app.get('/api/auth/check', (req, res) => {
    if (req.session && req.session.userId) {
        res.json({ authenticated: true, username: req.session.username });
    } else {
        res.json({ authenticated: false });
    }
});

// Cambiar contraseña
app.post('/api/auth/change-password', requireAuth, (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        
        const user = dbGet('SELECT * FROM usuarios WHERE id = ?', [req.session.userId]);
        
        if (!bcrypt.compareSync(currentPassword, user.password)) {
            return res.status(400).json({ error: 'Contraseña actual incorrecta' });
        }

        const hashedPassword = bcrypt.hashSync(newPassword, 10);
        dbRun('UPDATE usuarios SET password = ? WHERE id = ?', [hashedPassword, req.session.userId]);
        
        res.json({ success: true, message: 'Contraseña actualizada' });
    } catch (error) {
        console.error('Error al cambiar contraseña:', error);
        res.status(500).json({ error: 'Error al cambiar contraseña' });
    }
});

// ============== CRUD PRODUCTOS (ADMIN) ==============

// Obtener todos los productos (incluyendo inactivos)
app.get('/api/admin/productos', requireAuth, (req, res) => {
    try {
        const productos = dbAll(`
            SELECT p.*, 
                   (SELECT COUNT(*) FROM variaciones WHERE producto_id = p.id) as total_variaciones
            FROM productos p 
            ORDER BY p.created_at DESC
        `);

        const productosConVariaciones = productos.map(producto => {
            const variaciones = dbAll(`
                SELECT * FROM variaciones WHERE producto_id = ?
            `, [producto.id]);
            
            // Incluir imágenes de galería para cada variación
            const variacionesConGaleria = variaciones.map(variacion => {
                const imagenes = dbAll(`
                    SELECT * FROM imagenes_producto WHERE variacion_id = ? ORDER BY orden
                `, [variacion.id]);
                return { ...variacion, imagenes_galeria: imagenes };
            });
            
            return { ...producto, variaciones: variacionesConGaleria };
        });

        res.json(productosConVariaciones);
    } catch (error) {
        console.error('Error al obtener productos:', error);
        res.status(500).json({ error: 'Error al obtener productos' });
    }
});

// Crear producto
app.post('/api/admin/productos', requireAuth, (req, res) => {
    try {
        console.log('=== CREAR PRODUCTO ===');
        console.log('Body recibido:', req.body);
        
        const { nombre, descripcion, precio, categoria } = req.body;
        
        console.log('Datos procesados:', { nombre, descripcion, precio, categoria });
        
        const result = dbRun(`
            INSERT INTO productos (nombre, descripcion, precio, categoria)
            VALUES (?, ?, ?, ?)
        `, [nombre, descripcion || '', precio, categoria || 'Bolsa']);

        console.log('Resultado INSERT:', result);
        console.log('ID del nuevo producto:', result.lastID);

        // Verificar que se creó correctamente
        const nuevoProducto = dbGet('SELECT * FROM productos WHERE id = ?', [result.lastID]);
        console.log('Verificación - Nuevo producto:', nuevoProducto);

        res.json({ 
            success: true, 
            id: result.lastID,
            message: 'Producto creado exitosamente' 
        });
    } catch (error) {
        console.error('Error al crear producto:', error);
        res.status(500).json({ error: 'Error al crear producto' });
    }
});

// Actualizar producto
app.put('/api/admin/productos/:id', requireAuth, (req, res) => {
    try {
        const { nombre, descripcion, precio, categoria, activo } = req.body;
        
        dbRun(`
            UPDATE productos 
            SET nombre = ?, descripcion = ?, precio = ?, categoria = ?, activo = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [nombre, descripcion || '', precio, categoria || 'Bolsa', activo ? 1 : 0, parseInt(req.params.id)]);

        res.json({ success: true, message: 'Producto actualizado' });
    } catch (error) {
        console.error('Error al actualizar producto:', error);
        res.status(500).json({ error: 'Error al actualizar producto' });
    }
});

// Eliminar producto
app.delete('/api/admin/productos/:id', requireAuth, (req, res) => {
    try {
        const productoId = parseInt(req.params.id);
        
        // Obtener imágenes para eliminar archivos
        const variaciones = dbAll('SELECT imagen FROM variaciones WHERE producto_id = ?', [productoId]);
        const imagenes = dbAll(`
            SELECT ip.imagen FROM imagenes_producto ip 
            JOIN variaciones v ON ip.variacion_id = v.id 
            WHERE v.producto_id = ?
        `, [productoId]);

        // Eliminar archivos de imágenes
        [...variaciones, ...imagenes].forEach(item => {
            if (item.imagen) {
                const filepath = path.join(uploadsDir, item.imagen);
                if (fs.existsSync(filepath)) {
                    fs.unlinkSync(filepath);
                }
            }
        });

        // Eliminar registros relacionados primero
        const variacionesIds = dbAll('SELECT id FROM variaciones WHERE producto_id = ?', [productoId]);
        variacionesIds.forEach(v => {
            dbRun('DELETE FROM imagenes_producto WHERE variacion_id = ?', [v.id]);
        });
        dbRun('DELETE FROM variaciones WHERE producto_id = ?', [productoId]);
        dbRun('DELETE FROM productos WHERE id = ?', [productoId]);
        
        res.json({ success: true, message: 'Producto eliminado' });
    } catch (error) {
        console.error('Error al eliminar producto:', error);
        res.status(500).json({ error: 'Error al eliminar producto' });
    }
});

// ============== CRUD VARIACIONES (ADMIN) ==============

// Agregar variación
app.post('/api/admin/variaciones', requireAuth, upload.single('imagen'), (req, res) => {
    try {
        console.log('=== CREAR VARIACIÓN ===');
        console.log('Body:', req.body);
        console.log('File:', req.file ? { filename: req.file.filename, size: req.file.size } : 'NO FILE');
        
        const { producto_id, color, stock } = req.body;
        const imagen = req.file ? req.file.filename : null;

        const prodId = parseInt(producto_id);
        console.log('Datos procesados:', { producto_id: prodId, color, imagen, stock });

        if (!prodId || prodId <= 0) {
            console.error('ERROR: producto_id inválido:', producto_id);
            return res.status(400).json({ error: 'producto_id es requerido y debe ser válido' });
        }

        if (!color || color.trim() === '') {
            console.error('ERROR: color inválido:', color);
            return res.status(400).json({ error: 'color es requerido' });
        }

        // Verificar que el producto existe
        const producto = dbGet('SELECT id FROM productos WHERE id = ?', [prodId]);
        if (!producto) {
            console.error('ERROR: Producto no existe:', prodId);
            return res.status(400).json({ error: 'El producto no existe' });
        }

        const result = dbRun(`
            INSERT INTO variaciones (producto_id, color, imagen, stock)
            VALUES (?, ?, ?, ?)
        `, [prodId, color.trim(), imagen, parseInt(stock) || 0]);

        console.log('Variación creada con ID:', result.lastID);

        // Verificar que se creó correctamente
        const nuevaVariacion = dbGet('SELECT * FROM variaciones WHERE id = ?', [result.lastID]);
        console.log('Verificación - Nueva variación:', nuevaVariacion);

        res.json({ 
            success: true, 
            id: result.lastID,
            imagen: imagen,
            message: 'Variación agregada' 
        });
    } catch (error) {
        console.error('Error al agregar variación:', error);
        res.status(500).json({ error: 'Error al agregar variación: ' + error.message });
    }
});

// Actualizar variación
app.put('/api/admin/variaciones/:id', requireAuth, upload.single('imagen'), (req, res) => {
    try {
        const { color, stock } = req.body;
        const variacionId = parseInt(req.params.id);

        if (req.file) {
            // Eliminar imagen anterior
            const oldVariacion = dbGet('SELECT imagen FROM variaciones WHERE id = ?', [variacionId]);
            if (oldVariacion && oldVariacion.imagen) {
                const oldPath = path.join(uploadsDir, oldVariacion.imagen);
                if (fs.existsSync(oldPath)) {
                    fs.unlinkSync(oldPath);
                }
            }

            dbRun(`
                UPDATE variaciones SET color = ?, imagen = ?, stock = ? WHERE id = ?
            `, [color, req.file.filename, parseInt(stock) || 0, variacionId]);
        } else {
            dbRun(`
                UPDATE variaciones SET color = ?, stock = ? WHERE id = ?
            `, [color, parseInt(stock) || 0, variacionId]);
        }

        res.json({ success: true, message: 'Variación actualizada' });
    } catch (error) {
        console.error('Error al actualizar variación:', error);
        res.status(500).json({ error: 'Error al actualizar variación' });
    }
});

// Eliminar variación
app.delete('/api/admin/variaciones/:id', requireAuth, (req, res) => {
    try {
        const variacionId = parseInt(req.params.id);
        const variacion = dbGet('SELECT imagen FROM variaciones WHERE id = ?', [variacionId]);
        
        // Eliminar imágenes adicionales
        const imagenes = dbAll('SELECT imagen FROM imagenes_producto WHERE variacion_id = ?', [variacionId]);
        imagenes.forEach(img => {
            const filepath = path.join(uploadsDir, img.imagen);
            if (fs.existsSync(filepath)) {
                fs.unlinkSync(filepath);
            }
        });

        // Eliminar imagen principal
        if (variacion && variacion.imagen) {
            const filepath = path.join(uploadsDir, variacion.imagen);
            if (fs.existsSync(filepath)) {
                fs.unlinkSync(filepath);
            }
        }

        dbRun('DELETE FROM imagenes_producto WHERE variacion_id = ?', [variacionId]);
        dbRun('DELETE FROM variaciones WHERE id = ?', [variacionId]);
        
        res.json({ success: true, message: 'Variación eliminada' });
    } catch (error) {
        console.error('Error al eliminar variación:', error);
        res.status(500).json({ error: 'Error al eliminar variación' });
    }
});

// Agregar imagen adicional a variación (ruta original)
app.post('/api/admin/variaciones/:id/imagenes', requireAuth, upload.single('imagen'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No se proporcionó imagen' });
        }

        const variacionId = parseInt(req.params.id);
        const maxOrden = dbGet('SELECT MAX(orden) as max FROM imagenes_producto WHERE variacion_id = ?', [variacionId]);
        const orden = (maxOrden?.max || 0) + 1;

        const result = dbRun(`
            INSERT INTO imagenes_producto (variacion_id, imagen, orden)
            VALUES (?, ?, ?)
        `, [variacionId, req.file.filename, orden]);

        res.json({ 
            success: true, 
            id: result.lastID,
            imagen: req.file.filename 
        });
    } catch (error) {
        console.error('Error al agregar imagen:', error);
        res.status(500).json({ error: 'Error al agregar imagen' });
    }
});

// Agregar imagen a galería de variación (ruta alternativa)
app.post('/api/admin/variaciones/:id/galeria', requireAuth, upload.single('imagen'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No se proporcionó imagen' });
        }

        const variacionId = parseInt(req.params.id);
        const maxOrden = dbGet('SELECT MAX(orden) as max FROM imagenes_producto WHERE variacion_id = ?', [variacionId]);
        const orden = (maxOrden?.max || 0) + 1;

        const result = dbRun(`
            INSERT INTO imagenes_producto (variacion_id, imagen, orden)
            VALUES (?, ?, ?)
        `, [variacionId, req.file.filename, orden]);

        res.json({ 
            success: true, 
            id: result.lastID,
            imagen: req.file.filename 
        });
    } catch (error) {
        console.error('Error al agregar imagen a galería:', error);
        res.status(500).json({ error: 'Error al agregar imagen a galería' });
    }
});

// Eliminar imagen adicional
app.delete('/api/admin/imagenes/:id', requireAuth, (req, res) => {
    try {
        const imagenId = parseInt(req.params.id);
        const imagen = dbGet('SELECT imagen FROM imagenes_producto WHERE id = ?', [imagenId]);
        
        if (imagen) {
            const filepath = path.join(uploadsDir, imagen.imagen);
            if (fs.existsSync(filepath)) {
                fs.unlinkSync(filepath);
            }
        }

        dbRun('DELETE FROM imagenes_producto WHERE id = ?', [imagenId]);
        
        res.json({ success: true, message: 'Imagen eliminada' });
    } catch (error) {
        console.error('Error al eliminar imagen:', error);
        res.status(500).json({ error: 'Error al eliminar imagen' });
    }
});

// Iniciar servidor
async function startServer() {
    await initDatabase();
    
    app.listen(PORT, () => {
        console.log(`
╔═══════════════════════════════════════════════════════════╗
║                    CATÁLOGO DE BOLSAS                     ║
╠═══════════════════════════════════════════════════════════╣
║  🌐 Catálogo:  http://localhost:${PORT}                      ║
║  🔐 Admin:     http://localhost:${PORT}/admin                ║
║  👤 Usuario:   jhonatan                                   ║
║  🔑 Clave:     27270374                                   ║
╚═══════════════════════════════════════════════════════════╝
        `);
    });
}

startServer().catch(console.error);
