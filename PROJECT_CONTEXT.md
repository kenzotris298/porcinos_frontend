# PROJECT_CONTEXT.md — Frontend Bienestar Porcino (ICA)

> **Para asistentes de IA y herramientas (Copilot, Claude, etc.)**: lee esto antes de tocar código.
> Última verificación: 04/11/2026 contra el código real de `C:\IA_PORCINOS\frontend`.
> **ACTUALIZACIÓN 04/11/2026 (noche)**: el modo backend está **activo** (véase §4); este documento fue corregido para reflejarlo.

---

## 1. Qué es este proyecto

Aplicación web de **gestión y evaluación del bienestar porcino según la metodología del ICA**
(Instituto Colombiano Agropecuario). Frontend en React 19 + Vite 7 + TypeScript 5.9,
con un backend Express/MariaDB hermano en `C:\IA_PORCINOS\backend`.

**Alcance del directorio `frontend/`**: trabajar exclusivamente aquí. No hay repositorio Git
en el proyecto.

---

## 2. Reglas duras (no negociables)

1. **No inventes endpoints ni ponderaciones.** Las rutas reales del backend son `/api/v1/…`
   (ver `src/api/client.ts`); el catálogo de criterios y pesos está en
   `src/features/indicators/catalog.ts` y los rangos en `rubrics.ts`.
2. **No añadas frameworks.** No hay Tailwind, axios, zod, formik, redux ni styled-components.
   Usa `fetch`, `useState`, CSS con variables y BEM. Añadir dependencias requiere justificación.
3. **No uses `enum` ni `namespace`** — `erasableSyntaxOnly: true` en `tsconfig.app.json`
   los prohíbe. Usa uniones literales.
4. **Importa tipos con `import type`** — `verbatimModuleSyntax: true`.
5. **No importes CSS desde componentes** — todo entra por `src/main.tsx` línea 4.
6. **No escribas colores literales en clases** — usa las variables de `:root` (`global.css:11-66`).
7. **No rompas los 65 tests** ni `npm run typecheck` (`tsc -b` falla el build).
8. **Los mensajes de UI están en español** (es-CO), en segunda persona.
9. **No borres `docs/`** — contiene el diff y la documentación de arquitectura.
10. **No reintroduzcas `RecommendationForm.tsx`** — fue eliminado deliberadamente; sus páginas
    consumidoras fueron reescritas.

---

## 3. Documentación disponible (`frontend/docs/`)

| Archivo | Contenido |
|---|---|
| `PROJECT_STRUCTURE.md` | Árbol original (64 archivos) vs. actual (85), configuración, convenciones de nombres |
| `FRONTEND_ARCHITECTURE.md` | Stack, orden de providers, rutas, estado, capa de datos, integración backend, errores, pruebas |
| `TYPESCRIPT_GUIDE.md` | Config TS, inventario de `types/index.ts`, patrón de props, `FieldErrors`, utils |
| `CSS_GUIDE.md` | Variables `:root`, BEM, layout sidebar/topbar, grids, 6 breakpoints, animaciones |
| `DEVELOPMENT_PATTERNS.md` | Patrones generales (A1–A9) vs. implementaciones particulares (B1–B8) + anti-patrones |
| `NEW_FEATURE_TEMPLATE.md` | Plantilla paso a paso para añadir una funcionalidad |
| `ORIGINAL_VS_ACTUAL.md` | Resumen legible del diff: qué cambió, quién y cuándo |
| `ORIGINAL_VS_ACTUAL.patch` | Diff unificado completo (626 KB), `a/` = original, `b/` = actual |

---

## 4. Arquitectura en 30 segundos

```
main.tsx ─▶ App.tsx ─▶ BrowserRouter ▶ AuthProvider ▶ ToastProvider ▶ LocalDataProvider ▶ ErrorBoundary ▶ Routes
```

- **3 contextos**: `useAuth()` (sesión/loading/login/logout), `useToast()` (notificaciones),
  `useLocalData()` (base de datos local + 12 mutaciones).
