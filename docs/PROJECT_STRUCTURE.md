# Estructura del proyecto frontend

> Documento generado a partir del código real de `C:\IA_PORCINOS\frontend`.
> Compara la **versión original** (construida por OpenCode el 03/11/2026 entre 10:30 y 11:05, reconstruida
> desde el historial de sesiones) con la **versión actual** (que incluye los cambios posteriores de GitHub Copilot).
> El diff completo está en `docs/ORIGINAL_VS_ACTUAL.patch`; el resumen legible en `docs/ORIGINAL_VS_ACTUAL.md`.

---

## 1. Stack y configuración

### `package.json` (actual)

```json
{
  "name": "bienestar-porcino-ica",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "typecheck": "tsc -b --pretty false",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "lucide-react": "^1.67.0",
    "react": "^19.3.1",
    "react-dom": "^19.3.1",
    "react-router-dom": "^7.18.5"
  },
  ...
}
```

- **Sin framework CSS**: no hay `tailwindcss`, `postcss`, `sass` ni `styled-components` en dependencias.
- **Sin librería de datos**: no hay axios, react-query, zod ni formik. `fetch` y `useState` a mano.
- **Iconos**: `lucide-react` (p. ej. `import { LayoutDashboard, ClipboardList } from 'lucide-react'`).

La única diferencia con la versión original es la dependencia dev `@testing-library/dom@^10.4.2`
(añadida por `npm install --save-dev` el 03/11 10:57, no por un `write` de código).

### Archivos de configuración

| Archivo | Rol | Estado |
|---|---|---|
| `vite.config.ts` | Vite + Vitest | **modificado** (ver abajo) |
| `tsconfig.json` | Project references (`files: []`, referencia a app y node) | idéntico |
| `tsconfig.app.json` | Compilación de `src/` | **modificado** (1 línea añadida) |
| `tsconfig.node.json` | Compilación de `vite.config.ts` | idéntico |
| `.gitignore` | Ignorados | **modificado** (60 B → 86 B) |
| `index.html` | Punto de entrada HTML | **modificado** (favicon/marca) |
| `.env.example` | Ejemplo de variables de entorno | **ELIMINADO** |

**`vite.config.ts` original** (03/11):

```ts
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, strictPort: false },
  preview: { port: 4173 },
  test: { environment: 'jsdom', globals: true, setupFiles: './src/test/setup.ts', css: false, restoreMocks: true }
});
```

**`vite.config.ts` actual (336 B):**

```ts
export default defineConfig({
  plugins: [react()],
  server: {
    port: 4173,
    strictPort: true
  },
  test: { environment: 'jsdom', globals: true, setupFiles: './src/test/setup.ts', css: false, restoreMocks: true }
});
```

Cambios: puerto de dev 5173 → **4173 con `strictPort: true`**. El bloque `test` de Vitest **no cambió**.

> ⚠️ **El bloque `preview` y el proxy `/api` → `127.0.0.1:8000` fueron eliminados** el
> 04/11/2026 a las 10:11 (junto con el cambio de `AuthProvider`, ver §3.1). En el original
> la URL del backend se resolvía por la variable `VITE_API_BASE_URL` de `.env.example`;
> hoy **no hay proxy ni variable de entorno**: `src/api/client.ts` sigue declarando
> `const API_BASE = '/api/v1'` y apuntaría a la propia app.

**`tsconfig.app.json`**: única adición `"resolveJsonModule": true` (necesaria para
`import divipola from './divipola.json'`). El resto, incluido `"strict": true`, `"erasableSyntaxOnly": true`
y `"verbatimModuleSyntax": true`, **es idéntico al original**.

**`.env.example` (original, eliminado):**

```env
# Base URL of the backend API. Leave empty in development to use the Vite proxy
VITE_API_BASE_URL=

# Backend address used by the Vite development proxy.
VITE_API_PROXY_TARGET=http://localhost:3000
```

> ⚠️ **Hallazgo**: el archivo ya no existe, pero `AuthProvider.tsx` sigue consultando
> `import.meta.env.MODE`. No hay documentación de variables de entorno en el repo actual,
> ni proxy ni variable de entorno activos (ver §1 y §3.1).

