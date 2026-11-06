# Arquitectura del frontend

> Derivado del código real de `C:\IA_PORCINOS\frontend`. Cada afirmación cita un archivo verificable.
> Documenta la arquitectura **común** a original y actual, y señala explícitamente dónde difieren.

---

## 1. Stack

| Capa | Elección | Evidencia |
|---|---|---|
| Framework | React **19.3.1** (`react`, `react-dom`) | `package.json` |
| Build | Vite **7.3.7** + `@vitejs/plugin-react` 5 | `vite.config.ts` |
| Lenguaje | TypeScript **5.9.3**, `strict: true` | `tsconfig.app.json` |
| Routing | `react-router-dom` **7.18.5** (componentes `<Routes>`, no createBrowserRouter) | `src/App.tsx` |
| Iconos | `lucide-react` 1.67 | `src/components/AppShell.tsx` |
| Tests | Vitest **4.1.12** + Testing Library + jsdom | `vite.config.ts` bloque `test` |
| CSS | **CSS puro con variables** (`var(--…)`), sin framework | `src/styles/*.css` (5 archivos) |

**No hay**: axios, react-query/SWR, zod, formik, redux, styled-components, i18n ni store global.

---

## 2. Orden de providers

`src/App.tsx` (actual, líneas 20–48):

```tsx
<BrowserRouter>
  <AuthProvider>
    <ToastProvider>
      <LocalDataProvider>
        <ErrorBoundary>
          <Routes> … </Routes>
        </ErrorBoundary>
      </LocalDataProvider>
    </ToastProvider>
  </AuthProvider>
</BrowserRouter>
```

El orden **no ha cambiado** desde la versión original; solo se añadieron rutas dentro de `<Routes>`.

**Por qué ese orden:**

1. `AuthProvider` — más externo: `LocalDataProvider` llama `useAuth()` (línea 21 de `LocalDataProvider.tsx`).
2. `ToastProvider` — no depende de nada; se usa desde cualquier página con `useToast()`.
3. `LocalDataProvider` — depende de `useAuth()` para el *scoping* por propietario (línea 67).
4. `ErrorBoundary` — último anillo antes de las rutas: captura errores de render de las páginas.

`ErrorBoundary` es la **única** clase (`extends Component`); todo lo demás es función.
React Router se resuelve con `Outlet`: `ProtectedRoute` y `AppShell` renderizan `<Outlet />`.

---

## 3. Enrutamiento

`src/App.tsx` actual:

```tsx
<Route path="/login" element={<LoginPage />} />
<Route element={<ProtectedRoute />}>
  <Route element={<AppShell />}>
    <Route index element={<DashboardPage />} />
    <Route path="evaluaciones" element={<EvaluationsPage />} />
    <Route path="evaluaciones/:id" element={<EvaluationDetailPage />} />
    <Route path="indicadores" element={<IndicatorsPage />} />
    <Route path="evidencias" element={<EvidencePage />} />
    <Route path="recomendaciones" element={<RecommendationsPage />} />
    <Route element={<ProtectedRoute allowedRoles={['evaluator']} />}>
      <Route path="personas-predios" element={<PeopleFarmsPage />} />
    </Route>
    <Route path="metodologia" element={<MethodologyPage />} />
    <Route path="*" element={<NotFoundPage />} />
  </Route>
</Route>
```

### Diferencias con el original

| Ruta | Original (03/11) | Actual |
|---|---|---|
| `/personas-predios` | **no existía** | añadida, con `allowedRoles={['evaluator']}` |
| resto | idéntico | idéntico |

Es decir: **el enrutado de páginas `Api*` es interno, no por ruta**. Las páginas `Api*`
no tienen `<Route>` propio; se renderizan *dentro* de la página local correspondiente
(ver §6). `App.tsx` no importa ninguna `Api*Page`.

### Protección

```tsx
// src/components/ProtectedRoute.tsx (665 B, idéntico al original)
export function ProtectedRoute({ allowedRoles }: { allowedRoles?: Role[] }) {
  const { session, loading } = useAuth();
  const location = useLocation();
  if (loading) return <PageLoading label="Verificando la sesión…" />;
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (allowedRoles && !allowedRoles.includes(session.role)) return <Navigate to="/" replace />;
  return <Outlet />;
}
```

- `loading` evita el parpadeo → redirect prematura durante la restauración de sesión.
- `state={{ from }}` guarda la ruta de origen (aunque `LoginPage` no lo consume actualmente).
- Restricción por rol: solo `personas-predios` la usa (evaluador).

---

## 4. Navegación (AppShell)

