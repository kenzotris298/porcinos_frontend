# Versión original vs. versión actual

> **Qué es esto**: resumen legible del diff completo `ORIGINAL_VS_ACTUAL.patch` (626 KB, formato
> unificado, `a/` = original, `b/` = actual).
>
> **Cómo se obtuvo el original**: el proyecto **no tiene repositorio Git**. La versión original
> (64 archivos) se reconstruyó replayando, en orden cronológico, los 99 `write` + 8 `edit`
> registrados en el historial de sesiones de OpenCode (sesión `ses_e5df7dd45ffe…`, 03/11/2026
> 10:30–11:05). El snapshot vive en el temporal, no en el proyecto.
>
> **Cómo se obtuvo el actual**: lectura directa de `C:\IA_PORCINOS\frontend` (85 archivos de código).
> El patch se regeneró tras el cambio en caliente del 04/11 10:11 (ver §9) y **excluye**
> `node_modules/`, `dist/`, `docs/` y `PROJECT_CONTEXT.md` para que solo contenga código.

---

## 1. Cronología verificada

| Fecha/hora | Agente | Evento |
|---|---|---|
| 03/11 10:30 | **OpenCode** | Inicia "Frontend React para bienestar porcino". Fase A conectada a backend (`src/api/`, `src/hooks/`, `types/{admin,api}.ts`) |
| 03/11 10:42 | **OpenCode** | Cambio de requisito a "datos locales": **borrado de la Fase A** por el propio agente (orden `Remove-Item -Recurse -Force src\api; …`) |
| 03/11 10:36–10:57 | **OpenCode** | Escriben los 64 archivos de la versión original |
| 03/11 10:58 | **OpenCode** | `npm install` → crea `package-lock.json` y añade `@testing-library/dom` |
| 03/11 11:05 | **OpenCode** | **Falla: `provider.free-limit`** (límite del plan gratuito) |
| 03/11 11:26 | OpenCode | Reintento → falla de nuevo |
| 03/11 11:51 → 04/11 09:11 | **GitHub Copilot CLI** | Toma el mando (sesiones `c2c10e7f…` y `6e3fae38…`); 3 checkpoints: *"Backend MariaDB y rutas seguras"*, *"Conectar recomendaciones IA"*, *"Conectando rutas operativas a MariaDB"* |
| 03/11 14:21 → 04/11 01:44 | Copilot | Escribe todos los archivos añadidos y modificados |
| 04/11 09:12 | **OpenCode** | Reanuda; detecta *"the codebase has evolved substantially"* |

**Conclusión**: todo lo escrito después del 03/11 11:05 es de Copilot. El único cambio previo
a esa hora que no es de la versión original es el **borrado de la Fase A** (10:42), que hizo
OpenCode por un cambio de requisito del usuario.

---

## 2. Resumen cuantitativo

| | Original | Actual |
|---|---|---|
| Archivos de código | **64** | **85** |
| Eliminados | 8 | — |
| Añadidos | — | 28 (+`package-lock.json`) |
| Modificados | 36 | |
| Idénticos | 20 | |

---

## 3. Eliminados (8)

| Archivo | Motivo verificado |
|---|---|
| `.env.example` | Documentaba `VITE_API_BASE_URL` y `VITE_API_PROXY_TARGET`; hoy **no hay proxy ni variable de entorno** (ver §9). **No fue reemplazado por otra documentación de entorno.** |
| `src/features/recommendations/RecommendationForm.tsx` | Importado por `EvaluationDetailPage.tsx:32` y `RecommendationsPage.tsx:22`; ambos fueron reescritos. Verificado con grep: `RecommendationForm` ya no aparece en `src/`. |
| `src/types/auth.ts` | Resto de la Fase A; `types/index.ts` nunca lo importó |
| `src/types/evaluation.ts` | ídem |
| `src/types/evidence.ts` | ídem |
| `src/types/farm.ts` | ídem |
| `src/types/indicator.ts` | ídem |
| `src/types/recommendation.ts` | ídem |

> Los 6 `types/*.ts` eran archivos de la Fase A (arquitectura con backend) que quedaron
> huérfanos tras el borrado del 03/11 10:42. `types/index.ts` es autocontenido
> (verificado: no contiene ningún `from './'`).

---

## 4. Añadidos (28 + lockfile)

