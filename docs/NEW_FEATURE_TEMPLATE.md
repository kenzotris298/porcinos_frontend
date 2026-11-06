# Plantilla para una nueva funcionalidad

> Guía práctica derivada de los patrones **reales** del código. Cada bloque imita una
> implementación existente (citada). Sustituye `recurso` por el nombre en singular
> del dominio (`lote`, `vacuna`, `visita`, …).

---

## 0. Checklist previo

- [ ] ¿Dónde vive el estado? → `data/LocalDataProvider.tsx` (datos de dominio) o `useState` local (UI).
- [ ] ¿Necesita backend? → si sí, crear `src/api/`/`pages/Api*` y bifurcar por `session.backend` (patrón A1).
- [ ] ¿Es visible para `owner`? → revisar `visibleDatabase` en `LocalDataProvider`.
- [ ] ¿Es acción exclusiva del evaluador? → `requireEvaluator(session.role)` (ya existe).
- [ ] ¿Se puede romper en móvil? → añadir regla en `responsive.css`.

---

## 1. Tipos — `src/types/index.ts`

Añade al **final** del archivo (allí viven los 21 exports; no crear archivos `types/*.ts`).

```ts
// ── Recursos ─────────────────────────────────────────────
export type RecursoEstado = 'Activo' | 'Inactivo' | 'Pendiente';

export interface RecursoRecord {
  id: string;
  evaluationId: string;        // id en snake/kebab según dominio, aquí camelCase
  nombre: string;
  detalle: string;
  estado: RecursoEstado;
  puntaje: number | null;      // null = aún sin calificar
  createdAt: string;
  updatedAt: string;
}

// Amplía DemoDatabase (mantén `version` en incremento si cambia la forma)
export interface DemoDatabase {
  version: 6;                  // ← solo si cambias la estructura
  …
  recursos: RecursoRecord[];
}
```

Reglas: `interface` para objetos, `type` para uniones; `string | null` = "existe pero vacío",
`?` = "puede faltar"; `createdAt`/`updatedAt` en **ISO string**.

---

## 2. Datos semilla — `src/data/seed.ts`

```ts
// Dentro de createSeedDatabase()
recursos: [
  {
    id: 'rec-001',
    evaluationId: 'ev-001',
    nombre: 'Ejemplo de recurso',
    detalle: 'Descripción…',
    estado: 'Activo',
    puntaje: null,
    createdAt: SEED_NOW,
    updatedAt: SEED_NOW
  }
]
```

---

## 3. Mutación en el provider — `src/data/LocalDataProvider.tsx`

```ts
// 1) Input type junto a los demás (líneas 25–33)
export type RecursoInput = Omit<RecursoRecord, 'id' | 'createdAt' | 'updatedAt'>;

// 2) Añadir a LocalDataContextValue
interface LocalDataContextValue {
  …
  saveRecurso: (input: RecursoInput, id?: string) => RecursoRecord;
  deleteRecurso: (id: string) => void;
}

// 3) Implementación dentro de LocalDataProvider (usa now(), newId(), setDatabase)
const saveRecurso = useCallback((input: RecursoInput, id?: string): RecursoRecord => {
  const timestamp = now();
  const existing = id ? database.recursos.find((item) => item.id === id) : undefined;
  const record: RecursoRecord = existing
    ? { ...existing, ...input, updatedAt: timestamp }
    : { …input, id: newId('rec'), createdAt: timestamp, updatedAt: timestamp };
  setDatabase((current) => ({
    …current,
    recursos: existing
      ? current.recursos.map((item) => (item.id === record.id ? record : item))
      : [record, …current.recursos]
  }));
  return record;
}, [database.recursos]);
```

**Si el recurso pertenece a un rol**, copia el guardián existente:

```ts
requireEvaluator(session?.role);   // 'Esta acción está disponible solo para evaluadores.'
```

---

## 4. Formulario — `src/features/recurso/RecursoForm.tsx`