### Punto de entrada

`index.html` → `src/main.tsx` → `src/App.tsx`.

```tsx
// src/main.tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles/global.css';          // ← única importación de CSS en todo src/

const container = document.getElementById('root');
if (!container) {
  throw new Error('No se encontró el contenedor #root para iniciar la aplicación.');
}
createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

Verificado con grep: **ningún `.tsx` importa CSS** salvo `main.tsx` línea 4. Todo el estilo
entra por ese único `@import` en cadena.

---

## 2. Estructura original (64 archivos, 03/11/2026 10:30–11:05)

```
frontend/
├── .env.example                 364 B
├── .gitignore                    60 B
├── index.html                   497 B
├── package.json                 833 B
├── tsconfig.app.json            689 B
├── tsconfig.json                119 B
├── tsconfig.node.json           610 B
├── vite.config.ts               370 B
└── src/
    ├── App.tsx                 2124 B     ← 9 rutas
    ├── main.tsx                 377 B
    ├── components/                        (13 componentes)
    │   ├── Alert.tsx           1151 B
    │   ├── AppShell.tsx        6884 B
    │   ├── Badge.tsx           1060 B
    │   ├── Button.tsx           911 B
    │   ├── ErrorBoundary.tsx   1052 B
    │   ├── FormField.tsx       2229 B
    │   ├── LoadingState.tsx     527 B
    │   ├── Modal.tsx           2912 B
    │   ├── PageHeader.tsx      1525 B
    │   ├── ProgressBar.tsx     1216 B
    │   ├── ProtectedRoute.tsx   665 B
    │   ├── States.tsx          1434 B     ← EmptyState + ErrorState
    │   └── ToastProvider.tsx   2173 B
    ├── data/
    │   ├── LocalDataProvider.tsx  7238 B
    │   ├── seed.ts              16227 B
    │   └── store.ts              2083 B
    ├── features/                          (organización por funcionalidad)
    │   ├── auth/          AuthProvider.tsx, LoginPage.tsx
    │   ├── evaluations/   EvaluationForm.tsx, results.ts, results.test.ts
    │   ├── evidence/      EvidenceUploadForm.tsx, EvidenceViewer.tsx
    │   ├── indicators/    IndicatorForm.tsx, IndicatorList.tsx, catalog.ts, catalog.test.ts
    │   └── recommendations/ RecommendationForm.tsx, generator.ts
    ├── pages/                             (8 páginas)
    │   ├── DashboardPage.tsx        12677 B
    │   ├── EvaluationDetailPage.tsx 16933 B
    │   ├── EvaluationsPage.tsx      10402 B
    │   ├── EvidencePage.tsx         11769 B
    │   ├── IndicatorsPage.tsx       11166 B
    │   ├── MethodologyPage.tsx       9055 B
    │   ├── NotFoundPage.tsx          1131 B
    │   └── RecommendationsPage.tsx  13434 B
    ├── styles/
    │   ├── global.css   14496 B   ← :root + reset + controles compartidos
    │   ├── layout.css   14312 B   ← login, app shell, modal, toast
    │   ├── pages.css    22234 B   ← estilos específicos de páginas
    │   ├── modules.css  13337 B   ← módulos reutilizables (evidencia, sugerencias…)
    │   └── responsive.css 6072 B  ← breakpoints + prefers-reduced-motion
    ├── test/setup.ts        165 B
    ├── types/                         (7 archivos)
    │   ├── index.ts         2599 B   ← archivo único de re-export consumido por el código
    │   ├── auth.ts, evaluation.ts, evidence.ts,
    │   ├── farm.ts, indicator.ts, recommendation.ts
    └── utils/                file.ts, format.ts, validation.ts, file.test.ts
