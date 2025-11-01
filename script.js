// Variables globales
let selectedFiles = [];
const maxFileSize = 10 * 1024 * 1024; // 10MB

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
const selectModeBtn = document.getElementById('selectModeBtn');
const cancelSelectBtn = document.getElementById('cancelSelectBtn');
const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
const progressSection = document.getElementById('progressSection');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');
const progressPercent = document.getElementById('progressPercent');

// Variables de selección
let isSelectMode = false;
let selectedPhotos = [];

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    loadGallery();
    setupEventListeners();
});

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
    selectModeBtn.addEventListener('click', activateSelectMode);
    cancelSelectBtn.addEventListener('click', deactivateSelectMode);
    deleteSelectedBtn.addEventListener('click', handleDeleteSelected);
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
function handleConfirmUpload() {
    if (selectedFiles.length === 0) return;
    
    let processedCount = 0;
    const totalFiles = selectedFiles.length;
    
    // Mostrar barra de progreso
    progressSection.style.display = 'block';
    updateProgress(0, totalFiles);
    
    // Deshabilitar botones durante la subida
    confirmBtn.disabled = true;
    cancelBtn.disabled = true;
    
    selectedFiles.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const photoData = {
                id: Date.now() + Math.random() + index,
                dataUrl: e.target.result,
                name: file.name,
                date: new Date().toISOString()
            };
            savePhotoToGallery(photoData);
            
            processedCount++;
            updateProgress(processedCount, totalFiles);
            
            // Cuando todas las fotos se hayan procesado, recargar la galería
            if (processedCount === totalFiles) {
                // Esperar un momento antes de ocultar la barra
                setTimeout(() => {
                    // Limpiar vista previa
                    selectedFiles = [];
                    previewContainer.innerHTML = '';
                    previewSection.style.display = 'none';
                    progressSection.style.display = 'none';
                    fileInput.value = '';
                    
                    // Rehabilitar botones
                    confirmBtn.disabled = false;
                    cancelBtn.disabled = false;
                    
                    // Mostrar mensaje de éxito
                    showNotification('¡Fotos subidas correctamente!');
                    
                    // Recargar galería después de que todas se hayan guardado
                    loadGallery();
                    
                    // Hacer scroll suave hacia la galería
                    setTimeout(() => {
                        document.querySelector('.gallery-section').scrollIntoView({ 
                            behavior: 'smooth', 
                            block: 'start' 
                        });
                    }, 100);
                }, 500);
            }
        };
        reader.onerror = () => {
            processedCount++;
            updateProgress(processedCount, totalFiles);
            if (processedCount === totalFiles) {
                setTimeout(() => {
                    selectedFiles = [];
                    previewContainer.innerHTML = '';
                    previewSection.style.display = 'none';
                    progressSection.style.display = 'none';
                    fileInput.value = '';
                    confirmBtn.disabled = false;
                    cancelBtn.disabled = false;
                    loadGallery();
                }, 500);
            }
        };
        reader.readAsDataURL(file);
    });
}

// Actualizar barra de progreso
function updateProgress(current, total) {
    const percentage = Math.round((current / total) * 100);
    
    progressText.textContent = `${current} / ${total} fotos`;
    progressPercent.textContent = `${percentage}%`;
    progressBar.style.width = `${percentage}%`;
}

// Cancelar subida
function handleCancelUpload() {
    selectedFiles = [];
    previewContainer.innerHTML = '';
    previewSection.style.display = 'none';
    progressSection.style.display = 'none';
    fileInput.value = '';
    confirmBtn.disabled = false;
    cancelBtn.disabled = false;
}

// Guardar foto en la galería
function savePhotoToGallery(photoData) {
    let gallery = getGalleryFromStorage();
    gallery.push(photoData);
    localStorage.setItem('weddingGallery', JSON.stringify(gallery));
}

// Obtener galería del storage
function getGalleryFromStorage() {
    const gallery = localStorage.getItem('weddingGallery');
    return gallery ? JSON.parse(gallery) : [];
}

// Cargar galería
function loadGallery() {
    const gallery = getGalleryFromStorage();
    
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
    
    // Si está en modo selección, actualizar los checkboxes
    if (isSelectMode) {
        updateSelectMode();
    }
}