`src/components/AppShell.tsx` (modificado: 6884 B → 11416 B). Estructura de clases CSS:
`.app` → `.app-sidebar` (fixed, `width: var(--sidebar-width)` = 278px) + `.app__content`
(`margin-left: var(--sidebar-width)`) → `.topbar` (sticky) + `.app-main` + `.app-footer`.

Tres listas de navegación según el modo de sesión (líneas 33–72):

```ts
const EVALUATOR_NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Panel del evaluador', icon: LayoutDashboard, end: true },
  { to: '/evaluaciones', label: 'Evaluaciones', icon: ClipboardList },
  { to: '/personas-predios', label: 'Personas y predios', icon: UsersRound },
  { to: '/indicadores', label: 'Indicadores', icon: ListChecks },
  { to: '/evidencias', label: 'Evidencias', icon: Images },
  { to: '/recomendaciones', label: 'Planes de mejora', icon: Sparkles },
  { to: '/metodologia', label: 'Metodología', icon: BookOpen }
];

const OWNER_NAV_ITEMS: NavItem[] = [ /* sin /personas-predios, prefijos "Mis …" */ ];

// línea 62: tercer caso cuando session.backend es true
const navItems = session.backend ? [ /* versión dinámica según session.role */ ] : …;
```

`NavItem` es un `interface` local con `end?: boolean` (para que `/` no matchee `/evaluaciones`).

Accesibilidad real: `.skip-link` (`layout.css:458`), `aria-current` en `NavLink`, botón de menú
`.topbar__menu` visible solo bajo 980px, `.sidebar-scrim` para cerrar el panel móvil.

---

## 5. Estado y datos

### 5.1 Estado local por componente

Todo el estado de UI vive en `useState`/`useMemo`/`useRef` dentro de cada página.
**No hay store global** (redux/zustand/context de UI). Los contextos existentes son 3 y son de servicios:

| Contexto | Archivo | Expone |
|---|---|---|
| `AuthContext` | `features/auth/AuthProvider.tsx` | `session, loading, authError, login, changePassword, logout` |
| `ToastContext` | `components/ToastProvider.tsx` | `notify(message, tone?)` |
| `LocalDataContext` | `data/LocalDataProvider.tsx` | `database` + 12 mutaciones + `storageError` |

Patrón idéntico en los tres: `createContext<T | null>(null)` + hook propio que lanza si es `null`:

```tsx
export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast debe usarse dentro de ToastProvider');
  return context;
}
```

`ToastProvider` limita a 4 toasts (`[...current.slice(-3), nuevo]`) y auto-cierra a los 5 s.

### 5.2 Capa de datos local (modo demo)

```
seed.ts ──createSeedDatabase()──▶ store.ts ──loadDatabase()──▶ LocalDataProvider ──▶ páginas
                                     │
                                     └─ localStorage: 'bienestar-porcino.database.v1'
```

- **`store.ts`** (2083 B → 10621 B): persistencia. Exporta `STORAGE_KEY`, `loadDatabase()`,
  `saveDatabase()`, `removeDatabase()`, `newId(prefix)`. `loadDatabase()` migra la clave legada
  `bienestar-porcino.demo.v1` a `bienestar-porcino.database.v1` y devuelve `{ database, error }`.
- **`LocalDataProvider.tsx`** (7238 B → 14283 B): única fuente de escritura. Interface completa:

```ts
interface LocalDataContextValue {
  database: DemoDatabase;
  storageError: string | null;
  dismissStorageError: () => void;
  addPerson: (input: PersonInput) => PersonRecord;
  addFarm: (input: FarmInput) => Farm;
  saveEvaluation: (input: EvaluationInput, id?: string) => Evaluation;
  finalizeEvaluation: (id: string) => Evaluation;
  deleteEvaluation: (id: string) => void;
  saveIndicator: (input: IndicatorInput, id?: string) => IndicatorRecord;
  deleteIndicator: (id: string) => void;
  addEvidence: (input: EvidenceInput) => EvidenceRecord;
  deleteEvidence: (id: string) => void;
  generateRecommendationPlan: (evaluationId, items, generatedBy) => RecommendationRecord[];
  resetData: () => void;
}
```

**Aislamiento por rol** (`visibleDatabase`, líneas 73–84): cuando `session.role === 'owner'`,
se filtra el `database` devuelto a las personas/predios cuyo `correo` coincide con el de la
sesión. El escritor (`database`) sigue siendo completo; el lector expuesto está recortado.

**Guardas de dominio**: `requireEvaluator(role)` lanza `'Esta acción está disponible solo para evaluadores.'`
antes de mutaciones reservadas al evaluador.

**Input types por `Omit`** (líneas 25–33) — patrón para no repetir campos:

```ts
export type EvaluationInput = Omit<Evaluation, 'id' | 'createdAt' | 'updatedAt' | 'estado'>;
export type PersonInput     = Omit<PersonRecord, 'id' | 'createdAt'>;
export type IndicatorInput  = Omit<IndicatorRecord, 'id' | 'createdAt' | 'updatedAt'>;
```