```

**Nota sobre `types/`**: los 6 archivos `types/*.ts` (además de `index.ts`) eran restos de una
"Fase A" (arquitectura conectada a backend) que se descartó el 03/11 a las 10:42. `types/index.ts`
**no importa de ellos**: es un archivo autocontenido. Se eliminaron en esa sesión.

---

## 3. Estructura actual (85 archivos de código + documentación)

```
frontend/
├── .gitignore  index.html  package.json  package-lock.json
├── tsconfig{,.app,.node}.json  vite.config.ts
├── docs/
│   ├── ORIGINAL_VS_ACTUAL.patch      ← diff unificado (626 KB)
│   ├── ORIGINAL_VS_ACTUAL.md         ← resumen legible
│   ├── PROJECT_STRUCTURE.md          ← este archivo
│   ├── FRONTEND_ARCHITECTURE.md
│   ├── TYPESCRIPT_GUIDE.md
│   ├── CSS_GUIDE.md
│   ├── DEVELOPMENT_PATTERNS.md
│   └── NEW_FEATURE_TEMPLATE.md
├── public/brand/                     ← NUEVO: favicon.svg, logo.svg, logo-mark.svg, README.md
└── src/
    ├── App.tsx  main.tsx
    ├── api/                           ← NUEVO (por Copilot)
    │   ├── client.ts         2734 B   ← cliente HTTP: apiRequest, ApiClientError, CSRF
    │   └── client.test.ts
    ├── components/                    (13, MÁS AppShell.tsx modificado)
    ├── data/
    │   ├── LocalDataProvider.tsx  14283 B  (original 7238 B)
    │   ├── seed.ts                18948 B
    │   ├── store.ts               10621 B  (original 2083 B)
    │   ├── colombia.ts             6929 B  ← NUEVO: DEPARTMENTS, municipalitiesForDepartment
    │   ├── divipola.json         143218 B  ← NUEVO: DIVIPOLA
    │   └── *.test.ts(x)           (3 tests nuevos)
    ├── features/
    │   ├── auth/AuthProvider.tsx    9940 B (original 3229 B) ← doble modo backend/local
    │   ├── indicators/rubrics.ts   15891 B ← NUEVO: preguntas + rangos de calificación
    │   └── ...
    ├── pages/
    │   ├── (las 8 originales, todas modificadas)
    │   ├── PeopleFarmsPage.tsx     27742 B ← NUEVO
    │   ├── ApiEvaluationPages.tsx  25121 B ← NUEVO (Dashboard + Evaluations + Detail)
    │   ├── ApiEvidencePage.tsx     10614 B ← NUEVO
    │   ├── ApiIndicatorsPage.tsx    6750 B ← NUEVO
    │   ├── ApiPersonRegistrationPage.tsx 15186 B ← NUEVO
    │   ├── ApiRecommendationsPage.tsx    14427 B ← NUEVO
    │   └── *.test.tsx             (5 tests nuevos)
    ├── styles/                        (5, todos modificados salvo global.css)
    │   └── pages.css  34261 B  (original 22234 B)
    ├── test/
    │   ├── setup.ts                 (idéntico)
    │   └── renderWithEvaluator.tsx  ← NUEVO: helper de tests
    ├── types/index.ts               3413 B (original 2599 B) — ya no hay archivos divididos
    └── utils/                       (file/format/validation casi idénticos)
```

### 3.1 Cambio en caliente del 04/11/2026 10:11 (posterior a la primera lectura de este documento)

Mientras se redactaba esta documentación, **tres archivos de código fueron modificados a la vez
por una fuente externa** (no por esta sesión, que solo leyó archivos). Se detectó porque el
contenido ya no coincidía con lo leído minutos antes. **No se modificó ningún archivo de
código para producir esta documentación.**

| Archivo | Antes → Después | Cambio |
|---|---|---|
| `vite.config.ts` | 537 → **336 B** | Se eliminaron el bloque `preview` y el `proxy: { '/api': { target: '127.0.0.1:8000' } }` |
| `src/features/auth/AuthProvider.tsx` | 9 940 → **10 686 B** | Se añadió `const USE_BACKEND_AUTH = false;` y se añadieron 4 comprobaciones |
| `src/features/auth/LoginPage.tsx` | 10 284 → **10 213 B** | Ajuste menor del formulario de login |

**El cambio clave** (`AuthProvider.tsx` líneas 17–18):

```ts
// Temporalmente el frontend opera solo con sesiones y datos locales.
const USE_BACKEND_AUTH = false;
```

Efecto: las 4 rutas condicionales pasan a evaluarse así:

| Línea | Condición | Resultado con `false` |
|---|---|---|
| 164 | `if (!USE_BACKEND_AUTH \|\| MODE === 'test')` → restaurar sesión | **Siempre** usa `readSession()` local; nunca llama `/auth/me` |
| 199 | `if (USE_BACKEND_AUTH && MODE !== 'test')` → login | **Siempre** usa el login local con PBKDF2 |
| 260 | `if (!USE_BACKEND_AUTH) throw …` (cambio de contraseña con `session.backend`) | Lanza `'La autenticación del backend está desactivada temporalmente.'` |
| 307 | `if (USE_BACKEND_AUTH && session?.backend)` → logout | **Siempre** el logout local |

**Consecuencias verificadas:**

1. **El frontend opera hoy 100% en modo local.** La capa `src/api/client.ts` y las 6 páginas
   `Api*` **siguen existiendo y compilando** (`npm run typecheck` y los 65 tests pasan), pero
   quedan **inactivas**: `session.backend` nunca será `true`, por lo que ninguna página
   bifurcará a su variante `Api*`.
2. **Ya no hay proxy ni variable de entorno**: `API_BASE = '/api/v1'` no tiene destino.
3. El comentario declara que es **temporal**: `"Temporalmente el frontend opera solo con
   sesiones y datos locales."` — para reactivar el backend basta `USE_BACKEND_AUTH = true`
   **y** restaurar el proxy en `vite.config.ts`.

---

### Resumen cuantitativo

> ⚠️ **Los conteos de este apartado corresponden al diff `ORIGINAL_VS_ACTUAL.patch`**,
> generado antes del cambio de configuración del 04/11 10:11 (§3.1). Ese cambio modificó
> 3 archivos más: `vite.config.ts`, `src/features/auth/AuthProvider.tsx`,
> `src/features/auth/LoginPage.tsx`.

| Categoría | Cantidad | Detalle |
|---|---|---|
| Eliminados | **8** | `.env.example`, `RecommendationForm.tsx`, `types/{auth,evaluation,evidence,farm,indicator,recommendation}.ts` |
| Añadidos | **28** | 6 páginas `Api*` + `PeopleFarmsPage`, `api/client.ts`, `rubrics.ts`, `colombia.ts`, `divipola.json`, `renderWithEvaluator.tsx`, 10 archivos de test, 4 de `public/brand/` (más `package-lock.json`, generado por `npm install`, y `docs/`) |
| Modificados | **36** | ver lista en `docs/ORIGINAL_VS_ACTUAL.md` |
| Idénticos | **20** | 12 de `components/` (todo salvo `AppShell`), `main.tsx`, `global.css`, `setup.ts`, `utils/file.ts`, `utils/format.ts`, `tsconfig.json`, `tsconfig.node.json` |

**Archivos eliminados que importaban otros**: `RecommendationForm.tsx` era importado por
`EvaluationDetailPage.tsx` (línea 32) y `RecommendationsPage.tsx` (línea 22); ambos archivos
fueron reescritos para eliminar esa dependencia. Verificado con grep: `RecommendationForm`
ya no aparece en `src/`.

---

## 4. Convenciones de nombres observadas

| Elemento | Convención | Ejemplo real |
|---|---|---|
| Componente | `PascalCase.tsx`, export nombrado | `export function Button({...})` |
| Archivo de utilidad | `camelCase.ts` | `format.ts`, `validation.ts` |
| Estilo de clase | BEM | `form-field__label`, `button--primary`, `state-panel--error` |
| Estado visual | prefijo `is-` | `.app-sidebar.is-open`, `.dropzone--invalid` |
| Tipo | `PascalCase` en `types/index.ts` | `interface IndicatorRecord` |
| Unión literal | valores en `kebab-case` o texto libre | `'aplica' \| 'no-aplica'`, `'En proceso'` |
| Test | `mismo-nombre.test.ts(x)` junto al sujeto | `catalog.test.ts` |
| Clave localStorage | dominio + versión | `bienestar-porcino.database.v1` |
| Ruta | kebab-case en español | `/personas-predios`, `/recomendaciones` |
