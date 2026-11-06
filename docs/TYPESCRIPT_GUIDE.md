# Guía de TypeScript

> Basada en lectura directa de `src/types/index.ts`, `src/utils/*`, `src/components/{Button,FormField,Badge,States}.tsx`
> y `tsconfig.app.json`. Las citas son literales del código actual.

---

## 1. Configuración (`tsconfig.app.json`)

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,          // ← añadido después (divipola.json)
    "verbatimModuleSyntax": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true,         // ← prohibe enums, namespaces, parámetros
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true,
    "types": ["vite/client"]
  },
  "include": ["src"]
}
```

Implicaciones prácticas verificadas:

- **`erasableSyntaxOnly: true` → NO se usan `enum` ni `namespace` en todo el proyecto.**
  Los "enums" son uniones literales (`type Role = 'evaluator' | 'owner'`).
- **`verbatimModuleSyntax: true` → los tipos se importan con `import type`.**
  Ejemplo real (`Button.tsx`): `import type { ButtonHTMLAttributes, ReactNode } from 'react';`
- **`strict: true` + `noUnusedLocals/Parameters`** → `npm run typecheck` (`tsc -b --pretty false`)
  falla por variables sin usar y por `null`/`undefined` no manejados.
- `resolveJsonModule` es la única línea añadida respecto a la versión original.

---

## 2. Inventario de `src/types/index.ts` (156 líneas, 21 exports)

### 2.1 Uniones literales (sustituyen a enums)

```ts
export type Role = 'evaluator' | 'owner';
export type ProductionSystem = 'breeding' | 'fattening' | 'full-cycle';
export type EvaluationStatus = 'En proceso' | 'Finalizada' | 'Requiere seguimiento';
export type MeasureBase = 'Recursos' | 'Animales' | 'Gestión';
export type Applicability = 'aplica' | 'no-aplica';
export type IndicatorStatus = 'Registrado' | 'Pendiente de revisión' | 'Requiere seguimiento';
export type RecommendationSource = 'plantilla_local' | 'evaluador';
```

Nota: `EvaluationStatus`, `IndicatorStatus` y `MeasureBase` usan **texto en español con
espacios y tildes** porque son valores de dominio que se muestran tal cual en la UI.
`ProductionSystem` y `Applicability` usan `kebab-case` en inglés/espagnol porque derivan
del catálogo (`features/indicators/catalog.ts`).

### 2.2 Interfaces de dominio

```ts
export interface Session {
  email: string; name: string; role: Role;
  personId?: string; mustChangePassword: boolean;
  backend?: true;              // ← literal true, marcador de modo backend
}

export interface PersonRecord {
  id: string; cedula: string; nombres: string;
  celular: string; correo: string; createdAt: string;
}

export interface Farm {
  id: string; personaId?: string;
  codigoDepartamento: string | null;    // ← null explícito, no opcional
  codigoMunicipio: string | null;
  nombre: string; departamento: string; municipio: string; vereda: string;
  responsable: string; animales: number;
  hembrasCria: number | null; animalesGordos: number | null;
  tipo: ProductionSystem;
}

export interface Evaluation {
  id: string; predioId: string; fecha: string; hora: string;
  evaluador: string; investigadorNombres: string; investigadorApellidos: string;
  observaciones: string; estado: EvaluationStatus;
  createdAt: string; updatedAt: string;
}

export interface MetricSample {
  total: number; limpios?: number; sucios?: number;
  riesgoContaminacion?: boolean; score: number;
}

export interface IndicatorRecord {
  id: string; evalId: string; metricaCatalogoId: string;
  tipo: MeasureBase; nombre: string; metodo: string; resultado: string;
  estado: IndicatorStatus; aplicabilidad: Applicability;
  puntaje: number | null;            // ← null = aún sin calificar
  observaciones: string;
  metricaDatos?: MetricSample;
  createdAt: string; updatedAt: string;
}

