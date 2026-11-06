# Bienestar Porcino ICA — Frontend

Interfaz web de la plataforma de gestión y evaluación del bienestar porcino. Está construida con React, TypeScript y Vite.

## Requisitos

- Node.js 20.19+ o 22.12+.
- npm.
- El backend de Bienestar Porcino para usar las funciones que consultan o guardan información.

## Instalación y desarrollo local

Desde la carpeta del frontend:

```powershell
npm install
Copy-Item .env.example .env
npm run dev
```

Vite inicia la aplicación en `http://localhost:4173`. En desarrollo, las peticiones a `/api/v1` se envían al backend en `http://127.0.0.1:8000`, según la configuración de [vite.config.ts](./vite.config.ts).

Si el backend está en otra dirección, configura `VITE_API_BASE_URL` en `.env`. No pongas secretos en variables `VITE_*`: sus valores se incluyen en el código público del navegador.

## Comandos

| Comando | Descripción |
|---|---|
| `npm run dev` | Inicia el servidor de desarrollo de Vite. |
| `npm run typecheck` | Comprueba los tipos de TypeScript. |
| `npm test` | Ejecuta las pruebas una vez. |
| `npm run test:watch` | Ejecuta las pruebas en modo observación. |
| `npm run build` | Comprueba TypeScript y genera el sitio en `dist/`. |
| `npm run preview` | Previsualiza localmente el sitio compilado. |

## Compilación y despliegue

Genera los archivos estáticos con:

```powershell
npm ci
npm run build
```

El contenido publicable queda en `dist/`. En producción, sirve esa carpeta con el servidor web configurado para la aplicación.

El proxy de `vite.config.ts` es para desarrollo y previsualización, no para el sitio publicado. En el VPS configura el servidor web para:

1. Entregar el frontend estático desde `dist/`.
2. Enviar las solicitudes a `/api/v1` al backend.
3. Mantener el frontend y el backend bajo el mismo origen cuando sea posible, para que las cookies de sesión funcionen correctamente.

También se puede definir `VITE_API_BASE_URL` durante la compilación para apuntar a la URL pública de la API. Como estas variables se integran en los archivos entregados al navegador, no deben contener contraseñas, tokens privados ni otros secretos.

## Configuración y datos

- `.env.example` contiene la configuración de ejemplo para desarrollo.
- `.env` es local y no debe subirse al repositorio.
- Los datos operativos deben provenir del backend; la configuración de desarrollo no convierte datos de demostración en información real.

## Repositorios

- Frontend: <https://github.com/kenzotris298/porcinos_frontend>
- Backend: <https://github.com/kenzotris298/porcinos_backend>
