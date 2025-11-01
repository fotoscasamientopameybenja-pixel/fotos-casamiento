// Variables globales
let selectedFiles = [];
const maxFileSize = 10 * 1024 * 1024; // 10MB

// Configuración de Cloudinary
const CLOUDINARY_CONFIG = {
    cloudName: 'dm0dh7iqb',
    apiKey: '346395192943891',
    apiSecret: 'yE2yQEAASfvKYSeSENBib-uclJg',
    uploadPreset: null // Usaremos signed upload
};

// Elementos del DOM
const fileInput = document.getElementById('fileInput');
const selectPhotosBtn = document.getElementById('selectPhotosBtn');
const previewSection = document.getElementById('previewSection');
const previewContainer = document.getElementById('previewContainer');
const confirmBtn = document.getElementById('confirmBtn');
const cancelBtn = document.getElementById('cancelBtn');
const galleryGrid = document.getElementById('galleryGrid');
const photoCount = document.getElementById('photoCount');
const clearAllBtn = document.getElementById('clearAllBtn');
const progressSection = document.getElementById('progressSection');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');
const progressPercent = document.getElementById('progressPercent');
const selectModeBtn = document.getElementById('selectModeBtn');
const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
const cancelSelectBtn = document.getElementById('cancelSelectBtn');
const qrCodeBtn = document.getElementById('qrCodeBtn');
const qrModal = document.getElementById('qrModal');
const closeQrBtn = document.getElementById('closeQrBtn');
const downloadQrBtn = document.getElementById('downloadQrBtn');
const qrUrl = document.getElementById('qrUrl');

// Modo de selección
let isSelectMode = false;
let selectedPhotos = [];

// IndexedDB
let db = null;
const DB_NAME = 'WeddingGalleryDB';
const DB_VERSION = 1;
const STORE_NAME = 'photos';

// Inicialización
document.addEventListener('DOMContentLoaded', async () => {
    await initDB();
    await loadGallery();
    setupEventListeners();
    createFloatingEmojis();
});

// Inicializar IndexedDB
function initDB() {
    return new Promise((resolve) => {
        if (!window.indexedDB) {
            console.warn('IndexedDB no está disponible, usando localStorage');
            resolve();
            return;
        }
        
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onerror = () => {
            console.warn('Error al abrir IndexedDB, usando localStorage');
            resolve(); // No rechazamos, simplemente continuamos con localStorage
        };
        
        request.onsuccess = () => {
            db = request.result;
            resolve();
        };
        
        request.onupgradeneeded = (event) => {
            db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: false });
                objectStore.createIndex('date', 'date', { unique: false });
            }
        };
    });
}

// Configurar event listeners
function setupEventListeners() {
    // Subida de archivos
    fileInput.addEventListener('change', handleFileSelect);
    
    // Botón de seleccionar fotos - Simple y directo
    if (selectPhotosBtn) {
        selectPhotosBtn.addEventListener('click', function() {
            fileInput.click();
        });
    }
    
    // Drag and drop en el body (sin área visual)
    document.body.addEventListener('dragover', handleDragOver);
    document.body.addEventListener('dragleave', handleDragLeave);
    document.body.addEventListener('drop', handleDrop);
    
    // Botones
    confirmBtn.addEventListener('click', handleConfirmUpload);
    cancelBtn.addEventListener('click', handleCancelUpload);
    clearAllBtn.addEventListener('click', handleClearAll);
    
    // Botones de selección
    if (selectModeBtn) {
        selectModeBtn.addEventListener('click', enableSelectMode);
    }
    if (deleteSelectedBtn) {
        deleteSelectedBtn.addEventListener('click', handleDeleteSelected);
    }
    if (cancelSelectBtn) {
        cancelSelectBtn.addEventListener('click', disableSelectMode);
    }
    
    // Botón de código QR
    if (qrCodeBtn) {
        qrCodeBtn.addEventListener('click', showQRCode);
    }
    if (closeQrBtn) {
        closeQrBtn.addEventListener('click', closeQRModal);
    }
    if (downloadQrBtn) {
        downloadQrBtn.addEventListener('click', downloadQRCode);
    }
    if (qrModal) {
        qrModal.addEventListener('click', (e) => {
            if (e.target === qrModal) {
                closeQRModal();
            }
        });
    }
    
    // Modal de agradecimiento
    const thankYouModal = document.getElementById('thankYouModal');
    const closeThankYouBtn = document.getElementById('closeThankYouBtn');
    
    if (closeThankYouBtn) {
        closeThankYouBtn.addEventListener('click', closeThankYouModal);
    }
    
    if (thankYouModal) {
        thankYouModal.addEventListener('click', (e) => {
            if (e.target === thankYouModal) {
                closeThankYouModal();
            }
        });
    }
}

