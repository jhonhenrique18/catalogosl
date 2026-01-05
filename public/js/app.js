// ========================================
// CATÁLOGO DE BOLSOS - JavaScript Principal
// ========================================

// Estado de la aplicación
const state = {
    productos: [],
    productosFiltrados: [],
    categoriaActual: 'todos',
    productoActual: null,
    variacionActual: null
};

// Elementos del DOM
const elements = {
    productsGrid: document.getElementById('productsGrid'),
    productsCount: document.getElementById('productsCount'),
    loading: document.getElementById('loading'),
    emptyState: document.getElementById('emptyState'),
    searchInput: document.getElementById('searchInput'),
    searchBar: document.getElementById('searchBar'),
    searchToggle: document.getElementById('searchToggle'),
    searchClose: document.getElementById('searchClose'),
    modal: document.getElementById('productModal'),
    modalBackdrop: document.getElementById('modalBackdrop'),
    modalClose: document.getElementById('modalClose'),
    mainImage: document.getElementById('mainImage'),
    galleryThumbs: document.getElementById('galleryThumbs'),
    galleryMain: document.getElementById('galleryMain'),
    galleryPrev: document.getElementById('galleryPrev'),
    galleryNext: document.getElementById('galleryNext'),
    galleryIndicators: document.getElementById('galleryIndicators'),
    modalTitle: document.getElementById('modalTitle'),
    modalPrice: document.getElementById('modalPrice'),
    modalDescription: document.getElementById('modalDescription'),
    colorOptions: document.getElementById('colorOptions'),
    selectedColor: document.getElementById('selectedColor'),
    categoryButtons: document.querySelectorAll('.category-btn'),
    // Sidebar elements
    menuToggle: document.getElementById('menuToggle'),
    sidebar: document.getElementById('sidebar'),
    sidebarOverlay: document.getElementById('sidebarOverlay'),
    sidebarClose: document.getElementById('sidebarClose'),
    sidebarCategoryButtons: document.querySelectorAll('.sidebar-category-btn'),
    // Modal About elements
    modalAbout: document.getElementById('modalAbout'),
    modalAboutBackdrop: document.getElementById('modalAboutBackdrop'),
    modalAboutClose: document.getElementById('modalAboutClose'),
    sidebarAboutBtn: document.getElementById('sidebarAboutBtn'),
    footerAboutBtn: document.getElementById('footerAboutBtn')
};

// Estado da galeria
const galleryState = {
    images: [],
    currentIndex: 0,
    touchStartX: 0,
    touchEndX: 0,
    isSwiping: false
};

// ========================================
// FORMATEO DE PRECIO
// ========================================
function formatPrice(precio) {
    // Formatear en Guaraníes paraguayos
    return '₲ ' + new Intl.NumberFormat('es-PY').format(precio);
}

// ========================================
// OBTENER COLOR DE FONDO SEGÚN NOMBRE
// ========================================
function getColorHex(colorName) {
    const colors = {
        // Preto/Negro
        'negro': '#1a1a1a',
        'preto': '#1a1a1a',
        'black': '#1a1a1a',
        // Branco
        'blanco': '#f5f5f5',
        'branco': '#f5f5f5',
        'white': '#f5f5f5',
        // Marrom
        'marron': '#8B4513',
        'marrón': '#8B4513',
        'marrom': '#8B4513',
        'brown': '#8B4513',
        'caramelo': '#C68E17',
        // Café
        'cafe': '#6F4E37',
        'café': '#6F4E37',
        // Bege (mais escuro para ser visível)
        'beige': '#C4A77D',
        'bege': '#C4A77D',
        // Crema
        'crema': '#D4C4A8',
        'cream': '#D4C4A8',
        // Vermelho
        'rojo': '#C41E3A',
        'vermelho': '#C41E3A',
        'red': '#C41E3A',
        // Azul
        'azul': '#1E3A8A',
        'blue': '#1E3A8A',
        // Verde
        'verde': '#228B22',
        'green': '#228B22',
        // Rosa
        'rosa': '#E8A0B0',
        'rose': '#E8B4B8',
        'pink': '#E8A0B0',
        // Cinza (mais escuro para ser visível)
        'gris': '#6B7280',
        'cinza': '#6B7280',
        'gray': '#6B7280',
        'grey': '#6B7280',
        'stone': '#78716C',
        'fog': '#9CA3AF',
        // Dourado
        'dorado': '#DAA520',
        'dourado': '#DAA520',
        'gold': '#DAA520',
        // Prata
        'plateado': '#A8A9AD',
        'prata': '#A8A9AD',
        'silver': '#A8A9AD',
        // Laranja
        'naranja': '#FF8C00',
        'laranja': '#FF8C00',
        'orange': '#FF8C00',
        // Amarelo
        'amarillo': '#F4D03F',
        'amarelo': '#F4D03F',
        'yellow': '#F4D03F',
        // Roxo
        'morado': '#800080',
        'roxo': '#800080',
        'purple': '#800080',
        // Bordô
        'bordo': '#800020',
        'burgundy': '#800020',
        'vinho': '#722F37',
        // Tons neutros
        'camel': '#C19A6B',
        'tan': '#D2B48C',
        'nude': '#D4A574',
        'coral': '#FF7F50',
        'turquesa': '#40E0D0',
        'off white': '#E8E4DF',
        'offwhite': '#E8E4DF'
    };
    
    const lowerColor = colorName.toLowerCase().trim();
    return colors[lowerColor] || '#9CA3AF';
}

