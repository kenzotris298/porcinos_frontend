# Patrones de desarrollo

> Patrones **generales** (aplicables a cualquier parte de la app) separados de las
> **implementaciones particulares** existentes hoy. Todos los ejemplos son código literal
> de `C:\IA_PORCINOS\frontend`.

---

## A. Patrones generales

### A1. Página = wrapper por modo + implementación concreta

*Patrón general*: toda pantalla que puede funcionar con backend **o** con datos locales
se declara como función pequeña que bifurca según `session.backend`.

```tsx
// Patrón (general)
export function XPage() {
  const { session } = useAuth();
  if (session?.backend) return <ApiXPage />;
  return <LocalXPage />;
}
```

*Implementaciones particulares hoy*:

| Página | Línea | Bifurcación |
|---|---|---|
| `IndicatorsPage` | 37 | `session?.backend → <ApiIndicatorsPage />` |
| `EvidencePage` | 32 | `session?.backend → <ApiEvidencePage />` |
| `PeopleFarmsPage` | 64 | `session?.backend → <ApiPersonRegistrationPage />` |
| `RecommendationsPage` | 29 | `session?.backend → <ApiRecommendationsPage canGenerate={session.role === 'evaluator'} />` |

`DashboardPage`, `EvaluationDetailPage` y `EvaluationsPage` importan sus partes `Api*`
desde `ApiEvaluationPages.tsx` (mismo patrón, agrupados en un archivo).

### A2. Estado de lista: `useState` de filtros + `useMemo` de filtrado

*Patrón general*:

```tsx
const [search, setSearch] = useState('');
const [filterA, setFilterA] = useState('');

const filtered = useMemo(() => {
  const term = search.trim().toLowerCase();
  return items.filter((item) => {
    const matchesA = !filterA || item.campoA === filterA;
    const matchesTerm = !term || item.nombre.toLowerCase().includes(term);
    return matchesA && matchesTerm;
  });
}, [items, filterA, search]);
```

Reglas observables:
1. **`!filtro || condición`** — un filtro vacío no filtra (evita `if` anidados).
2. **`term` se normaliza una vez** con `.trim().toLowerCase()`.
3. **Todo lo que lee el `useMemo` va en el array de deps**, incluidas colecciones derivadas
   (`database.evaluations`, `database.farms`).
4. Si una función auxiliar se define *dentro* del componente y lee estado vivo, se documenta:

```tsx
// evaluationLabel se reconstruye con el estado actual de la base de datos.
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [indicators, evaluationFilter, libertyFilter, statusFilter, search, database.evaluations, database.farms]);
```
(*`IndicatorsPage.tsx` líneas 85–87 — particular, y es el único `eslint-disable` de este tipo*)

5. `const hasFilters = Boolean(search || filterA || filterB)` → para mostrar "Limpiar filtros".

### A3. CRUD a través de un único provider

*Patrón general*: los componentes **nunca** escriben `localStorage` ni hacen `fetch` directo
para datos de dominio. Llaman al provider y actualizan estado:

```tsx
const { database, saveIndicator, deleteIndicator } = useLocalData();
saveIndicator(input);            // con id → actualiza; sin id → crea
deleteIndicator(id);             // la UI pide confirmación antes
```

Las firmas usan **`input` tipado con `Omit`** y devuelven la entidad creada/actualizada,
lo que permite mostrarla en un toast sin releer el estado:

```ts
saveIndicator: (input: IndicatorInput, id?: string) => IndicatorRecord;
```

*Particular*: `LocalDataProvider` distingue `id?` como segundo parámetro (no un objeto
con `{ id, ... }`) y usa `newId('ind')` internamente.

### A4. Confirmación destructiva con `ConfirmDialog`

*Patrón general*: ninguna eliminación ocurre sin diálogo; el botón de confirmar muestra
estado de carga mientras se ejecuta.