```tsx
import { useState } from 'react';
import { Button } from '../../components/Button';
import { FormField, TextInput } from '../../components/FormField';
import { Modal } from '../../components/Modal';
import { hasErrors, isBlank, type FieldErrors } from '../../utils/validation';
import type { RecursoInput } from '../../data/LocalDataProvider';

interface Draft { nombre: string; detalle: string }

function validate(draft: Draft): FieldErrors<keyof Draft> {
  const errors: FieldErrors<keyof Draft> = {};
  if (isBlank(draft.nombre)) errors.nombre = 'Ingresa el nombre del recurso.';
  if (draft.detalle.length > 2_000) errors.detalle = 'El detalle no puede superar 2.000 caracteres.';
  return errors;
}

export function RecursoForm({ open, initial, onSubmit, onClose }: {
  open: boolean;
  initial?: RecursoInput;
  onSubmit: (input: RecursoInput) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<Draft>({ nombre: initial?.nombre ?? '', detalle: initial?.detalle ?? '' });
  const [errors, setErrors] = useState<FieldErrors<keyof Draft>>({});

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const found = validate(draft);
    setErrors(found);
    if (hasErrors(found)) return;
    onSubmit({ …draft, evaluationId: initial?.evaluationId ?? '', estado: 'Pendiente', puntaje: null });
  }

  return (
    <Modal open={open} title="Nuevo recurso" onClose={onClose}
      footer={<>
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button variant="primary" onClick={handleSubmit}>Guardar</Button>
      </>}>
      <form className="form-grid" onSubmit={handleSubmit} noValidate>
        <FormField id="recurso-nombre" label="Nombre" required error={errors.nombre}>
          <TextInput
            id="recurso-nombre"
            value={draft.nombre}
            invalid={Boolean(errors.nombre)}
            onChange={(e) => { setDraft({ …draft, nombre: e.target.value }); setErrors({ ...errors, nombre: undefined }); }}
          />
        </FormField>
        …
      </form>
    </Modal>
  );
}
```

Checklist del formulario (todo literal de formularios existentes):
`noValidate` · `event.preventDefault()` primero · validar → `hasErrors` → abortar ·
`invalid={Boolean(errors.campo)}` · limpiar el error de ese campo al escribir ·
`FormField error/hint/required` · botón principal **al final del `footer` del Modal**.

---

## 5. Página — `src/pages/RecursosPage.tsx`

```tsx
import { useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { Alert } from '../components/Alert';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { TextInput } from '../components/FormField';
import { ConfirmDialog } from '../components/Modal';
import { PageHeader, StatCard } from '../components/PageHeader';
import { EmptyState, ErrorState } from '../components/States';
import { useToast } from '../components/ToastProvider';
import { useLocalData } from '../data/LocalDataProvider';
import { useAuth } from '../features/auth/AuthProvider';
import { formatDate } from '../utils/format';
import type { RecursoRecord } from '../types';

export function RecursosPage() {
  const { session } = useAuth();
  if (session?.backend) return <ApiRecursosPage />;   // solo si hay implementación API
  return <LocalRecursosPage />;
}

function LocalRecursosPage() {
  const { database, saveRecurso, deleteRecurso } = useLocalData();
  const { notify } = useToast();
  const [search, setSearch] = useState('');
  const [deleting, setDeleting] = useState<RecursoRecord | null>(null);

  const recursos = useMemo(
    () => [...database.recursos].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [database.recursos]
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return recursos.filter((r) => !term || r.nombre.toLowerCase().includes(term));
  }, [recursos, search]);

  const hasFilters = Boolean(search);

  return (
    <>
      <PageHeader
        title="Recursos"
        description="Seguimiento de recursos de la evaluación."
        actions={<Button icon={<Plus size={16} />} onClick={openCreate}>Nuevo recurso</Button>}
      />

      <div className="stats-grid">
        <StatCard label="Total" value={recursos.length} />
        …
      </div>

      <div className="filters-bar">
        <div className="search-box">
          <Search size={16} aria-hidden="true" />
          <TextInput
            type="search"
            value={search}
            placeholder="Buscar recurso…"
            aria-label="Buscar recurso"
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        {hasFilters ? <Button variant="ghost" onClick={() => setSearch('')}>Limpiar</Button> : null}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={hasFilters ? 'Sin resultados' : 'Aún no hay recursos'}
          description={hasFilters ? 'Ajusta la búsqueda.' : 'Registra el primer recurso.'}
          action={<Button onClick={openCreate}>Crear recurso</Button>}
        />
      ) : (
        <ul>… </ul>
      )}

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Eliminar recurso"
        message="Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        onConfirm={() => { deleteRecurso(deleting!.id); notify('Recurso eliminado.', 'success'); setDeleting(null); }}
        onClose={() => setDeleting(null)}
      />
    </>
  );
}
```