// ========================================
// CARGAR PRODUCTOS
// ========================================
async function loadProducts() {
    try {
        showLoading(true);
        
        const response = await fetch('/api/productos');
        if (!response.ok) throw new Error('Error al cargar productos');
        
        const productos = await response.json();
        
        // Ordenar por precio: más barato primero
        state.productos = productos.sort((a, b) => a.precio - b.precio);
        state.productosFiltrados = [...state.productos];
        
        renderProducts();
    } catch (error) {
        console.error('Error:', error);
        showError('No se pudieron cargar los productos');
    } finally {
        showLoading(false);
    }
}

// ========================================
// RENDERIZAR PRODUCTOS
// ========================================
function renderProducts() {
    const productos = state.productosFiltrados;
    
    if (productos.length === 0) {
        elements.productsGrid.innerHTML = '';
        elements.emptyState.style.display = 'block';
        elements.productsCount.textContent = '0 productos';
        return;
    }
    
    elements.emptyState.style.display = 'none';
    elements.productsCount.textContent = `${productos.length} producto${productos.length !== 1 ? 's' : ''}`;
    
    elements.productsGrid.innerHTML = productos.map(producto => {
        const variaciones = producto.variaciones || [];
        const primeraVariacion = variaciones[0];
        const imagenPrincipal = primeraVariacion?.imagen 
            ? `/uploads/${primeraVariacion.imagen}` 
            : '/img/placeholder.jpg';
        
        const numColores = variaciones.length;
        
        // Generar dots de colores (máximo 5)
        const colorDots = variaciones.slice(0, 5).map(v => `
            <span class="color-dot" style="background-color: ${getColorHex(v.color)}" title="${v.color}"></span>
        `).join('');
        
        return `
            <article class="product-card" data-id="${producto.id}">
                <div class="product-image">
                    <img src="${imagenPrincipal}" alt="${producto.nombre}" loading="lazy" 
                         onerror="this.src='/img/placeholder.jpg'">
                    ${numColores > 0 ? `<span class="color-badge">${numColores} color${numColores !== 1 ? 'es' : ''}</span>` : ''}
                    ${colorDots ? `<div class="color-preview">${colorDots}</div>` : ''}
                </div>
                <div class="product-info">
                    <h3 class="product-name">${producto.nombre}</h3>
                    <p class="product-price">${formatPrice(producto.precio)}</p>
                </div>
            </article>
        `;
    }).join('');
    
    // Agregar event listeners a las cards
    document.querySelectorAll('.product-card').forEach(card => {
        card.addEventListener('click', () => {
            const id = parseInt(card.dataset.id);
            openProductModal(id);
        });
    });
}

// ========================================
// FILTRAR POR CATEGORÍA
// ========================================
function filterByCategory(categoria) {
    state.categoriaActual = categoria;
    
    if (categoria === 'todos') {
        state.productosFiltrados = [...state.productos];
    } else {
        state.productosFiltrados = state.productos.filter(p => 
            p.categoria?.toLowerCase().includes(categoria.toLowerCase())
        );
    }
    
    // Actualizar botones activos
    elements.categoryButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.category === categoria);
    });
    
    renderProducts();
}