// Crear elemento de galería
function createGalleryItem(photo, index) {
    const div = document.createElement('div');
    div.className = 'gallery-item';
    div.dataset.photoIndex = index;
    
    const img = document.createElement('img');
    img.src = photo.dataUrl;
    img.alt = photo.name || 'Foto';
    img.onclick = () => {
        if (isSelectMode) {
            togglePhotoSelection(index, div);
        } else {
            openModal(photo.dataUrl);
        }
    };
    
    // Checkbox para selección
    const checkbox = document.createElement('div');
    checkbox.className = 'select-checkbox';
    checkbox.onclick = (e) => {
        e.stopPropagation();
        togglePhotoSelection(index, div);
    };
    
    // Permitir clic en el contenedor para seleccionar en modo selección
    div.onclick = (e) => {
        if (isSelectMode && e.target === div) {
            togglePhotoSelection(index, div);
        }
    };
    
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
    div.appendChild(checkbox);
    div.appendChild(deleteBtn);
    
    return div;
}

// Eliminar foto de la galería
function deletePhotoFromGallery(index) {
    let gallery = getGalleryFromStorage();
    gallery.splice(index, 1);
    localStorage.setItem('weddingGallery', JSON.stringify(gallery));
    loadGallery();
    showNotification('Foto eliminada');
    
    // Limpiar selección si estaba seleccionada
    selectedPhotos = selectedPhotos.filter(i => i !== index);
    selectedPhotos = selectedPhotos.map(i => i > index ? i - 1 : i);
    updateDeleteButton();
}

// Activar modo selección
function activateSelectMode() {
    isSelectMode = true;
    selectedPhotos = [];
    selectModeBtn.style.display = 'none';
    cancelSelectBtn.style.display = 'block';
    deleteSelectedBtn.style.display = 'block';
    clearAllBtn.style.display = 'none';
    updateSelectMode();
}

// Desactivar modo selección
function deactivateSelectMode() {
    isSelectMode = false;
    selectedPhotos = [];
    selectModeBtn.style.display = 'block';
    cancelSelectBtn.style.display = 'none';
    deleteSelectedBtn.style.display = 'none';
    clearAllBtn.style.display = 'block';
    updateSelectMode();
}

// Actualizar modo selección
function updateSelectMode() {
    const items = galleryGrid.querySelectorAll('.gallery-item');
    items.forEach((item, index) => {
        if (isSelectMode) {
            item.classList.add('select-mode');
            const isSelected = selectedPhotos.includes(index);
            if (isSelected) {
                item.classList.add('selected');
            } else {
                item.classList.remove('selected');
            }
        } else {
            item.classList.remove('select-mode', 'selected');
        }
    });
    updateDeleteButton();
}

// Alternar selección de foto
function togglePhotoSelection(index, item) {
    const photoIndex = selectedPhotos.indexOf(index);
    if (photoIndex > -1) {
        selectedPhotos.splice(photoIndex, 1);
        item.classList.remove('selected');
    } else {
        selectedPhotos.push(index);
        item.classList.add('selected');
    }
    updateDeleteButton();
}

// Actualizar botón de eliminar seleccionadas
function updateDeleteButton() {
    if (selectedPhotos.length > 0) {
        deleteSelectedBtn.textContent = `Eliminar ${selectedPhotos.length} ${selectedPhotos.length === 1 ? 'foto' : 'fotos'}`;
        deleteSelectedBtn.disabled = false;
    } else {
        deleteSelectedBtn.textContent = 'Eliminar Seleccionadas';
        deleteSelectedBtn.disabled = true;
    }
}

// Eliminar fotos seleccionadas
function handleDeleteSelected() {
    if (selectedPhotos.length === 0) return;
    
    const count = selectedPhotos.length;
    if (confirm(`¿Estás seguro de que quieres eliminar ${count} ${count === 1 ? 'foto' : 'fotos'}?`)) {
        let gallery = getGalleryFromStorage();
        
        // Ordenar índices de mayor a menor para eliminar correctamente
        const sortedIndices = [...selectedPhotos].sort((a, b) => b - a);
        
        sortedIndices.forEach(index => {
            gallery.splice(index, 1);
        });
        
        localStorage.setItem('weddingGallery', JSON.stringify(gallery));
        showNotification(`${count} ${count === 1 ? 'foto eliminada' : 'fotos eliminadas'}`);
        deactivateSelectMode();
        loadGallery();
    }
}

// Eliminar todas las fotos
function handleClearAll() {
    if (confirm('¿Estás seguro de que quieres eliminar todas las fotos? Esta acción no se puede deshacer.')) {
        localStorage.removeItem('weddingGallery');
        loadGallery();
        showNotification('Todas las fotos han sido eliminadas');
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
function showNotification(message) {
    // Crear notificación si no existe
    let notification = document.getElementById('notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'notification';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #28a745;
            color: white;
            padding: 15px 25px;
            border-radius: 8px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.2);
            z-index: 2000;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;
        document.body.appendChild(notification);
    }
    
    notification.textContent = message;
    notification.style.opacity = '1';
    
    setTimeout(() => {
        notification.style.opacity = '0';
    }, 3000);
}

