// ========================================
// ADMIN PANEL - JavaScript Simplificado
// ========================================

// Estado global
const state = {
    productos: [],
    productoActual: null,
    colores: []
};

// Elementos DOM
const $ = id => document.getElementById(id);

// ========================================
// INICIALIZACIÓN
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadProducts();
    setupEventListeners();
});

function setupEventListeners() {
    $('btnNuevoProducto')?.addEventListener('click', openNewProduct);
    $('btnNuevoProducto2')?.addEventListener('click', openNewProduct);
    $('btnCloseModal')?.addEventListener('click', closeModal);
    $('modalOverlay')?.addEventListener('click', closeModal);
    $('btnCancelar')?.addEventListener('click', closeModal);
    $('btnGuardar')?.addEventListener('click', saveProduct);
    $('btnEliminar')?.addEventListener('click', deleteProduct);
    $('btnAgregarColor')?.addEventListener('click', addColor);
    $('btnLogout')?.addEventListener('click', logout);
    
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') closeModal();
    });
}

// ========================================
// AUTENTICACIÓN
// ========================================
async function checkAuth() {
    try {
        const res = await fetch('/api/auth/check');
        const data = await res.json();
        if (!data.authenticated) {
            window.location.href = '/admin/login';
            return;
        }
        $('userName').textContent = `Hola, ${data.username}`;
    } catch (e) {
        window.location.href = '/admin/login';
    }
}

async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/admin/login';
}

// ========================================
// PRODUCTOS
// ========================================
async function loadProducts() {
    showLoading(true);
    try {
        const res = await fetch('/api/admin/productos');
        state.productos = await res.json();
        renderProducts();
    } catch (e) {
        showToast('Error al cargar productos', 'error');
    }
    showLoading(false);
}