// ========================================
// BUSCAR PRODUCTOS
// ========================================
function searchProducts(query) {
    const searchTerm = query.toLowerCase().trim();
    
    if (!searchTerm) {
        state.productosFiltrados = [...state.productos];
    } else {
        state.productosFiltrados = state.productos.filter(p => 
            p.nombre.toLowerCase().includes(searchTerm) ||
            p.descripcion?.toLowerCase().includes(searchTerm) ||
            p.variaciones?.some(v => v.color.toLowerCase().includes(searchTerm))
        );
    }
    
    renderProducts();
}

// ========================================
// MODAL DE PRODUCTO
// ========================================
async function openProductModal(id) {
    try {
        console.log('Abriendo producto ID:', id);
        
        const response = await fetch(`/api/productos/${id}`);
        if (!response.ok) throw new Error('Producto no encontrado');
        
        const producto = await response.json();
        console.log('Producto recibido:', producto);
        
        state.productoActual = producto;
        
        // Mostrar información básica
        if (elements.modalTitle) {
            elements.modalTitle.textContent = producto.nombre;
        }
        if (elements.modalPrice) {
            elements.modalPrice.textContent = formatPrice(producto.precio);
        }
        if (elements.modalDescription) {
            elements.modalDescription.textContent = producto.descripcion || 'Sin descripción disponible.';
        }
        
        // Renderizar opciones de color
        renderColorOptions(producto.variaciones || []);
        
        // Seleccionar primera variación por defecto
        if (producto.variaciones && producto.variaciones.length > 0) {
            selectVariation(producto.variaciones[0]);
        }
        
        // Mostrar modal
        elements.modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    } catch (error) {
        console.error('Error al abrir producto:', error);
        alert('No se pudo cargar el producto');
    }
}

function renderColorOptions(variaciones) {
    if (!variaciones || variaciones.length === 0) {
        elements.colorOptions.innerHTML = '<p style="color: #999;">Sin variaciones disponibles</p>';
        return;
    }
    
    elements.colorOptions.innerHTML = variaciones.map(v => `
        <button class="color-option" data-id="${v.id}">
            ${v.imagen 
                ? `<img src="/uploads/${v.imagen}" alt="${v.color}">`
                : `<span class="color-dot" style="background: ${getColorHex(v.color)}; width: 50px; height: 50px;"></span>`
            }
            <span>${v.color}</span>
        </button>
    `).join('');
    
    // Event listeners
    elements.colorOptions.querySelectorAll('.color-option').forEach(btn => {
        btn.addEventListener('click', () => {
            const variacion = variaciones.find(v => v.id === parseInt(btn.dataset.id));
            if (variacion) selectVariation(variacion);
        });
    });
}

function selectVariation(variacion) {
    state.variacionActual = variacion;
    
    // Actualizar botón activo
    elements.colorOptions.querySelectorAll('.color-option').forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.id) === variacion.id);
    });
    
    // Actualizar imagen principal
    if (variacion.imagen) {
        elements.mainImage.src = `/uploads/${variacion.imagen}`;
    }
    
    // Actualizar color seleccionado
    elements.selectedColor.textContent = variacion.color;
    
    // Renderizar galería de miniaturas
    renderGalleryThumbs(variacion);
}

function renderGalleryThumbs(variacion) {
    const imagenes = [];
    
    // Imagen principal de la variación
    if (variacion.imagen) {
        imagenes.push({ src: `/uploads/${variacion.imagen}`, isMain: true });
    }
    
    // Imágenes adicionales (de la galería)
    const galeriaImagenes = variacion.imagenes_galeria || variacion.imagenes || [];
    if (galeriaImagenes.length > 0) {
        galeriaImagenes.forEach(img => {
            imagenes.push({ src: `/uploads/${img.imagen}`, isMain: false });
        });
    }
    
    // Guardar en estado de galería
    galleryState.images = imagenes;
    galleryState.currentIndex = 0;
    
    // Mostrar/ocultar navegación
    const hasMultipleImages = imagenes.length > 1;
    
    if (elements.galleryPrev) {
        elements.galleryPrev.style.display = hasMultipleImages ? 'flex' : 'none';
    }
    if (elements.galleryNext) {
        elements.galleryNext.style.display = hasMultipleImages ? 'flex' : 'none';
    }
    
    // Renderizar indicadores
    if (elements.galleryIndicators) {
        if (hasMultipleImages) {
            elements.galleryIndicators.innerHTML = imagenes.map((_, index) => `
                <button class="gallery-indicator ${index === 0 ? 'active' : ''}" data-index="${index}" aria-label="Foto ${index + 1}"></button>
            `).join('');
            elements.galleryIndicators.style.display = 'flex';
            
            // Event listeners para indicadores
            elements.galleryIndicators.querySelectorAll('.gallery-indicator').forEach(indicator => {
                indicator.addEventListener('click', () => {
                    goToImage(parseInt(indicator.dataset.index));
                });
            });
        } else {
            elements.galleryIndicators.innerHTML = '';
            elements.galleryIndicators.style.display = 'none';
        }
    }
    
    // Renderizar miniaturas
    if (imagenes.length <= 1) {
        elements.galleryThumbs.innerHTML = '';
        return;
    }
    
    elements.galleryThumbs.innerHTML = imagenes.map((img, index) => `
        <button class="gallery-thumb ${index === 0 ? 'active' : ''}" data-src="${img.src}" data-index="${index}">
            <img src="${img.src}" alt="Vista ${index + 1}">
        </button>
    `).join('');
    
    // Event listeners para miniaturas
    elements.galleryThumbs.querySelectorAll('.gallery-thumb').forEach(thumb => {
        thumb.addEventListener('click', () => {
            goToImage(parseInt(thumb.dataset.index));
        });
    });
}