export interface EvidenceRecord {
  id: string; indicadorId: string; evaluationId: string;
  nombre: string; tipo: string; tamano: number;
  createdAt: string; uploadedBy: string; dataUrl?: string;
}

export interface RecommendationRecord {
  id: string; evaluationId: string; title: string;
  action?: string; text: string; source: RecommendationSource;
  createdBy: string; createdAt: string; updatedAt: string;
}

export interface RecommendationPlan {
  evaluationId: string; generatedAt: string; generatedBy: string;
  source: 'local-demo' | 'seed-demo';
}

export interface DemoDatabase {
  version: 5;                       // ← literal de tipo = control de migración
  personas: PersonRecord[]; farms: Farm[]; evaluations: Evaluation[];
  indicators: IndicatorRecord[]; evidence: EvidenceRecord[];
  recommendations: RecommendationRecord[]; recommendationPlans: RecommendationPlan[];
}

export interface LibertyScore {
  id: string; nombre: string; peso: number;
  puntuacion: number | null; indicadoresPuntuados: number;
  noAplicables: number; faltantes: string[];
}

export interface EvaluationInsights {
  evaluation: Evaluation; farm: Farm;
  indicators: IndicatorRecord[]; evidence: EvidenceRecord[];
  score: number | null; classification: string | null;
  evaluatedCriteria: number; pendingCriteria: string[];
  criteriaStatus: Array<{ id: string; nombre: string; completed: boolean; indicatorId?: string }>;
  totalCriteria: number; evidenceCount: number; liberties: LibertyScore[];
}
```

### 2.3 Convención `string | null` vs `?:`

- **`| null`** = el campo existe pero no tiene valor conocido (`Farm.codigoDepartamento`,
  `IndicatorRecord.puntaje`). Obliga a manejar el caso en la UI (`formatScore(null) → '—'`).
- **`?`** = el campo es opcional y puede faltar por completo (`EvidenceRecord.dataUrl`,
  `Session.personId`). Se propaga con `...cond ? { campo } : {}` (ver §4).

---

## 3. Convención `interface` vs `type`

| Uso | Elegido | Ejemplo real |
|---|---|---|
| Objeto con nombre (entidad, props, contexto) | **`interface`** | `interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>` |
| Unión de literales | **`type`** | `type ButtonVariant = 'primary' \| 'secondary' \| 'ghost' \| 'danger'` |
| Alias de objeto anónimo (una vez) | **`type`** | `type FieldErrors<T extends string = string> = Partial<Record<T, string>>` |
| Extender tipos de React | **`interface … extends`** | `interface FormFieldProps { … }` (no extiende, pero es el patrón de props) |

`interface` se usa también para objetos que solo existen dentro de un archivo
(`interface NavItem` en `AppShell.tsx`, `interface LoginInput` en `AuthProvider.tsx`):
**no se exportan** si ningún otro archivo los necesita.

---

## 4. Props de componentes

**Patrón real: `interface` aparte + desestructuración con defaults + `...rest`.**

`src/components/Button.tsx` (literal):

```tsx
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  className = '',
  children,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`button button--${variant} button--${size} ${className}`.trim()}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <Loader2 className="icon icon--spin" aria-hidden="true" size={17} /> : icon}
      <span>{children}</span>
    </button>
  );
}
```

Puntos clave observables:

1. `extends ButtonHTMLAttributes<HTMLButtonElement>` → hereda `onClick`, `disabled`, etc.
   sin redeclararlos. `...rest` los reenvía.
2. **`type = 'button'` por defecto** — evita el submit accidental en formularios.
3. `className = ''` + `.trim()` → nunca queda un espacio suelto en `class`.
4. `aria-busy={loading || undefined}` → `undefined` **elimina** el atributo (no pone `false`).
5. Variantes se vuelcan a clases BEM: `button--primary`, `button--sm`.

`src/components/FormField.tsx` — wrapper de label + control + mensaje:

```tsx
interface FormFieldProps {
  id: string; label: string; error?: string; hint?: string;
  required?: boolean; children: ReactNode; className?: string;
}