### Infraestructura y marca
| Archivo | Tamaño | Qué es |
|---|---|---|
| `package-lock.json` | 107 KB | **Generado por `npm install`** (03/11 10:58, OpenCode) — no es creación de Copilot |
| `public/brand/{favicon,logo,logo-mark}.svg` + `README.md` | 2,6 KB | Identidad visual enlazada desde `index.html` |
| `src/test/renderWithEvaluator.tsx` | 1,5 KB | Helper `renderWithSession`/`renderWithEvaluator`/`renderWithOwner` |

### Capa de API (backend real)
| Archivo | Tamaño | Qué es |
|---|---|---|
| `src/api/client.ts` | 2,7 KB | `apiRequest<T>()`, `ApiClientError`, `API_BASE='/api/v1'`, CSRF, `credentials:'include'` |
| `src/api/client.test.ts` | 1,4 KB | Tests del cliente |

### Datos y catálogos
| Archivo | Tamaño | Qué es |
|---|---|---|
| `src/data/colombia.ts` | 6,9 KB | `DEPARTMENTS`, `municipalitiesForDepartment()` |
| `src/data/divipola.json` | 143 KB | Tabla DIVIPOLA completa (requirió `resolveJsonModule`) |
| `src/features/indicators/rubrics.ts` | 15,9 KB | `CRITERION_RUBRICS`: pregunta + rangos de calificación por criterio |

### Páginas
| Archivo | Tamaño | Qué es |
|---|---|---|
| `src/pages/PeopleFarmsPage.tsx` | 27,7 KB | Personas y predios (ruta nueva `/personas-predios`) |
| `src/pages/ApiEvaluationPages.tsx` | 25,1 KB | `ApiDashboardPage`, `ApiEvaluationsPage`, `ApiEvaluationDetailPage` |
| `src/pages/ApiPersonRegistrationPage.tsx` | 15,2 KB | Registro de personas (backend) |
| `src/pages/ApiRecommendationsPage.tsx` | 14,4 KB | Planes de mejora (backend) |
| `src/pages/ApiEvidencePage.tsx` | 10,6 KB | Evidencias (backend) |
| `src/pages/ApiIndicatorsPage.tsx` | 6,8 KB | Indicadores (backend) |

### Tests (10 archivos nuevos)
`data/{colombia,store}.test.ts`, `data/LocalDataProvider.test.tsx`,
`features/evaluations/EvaluationFlow.test.tsx`, `features/indicators/IndicatorForm.test.tsx`,
`features/recommendations/generator.test.ts`,
`pages/{ApiEvaluationPages,ApiPersonRegistrationPage,ApiRecommendationsPage,EvaluationsPage,PeopleFarmsPage,RecommendationsPage}.test.tsx`

> **Suite actual: 16 archivos, 65 tests, todos en verde** (verificado con `npm test`).
> La versión original tenía **3** archivos de test.

---

## 5. Modificados (36) — con tamaño antes/después

### Raíz y configuración (5)
| Archivo | Antes → Después | Cambio concreto |
|---|---|---|
| `vite.config.ts` | 370 → **336 B** | Puerto dev 5173 → **4173 `strictPort`**. Bloque `test` sin cambios. **El proxy `/api` y el bloque `preview` fueron añadidos y luego eliminados** (ver §9) |
| `tsconfig.app.json` | 689 → 720 B | **+ `"resolveJsonModule": true`** (único cambio) |
| `package.json` | 833 → 872 B | **+ `@testing-library/dom@^10.4.2`** en devDependencies (único cambio) |
| `index.html` | 497 → 568 B | Favicon/marca de `public/brand/` |
| `.gitignore` | 60 → 86 B | Reglas adicionales |

### Enrutamiento y shell (2)
| Archivo | Antes → Después | Cambio concreto |
|---|---|---|
| `src/App.tsx` | 2 124 → 2 384 B | **+ ruta `personas-predios`** con `ProtectedRoute allowedRoles={['evaluator']}`. Orden de providers **idéntico** |
| `src/components/AppShell.tsx` | 6 884 → 11 416 B | **+ tercer bloque de navegación** `session.backend` (línea 62), ítems dinámicos según rol, + modal de cambio de contraseña, + `Alert` de `storageError` (línea 202) |