// ========================================
// NAVEGAÇÃO DA GALERIA
// ========================================
function goToImage(index) {
    if (index < 0 || index >= galleryState.images.length) return;
    
    galleryState.currentIndex = index;
    const img = galleryState.images[index];
    
    // Atualizar imagem principal
    elements.mainImage.src = img.src;
    
    // Atualizar miniaturas ativas
    elements.galleryThumbs.querySelectorAll('.gallery-thumb').forEach((thumb, i) => {
        thumb.classList.toggle('active', i === index);
    });
    
    // Atualizar indicadores ativos
    if (elements.galleryIndicators) {
        elements.galleryIndicators.querySelectorAll('.gallery-indicator').forEach((indicator, i) => {
            indicator.classList.toggle('active', i === index);
        });
    }
    
    // Scroll automático para miniatura visível
    const activeThumb = elements.galleryThumbs.querySelector('.gallery-thumb.active');
    if (activeThumb) {
        activeThumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
}

function nextImage() {
    const nextIndex = (galleryState.currentIndex + 1) % galleryState.images.length;
    goToImage(nextIndex);
}

function prevImage() {
    const prevIndex = galleryState.currentIndex === 0 
        ? galleryState.images.length - 1 
        : galleryState.currentIndex - 1;
    goToImage(prevIndex);
}

// ========================================
// TOUCH/SWIPE NA GALERIA
// ========================================
function initGallerySwipe() {
    if (!elements.galleryMain) return;
    
    const minSwipeDistance = 50;
    
    elements.galleryMain.addEventListener('touchstart', (e) => {
        galleryState.touchStartX = e.touches[0].clientX;
        galleryState.isSwiping = true;
    }, { passive: true });
    
    elements.galleryMain.addEventListener('touchmove', (e) => {
        if (!galleryState.isSwiping) return;
        galleryState.touchEndX = e.touches[0].clientX;
    }, { passive: true });
    
    elements.galleryMain.addEventListener('touchend', () => {
        if (!galleryState.isSwiping) return;
        
        const swipeDistance = galleryState.touchStartX - galleryState.touchEndX;
        
        if (Math.abs(swipeDistance) > minSwipeDistance) {
            if (swipeDistance > 0) {
                // Swipe para esquerda = próxima imagem
                nextImage();
            } else {
                // Swipe para direita = imagem anterior
                prevImage();
            }
        }
        
        galleryState.isSwiping = false;
        galleryState.touchStartX = 0;
        galleryState.touchEndX = 0;
    }, { passive: true });
    
    // Prevenir scroll horizontal no modal durante swipe na galeria
    elements.galleryMain.addEventListener('touchmove', (e) => {
        if (galleryState.images.length > 1) {
            // Só previne se tiver múltiplas imagens e o swipe for horizontal
            const deltaX = Math.abs(galleryState.touchStartX - e.touches[0].clientX);
            const deltaY = Math.abs(e.touches[0].clientY - (galleryState.touchStartY || e.touches[0].clientY));
            
            if (deltaX > deltaY && deltaX > 10) {
                e.preventDefault();
            }
        }
    }, { passive: false });
    
    // Guardar Y inicial para detectar direção do swipe
    elements.galleryMain.addEventListener('touchstart', (e) => {
        galleryState.touchStartY = e.touches[0].clientY;
    }, { passive: true });
}

function closeModal() {
    elements.modal.classList.remove('active');
    document.body.style.overflow = '';
    state.productoActual = null;
    state.variacionActual = null;
}

// ========================================
// UTILIDADES UI
// ========================================
function showLoading(show) {
    elements.loading.style.display = show ? 'flex' : 'none';
}

function showError(message) {
    elements.productsGrid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
            <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M12 8v4M12 16h.01"></path>
            </svg>
            <h3>Error</h3>
            <p>${message}</p>
        </div>
    `;
}

// ========================================
// SIDEBAR / MENU
// ========================================
function openSidebar() {
    elements.sidebar?.classList.add('active');
    elements.sidebarOverlay?.classList.add('active');
    elements.menuToggle?.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeSidebar() {
    elements.sidebar?.classList.remove('active');
    elements.sidebarOverlay?.classList.remove('active');
    elements.menuToggle?.classList.remove('active');
    document.body.style.overflow = '';
}

function toggleSidebar() {
    if (elements.sidebar?.classList.contains('active')) {
        closeSidebar();
    } else {
        openSidebar();
    }
}

// ========================================
// MODAL ABOUT - QUIÉNES SOMOS
// ========================================
function openAboutModal() {
    elements.modalAbout?.classList.add('active');
    document.body.style.overflow = 'hidden';
    closeSidebar(); // Fecha o sidebar se estiver aberto
}

function closeAboutModal() {
    elements.modalAbout?.classList.remove('active');
    document.body.style.overflow = '';
}

// ========================================
// SEARCH BAR
// ========================================
function toggleSearchBar() {
    elements.searchBar.classList.toggle('active');
    if (elements.searchBar.classList.contains('active')) {
        elements.searchInput.focus();
    }
}

// ========================================
// HEADER SCROLL
// ========================================
function handleScroll() {
    const header = document.querySelector('.header');
    if (window.scrollY > 50) {
        header.classList.add('scrolled');
    } else {
        header.classList.remove('scrolled');
    }
}

// ========================================
// EVENT LISTENERS
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    // Cargar productos
    loadProducts();
    
    // Sidebar / Menu
    elements.menuToggle?.addEventListener('click', toggleSidebar);
    elements.sidebarClose?.addEventListener('click', closeSidebar);
    elements.sidebarOverlay?.addEventListener('click', closeSidebar);
    
    // Sidebar category buttons
    elements.sidebarCategoryButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            filterByCategory(btn.dataset.category);
            closeSidebar();
        });
    });
    
    // Sidebar links - close on click
    document.querySelectorAll('.sidebar-link').forEach(link => {
        link.addEventListener('click', () => {
            closeSidebar();
        });
    });
    
    // Categorías (header)
    elements.categoryButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            filterByCategory(btn.dataset.category);
        });
    });
    
    // Search
    elements.searchToggle?.addEventListener('click', toggleSearchBar);
    elements.searchClose?.addEventListener('click', toggleSearchBar);
    
    let searchTimeout;
    elements.searchInput?.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            searchProducts(e.target.value);
        }, 300);
    });
    
    // Modal
    elements.modalClose?.addEventListener('click', closeModal);
    elements.modalBackdrop?.addEventListener('click', closeModal);
    
    // Navegação da galeria
    elements.galleryPrev?.addEventListener('click', prevImage);
    elements.galleryNext?.addEventListener('click', nextImage);
    
    // Inicializar swipe na galeria
    initGallerySwipe();
    
    // Teclado para navegar imagens
    document.addEventListener('keydown', (e) => {
        if (elements.modal.classList.contains('active')) {
            if (e.key === 'ArrowLeft') {
                prevImage();
            } else if (e.key === 'ArrowRight') {
                nextImage();
            }
        }
    });
    
    // Modal About - Quiénes Somos
    elements.sidebarAboutBtn?.addEventListener('click', openAboutModal);
    elements.footerAboutBtn?.addEventListener('click', openAboutModal);
    elements.modalAboutClose?.addEventListener('click', closeAboutModal);
    elements.modalAboutBackdrop?.addEventListener('click', closeAboutModal);
    
    // Cerrar modales y sidebar con Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (elements.modal.classList.contains('active')) {
                closeModal();
            }
            if (elements.sidebar?.classList.contains('active')) {
                closeSidebar();
            }
            if (elements.modalAbout?.classList.contains('active')) {
                closeAboutModal();
            }
        }
    });
    
    // Scroll
    window.addEventListener('scroll', handleScroll);
});