```tsx
const [deleting, setDeleting] = useState<IndicatorRecord | null>(null);

<ConfirmDialog
  open={Boolean(deleting)}
  title="Eliminar indicador"
  message={`Esta acción no se puede deshacer.`}
  confirmLabel="Eliminar"
  onConfirm={() => { deleteIndicator(deleting.id); setDeleting(null); }}
  onClose={() => setDeleting(null)}
/>
```

`ConfirmDialog` (particular) ya trae `Cancelar` (secondary) + acción `danger` con `loading`.

### A5. Feedback: toast para éxito, `Alert` para aviso persistente

| Situación | Mecanismo | Ejemplo real |
|---|---|---|
| Acción completada | `notify('…', 'success')` | guardar/eliminar indicador |
| Aviso que debe leerse | `<Alert tone="warning">` | datos de demostración, cambio de contraseña |
| Error de sistema | `<Alert tone="danger">` o `ErrorState` | fallo de `localStorage` |
| Error de campo | `<FormField error={errors.campo}>` | formularios |

`Alert` acepta `tone?: 'info' | 'success' | 'warning' | 'danger'` (default `'info'`) y
asigna `role="alert"` solo cuando `tone === 'danger'`, `role="status"` en el resto.

### A6. Accesibilidad como parte del patrón

Observado de forma consistente en componentes nuevos y viejos:

- Iconos decorativos: `aria-hidden="true"` (o `size` + `aria-hidden` en lucide).
- Botón sin texto: `aria-label="Cerrar"` / `"Cerrar notificación"`.
- Estados asíncronos: `aria-busy={loading || undefined}` (`undefined` borra el atributo).
- Campos inválidos: `aria-invalid={invalid || undefined}` + mensaje con `role="alert"`.
- Región de toasts: `aria-live="polite"`.
- Modal: `role="dialog"`, `aria-modal="true"`, `aria-labelledby="modal-title"`,
  foco inicial en el botón de cerrar, `Escape` cierra, `body.overflow = hidden` mientras está abierto,
  cerrado con `onMouseDown` solo si el clic fue **en el backdrop** (`event.target === currentTarget`).
- `skip-link` en `layout.css` para saltar al contenido.

### A7. Acceso a contexto con guardia

*Patrón general* (los 3 contextos):

```tsx
const XContext = createContext<XValue | null>(null);

export function useX(): XValue {
  const context = useContext(XContext);
  if (!context) throw new Error('useX debe usarse dentro de XProvider');
  return context;
}
```

### A8. Efectos con bandera de montaje

```tsx
useEffect(() => {
  let active = true;
  async function run() { … if (active) setX(…) }
  void run();
  return () => { active = false; };
}, []);
```

Se usa en `AuthProvider` (restaurar sesión) y es el patrón para cualquier llamada inicial.

### A9. Derivaciones fuera del estado

Los promedios, conteos y clasificaciones **no se guardan en estado**: se calculan en cada
render con `filter`/`reduce`. Ejemplo (`IndicatorsPage`):

```tsx
const scored = indicators.filter((i) =>
  i.aplicabilidad === 'aplica' &&
  i.estado !== 'Pendiente de revisión' &&
  i.metricaCatalogoId !== LIBERTY_ADJUSTMENT_CRITERION_ID &&
  typeof i.puntaje === 'number'
);
const average = scored.length
  ? scored.reduce((total, i) => total + (i.puntaje ?? 0), 0) / scored.length
  : null;
```

`average` es `number | null` y se muestra con `formatScore(average)` → `'—'` si es `null`.

---

## B. Implementaciones particulares (existentes hoy)

### B1. Catálogo de indicadores vs. rúbricas

Dos fuentes de verdad distintas y **no intercambiables**:

- **`features/indicators/catalog.ts`** (~20 KB): `CRITERIA`, `LIBERTIES`, `findCriterion()`.
  Define libertades, criterios, pesos y método de medición.
- **`features/indicators/rubrics.ts`** (~16 KB): `CRITERION_RUBRICS: Record<string, CriterionRubric>`
  con `{ question: string; ratings: { score, description }[] }`, construido con un helper:

```ts
function rubric(question: string, ranges: [number, string][]): CriterionRubric {
  return { question, ratings: ranges.map(([score, description]) => ({ score, description })) };
}

export const CRITERION_RUBRICS: Record<string, CriterionRubric> = {
  'limpieza-comederos': rubric(
    '¿Los materiales del comedero garantizan la calidad del alimento y facilitan la limpieza y desinfección?',
    [
      [100, '100% limpios y sin riesgo de contaminación.'],
      [55, 'Más del 50% limpios y sin riesgo de contaminación.'],
      [0, '50% o menos limpios, o con riesgo de contaminación.']
    ]
  ),
  …
};

export const LIBERTY_ADJUSTMENT_CRITERION_ID = 'proteccion-cerdas-grupo';
```

`IndicatorForm` usa `CRITERION_RUBRICS[id].ratings` para **mostrar solo botones de rango**
(no hay inputs manuales de puntaje). `LIBERTY_ADJUSTMENT_CRITERION_ID` se importa desde
`rubrics.ts` en `IndicatorsPage` para excluir ese criterio del promedio.

### B2. Geografía DIVIPOLA

- **`data/colombia.ts`**: exporta `DEPARTMENTS` y `municipalitiesForDepartment(codigo)`.
- **`data/divipola.json`** (143 KB): tabla DIVIPOLA completa; requiere
  `"resolveJsonModule": true` en `tsconfig.app.json`.
- Consumido por `LocalDataProvider` (`import { DEPARTMENTS, municipalitiesForDepartment } from './colombia'`)
  para pobler selects de departamento/municipio y por `Farm.codigoDepartamento/codigoMunicipio`.

### B3. Cliente HTTP y CSRF — *código presente, inactivo*

> ⚠️ Con `USE_BACKEND_AUTH = false` (estado actual) **ninguna de estas llamadas se ejecuta**.
> Ver `PROJECT_STRUCTURE.md` §3.1.

`api/client.ts`:

```ts
const API_BASE = '/api/v1';
export class ApiClientError extends Error { readonly status: number; … }
export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T>
```

- `credentials: 'include'` + token CSRF capturado de cualquier respuesta (`'csrfToken' in body`).
- `204` → `undefined as T`; cuerpo no JSON con `ok` → `'El backend devolvió una respuesta inválida.'`
- Sin conexión → `'No se pudo conectar con el backend. Verifica que la API esté iniciada.'`
- **El proxy de Vite (`/api` → `127.0.0.1:8000`) fue eliminado** el 04/11 10:11; hoy
  `API_BASE` no tiene destino.

### B4. Autenticación dual — *interruptor `USE_BACKEND_AUTH`*

> ⚠️ **Estado actual: `const USE_BACKEND_AUTH = false;`** → siempre rama local.

`features/auth/AuthProvider.tsx`:

```ts
const SESSION_KEY = 'bienestar-porcino.demo.session';
const ACCOUNTS_KEY = 'bienestar-porcino.demo.accounts.v1';
const PASSWORD_ITERATIONS = 120_000;
// Temporalmente el frontend opera solo con sesiones y datos locales.
const USE_BACKEND_AUTH = false;
```

- **Modo real** (`USE_BACKEND_AUTH && MODE !== 'test'`): `POST /auth/login`, `GET /auth/me`,
  `GET /auth/csrf`, `PATCH /auth/password`. El `401` en `/auth/me` **no** es error.
- **Modo local (activo)**: PBKDF2-SHA256 con sal por cuenta en `localStorage`; sesión JSON con
  `mustChangePassword`; login simulado con `wait(700)`.
- **Mismatch de rol**: cierra sesión (`POST /auth/logout` + `clearApiCsrfToken()`) y lanza
  `'El perfil seleccionado no coincide con el rol de esta cuenta.'`