export function FormField({ id, label, error, hint, required, children, className = '' }: FormFieldProps) {
  const messageId = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className={`form-field ${error ? 'form-field--invalid' : ''} ${className}`.trim()}>
      <label className="form-field__label" htmlFor={id}>
        {label}
        {required ? <span className="form-field__required" aria-hidden="true"> *</span> : null}
      </label>
      {children}
      {error ? (
        <p className="form-field__message form-field__message--error" id={messageId} role="alert">{error}</p>
      ) : hint ? (
        <p className="form-field__message" id={messageId}>{hint}</p>
      ) : null}
    </div>
  );
}
```

Los controles `TextInput`, `TextArea` y `Select` comparten un truco: añaden `invalid?: boolean`
a los atributos nativos y lo traducen a clase + atributo ARIA:

```tsx
type InputProps = InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean };

export function TextInput({ invalid, className = '', ...rest }: InputProps) {
  return (
    <input
      className={`input ${invalid ? 'input--invalid' : ''} ${className}`.trim()}
      aria-invalid={invalid || undefined}
      {...rest}
    />
  );
}
```

> **Regla**: los componentes de `components/` **nunca** importan de `pages/` ni de `features/`
> (excepción: `AppShell` importa `data/LocalDataProvider` y `features/auth/AuthProvider`).

---

## 5. Estado, callbacks y contextos

### `useState` con tipo explícito solo cuando no se infiere

```tsx
// LocalDataProvider.tsx
const [initial] = useState(() => loadDatabase());          // se infiere de loadDatabase()
const [database, setDatabase] = useState<DemoDatabase>(initial.database);
const [storageError, setStorageError] = useState<string | null>(initial.error);
```

`useState(() => …)` con función inicial = lazy init (lee `localStorage` una sola vez).

### Contextos: `createContext<T | null>(null)` + hook con guardia

```tsx
interface AuthContextValue {
  session: Session | null;
  loading: boolean;
  authError: string | null;
  login: (input: LoginInput) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return context;
}
```

`null` como valor inicial **obliga** a que el hook falle ruidosamente si se usa fuera del provider.

### Callbacks estables: `useCallback` + `useMemo`

```tsx
const notify = useCallback((message: string, tone: ToastTone = 'success') => { … }, [dismiss]);
const value = useMemo(() => ({ notify }), [notify]);
```

Los tres providers envuelven su valor en `useMemo` para no re-renderizar consumidores.

### Limpieza de efectos

```tsx
// AuthProvider.tsx líneas 159–184
useEffect(() => {
  let active = true;
  async function restoreSession() { … if (active) setSession(…) … }
  void restoreSession();
  return () => { active = false; };
}, []);
```

`void restoreSession()` marca el promise como intencionadamente no capturado.
La bandera `active` evita `setState` tras unmount. **`[]` vacío = restauración única.**

### Efectos con `request` no crudo

```tsx
const recommendationGenerationLocks = useRef(new Set<string>());
```
(`LocalDataProvider.tsx` línea 71) — bloqueo de reentrada sin re-render.

---

## 6. Validación de formularios: `FieldErrors<T>`

`src/utils/validation.ts` (completo y verificado):

```ts
export type FieldErrors<T extends string = string> = Partial<Record<T, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string): boolean
export function isBlank(value: string | null | undefined): boolean
export function isScore(value: number | null | undefined): value is number   // type guard
export function isCount(value: number | null | undefined): value is number   // type guard
export function validateEvaluationDraft(draft: EvaluationDraft): FieldErrors<EvaluationField>
export function hasErrors(errors: FieldErrors): boolean
export function validateLoginDraft(draft: LoginDraft): FieldErrors<keyof LoginDraft>
```

**Patrón exacto** (literal de `validateLoginDraft`):

```ts
export function validateLoginDraft(draft: LoginDraft): FieldErrors<keyof LoginDraft> {
  const errors: FieldErrors<keyof LoginDraft> = {};
  if (!draft.email) errors.email = 'Ingresa tu correo institucional.';
  else if (!isValidEmail(draft.email)) errors.email = 'Escribe un correo electrónico válido.';
  if (!draft.password) errors.password = 'Ingresa tu contraseña.';
  else if (draft.password.length < 6) errors.password = 'La contraseña debe tener al menos 6 caracteres.';
  return errors;
}
```

Características del patrón: **vacío → mensaje de obligatoriedad; presente pero inválido →
mensaje de formato** (cadena `if/else if` por campo).

- **Un objeto, un mensaje por campo, `undefined` = sin error.**
- Se compara con `hasErrors(errors)` → `Object.keys(errors).length > 0`.
- Se renderiza con `<FormField error={errors.email}>`, que muestra `role="alert"`.
- Los mensajes están en **español y en segunda persona imperativa**: `'Selecciona el predio evaluado.'`
- `isScore`/`isCount` son **type guards** (`value is number`): al usarlas, TS estrecha el tipo.
- Números con separador de miles: `draft.observaciones.length > 2_000`.

---

## 7. Utilidades de formato (`src/utils/format.ts`)

```ts
export function formatDate(value?: string | null): string       // '03 nov. 2026' · fallback 'Sin fecha'
export function formatDateTime(value?: string | null): string   // + hora · fallback 'Sin registro'
export function formatScore(value: number | null | undefined): string  // '85,5 / 100' · '—'
export function formatNumber(value: number | null | undefined): string // '—' si no es finito
export function formatBytes(bytes: number): string             // '1,4 MB'
export function todayAsInputValue(): string                    // '2026-11-04' para <input type="date">
export function initials(name: string): string                 // 'Andrea Salazar' → 'AS' · fallback 'BP'
export function pluralize(count: number, singular: string, plural: string): string
export function errorMessage(error: unknown): string           // 'Ocurrió un error inesperado.'
export function classificationFor(score: number | null): string | null
```

- Formateadores **singleton a nivel de módulo** (fuera de la función) para no recrearlos:

```ts
const dateFormatter = new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
const numberFormatter = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 });
```

- **Todo formateador acepta `null`/`undefined` y devuelve un string legible** (`'—'`, `'Sin fecha'`).
  Ninguna página necesita `?.` para mostrar un valor potencialmente ausente.
- `parseDate` distingue `YYYY-MM-DD` (le agrega `T00:00:00`) de ISO completo.
- `classificationFor`: `≥90 Excelente bienestar`, `≥75 Alto`, `≥50 Medio`, resto `Bajo`.

`src/utils/file.ts`: `validateLoginDraft` reexportado/consumido por tests (`file.test.ts` usa
`'demo@ica.gov.co'` / `'demo1234'`).

---

## 8. Manejo de errores en tiempo de ejecución

```ts
// api/client.ts
export class ApiClientError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
  }
}
```

- **Clase con `readonly` y `this.name`** — patrón estándar para errores tipados.
- Consumidores distinguen: `error instanceof ApiClientError && error.status === 401`.
- Fuera del cliente: `errorMessage(error: unknown)` en `format.ts` hace el narrowing.
- Dominio: `requireEvaluator(role)` lanza `Error` con mensaje en español
  (`'Esta acción está disponible solo para evaluadores.'`).

---

## 9. Comprobación de calidad

```bash
npm run typecheck   # tsc -b --pretty false
npm test            # vitest run   → 16 archivos, 65 tests
npm run build       # tsc -b && vite build
```

`build` ejecuta `tsc -b` **antes** de Vite: un error de tipos rompe el build, no solo el editor.
