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
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const previewSection = document.getElementById('previewSection');
const previewContainer = document.getElementById('previewContainer');
const confirmBtn = document.getElementById('confirmBtn');
const cancelBtn = document.getElementById('cancelBtn');
const galleryGrid = document.getElementById('galleryGrid');
const photoCount = document.getElementById('photoCount');
const clearAllBtn = document.getElementById('clearAllBtn');

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
    
    // Drag and drop
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('dragleave', handleDragLeave);
    uploadArea.addEventListener('drop', handleDrop);
    uploadArea.addEventListener('click', () => fileInput.click());
    
    // Botones
    confirmBtn.addEventListener('click', handleConfirmUpload);
    cancelBtn.addEventListener('click', handleCancelUpload);
    clearAllBtn.addEventListener('click', handleClearAll);
}

// Manejar selección de archivos
function handleFileSelect(e) {
    const files = Array.from(e.target.files);
    addFilesToPreview(files);
}

// Manejar drag over
function handleDragOver(e) {
    e.preventDefault();
    uploadArea.classList.add('dragover');
}

// Manejar drag leave
function handleDragLeave(e) {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
}

// Manejar drop
function handleDrop(e) {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
    addFilesToPreview(files);
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
    
    // Mostrar mensaje de carga
    showNotification('Subiendo fotos a Cloudinary...');
    
    // Deshabilitar botón mientras sube
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Subiendo...';
    
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
            
        } catch (error) {
            console.error('Error al subir foto:', error);
            const errorMsg = error.message || 'Error desconocido';
            showNotification(`Error: ${file.name} - ${errorMsg}`, 'error');
            processedCount++;
        }
    }
    
    // Cuando todas las fotos se hayan procesado, recargar la galería
    if (processedCount === totalFiles) {
        // Limpiar vista previa
        selectedFiles = [];
        previewContainer.innerHTML = '';
        previewSection.style.display = 'none';
        fileInput.value = '';
        
        // Rehabilitar botón
        confirmBtn.disabled = false;
        confirmBtn.textContent = 'Subir Fotos';
        
        // Mostrar mensaje de éxito
        showNotification('¡Fotos subidas correctamente a Cloudinary!');
        
        // Recargar galería después de que todas se hayan guardado
        await loadGallery();
        
        // Hacer scroll suave hacia la galería
        setTimeout(() => {
            document.querySelector('.gallery-section').scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start' 
            });
        }, 100);
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
        return;
    }
    
    galleryGrid.innerHTML = '';
    photoCount.textContent = `${gallery.length} ${gallery.length === 1 ? 'foto' : 'fotos'}`;
    clearAllBtn.style.display = 'block';
    
    gallery.forEach((photo, index) => {
        const galleryItem = createGalleryItem(photo, index);
        galleryGrid.appendChild(galleryItem);
    });
}

// Crear elemento de galería
function createGalleryItem(photo, index) {
    const div = document.createElement('div');
    div.className = 'gallery-item';
    div.dataset.photoIndex = index;
    
    const img = document.createElement('img');
    img.src = photo.url || photo.dataUrl;
    img.alt = photo.name || 'Foto';
    const imageSrc = photo.url || photo.dataUrl;
    img.onclick = () => openModal(imageSrc);
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.innerHTML = '×';
    deleteBtn.onclick = (e) => {
        e.stopPropagation();
        if (confirm('¿Estás seguro de que quieres eliminar esta foto?')) {
            deletePhotoFromGallery(index);
        }
    };
    
    div.appendChild(img);
    div.appendChild(deleteBtn);
    
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