// Manejar selección de archivos
function handleFileSelect(e) {
    const files = Array.from(e.target.files);
    addFilesToPreview(files);
}

// Manejar drag over
function handleDragOver(e) {
    e.preventDefault();
    // Sin área visual, solo permitir el drop
}

// Manejar drag leave
function handleDragLeave(e) {
    e.preventDefault();
    // Sin área visual, no hay nada que cambiar
}

// Manejar drop
function handleDrop(e) {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
    if (files.length > 0) {
        addFilesToPreview(files);
    }
}

// Añadir archivos a la vista previa
function addFilesToPreview(files) {
    files.forEach(file => {
        // Validar tamaño
        if (file.size > maxFileSize) {
            alert(`La imagen ${file.name} es demasiado grande. Máximo 10MB.`);
            return;
        }
        
        // Validar tipo
        if (!file.type.startsWith('image/')) {
            alert(`${file.name} no es una imagen válida.`);
            return;
        }
        
        // Evitar duplicados
        if (selectedFiles.some(f => f.name === file.name && f.size === file.size)) {
            return;
        }
        
        selectedFiles.push(file);
        
        // Crear vista previa
        const reader = new FileReader();
        reader.onload = (e) => {
            const previewItem = createPreviewItem(e.target.result, selectedFiles.length - 1);
            previewContainer.appendChild(previewItem);
        };
        reader.readAsDataURL(file);
    });
    
    if (selectedFiles.length > 0) {
        previewSection.style.display = 'block';
    }
}

// Crear elemento de vista previa
function createPreviewItem(imageSrc, index) {
    const div = document.createElement('div');
    div.className = 'preview-item';
    
    const img = document.createElement('img');
    img.src = imageSrc;
    img.alt = 'Vista previa';
    
    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-preview';
    removeBtn.innerHTML = '×';
    removeBtn.onclick = () => {
        selectedFiles.splice(index, 1);
        div.remove();
        updatePreviewIndices();
        if (selectedFiles.length === 0) {
            previewSection.style.display = 'none';
        }
    };
    
    div.appendChild(img);
    div.appendChild(removeBtn);
    
    return div;
}

// Actualizar índices después de eliminar
function updatePreviewIndices() {
    const previewItems = previewContainer.querySelectorAll('.preview-item');
    previewItems.forEach((item, index) => {
        const removeBtn = item.querySelector('.remove-preview');
        removeBtn.onclick = () => {
            selectedFiles.splice(index, 1);
            item.remove();
            updatePreviewIndices();
            if (selectedFiles.length === 0) {
                previewSection.style.display = 'none';
            }
        };
    });
}

// Confirmar subida
async function handleConfirmUpload() {
    if (selectedFiles.length === 0) return;
    
    let processedCount = 0;
    const totalFiles = selectedFiles.length;
    
    // Mostrar barra de progreso
    if (progressSection) {
        progressSection.style.display = 'block';
    }
    updateProgress(0, totalFiles);
    
    // Mostrar mensaje de carga
    showNotification('Subiendo fotos a Cloudinary...');
    
    // Deshabilitar botón mientras sube
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Subiendo...';
    cancelBtn.disabled = true;
    
    for (let index = 0; index < selectedFiles.length; index++) {
        const file = selectedFiles[index];
        
        try {
            // Subir a Cloudinary
            const cloudinaryUrl = await uploadToCloudinary(file);
            
            // Guardar los datos de la foto (URL de Cloudinary en lugar de dataUrl)
            const photoData = {
                id: Date.now() + Math.random() + index,
                url: cloudinaryUrl,
                name: file.name,
                date: new Date().toISOString(),
                cloudinary: true
            };
            
            await savePhotoToGallery(photoData);
            
            processedCount++;
            
            // Actualizar barra de progreso
            updateProgress(processedCount, totalFiles);
            
        } catch (error) {
            console.error('Error al subir foto:', error);
            const errorMsg = error.message || 'Error desconocido';
            showNotification(`Error: ${file.name} - ${errorMsg}`, 'error');
            processedCount++;
            
            // Actualizar barra de progreso incluso si hay error
            updateProgress(processedCount, totalFiles);
        }
    }
    
    // Cuando todas las fotos se hayan procesado, recargar la galería
    if (processedCount === totalFiles) {
        // Ocultar barra de progreso
        if (progressSection) {
            progressSection.style.display = 'none';
        }
        
        // Limpiar vista previa
        selectedFiles = [];
        previewContainer.innerHTML = '';
        previewSection.style.display = 'none';
        fileInput.value = '';
        
        // Rehabilitar botones
        confirmBtn.disabled = false;
        confirmBtn.textContent = 'Subir Fotos';
        cancelBtn.disabled = false;
        
        // Mostrar mensaje de éxito
        showNotification('¡Fotos subidas correctamente a Cloudinary!');
        
        // Recargar galería después de que todas se hayan guardado
        await loadGallery();
        
        // Mostrar modal de agradecimiento con el GIF
        showThankYouModal();
        
        // Hacer scroll suave hacia la galería
        setTimeout(() => {
            document.querySelector('.gallery-section').scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start' 
            });
        }, 100);
    }
}

