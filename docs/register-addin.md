# Registro del Add-In en MyGeotab

## Prerrequisitos

1. URL pública HTTPS que sirva `addin/index.html` y sus assets.
2. Backend API desplegado y accesible para el add-in (mismo dominio recomendado).
3. Usuario con permisos de administración de Add-Ins en MyGeotab.
4. Manifest completado desde `addin/addin-manifest.example.json`.

## Manifest ejemplo

Ajusta estos campos:

- `name`
- `version`
- `path` (URL final de `index.html`)
- `supportEmail`
- `icon`

Ejemplo mínimo:

```json
{
  "name": "Data Connector View",
  "version": "0.2.0",
  "menuName": {
    "en": "Data Connector View",
    "es": "Vista Data Connector"
  },
  "path": "https://TU_DOMINIO/addin/index.html",
  "supportEmail": "soporte@tu-dominio.com",
  "icon": "https://TU_DOMINIO/addin/icon.png"
}
```

## Alta en MyGeotab

1. Entra en MyGeotab con un usuario administrador.
2. Abre `Administración` -> `Sistema` -> `Add-Ins`.
3. Crea un Add-In nuevo.
4. Pega el manifest JSON.
5. Guarda y asigna el Add-In a los perfiles/usuarios necesarios.
6. Refresca MyGeotab y valida que el menú del Add-In aparece.

## Verificación funcional

1. Abre el Add-In.
2. Rellena conexión MyGeotab + Data Connector.
   El backend usa automáticamente `database/usuario/password` de MyGeotab para Data Connector.
3. Pulsa `Conectar`.
   Si no quieres persistir la contraseña en navegador, deja desactivado `Recordar password`.
4. Selecciona `fleet` o `group` y rango temporal.
5. Pulsa `Actualizar` y confirma gráfica + tabla.
6. Pulsa `Export CSV` y valida el fichero descargado.

## Notas

1. El backend elimina el bloqueo CORS de consultas a Data Connector.
2. El icono del add-in debe ser SVG accesible por URL pública.