- **Guardia del interruptor** (líneas 260–262): con `session.backend` pero constante en
  `false` → `'La autenticación del backend está desactivada temporalmente.'`
- **Contraseña mínima**: 12 caracteres con backend, 8 en local.
- Nombre demo: `evaluador@ica.gov.co` → `"Andrea Salazar"`.

### B5. Persistencia y migración de `localStorage`

`data/store.ts`:

```ts
export const STORAGE_KEY = 'bienestar-porcino.database.v1';
const LEGACY_STORAGE_KEY = 'bienestar-porcino.demo.v1';
export function loadDatabase(): LoadResult   // { database, error }
export function saveDatabase(database: DemoDatabase): void
export function removeDatabase(): void
export function newId(prefix: string): string
```

`loadDatabase()` migra de la clave legada a la nueva y captura errores de
`JSON.parse`/`QuotaExceededError` → `storageError` mostrado como `Alert` en `AppShell`.

### B6. Aislamiento de datos por propietario

`LocalDataProvider.visibleDatabase` (líneas 73–84): si `session.role === 'owner'`, se
devuelve una copia del `database` con `personas`/`farms` filtradas por `personId` + `correo`.
El estado interno **no** se recorta (las mutaciones siguen funcionando), solo la vista expuesta.

### B7. Helper de tests

```tsx
// src/test/renderWithEvaluator.tsx
export async function renderWithSession(ui: ReactNode, session: Session) {
  window.localStorage.setItem('bienestar-porcino.demo.session', JSON.stringify(session));
  const result = render(
    <MemoryRouter>
      <ToastProvider>
        <AuthProvider>
          <LocalDataProvider>
            {ui}
            <SessionReady />
          </LocalDataProvider>
        </AuthProvider>
      </ToastProvider>
    </MemoryRouter>
  );
  await screen.findByTestId('test-session-ready');   // espera a que termine loading
  return result;
}
```

**Orden de providers en tests ≠ orden en `App.tsx`**: aquí `ToastProvider` va *fuera* de
`AuthProvider` (irrelevante porque no dependen entre sí) y **no hay `BrowserRouter`**
(`MemoryRouter` en su lugar) ni `ErrorBoundary`.

### B8. Doble render en páginas con detalle

`EvaluationDetailPage` (20 KB) y `EvaluationsPage` (18 KB) son los archivos más grandes;
manejan a la vez lista, detalle, formularios y modo `Api*`. Son el caso particular donde
el patrón A1 produce archivos grandes — candidatos a partición si crecen más.

---

## C. Anti-patrones detectados (conocidos, no corregidos)

1. **`eslint-disable react-hooks/exhaustive-deps`** en `IndicatorsPage.tsx:86` — la dependencia
   `database.evaluations`/`database.farms` sí está en la lista; el comentario explica que
   `evaluationLabel` (definida en el cuerpo) no se puede serializar.
2. **Archivos > 20 KB**: `catalog.ts` (20,7 KB), `rubrics.ts` (15,9 KB), `ApiEvaluationPages.tsx`
   (25,1 KB), `PeopleFarmsPage.tsx` (27,7 KB), `pages.css` (34,3 KB).
3. **Dos fuentes de verdad de criterios** (`catalog.ts` y `rubrics.ts`) que deben mantenerse
   sincronizadas manualmente por clave de criterio.
4. **Sin validación de esquema** en `JSON.parse` de `localStorage`: la validación es manual
   campo a campo (`readAccounts()` en `AuthProvider`).
5. **`.env.example` eliminado** mientras existen referencias a `import.meta.env.MODE` y a un
   `API_BASE = '/api/v1'` **sin proxy ni variable de entorno** (proxy eliminado el 04/11 10:11).
6. **`USE_BACKEND_AUTH = false` hardcodeado** (`AuthProvider.tsx:18`): la capa de API y las 6
   páginas `Api*` (~87 KB) compilan pero son inalcanzables. Sin documentación de cómo
   reactivarlas más allá del comentario en línea.