// Actualizar barra de progreso
function updateProgress(current, total) {
    if (!progressBar || !progressText || !progressPercent) return;
    
    const percentage = Math.round((current / total) * 100);
    
    // Actualizar texto del contador (ej: 1/6, 2/6, etc.)
    progressText.textContent = `${current}/${total}`;
    
    // Actualizar porcentaje
    progressPercent.textContent = `${percentage}%`;
    
    // Actualizar ancho de la barra
    progressBar.style.width = `${percentage}%`;
    
    // Mostrar texto dentro de la barra
    if (percentage > 10) {
        progressBar.textContent = `${percentage}%`;
    } else {
        progressBar.textContent = '';
    }
}

// Subir foto a Cloudinary
async function uploadToCloudinary(file) {
    return new Promise((resolve, reject) => {
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', 'ml_default'); // Preset sin firma configurado en Cloudinary
            
            const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/image/upload`;
            
            fetch(uploadUrl, {
                method: 'POST',
                body: formData,
                mode: 'cors' // Asegurar que CORS funcione
            })
            .then(response => {
                if (!response.ok) {
                    // Intentar leer el error
                    return response.text().then(text => {
                        let errorMessage = `Error HTTP: ${response.status}`;
                        try {
                            const errorData = JSON.parse(text);
                            errorMessage = errorData.error?.message || errorData.message || errorMessage;
                            console.error('Error de Cloudinary:', errorData);
                        } catch (e) {
                            console.error('Error de Cloudinary (texto):', text);
                            errorMessage = text || errorMessage;
                        }
                        throw new Error(errorMessage);
                    });
                }
                return response.json();
            })
            .then(data => {
                if (data.secure_url || data.url) {
                    console.log('Foto subida exitosamente a Cloudinary:', data.secure_url || data.url);
                    resolve(data.secure_url || data.url);
                } else {
                    console.error('Respuesta de Cloudinary sin URL:', data);
                    reject(new Error('No se recibió URL de Cloudinary en la respuesta'));
                }
            })
            .catch(error => {
                console.error('Error en upload a Cloudinary:', error);
                reject(error);
            });
        } catch (error) {
            console.error('Error al preparar upload:', error);
            reject(error);
        }
    });
}

// Cancelar subida
function handleCancelUpload() {
    selectedFiles = [];
    previewContainer.innerHTML = '';
    previewSection.style.display = 'none';
    fileInput.value = '';
    
    // Ocultar barra de progreso si está visible
    if (progressSection) {
        progressSection.style.display = 'none';
    }
    
    // Rehabilitar botones
    if (confirmBtn) {
        confirmBtn.disabled = false;
        confirmBtn.textContent = 'Subir Fotos';
    }
    if (cancelBtn) {
        cancelBtn.disabled = false;
    }
}

// Guardar foto en la galería
function savePhotoToGallery(photoData) {
    return new Promise((resolve, reject) => {
        // Intentar usar IndexedDB primero
        if (db) {
            try {
                const transaction = db.transaction([STORE_NAME], 'readwrite');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.add(photoData);
                
                request.onsuccess = () => {
                    resolve();
                };
                
                request.onerror = () => {
                    // Fallback a localStorage si IndexedDB falla
                    saveToLocalStorage(photoData);
                    resolve();
                };
                return;
            } catch (error) {
                // Fallback a localStorage
                saveToLocalStorage(photoData);
                resolve();
                return;
            }
        }
        
        // Fallback a localStorage
        saveToLocalStorage(photoData);
        resolve();
    });
}

// Función auxiliar para guardar en localStorage
function saveToLocalStorage(photoData) {
    try {
        let gallery = JSON.parse(localStorage.getItem('weddingGallery') || '[]');
        gallery.push(photoData);
        // Limpiar si es demasiado grande (más de 50 fotos)
        if (gallery.length > 50) {
            gallery = gallery.slice(-50);
        }
        localStorage.setItem('weddingGallery', JSON.stringify(gallery));
    } catch (error) {
        console.error('Error al guardar en localStorage:', error);
    }
}

// Obtener todas las fotos del storage
async function getGalleryFromStorage() {
    return new Promise((resolve) => {
        // Intentar usar IndexedDB primero
        if (db) {
            try {
                const transaction = db.transaction([STORE_NAME], 'readonly');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.getAll();
                
                request.onsuccess = () => {
                    resolve(request.result || []);
                };
                
                request.onerror = () => {
                    // Fallback a localStorage
                    resolve(getFromLocalStorage());
                };
                return;
            } catch (error) {
                // Fallback a localStorage
                resolve(getFromLocalStorage());
            }
        }
        
        // Fallback a localStorage
        resolve(getFromLocalStorage());
    });
}

// Función auxiliar para obtener de localStorage
function getFromLocalStorage() {
    try {
        const gallery = localStorage.getItem('weddingGallery');
        return gallery ? JSON.parse(gallery) : [];
    } catch (error) {
        console.error('Error al leer localStorage:', error);
        return [];
    }
}

// Cargar galería
async function loadGallery() {
    const gallery = await getGalleryFromStorage();
    
    if (gallery.length === 0) {
        galleryGrid.innerHTML = '<div class="empty-gallery"><p>No hay fotos aún. ¡Sube tu primera foto para comenzar!</p></div>';
        photoCount.textContent = '0 fotos';
        clearAllBtn.style.display = 'none';
        selectModeBtn.style.display = 'none';
        return;
    }
    
    galleryGrid.innerHTML = '';
    photoCount.textContent = `${gallery.length} ${gallery.length === 1 ? 'foto' : 'fotos'}`;
    clearAllBtn.style.display = 'block';
    selectModeBtn.style.display = 'block';
    
    gallery.forEach((photo, index) => {
        const galleryItem = createGalleryItem(photo, index);
        galleryGrid.appendChild(galleryItem);
    });
    
    // Actualizar estado de selección si está activo
    if (isSelectMode) {
        updateSelectModeUI();
    }
}

// Crear elemento de galería
function createGalleryItem(photo, index) {
    const div = document.createElement('div');
    div.className = 'gallery-item';
    div.dataset.photoIndex = index;
    
    // Checkbox para modo selección
    const checkbox = document.createElement('div');
    checkbox.className = 'select-checkbox';
    checkbox.onclick = (e) => {
        e.stopPropagation();
        togglePhotoSelection(index);
    };
    
    const img = document.createElement('img');
    img.src = photo.url || photo.dataUrl;
    img.alt = photo.name || 'Foto';
    const imageSrc = photo.url || photo.dataUrl;
    
    // Cambiar comportamiento según modo
    if (isSelectMode) {
        img.onclick = (e) => {
            e.stopPropagation();
            togglePhotoSelection(index);
        };
    } else {
        img.onclick = () => openModal(imageSrc);
    }
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.innerHTML = '×';
    deleteBtn.onclick = (e) => {
        e.stopPropagation();
        if (!isSelectMode) {
            if (confirm('¿Estás seguro de que quieres eliminar esta foto?')) {
                deletePhotoFromGallery(index);
            }
        }
    };
    
    div.appendChild(checkbox);
    div.appendChild(img);
    div.appendChild(deleteBtn);
    
    // Actualizar estado visual según modo
    if (isSelectMode) {
        div.classList.add('select-mode');
        if (selectedPhotos.includes(index)) {
            div.classList.add('selected');
        }
    }
    
    return div;
}

// Eliminar foto de la galería
async function deletePhotoFromGallery(index) {
    try {
        const gallery = await getGalleryFromStorage();
        const photoToDelete = gallery[index];
        
        if (!photoToDelete) {
            console.error('No se encontró la foto para eliminar');
            return;
        }
        
        // Intentar usar IndexedDB
        if (db && photoToDelete.id) {
            try {
                const transaction = db.transaction([STORE_NAME], 'readwrite');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.delete(photoToDelete.id);
                
                request.onsuccess = async () => {
                    await loadGallery();
                    showNotification('Foto eliminada');
                };
                
                request.onerror = () => {
                    // Fallback a localStorage
                    deleteFromLocalStorage(index);
                    loadGallery();
                    showNotification('Foto eliminada');
                };
                return;
            } catch (error) {
                // Fallback a localStorage
                deleteFromLocalStorage(index);
                loadGallery();
                showNotification('Foto eliminada');
            }
        } else {
            // Usar localStorage
            deleteFromLocalStorage(index);
            loadGallery();
            showNotification('Foto eliminada');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error al eliminar la foto');
    }
}

// Función auxiliar para eliminar de localStorage
function deleteFromLocalStorage(index) {
    try {
        let gallery = JSON.parse(localStorage.getItem('weddingGallery') || '[]');
        gallery.splice(index, 1);
        localStorage.setItem('weddingGallery', JSON.stringify(gallery));
    } catch (error) {
        console.error('Error al eliminar de localStorage:', error);
    }
}

// Activar modo de selección
function enableSelectMode() {
    isSelectMode = true;
    selectedPhotos = [];
    updateSelectModeUI();
    updateGalleryItems();
}

// Desactivar modo de selección
function disableSelectMode() {
    isSelectMode = false;
    selectedPhotos = [];
    updateSelectModeUI();
    updateGalleryItems();
}

// Actualizar UI del modo de selección
function updateSelectModeUI() {
    if (isSelectMode) {
        selectModeBtn.style.display = 'none';
        deleteSelectedBtn.style.display = selectedPhotos.length > 0 ? 'block' : 'none';
        cancelSelectBtn.style.display = 'block';
        clearAllBtn.style.display = 'none';
    } else {
        selectModeBtn.style.display = 'block';
        deleteSelectedBtn.style.display = 'none';
        cancelSelectBtn.style.display = 'none';
        clearAllBtn.style.display = galleryGrid.children.length > 0 ? 'block' : 'none';
    }
}

// Actualizar items de galería para modo selección
function updateGalleryItems() {
    const items = galleryGrid.querySelectorAll('.gallery-item');
    items.forEach((item, index) => {
        const photoIndex = parseInt(item.dataset.photoIndex);
        const img = item.querySelector('img');
        const imageSrc = img.src;
        
        if (isSelectMode) {
            item.classList.add('select-mode');
            img.onclick = (e) => {
                e.stopPropagation();
                togglePhotoSelection(photoIndex);
            };
            
            if (selectedPhotos.includes(photoIndex)) {
                item.classList.add('selected');
            } else {
                item.classList.remove('selected');
            }
        } else {
            item.classList.remove('select-mode', 'selected');
            img.onclick = () => openModal(imageSrc);
        }
    });
}

// Alternar selección de foto
function togglePhotoSelection(index) {
    const photoIndex = parseInt(index);
    const itemIndex = selectedPhotos.indexOf(photoIndex);
    
    if (itemIndex > -1) {
        selectedPhotos.splice(itemIndex, 1);
    } else {
        selectedPhotos.push(photoIndex);
    }
    
    updateSelectModeUI();
    updateGalleryItems();
}

// Eliminar fotos seleccionadas
async function handleDeleteSelected() {
    if (selectedPhotos.length === 0) return;
    
    const count = selectedPhotos.length;
    const message = count === 1 
        ? '¿Estás seguro de que quieres eliminar esta foto?'
        : `¿Estás seguro de que quieres eliminar ${count} fotos?`;
    
    if (!confirm(message)) return;
    
    try {
        const gallery = await getGalleryFromStorage();
        const photosToDelete = selectedPhotos.map(index => gallery[index]).filter(Boolean);
        
        if (photosToDelete.length === 0) {
            showNotification('No se encontraron fotos para eliminar');
            disableSelectMode();
            return;
        }
        
        // Eliminar fotos usando sus IDs o índices
        let successCount = 0;
        for (const photo of photosToDelete) {
            try {
                // Intentar usar IndexedDB primero
                if (db && photo.id) {
                    const transaction = db.transaction([STORE_NAME], 'readwrite');
                    const store = transaction.objectStore(STORE_NAME);
                    await new Promise((resolve, reject) => {
                        const request = store.delete(photo.id);
                        request.onsuccess = () => resolve();
                        request.onerror = () => {
                            // Fallback a localStorage
                            deleteFromLocalStorageByPhoto(photo);
                            resolve();
                        };
                    });
                } else {
                    // Usar localStorage
                    deleteFromLocalStorageByPhoto(photo);
                }
                successCount++;
            } catch (error) {
                console.error('Error al eliminar foto:', error);
            }
        }
        
        // Limpiar localStorage también para sincronizar
        if (db) {
            let galleryLocal = JSON.parse(localStorage.getItem('weddingGallery') || '[]');
            const idsToDelete = new Set(photosToDelete.map(p => p.id).filter(Boolean));
            galleryLocal = galleryLocal.filter(p => !idsToDelete.has(p.id));
            localStorage.setItem('weddingGallery', JSON.stringify(galleryLocal));
        }
        
        // Desactivar modo de selección
        disableSelectMode();
        
        // Recargar galería
        await loadGallery();
        showNotification(`${successCount} ${successCount === 1 ? 'foto eliminada' : 'fotos eliminadas'}`);
    } catch (error) {
        console.error('Error al eliminar fotos seleccionadas:', error);
        showNotification('Error al eliminar las fotos');
        disableSelectMode();
    }
}

// Función auxiliar para eliminar de localStorage por objeto foto
function deleteFromLocalStorageByPhoto(photo) {
    try {
        let gallery = JSON.parse(localStorage.getItem('weddingGallery') || '[]');
        if (photo.id) {
            gallery = gallery.filter(p => p.id !== photo.id);
        } else {
            // Si no tiene ID, buscar por URL o dataUrl
            gallery = gallery.filter(p => 
                (p.url || p.dataUrl) !== (photo.url || photo.dataUrl)
            );
        }
        localStorage.setItem('weddingGallery', JSON.stringify(gallery));
    } catch (error) {
        console.error('Error al eliminar de localStorage:', error);
    }
}

// Eliminar todas las fotos
async function handleClearAll() {
    if (confirm('¿Estás seguro de que quieres eliminar todas las fotos? Esta acción no se puede deshacer.')) {
        try {
            // Intentar usar IndexedDB
            if (db) {
                try {
                    const transaction = db.transaction([STORE_NAME], 'readwrite');
                    const store = transaction.objectStore(STORE_NAME);
                    const request = store.clear();
                    
                    request.onsuccess = async () => {
                        localStorage.removeItem('weddingGallery');
                        await loadGallery();
                        showNotification('Todas las fotos han sido eliminadas');
                    };
                    
                    request.onerror = () => {
                        localStorage.removeItem('weddingGallery');
                        loadGallery();
                        showNotification('Todas las fotos han sido eliminadas');
                    };
                    return;
                } catch (error) {
                    // Fallback
                    localStorage.removeItem('weddingGallery');
                    loadGallery();
                    showNotification('Todas las fotos han sido eliminadas');
                }
            } else {
                // Usar localStorage
                localStorage.removeItem('weddingGallery');
                await loadGallery();
                showNotification('Todas las fotos han sido eliminadas');
            }
        } catch (error) {
            console.error('Error:', error);
            showNotification('Error al eliminar las fotos');
        }
    }
}

// Abrir modal para vista ampliada
function openModal(imageSrc) {
    // Crear modal si no existe
    let modal = document.getElementById('imageModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'imageModal';
        modal.className = 'modal';
        
        const closeBtn = document.createElement('span');
        closeBtn.className = 'modal-close';
        closeBtn.innerHTML = '&times;';
        closeBtn.onclick = closeModal;
        
        const content = document.createElement('div');
        content.className = 'modal-content';
        const img = document.createElement('img');
        img.src = imageSrc;
        content.appendChild(img);
        
        modal.appendChild(closeBtn);
        modal.appendChild(content);
        modal.onclick = (e) => {
            if (e.target === modal) closeModal();
        };
        
        document.body.appendChild(modal);
    }
    
    const img = modal.querySelector('img');
    img.src = imageSrc;
    modal.classList.add('active');
}

// Cerrar modal
function closeModal() {
    const modal = document.getElementById('imageModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

// Mostrar modal de agradecimiento
function showThankYouModal() {
    const modal = document.getElementById('thankYouModal');
    if (modal) {
        modal.classList.add('active');
        // Cerrar automáticamente después de 5 segundos
        setTimeout(() => {
            closeThankYouModal();
        }, 5000);
    }
}

// Cerrar modal de agradecimiento
function closeThankYouModal() {
    const modal = document.getElementById('thankYouModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

// Mostrar código QR
function showQRCode() {
    if (!window.QRCode) {
        showNotification('Error: La librería de QR no está cargada', 'error');
        return;
    }
    
    const canvas = document.getElementById('qrcode');
    const currentUrl = window.location.href;
    
    // Mostrar URL en el modal
    if (qrUrl) {
        qrUrl.textContent = currentUrl;
    }
    
    // Limpiar canvas anterior
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Generar código QR
    QRCode.toCanvas(canvas, currentUrl, {
        width: 300,
        margin: 2,
        color: {
            dark: '#667eea',
            light: '#ffffff'
        }
    }, (error) => {
        if (error) {
            console.error('Error al generar QR:', error);
            showNotification('Error al generar el código QR', 'error');
            return;
        }
        
        // Mostrar modal
        if (qrModal) {
            qrModal.classList.add('active');
        }
    });
}

// Cerrar modal de QR
function closeQRModal() {
    if (qrModal) {
        qrModal.classList.remove('active');
    }
}

// Descargar código QR
function downloadQRCode() {
    const canvas = document.getElementById('qrcode');
    const link = document.createElement('a');
    link.download = 'codigo-qr-galeria.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
    showNotification('Código QR descargado');
}

// Crear emojis flotantes
function createFloatingEmojis() {
    const emojis = ['💍', '💕', '❤️', '💖', '💗', '💓', '💝', '💞', '💟', '💍', '💕', '❤️', '💖', '💗', '💓', '💝', '💞', '💟', '💍', '💕', '❤️', '💖', '💗', '💓', '💝', '💞', '💟'];
    
    // Crear contenedor para los emojis flotantes
    const floatingContainer = document.createElement('div');
    floatingContainer.className = 'floating-emojis';
    floatingContainer.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 0;
        overflow: hidden;
    `;
    document.body.appendChild(floatingContainer);
    
    // Crear muchos más emojis flotantes iniciales
    for (let i = 0; i < 150; i++) {
        setTimeout(() => {
            createFloatingEmoji(floatingContainer, emojis);
        }, i * 150); // Crear más rápido
    }
    
    // Crear emojis periódicamente más frecuentemente
    setInterval(() => {
        // Crear 4-5 emojis a la vez
        for (let j = 0; j < 5; j++) {
            setTimeout(() => {
                createFloatingEmoji(floatingContainer, emojis);
            }, j * 80);
        }
    }, 1000); // Cada 1 segundo
}

// Crear un emoji flotante individual
function createFloatingEmoji(container, emojis) {
    const emoji = document.createElement('div');
    const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
    
    emoji.textContent = randomEmoji;
    emoji.style.cssText = `
        position: absolute;
        font-size: ${20 + Math.random() * 30}px;
        opacity: ${0.3 + Math.random() * 0.4};
        left: ${Math.random() * 100}%;
        animation: floatDown ${15 + Math.random() * 10}s linear forwards;
        pointer-events: none;
        user-select: none;
    `;
    
    container.appendChild(emoji);
    
    // Remover el emoji después de que termine la animación
    setTimeout(() => {
        if (emoji.parentNode) {
            emoji.remove();
        }
    }, 25000);
}

// Mostrar notificación
function showNotification(message, type = 'success') {
    // Crear notificación si no existe
    let notification = document.getElementById('notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'notification';
        document.body.appendChild(notification);
    }
    
    // Configurar estilos según el tipo
    const bgColor = type === 'error' ? '#dc3545' : '#28a745';
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${bgColor};
        color: white;
        padding: 15px 25px;
        border-radius: 8px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        z-index: 2000;
        opacity: 0;
        transition: opacity 0.3s ease;
        max-width: 400px;
        word-wrap: break-word;
    `;
    
    notification.textContent = message;
    notification.style.opacity = '1';
    
    const duration = type === 'error' ? 5000 : 3000;
    
    setTimeout(() => {
        notification.style.opacity = '0';
    }, duration);
}

