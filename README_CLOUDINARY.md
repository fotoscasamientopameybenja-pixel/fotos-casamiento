# Configuración de Cloudinary

## Importante: Crear Upload Preset

Para que la aplicación funcione, necesitas crear un **Upload Preset sin firma** en tu dashboard de Cloudinary:

1. Ve a https://console.cloudinary.com/
2. Ingresa con tus credenciales
3. Ve a **Settings** → **Upload**
4. Haz clic en **Add upload preset**
5. Configura:
   - **Preset name**: `ml_default` (o el que prefieras, y luego actualízalo en script.js)
   - **Signing mode**: **Unsigned** (importante!)
   - **Folder** (opcional): Puedes crear una carpeta como "wedding-photos"
   - **Allowed formats**: Images (o todos los que necesites)
   - Guarda el preset

6. Actualiza el código en `script.js` línea ~264 si usas un nombre diferente:
   ```javascript
   formData.append('upload_preset', 'TU_PRESET_NAME');
   ```

## Variables de entorno (opcional)

Las credenciales están en el código JavaScript. Si prefieres usar variables de entorno:

1. Crea un archivo `.env.local` (no se sube a GitHub)
2. Agrega:
   ```
   CLOUDINARY_CLOUD_NAME=dm0dh7iqb
   CLOUDINARY_API_KEY=346395192943891
   ```

**Nota**: En sitios estáticos como Vercel, las variables de entorno del frontend se exponen en el código JavaScript, así que no hay mucha diferencia de seguridad.

## Credenciales actuales

- Cloud name: `dm0dh7iqb`
- API Key: `346395192943891`
- API Secret: `yE2yQEAASfvKYSeSENBib-uclJg` (no se usa en el frontend)