Estados **obligatorios** en toda página: **carga** (`PageLoading`), **vacío** (`EmptyState`),
**error** (`ErrorState` con `onRetry`), **lista**.

---

## 6. Ruta — `src/App.tsx`

```tsx
import { RecursosPage } from './pages/RecursosPage';
…
<Route path="recursos" element={<RecursosPage />} />
```

Y en `src/components/AppShell.tsx`, dentro de `EVALUATOR_NAV_ITEMS` / `OWNER_NAV_ITEMS`
(y del arreglo dinámico de `session.backend`, línea 62):

```ts
{ to: '/recursos', label: 'Recursos', icon: FolderOpen },        // evaluador
{ to: '/recursos', label: 'Mis recursos', icon: FolderOpen },     // owner
```

Iconos: **solo `lucide-react`**, importados por nombre en el `import` superior de `AppShell`.

---

## 7. Estilos — `src/styles/pages.css` (o `modules.css`)

```css
/* Recursos ------------------------------------------------ */
.recurso-list { display: flex; flex-direction: column; gap: 0.75rem; }
.recurso-card {
  display: flex; align-items: center; gap: 0.9rem;
  padding: 1rem 1.1rem;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--surface);
  box-shadow: var(--shadow-sm);
}
.recurso-card__title { margin: 0; font-size: 0.95rem; color: var(--ink-strong); }
```

Reglas: sección comentada con `/* Recursos ----… */` · **solo variables `var(--…)`** ·
`minmax(0, 1fr)` en grids · responsive en `responsive.css` con la cadena 1180→520.

---

## 8. Test — `src/pages/RecursosPage.test.tsx`

```tsx
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderWithEvaluator } from '../test/renderWithEvaluator';
import { RecursosPage } from './RecursosPage';

describe('RecursosPage', () => {
  it('muestra el estado vacío cuando no hay recursos', async () => {
    await renderWithEvaluator(<RecursosPage />);
    expect(screen.getByText('Aún no hay recursos')).toBeInTheDocument();
  });

  it('filtra por término de búsqueda', async () => {
    await renderWithEvaluator(<RecursosPage />);
    await userEvent.type(screen.getByLabelText('Buscar recurso'), 'cerdo');
    …
  });
});
```

Convenciones de test reales:
- `describe` en español con el nombre de la página; `it` en tercera persona.
- **`await renderWithEvaluator(...)`** (nunca `render` crudo) — espera a que la sesión esté lista.
- Accesos por **rol** (`getByRole`, `getByLabelText`), no por clase CSS.
- `beforeEach` con `window.localStorage.removeItem(STORAGE_KEY)` si se siembra datos
  (ver `PeopleFarmsPage.test.tsx`).

---

## 9. Verificación final

```bash
cd frontend
npm run typecheck   # 0 errores
npm test            # 16+ archivos, todos en verde
npm run build       # tsc -b && vite build
```

Y revisión manual: `npm run dev` → probar en 1280px, 980px (sidebar colapsado) y 520px.