- **Sin store global.** El estado de UI vive en cada página (`useState`/`useMemo`).
- **Rutas**: `/login`, `/`, `/evaluaciones`, `/evaluaciones/:id`, `/indicadores`, `/evidencias`,
  `/recomendaciones`, `/personas-predios` (solo `evaluator`), `/metodologia`, `*`.
- **Navegación** en `AppShell.tsx`: 3 listas según rol y modo
  (`EVALUATOR_NAV_ITEMS`, `OWNER_NAV_ITEMS`, y la dinámica de `session.backend` en línea 62).

### Modo de datos: BACKEND ACTIVO (desde 04/11/2026)

> ✅ **04/11/2026 — el frontend opera contra el backend real en `127.0.0.1:8000`.**
> `AuthProvider.tsx` se autentica siempre por `/api/v1` (salvo `MODE === 'test'`);
> ya **no existe** la constante `USE_BACKEND_AUTH`. `vite.config.ts` incluye
> `server.proxy` y `preview.proxy` → `/api/v1` → `http://127.0.0.1:8000`.
> Las páginas bifurcan a sus variantes `Api*` vía `session?.backend`.

| | Modo backend (**ACTIVO**) |
|---|---|
| Se activa con | Sesión iniciada en el backend (cookie HttpOnly + CSRF) |
| Sesión en | cookie `bienestar_session` (HttpOnly, SameSite=Lax) + `X-CSRF-Token` |
| Datos en | MariaDB 10.4 vía `/api/v1` (backend en `C:\IA_PORCINOS\backend`) |
| Marcador | `session.backend === true` |
| Contraseña mínima | 12 caracteres |

Las páginas bifurcan así — con sesión de backend siempre caen en la rama `Api*`:

```tsx
export function IndicatorsPage() {
  const { session } = useAuth();
  if (session?.backend) return <ApiIndicatorsPage />;   // ← activo con sesión backend
  return <LocalIndicatorsPage />;
}
```

---

## 5. Comandos

```bash
cd C:\IA_PORCINOS\frontend
npm install
npm run dev         # Vite en puerto 4173 (strictPort) — CON proxy /api/v1 → 127.0.0.1:8000
npm run typecheck   # tsc -b --pretty false
npm test            # vitest run → 17 archivos, 68 tests
npm run build       # tsc -b && vite build
```

⚠️ El servidor de desarrollo suele estar **ya corriendo en el puerto 4173**; lanzar otro
`npm run dev` fallará con *"Port 4173 is already in use"*.

**Hay proxy en `vite.config.ts`**: `/api/v1` → `http://127.0.0.1:8000`. El backend
(Express + MariaDB) debe estar iniciado (`cd ..\backend && npm run db:start && npm run dev`);
ver `backend/README.md` e `backend/docs/API.md`.

---

## 6. Cuentas de prueba conocidas

| Correo | Rol | Uso |
|---|---|---|
| `evaluador@ica.gov.co` | evaluator | **Backend** (seed-demo); contraseña inicial `EvaluadorICA-2026!` (cambio obligatorio) |
| `maria.rojas@example.com` | owner (Granja La Esperanza) | **Backend** (seed-demo); contraseña inicial `PropietariaICA-2026!` (cambio obligatorio) |
| `evaluador@ica.gov.co` | evaluator | Modo local PBKDF2 (solo tests/localStorage) |
| `demo@ica.gov.co` | — | Tests (`file.test.ts`), contraseña `demo1234` |

---

## 7. Estado del código (04/11/2026, noche)