function renderProducts() {
    const grid = $('productsGrid');
    const empty = $('emptyState');
    
    if (state.productos.length === 0) {
        grid.innerHTML = '';
        empty.style.display = 'block';
        return;
    }
    
    empty.style.display = 'none';
    
    grid.innerHTML = state.productos.map(p => {
        const variaciones = p.variaciones || [];
        const primeraVar = variaciones[0];
        const imagen = primeraVar?.imagen ? `/uploads/${primeraVar.imagen}` : null;
        
        let totalFotos = 0;
        variaciones.forEach(v => {
            if (v.imagen) totalFotos++;
            if (v.imagenes_galeria) totalFotos += v.imagenes_galeria.length;
        });
        
        const colorDots = variaciones.slice(0, 5).map(v => 
            `<span class="color-dot" style="background:${getColorHex(v.color)}" title="${v.color}"></span>`
        ).join('');
        
        return `
            <div class="product-card" onclick="editProduct(${p.id})">
                <div class="product-image">
                    ${imagen 
                        ? `<img src="${imagen}" alt="${p.nombre}">`
                        : `<div class="product-image-placeholder">📷</div>`
                    }
                    ${colorDots ? `<div class="product-colors">${colorDots}</div>` : ''}
                </div>
                <div class="product-info">
                    <div class="product-name">${p.nombre}</div>
                    <div class="product-price">${formatPrice(p.precio)}</div>
                    <div class="product-meta">
                        <span class="product-badge ${p.activo ? 'badge-active' : 'badge-inactive'}">
                            ${p.activo ? 'Activo' : 'Oculto'}
                        </span>
                        ${totalFotos > 0 ? `<span class="product-photos-count">📷 ${totalFotos}</span>` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// ========================================
// MODAL
// ========================================
function openNewProduct() {
    state.productoActual = null;
    state.colores = [];
    
    $('modalTitle').textContent = 'Nuevo Producto';
    $('productoForm').reset();
    $('productoId').value = '';
    $('productoActivo').value = '1';
    $('btnEliminar').style.display = 'none';
    
    renderColores();
    openModal();
}

async function editProduct(id) {
    const producto = state.productos.find(p => p.id === id);
    if (!producto) return;
    
    state.productoActual = producto;
    
    state.colores = (producto.variaciones || []).map(v => ({
        id: v.id,
        dbId: v.id,
        color: v.color,
        imagenes: [
            ...(v.imagen ? [{ url: `/uploads/${v.imagen}`, isNew: false, isMain: true }] : []),
            ...((v.imagenes_galeria || []).map(img => ({ 
                url: `/uploads/${img.imagen}`, 
                isNew: false, 
                dbId: img.id 
            })))
        ]
    }));
    
    $('modalTitle').textContent = 'Editar Producto';
    $('productoId').value = producto.id;
    $('productoNombre').value = producto.nombre;
    $('productoPrecio').value = producto.precio;
    $('productoCategoria').value = producto.categoria || 'Bolsa';
    $('productoDescripcion').value = producto.descripcion || '';
    $('productoActivo').value = producto.activo ? '1' : '0';
    $('btnEliminar').style.display = 'block';
    
    renderColores();
    openModal();
}

function openModal() {
    $('modalProducto').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    $('modalProducto').classList.remove('active');
    document.body.style.overflow = '';
}

// ========================================
// COLORES
// ========================================
function addColor() {
    const newColor = {
        id: Date.now(),
        color: '',
        imagenes: [],
        isNew: true
    };
    
    console.log('Agregando nuevo color:', newColor);
    state.colores.push(newColor);
    
    renderColores();
    
    setTimeout(() => {
        const inputs = document.querySelectorAll('.color-input-wrapper input[type="text"]');
        if (inputs.length) {
            inputs[inputs.length - 1].focus();
        }
    }, 100);
    
    showToast('Color agregado. Escribe el nombre y agrega fotos.', 'success');
}

function removeColor(colorId) {
    state.colores = state.colores.filter(c => c.id !== colorId);
    renderColores();
}

function updateColorName(colorId, value) {
    const color = state.colores.find(c => c.id === colorId);
    if (color) {
        color.color = value;
        const preview = document.querySelector(`[data-color-id="${colorId}"] .color-preview`);
        if (preview) {
            preview.style.backgroundColor = getColorHex(value);
        }
    }
}

function renderColores() {
    const container = $('colorsContainer');
    const noColors = $('noColors');
    
    if (state.colores.length === 0) {
        container.innerHTML = '';
        noColors.classList.remove('hidden');
        return;
    }
    
    noColors.classList.add('hidden');
    
    container.innerHTML = state.colores.map(c => `
        <div class="color-card" data-color-id="${c.id}">
            <div class="color-header">
                <div class="color-input-wrapper">
                    <div class="color-preview" style="background:${getColorHex(c.color)}"></div>
                    <input type="text" 
                           value="${c.color}" 
                           placeholder="Ej: Negro, Marrón, Beige"
                           onchange="updateColorName(${c.id}, this.value)"
                           oninput="updateColorName(${c.id}, this.value)">
                </div>
                <button type="button" class="btn-remove-color" onclick="removeColor(${c.id})" title="Eliminar">✕</button>
            </div>
            
            <div class="fotos-section">
                <div class="fotos-header">
                    <span>Fotos (${c.imagenes.length})</span>
                </div>
                
                <!-- Zona de upload con input visible -->
                <div class="upload-area" id="upload-area-${c.id}">
                    <input type="file" 
                           id="file-${c.id}" 
                           accept="image/*" 
                           multiple 
                           onchange="onFileSelect(${c.id}, this.files)">
                    <label for="file-${c.id}">
                        <span class="upload-icon">📷</span>
                        <span class="upload-text">Clic aquí o arrastra fotos</span>
                    </label>
                </div>
                
                <div class="fotos-grid" id="fotos-${c.id}">
                    ${c.imagenes.map((img, idx) => `
                        <div class="foto-item ${idx === 0 ? 'principal' : ''}">
                            <img src="${img.url}" alt="Foto ${idx + 1}">
                            <button type="button" class="foto-remove" onclick="removeFoto(${c.id}, ${idx})">✕</button>
                            ${idx === 0 ? '<span class="foto-badge">Principal</span>' : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `).join('');
    
    // Setup drag and drop para cada área
    state.colores.forEach(c => {
        setupDropZone(c.id);
    });
}

function setupDropZone(colorId) {
    const area = document.getElementById(`upload-area-${colorId}`);
    if (!area) return;
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(event => {
        area.addEventListener(event, e => {
            e.preventDefault();
            e.stopPropagation();
        });
    });
    
    ['dragenter', 'dragover'].forEach(event => {
        area.addEventListener(event, () => area.classList.add('dragover'));
    });
    
    ['dragleave', 'drop'].forEach(event => {
        area.addEventListener(event, () => area.classList.remove('dragover'));
    });
    
    area.addEventListener('drop', e => {
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            procesarFotos(colorId, files);
        }
    });
}

function onFileSelect(colorId, files) {
    if (files && files.length > 0) {
        procesarFotos(colorId, files);
    }
}

// ========================================
// FOTOS - GESTIÓN
// ========================================
function procesarFotos(colorId, files) {
    console.log('=== PROCESANDO FOTOS ===');
    console.log('Color ID:', colorId);
    console.log('Archivos recibidos:', files.length);
    
    const color = state.colores.find(c => c.id === colorId);
    if (!color) {
        console.error('Color no encontrado:', colorId);
        showToast('Error: color no encontrado', 'error');
        return;
    }
    
    // Inicializar array de imágenes si no existe
    if (!color.imagenes) {
        color.imagenes = [];
    }
    
    let procesadas = 0;
    const total = files.length;
    let validas = 0;
    
    Array.from(files).forEach(file => {
        console.log('Procesando archivo:', file.name, file.type, file.size);
        
        if (!file.type.startsWith('image/')) {
            console.log('Archivo no es imagen, ignorando');
            procesadas++;
            return;
        }
        
        validas++;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            console.log('Archivo leído exitosamente:', file.name);
            
            color.imagenes.push({
                file: file,
                url: e.target.result,
                isNew: true,
                name: file.name
            });
            
            console.log('Total imágenes en color:', color.imagenes.length);
            
            procesadas++;
            if (procesadas >= total) {
                renderColores();
                showToast(`${validas} foto(s) agregada(s)`, 'success');
            }
        };
        
        reader.onerror = function(e) {
            console.error('Error leyendo archivo:', e);
            procesadas++;
        };
        
        reader.readAsDataURL(file);
    });
    
    if (total === 0) {
        showToast('No se seleccionaron archivos', 'error');
    }
}

function removeFoto(colorId, fotoIndex) {
    const color = state.colores.find(c => c.id === colorId);
    if (color) {
        color.imagenes.splice(fotoIndex, 1);
        renderColores();
    }
}

// ========================================
// GUARDAR PRODUCTO
// ========================================
async function saveProduct() {
    const nombre = $('productoNombre').value.trim();
    const precio = parseInt($('productoPrecio').value);
    
    console.log('=== GUARDANDO PRODUCTO ===');
    console.log('Nombre:', nombre);
    console.log('Precio:', precio);
    console.log('Colores en state:', state.colores);
    
    // Validaciones
    if (!nombre) {
        showToast('Ingresa el nombre del producto', 'error');
        $('productoNombre').focus();
        return;
    }
    
    if (!precio || precio <= 0) {
        showToast('Ingresa un precio válido', 'error');
        $('productoPrecio').focus();
        return;
    }
    
    // Verificar colores - actualizar nombres desde los inputs
    syncColorNames();
    
    const coloresValidos = state.colores.filter(c => c.color && c.color.trim() !== '');
    console.log('Colores válidos:', coloresValidos.length, coloresValidos);
    
    if (coloresValidos.length === 0) {
        showToast('Agrega al menos un color con nombre', 'error');
        return;
    }
    
    // Verificar que al menos un color tenga imagen
    const coloresConImagen = coloresValidos.filter(c => c.imagenes && c.imagenes.length > 0);
    if (coloresConImagen.length === 0) {
        showToast('Agrega al menos una foto a un color', 'error');
        return;
    }
    
    const btnGuardar = $('btnGuardar');
    btnGuardar.disabled = true;
    btnGuardar.textContent = 'Guardando...';
    
    try {
        const productoId = $('productoId').value;
        const isEdit = !!productoId;
        
        const productoData = {
            nombre,
            precio,
            categoria: $('productoCategoria').value || 'Bolsa',
            descripcion: $('productoDescripcion').value || '',
            activo: $('productoActivo').value === '1'
        };
        
        console.log('Enviando producto:', productoData);
        
        const res = await fetch(
            isEdit ? `/api/admin/productos/${productoId}` : '/api/admin/productos',
            {
                method: isEdit ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(productoData)
            }
        );
        
        const result = await res.json();
        console.log('Respuesta producto:', result);
        
        if (!res.ok) throw new Error(result.error || 'Error al guardar producto');
        
        const finalProductoId = isEdit ? parseInt(productoId) : result.id;
        console.log('ID del producto:', finalProductoId);
        
        // Eliminar variaciones antiguas si es edición
        if (isEdit && state.productoActual) {
            const oldVariaciones = state.productoActual.variaciones || [];
            const currentDbIds = state.colores.filter(c => c.dbId).map(c => c.dbId);
            
            for (const oldVar of oldVariaciones) {
                if (!currentDbIds.includes(oldVar.id)) {
                    console.log('Eliminando variación antigua:', oldVar.id);
                    await fetch(`/api/admin/variaciones/${oldVar.id}`, { method: 'DELETE' });
                }
            }
        }
        
        // Guardar cada color
        let variacionesCreadas = 0;
        for (const color of coloresValidos) {
            try {
                if (color.dbId) {
                    await updateVariacion(color);
                    variacionesCreadas++;
                } else {
                    await createVariacion(finalProductoId, color);
                    variacionesCreadas++;
                }
            } catch (varError) {
                console.error('Error en variación:', varError);
            }
        }
        
        console.log('Variaciones creadas/actualizadas:', variacionesCreadas);
        
        showToast(isEdit ? 'Producto actualizado' : 'Producto creado con ' + variacionesCreadas + ' color(es)', 'success');
        closeModal();
        await loadProducts();
        
    } catch (e) {
        console.error('Error al guardar:', e);
        showToast(e.message || 'Error al guardar', 'error');
    }
    
    btnGuardar.disabled = false;
    btnGuardar.textContent = 'Guardar Producto';
}

// Sincronizar nombres de colores desde los inputs del DOM
function syncColorNames() {
    state.colores.forEach(color => {
        const card = document.querySelector(`[data-color-id="${color.id}"]`);
        if (card) {
            const input = card.querySelector('.color-input-wrapper input[type="text"]');
            if (input) {
                color.color = input.value.trim();
            }
        }
    });
    console.log('Colores sincronizados:', state.colores);
}

async function createVariacion(productoId, color) {
    console.log('=== CREANDO VARIACIÓN ===');
    console.log('Producto ID:', productoId, typeof productoId);
    console.log('Color objeto:', color);
    console.log('Color nombre:', color.color);
    console.log('Total imágenes:', color.imagenes?.length || 0);
    
    const formData = new FormData();
    formData.append('producto_id', String(productoId));
    formData.append('color', color.color);
    formData.append('stock', '0');
    
    // Buscar primera imagen disponible (nueva con file)
    const imagenPrincipal = color.imagenes?.find(img => img.file);
    
    console.log('Imagen principal encontrada:', imagenPrincipal ? 'SI' : 'NO');
    
    if (imagenPrincipal && imagenPrincipal.file) {
        formData.append('imagen', imagenPrincipal.file);
        console.log('Archivo adjuntado:', imagenPrincipal.file.name, imagenPrincipal.file.size, 'bytes');
    } else {
        console.log('No hay imagen para adjuntar');
    }
    
    // Log FormData contents
    for (let pair of formData.entries()) {
        console.log('FormData:', pair[0], '=', pair[1]);
    }
    
    const res = await fetch('/api/admin/variaciones', {
        method: 'POST',
        body: formData
    });
    
    const result = await res.json();
    console.log('Respuesta servidor variación:', result);
    
    if (!res.ok) {
        console.error('Error al crear variación:', result);
        throw new Error(result.error || 'Error al crear variación');
    }
    
    // Subir imágenes adicionales (todas las demás con file)
    const imagenesAdicionales = color.imagenes?.filter(img => img.file && img !== imagenPrincipal) || [];
    console.log('Imágenes adicionales:', imagenesAdicionales.length);
    
    for (const img of imagenesAdicionales) {
        try {
            const galeriaForm = new FormData();
            galeriaForm.append('imagen', img.file);
            
            const galeriaRes = await fetch(`/api/admin/variaciones/${result.id}/galeria`, {
                method: 'POST',
                body: galeriaForm
            });
            
            const galeriaResult = await galeriaRes.json();
            console.log('Imagen galería subida:', galeriaResult);
        } catch (galError) {
            console.error('Error subiendo imagen adicional:', galError);
        }
    }
    
    return result;
}

async function updateVariacion(color) {
    const formData = new FormData();
    formData.append('color', color.color);
    formData.append('stock', 0);
    
    const nuevaPrincipal = color.imagenes.find(img => img.isNew && img.file);
    if (nuevaPrincipal) {
        formData.append('imagen', nuevaPrincipal.file);
    }
    
    await fetch(`/api/admin/variaciones/${color.dbId}`, {
        method: 'PUT',
        body: formData
    });
    
    // Subir nuevas imágenes adicionales
    const nuevasImagenes = color.imagenes.filter(img => img.isNew && img.file && img !== nuevaPrincipal);
    for (const img of nuevasImagenes) {
        const galeriaForm = new FormData();
        galeriaForm.append('imagen', img.file);
        await fetch(`/api/admin/variaciones/${color.dbId}/galeria`, {
            method: 'POST',
            body: galeriaForm
        });
    }
}

// ========================================
// ELIMINAR PRODUCTO
// ========================================
async function deleteProduct() {
    const productoId = $('productoId').value;
    if (!productoId) return;
    
    if (!confirm('¿Eliminar este producto y todas sus fotos?')) return;
    
    try {
        const res = await fetch(`/api/admin/productos/${productoId}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Error al eliminar');
        
        showToast('Producto eliminado', 'success');
        closeModal();
        await loadProducts();
    } catch (e) {
        showToast('Error al eliminar', 'error');
    }
}

// ========================================
// UTILIDADES
// ========================================
function formatPrice(precio) {
    return '₲ ' + new Intl.NumberFormat('es-PY').format(precio);
}

function getColorHex(colorName) {
    const colors = {
        'negro': '#1a1a1a', 'black': '#1a1a1a',
        'blanco': '#ffffff', 'white': '#ffffff',
        'marron': '#8B4513', 'marrón': '#8B4513', 'brown': '#8B4513',
        'cafe': '#6F4E37', 'café': '#6F4E37',
        'beige': '#F5F5DC', 'crema': '#FFFDD0',
        'rojo': '#C41E3A', 'red': '#C41E3A',
        'azul': '#1E3A8A', 'blue': '#1E3A8A',
        'verde': '#228B22', 'green': '#228B22',
        'rosa': '#FFC0CB', 'pink': '#FFC0CB',
        'gris': '#808080', 'gray': '#808080',
        'dorado': '#FFD700', 'gold': '#FFD700',
        'plateado': '#C0C0C0', 'silver': '#C0C0C0',
        'naranja': '#FF8C00', 'orange': '#FF8C00',
        'amarillo': '#FFD700', 'yellow': '#FFD700',
        'morado': '#800080', 'purple': '#800080',
        'bordo': '#800020', 'burgundy': '#800020',
        'camel': '#C19A6B', 'nude': '#E3BC9A',
        'coral': '#FF7F50', 'turquesa': '#40E0D0'
    };
    return colors[colorName?.toLowerCase()?.trim()] || '#cccccc';
}

function showLoading(show) {
    const loading = $('loading');
    if (loading) loading.style.display = show ? 'flex' : 'none';
}

function showToast(message, type = 'success') {
    const container = $('toastContainer');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span>${type === 'success' ? '✓' : '⚠'}</span>
        <span>${message}</span>
    `;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Exponer funciones globales
window.editProduct = editProduct;
window.removeColor = removeColor;
window.updateColorName = updateColorName;
window.removeFoto = removeFoto;
window.onFileSelect = onFileSelect;