### 5.3 Tipos de dominio

Todo vive en **`src/types/index.ts`** (archivo único, 156 líneas, 21 exports). Entidades:
`Session`, `PersonRecord`, `Farm`, `Evaluation`, `IndicatorRecord`, `EvidenceRecord`,
`RecommendationRecord`, `RecommendationPlan`, `DemoDatabase`, `LibertyScore`, `EvaluationInsights`.
Uniones literales: `Role`, `ProductionSystem`, `EvaluationStatus`, `MeasureBase`, `Applicability`,
`IndicatorStatus`, `RecommendationSource`. Detalle completo en `TYPESCRIPT_GUIDE.md`.

`DemoDatabase` fija `version: 5` (literal de tipo) para controlar migraciones del `localStorage`.

---

## 6. Integración con el backend (capa añadida posteriormente)

Esta capa **no existía** en la versión original de 64 archivos; fue añadida después.
Se documenta porque hoy forma parte del código.

> ✅ **ACTUALIZACIÓN 04/11/2026**: el modo backend está ACTIVO (sin `USE_BACKEND_AUTH`).
> `AuthProvider.tsx` autentica siempre por `/api/v1` salvo en `MODE === 'test'`, y
> `vite.config.ts` incluye el proxy `/api/v1 → http://127.0.0.1:8000`. El backend vive
> en `C:\IA_PORCINOS\backend` (Express + MariaDB). Este §6 describe el código tal como
> está; la activación se completó el 04/11/2026 (ver PROJECT_CONTEXT.md §4).

### 6.1 Cliente HTTP — `src/api/client.ts`

```ts
const API_BASE = '/api/v1';
export class ApiClientError extends Error { readonly status: number; … }
async function getCsrfToken(): Promise<string> { … '/auth/csrf' … }
export async function apiRequest<T>(path, init?): Promise<T>
```

- `credentials: 'include'` → cookie HttpOnly de sesión.
- Guarda `csrfToken` de cualquier respuesta que lo traiga y lo envía en mutaciones.
- `204` → `undefined`; errores → `ApiClientError` con `status`.
- Error de red → `'No se pudo conectar con el backend. Verifica que la API esté iniciada.'`

### 6.2 Doble modo: `session.backend`

`Session.backend?: true` es un **literal `true`** (no `boolean`), marcador de que la sesión
vino del backend real. `AuthProvider` decide el modo con **una constante + el modo de Vite**:

```ts
// AuthProvider.tsx líneas 17–18 — interruptor maestro
// Temporalmente el frontend opera solo con sesiones y datos locales.
const USE_BACKEND_AUTH = false;

// línea 164 (restaurar sesión) y 199 (login)
if (USE_BACKEND_AUTH && import.meta.env.MODE !== 'test') { /* backend real vía apiRequest */ }
else { /* cuentas locales con PBKDF2 en localStorage */ }
```

**Con `USE_BACKEND_AUTH = false` (estado actual) siempre se toma la rama local.** La condición
`import.meta.env.MODE !== 'test'` sigue presente: en los tests se fuerza el modo local aunque
la constante esté en `true`.

- **Restauración** (líneas 161–192): con backend haría `GET /auth/csrf` + `GET /auth/me`;
  un `401` no es error (sesión simplemente ausente), otros códigos sí. Hoy: `wait(350)` +
  `readSession()` desde `localStorage`.
- **Login real** (línea 199, hoy inalcanzable): `POST /auth/login` y valida
  `result.user.role !== input.role` → cierra sesión y lanza
  `'El perfil seleccionado no coincide con el rol de esta cuenta.'`
- **Login local** (rama activa): PBKDF2-SHA256, 120 000 iteraciones, sal aleatoria por cuenta,
  en `bienestar-porcino.demo.accounts.v1`. Sesión en `bienestar-porcino.demo.session`.
- **Cambio de contraseña** (línea 252): mínimo **12** caracteres si `session.backend`,
  **8** si no. Y líneas 260–262: si `session.backend` pero `USE_BACKEND_AUTH` está en `false`,
  lanza `'La autenticación del backend está desactivada temporalmente.'`
- **Logout** (línea 307): con backend haría `POST /auth/logout`; hoy siempre limpia
  `localStorage`.

### 6.3 Patrón de bifurcación por página

Las páginas locales son *wrappers* que delegan cuando hay backend:

```tsx
// src/pages/IndicatorsPage.tsx líneas 35–39
export function IndicatorsPage() {
  const { session } = useAuth();
  if (session?.backend) return <ApiIndicatorsPage />;
  return <LocalIndicatorsPage />;
}
```