- **85 archivos** de código (64 originales → 8 eliminados, 28 añadidos, 36 modificados, 20 idénticos).
- **17 archivos de test, 68 tests, todos en verde** (verificado tras la activación del backend).
- `npm run typecheck`: **sin errores**.
- **Modo backend activo**: `AuthProvider` usa `/api/v1` (cookie HttpOnly + CSRF).
- **Backend propio** en `C:\IA_PORCINOS\backend` (Express + TypeScript + MariaDB 10.4.32):
  13 rutas `/api/v1/*` + `/health`, autenticación con roles y alcance por predio,
  migración `001_initial_schema.sql` aplicada, datos académicos `seed-demo` cargados
  (ficticios, marcados `provenance='seed-demo'`).
- El frontend **no requirió cambios de código** para integrarse.

### Cambio detectado durante la generación de esta documentación

A las **10:11:47 del 04/11/2026** — mientras se redactaba — tres archivos fueron modificados
por una fuente externa a esta sesión (que solo leyó archivos):

| Archivo | Cambio |
|---|---|
| `vite.config.ts` | 537 → 336 B: eliminados `preview` y `proxy /api → 127.0.0.1:8000` |
| `src/features/auth/AuthProvider.tsx` | 9 940 → 10 686 B: + `const USE_BACKEND_AUTH = false` y 4 comprobaciones |
| `src/features/auth/LoginPage.tsx` | 10 284 → 10 213 B: ajuste del formulario |

Proceso sospechoso activo en la máquina: `copilot-runtime` (PID 17036, desde 03/11 10:26)
y múltiples instancias de VS Code. **La documentación fue actualizada para reflejar este
cambio; los documentos previos afirmaban que el proxy existía.** Detalle en
`docs/PROJECT_STRUCTURE.md` §3.1.

### Archivos más grandes (candidatos a partición)

`pages.css` 34 KB · `PeopleFarmsPage.tsx` 27,7 KB · `ApiEvaluationPages.tsx` 25,1 KB ·
`catalog.ts` 20,7 KB · `rubrics.ts` 15,9 KB · `EvaluationDetailPage.tsx` 20,6 KB.

---

## 8. Deuda técnica conocida (documentada, no corregida)

1. **Dos fuentes de verdad de criterios**: `catalog.ts` (pesos, método) y `rubrics.ts`
   (pregunta + rangos) deben mantenerse sincronizadas manualmente por clave de criterio.
2. **`eslint-disable react-hooks/exhaustive-deps`** en `IndicatorsPage.tsx:86`.
3. **Sin validación de esquema** al parsear `localStorage` (validación campo a campo manual).
4. **`.env.example` inexistente en frontend** (decisión consciente): la API se resuelve
   por el proxy de Vite; no hace falta variable de entorno. Backend sí tiene `.env.example`.
5. **Sin Git** → no hay rollback por commits. El diff oficial está en `docs/`.
6. ~~**`USE_BACKEND_AUTH = false` hardcodeado**~~ **RESUELTO (04/11)**: la constante
   desapareció; el modo backend es el único modo real (los tests siguen forzando
   el modo local con `MODE === 'test'`).
7. **Dos modos de `MODE === 'test'` y `USE_BACKEND_AUTH`** conviven como condiciones de la
   misma decisión (líneas 164 y 199), lo que hace fácil que diverjan.

---

## 9. Proveniencia del código

| Período | Agente | Qué hizo |
|---|---|---|
| 03/11 10:30–11:05 | **OpenCode** | Construyó los 64 archivos originales (arquitectura, componentes, estilos, páginas). Falló por `provider.free-limit` |
| 03/11 11:51 → 04/11 09:11 | **GitHub Copilot CLI** | Añadió la capa de API, páginas `Api*`, `rubrics.ts`, DIVIPOLA, `PeopleFarmsPage`, marca y 12 archivos de test; modificó 36 archivos |

**La arquitectura base (components/, data/, features/, pages/, styles/, types/, utils/) es
de OpenCode y está mayormente intacta**: 12 de 13 componentes, `global.css`, `main.tsx`,
`format.ts` y `file.ts` son idénticos al original. Copilot añadió encima sin reemplazar
el esqueleto. Detalle completo en `docs/ORIGINAL_VS_ACTUAL.md`.
