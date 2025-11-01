# Solución de Problemas en Vercel

## Problema: No se pueden subir fotos en Vercel

### Verificaciones

1. **Preset de Cloudinary está configurado correctamente**:
   - Ve a https://console.cloudinary.com/
   - Settings → Upload
   - Verifica que el preset `ml_default` existe
   - **Importante**: Debe estar en modo **Unsigned**
   - Si el preset tiene otro nombre, actualiza `script.js` línea 265

2. **Abrir la consola del navegador en Vercel**:
   - En tu página de Vercel, presiona F12
   - Ve a la pestaña "Console"
   - Intenta subir una foto
   - Revisa los mensajes de error que aparecen

### Errores comunes

#### Error: "Invalid upload preset"
- **Solución**: El preset `ml_default` no existe o no está configurado como "Unsigned"
- Crea el preset en Cloudinary Dashboard con el nombre exacto `ml_default`
- Asegúrate de que "Signing mode" esté en "Unsigned"

#### Error: "CORS error"
- **Solución**: Esto es raro con Cloudinary, pero verifica que el preset permita uploads desde cualquier origen
- En Cloudinary Dashboard, Settings → Security, verifica las restricciones

#### Error: "Network error" o "Failed to fetch"
- **Solución**: Puede ser un problema de red o firewall
- Verifica que la API de Cloudinary esté accesible
- Prueba desde otro navegador o dispositivo

### Debugging

1. Abre la consola del navegador (F12)
2. Ve a la pestaña "Network"
3. Intenta subir una foto
4. Busca la petición a `api.cloudinary.com`
5. Revisa el código de respuesta:
   - **200**: Todo bien
   - **400**: Error en el preset o configuración
   - **401**: Problema de autenticación
   - **403**: Permisos o CORS
   - **500**: Error del servidor de Cloudinary

### Verificar el preset

Para verificar que el preset funciona:

```javascript
// Abre la consola del navegador y ejecuta:
fetch('https://api.cloudinary.com/v1_1/dm0dh7iqb/image/upload', {
  method: 'POST',
  body: new FormData() // Esto fallará pero te dirá si el preset existe
})
```

### Solución rápida

Si nada funciona, puedes cambiar el preset en el código:

1. En Cloudinary, crea un nuevo preset con nombre `vercel_upload`
2. En `script.js` línea 265, cambia:
   ```javascript
   formData.append('upload_preset', 'vercel_upload');
   ```