Mismo patrón en `EvidencePage` (línea 32), `RecommendationsPage` (línea 29),
`PeopleFarmsPage` (línea 64). `DashboardPage`, `EvaluationDetailPage` y `EvaluationsPage`
importan sus equivalentes `Api*` desde `ApiEvaluationPages.tsx`.

La navegación responde igual (`AppShell.tsx` línea 62: `const navItems = session.backend ? …`).

**Con `USE_BACKEND_AUTH = false` estas bifurcaciones nunca se activan** — `session.backend`
no puede ser `true` porque `sessionFromApiUser()` solo se invoca en la rama backend.
Las páginas `Api*` quedan como código compilado pero inalcanzable.

### 6.4 Proxy de desarrollo — ELIMINADO

`vite.config.ts` **ya no tiene bloque `proxy` ni `preview`** (eliminados el 04/11 10:11):

```ts
// Estado actual — sin proxy
export default defineConfig({
  plugins: [react()],
  server: { port: 4173, strictPort: true },
  test: { … }
});
```

Mientras tanto, `api/client.ts` sigue declarando `const API_BASE = '/api/v1'`, que hoy
resolvería contra la propia app (y fallaría). **Para reactivar el backend** hay que hacer
ambas cosas: `USE_BACKEND_AUTH = true` **y** restaurar
`proxy: { '/api': { target: 'http://127.0.0.1:8000' } }` en `server` y `preview`.

---

## 7. Manejo de errores y estados

| Nivel | Mecanismo | Archivo |
|---|---|---|
| Render | `ErrorBoundary` (clase) → `ErrorState` con botón "Reintentar" | `components/ErrorBoundary.tsx` |
| Datos locales | `storageError` + `dismissStorageError` → `Alert` en `AppShell` | `LocalDataProvider`, `AppShell:202` |
| HTTP | `ApiClientError.status` distingue 401 de fallos | `api/client.ts` |
| Formularios | `FieldErrors<T>` por campo + `hasErrors()` | `utils/validation.ts` |
| UI | `EmptyState`, `ErrorState`, `PageLoading` | `components/States.tsx`, `LoadingState.tsx` |
| Feedback | `useToast().notify(msg, tone)` | `components/ToastProvider.tsx` |

**Estados vacío/carga/error están presentes en todas las páginas**: `EmptyState` recibe
`title`, `description`, `action?`, `icon?`; `ErrorState` recibe `message` y `onRetry?`.

---

## 8. Pruebas

- Config en `vite.config.ts`: `environment: 'jsdom'`, `globals: true`,
  `setupFiles: './src/test/setup.ts'`, `css: false`, `restoreMocks: true`.
- `setup.ts` (7 líneas, idéntico al original): `@testing-library/jest-dom/vitest` + `cleanup()` en `afterEach`.
- **Estado actual: 16 archivos, 65 tests, todos en verde** (`npm test`, verificado 04/11).
- Helper `src/test/renderWithEvaluator.tsx`: `renderWithSession(ui, session)` y
  `renderWithEvaluator(ui)` envuelven en `MemoryRouter > ToastProvider > AuthProvider > LocalDataProvider`
  y **esperan a que la sesión esté lista** (`findByTestId('test-session-ready')`) — evita el
  parpadeo de `loading` en los tests.
- La versión original solo tenía 3 tests: `results.test.ts`, `catalog.test.ts`, `file.test.ts`.

---

## 9. Diagrama de dependencias

```
main.tsx ──▶ App.tsx ──▶ styles/global.css (@import ×4 en cadena)
                │
                ├─ AuthProvider ──▶ [USE_BACKEND_AUTH=false] localStorage + PBKDF2
                │        └─ (código inactivo) api/client.ts ──▶ fetch('/api/v1/…')
                ├─ ToastProvider
                ├─ LocalDataProvider ──▶ store.ts ──▶ localStorage '…database.v1'
                │        │                 └─ seed.ts (createSeedDatabase)
                │        ├─ features/auth/useAuth()
                │        └─ data/colombia.ts + divipola.json
                └─ ErrorBoundary
                        └─ Routes
                             ├─ LoginPage
                             └─ ProtectedRoute ─▶ AppShell ─▶ páginas
                                                        └─ useLocalData()   (siempre modo local hoy)
                                                            └─ (rama Api* inactiva: session.backend nunca true)
```

Regla observada en el código: **`features/` no importa de `pages/`**;
**`pages/` importa de `features/`, `components/`, `data/`, `utils/`, `types`**;
**`components/` importa de `components/`, `utils/`, `types`** (y `AppShell` además de `data/` y `features/auth`).
La única excepción es `pages/*.tsx` importando `pages/Api*.tsx` (mismo nivel).