### Capa de datos (3)
| Archivo | Antes → Después | Cambio concreto |
|---|---|---|
| `src/data/store.ts` | 2 083 → **10 621 B** | **+ migración `LEGACY_STORAGE_KEY` → `STORAGE_KEY`**, manejo de `QuotaExceededError`, `newId(prefix)` |
| `src/data/LocalDataProvider.tsx` | 7 238 → **14 283 B** | **+ `visibleDatabase`** (scoping por propietario), + `addPerson`, `addFarm`, `finalizeEvaluation`, `resetData`, + bloqueos de reentrada (`useRef<Set>`) |
| `src/data/seed.ts` | 16 227 → 18 948 B | + datos de personas/predios/coinciden con `colombia.ts` |

### Autenticación (2)
| Archivo | Antes → Después | Cambio concreto |
|---|---|---|
| `src/features/auth/AuthProvider.tsx` | 3 229 → **10 686 B** | **+ interruptor `USE_BACKEND_AUTH`** (línea 18, hoy `false`), + modo backend (`apiRequest('/auth/login'|'/auth/me'|'/auth/csrf'|'/auth/password')`), + PBKDF2 local (120 000 iteraciones), + `SESSION_KEY`/`ACCOUNTS_KEY`, mínimo de contraseña 12 (backend) / 8 (local) |
| `src/features/auth/LoginPage.tsx` | 9 611 → 10 213 B | + selector de rol/backend, `placeholder` diferenciado por rol |

### Features (8)
| Archivo | Antes → Después | Cambio concreto |
|---|---|---|
| `features/indicators/IndicatorForm.tsx` | 20 656 → **17 516 B** (−3 KB) | **Ahora lee `CRITERION_RUBRICS`** de `rubrics.ts`: solo botones de rango, sin inputs manuales de puntaje |
| `features/indicators/catalog.ts` | 20 644 → 20 508 B | Ajustes menores de catálogo |
| `features/indicators/catalog.test.ts` | 2 290 → 3 379 B | + tests |
| `features/indicators/IndicatorList.tsx` | 3 509 → 3 889 B | + presentación de rúbrica |
| `features/evaluations/EvaluationForm.tsx` | 8 546 → 7 999 B | Simplificación |
| `features/evaluations/results.ts` | 4 508 → 5 257 B | + lógica de puntaje |
| `features/evaluations/results.test.ts` | 1 731 → 5 275 B | + tests |
| `features/evidence/EvidenceViewer.tsx` | 2 458 → 2 414 B | Ajuste menor |
| `features/recommendations/generator.ts` | 3 841 → 5 911 B | + generación de recomendaciones |

### Páginas (8 — todas)
| Archivo | Antes → Después | Cambio concreto |
|---|---|---|
| `pages/EvaluationsPage.tsx` | 10 402 → **18 603 B** | + bifurcación `Api*`, + filtros y estados ampliados |
| `pages/RecommendationsPage.tsx` | 13 434 → 18 314 B | − `RecommendationForm` (eliminado), + `ApiRecommendationsPage` |
| `pages/EvaluationDetailPage.tsx` | 16 933 → 20 533 B | − `RecommendationForm`, + `ApiEvaluationDetailPage` |
| `pages/DashboardPage.tsx` | 12 677 → 13 339 B | + `ApiDashboardPage` |
| `pages/IndicatorsPage.tsx` | 11 166 → 11 810 B | + wrapper `session.backend` (línea 37), + `LIBERTY_ADJUSTMENT_CRITERION_ID` |
| `pages/EvidencePage.tsx` | 11 769 → 12 135 B | + wrapper `session.backend` (línea 32) |
| `pages/MethodologyPage.tsx` | 9 055 → 9 785 B | + contenido |
| `pages/NotFoundPage.tsx` | 1 131 → 1 117 B | Ajuste menor |

### Estilos (4 de 5 — `global.css` NO cambió)
| Archivo | Antes → Después | Cambio |
|---|---|---|
| `src/styles/pages.css` | 22 234 → **34 261 B** (+54%) | + estilos de `PeopleFarmsPage`, `Api*`, filtros ampliados |
| `src/styles/modules.css` | 13 337 → 13 610 B | + módulos menores |
| `src/styles/layout.css` | 14 312 → 13 819 B | Refactor menor |
| `src/styles/responsive.css` | 6 072 → 6 123 B | + reglas para pantallas nuevas |

### Tipos y utilidades (3)
| Archivo | Antes → Después | Cambio |
|---|---|---|
| `src/types/index.ts` | 2 599 → 3 413 B | **+ `Session.backend?: true`**, + `PersonRecord`, + `Farm.personaId`/`codigoDepartamento`/`codigoMunicipio`, + campos de `MetricSample`, `RecommendationPlan.source` |
| `src/utils/validation.ts` | 2 522 → 2 504 B | Ajuste menor |
| `src/utils/file.test.ts` | 1 754 → 1 726 B | Ajuste de test |

