# Aluna - Dashboard de Gestión

Dashboard para gestión de compras, ventas e inventario conectado a Google Sheets.

## Variables de entorno necesarias

En Vercel, configura estas variables en **Settings → Environment Variables**:

| Variable | Descripción |
|---|---|
| `SPREADSHEET_ID` | ID del Google Sheet |
| `GOOGLE_SERVICE_ACCOUNT` | JSON completo de la cuenta de servicio (todo en una línea) |

## Despliegue en Vercel

1. Importa este repo en [vercel.com](https://vercel.com)
2. Configura las variables de entorno
3. ¡Listo!

## Desarrollo local

```bash
npm install
# Crear archivo .env con las variables necesarias
npx vercel dev
```