---

## 6. Idénticos (20) — sin cambios desde el 03/11

```
src/components/Alert.tsx        src/components/Badge.tsx
src/components/Button.tsx       src/components/ErrorBoundary.tsx
src/components/FormField.tsx    src/components/LoadingState.tsx
src/components/Modal.tsx        src/components/PageHeader.tsx
src/components/ProgressBar.tsx  src/components/ProtectedRoute.tsx
src/components/States.tsx       src/components/ToastProvider.tsx
src/features/evidence/EvidenceUploadForm.tsx
src/main.tsx                    src/styles/global.css
src/test/setup.ts               src/utils/file.ts
src/utils/format.ts             tsconfig.json
tsconfig.node.json
```

**12 de los 13 componentes de `components/`** son byte a byte idénticos: toda la capa de
UI reutilizable (botones, modales, formularios, estados, toasts) **no fue tocada**.
Igual `global.css` (variables, reset, controles), `main.tsx` y las utilidades puras
`format.ts`/`file.ts`.

---

## 7. Cambios estructurales destacados

1. **`RecommendationForm.tsx` eliminado** → sus dos páginas consumidoras fueron reescritas.
2. **Ruta nueva** `/personas-predios` con restricción `allowedRoles={['evaluator']}`.
3. **Bifurcación por `session.backend`** en 4 páginas locales → renderizan su variante `Api*`
   *(hoy inalcanzable: `USE_BACKEND_AUTH = false`, ver §9)*.
4. **`.env.example` eliminado** sin sustituto; hoy tampoco hay proxy ni variable de entorno.
5. **`pages.css` creció 54%**; `IndicatorForm` se redujo 3 KB al externalizar rangos a `rubrics.ts`.
6. **`components/` (salvo `AppShell`), `main.tsx`, `global.css` y `utils/format.ts` intactos**:
   la arquitectura base original sigue siendo el esqueleto del proyecto.

---

## 8. Cómo regenerar estos datos

```bash
# Instantánea original (replay del historial de OpenCode)
python C:\Users\KEVIN\AppData\Local\Temp\opencode\reconstruct.py
# Diff por archivo (eliminados / añadidos / modificados / idénticos)
python C:\Users\KEVIN\AppData\Local\Temp\opencode\diff.py
# Patch unificado → frontend/docs/ORIGINAL_VS_ACTUAL.patch
python C:\Users\KEVIN\AppData\Local\Temp\opencode\make_patch.py
```

Los scripts y el snapshot viven en el **directorio temporal**, no en el proyecto.
Ambos scripts excluyen `node_modules`, `dist`, `.git`, `docs/` y `PROJECT_CONTEXT.md`
(para que la documentación generada no contamine el diff de código).

---

## 9. Cambio en caliente del 04/11/2026 10:11 (posterior al diff)

El patch de este documento se regeneró **después** de un cambio hecho por una fuente externa
durante la redacción (no por esta sesión, que solo leyó archivos). Se detectó porque el
contenido de tres archivos ya no coincidía con lo leído minutos antes.

| Archivo | Antes → Después | Cambio |
|---|---|---|
| `vite.config.ts` | 537 → **336 B** | **Eliminados** el bloque `preview` y el `proxy: { '/api': { target: '127.0.0.1:8000' } }` |
| `src/features/auth/AuthProvider.tsx` | 9 940 → **10 686 B** | **+ `const USE_BACKEND_AUTH = false;`** (líneas 17–18) y 4 comprobaciones |
| `src/features/auth/LoginPage.tsx` | 10 284 → **10 213 B** | Ajuste del formulario de login |

```ts
// AuthProvider.tsx líneas 17–18
// Temporalmente el frontend opera solo con sesiones y datos locales.
const USE_BACKEND_AUTH = false;
```

**Efecto**: el frontend opera **100% en modo local**. Las 6 páginas `Api*` y `src/api/client.ts`
compilan y pasan tests, pero son **inalcanzables** — `session.backend` nunca será `true`.
La capa de API quedó como código muerto temporal hasta que se reactive la constante
**y** se restaure el proxy. Detalle completo en `PROJECT_STRUCTURE.md` §3.1.
