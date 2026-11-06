# Guía de CSS

> Basada en lectura directa de los 5 archivos de `src/styles/` y de `index.html`.
> **No hay framework CSS**: no existen `tailwindcss`, `postcss`, `sass` ni `styled-components`
> en `package.json`, ni `tailwind.config.*`/`postcss.config.*` en el repo.

---

## 1. Archivos y orden de importación

Solo **5 archivos CSS** en todo el proyecto, todos en `src/styles/`:

| Archivo | Tamaño actual | Contenido |
|---|---|---|
| `global.css` | 14 497 B | `@import`s + `:root` + reset + tipografía + **controles compartidos** (forms, alert, badge, state-panel) |
| `layout.css` | 13 820 B | login, app shell (sidebar/topbar/main), modal, toast, footer |
| `pages.css` | 34 261 B | estilos específicos de páginas (stats, cards, tablas, filtros, detalle) |
| `modules.css` | 13 610 B | módulos reutilizables: evidencias, recomendaciones, metodología |
| `responsive.css` | 6 123 B | los 6 breakpoints + `prefers-reduced-motion` |

**Orden exacto de `src/styles/global.css` líneas 1–4:**

```css
@import './layout.css';
@import './pages.css';
@import './modules.css';
@import './responsive.css';
```

`responsive.css` va **siempre al final** para que sus reglas ganen por orden de aparición
(misma especificidad). Este orden es **idéntico en la versión original y en la actual**.

**Único punto de entrada** (verificado con grep en `src/**/*.tsx`):

```tsx
// src/main.tsx línea 4
import './styles/global.css';
```

Ningún otro `.tsx` importa CSS. Toda la aplicación se estiliza desde ese único `@import` en cadena.

---

## 2. Variables `:root` (`global.css` líneas 11–66)

```css
:root {
  color-scheme: light;

  /* Marca — escala verde institucional */
  --brand-950: #07261f;   --brand-900: #0b3a31;   --brand-800: #10493d;
  --brand-700: #14594b;   --brand-600: #1a6f5d;   --brand-500: #268a74;
  --brand-400: #4aa88f;   --brand-200: #b7ded2;   --brand-100: #dcefe8;
  --brand-50:  #f0f8f4;

  /* Acento (ámbar) */
  --accent: #c98a2b;  --accent-soft: #fdf3df;  --accent-line: #efd8ac;

  /* Texto */
  --ink: #182b26;  --ink-strong: #0e201b;
  --muted: #5d716a;  --muted-soft: #86958f;

  /* Líneas */
  --line: #dfe8e3;  --line-strong: #cad9d2;

  /* Superficies */
  --surface: #ffffff;  --surface-soft: #f7faf8;  --bg: #f2f6f4;

  /* Semánticos: color + fondo + borde, siempre los tres */
  --danger:  #b42318;  --danger-soft:  #fdecea;  --danger-line:  #f3c9c4;
  --warning: #a16207;  --warning-soft: #fef6e4;  --warning-line: #f0dcb0;
  --success: #1c7a4b;  --success-soft: #e8f6ee;  --success-line: #bfe5cd;
  --info:    #2563a8;  --info-soft:    #eaf2fb;  --info-line:    #c5daf1;

  /* Sombras */
  --shadow-sm: 0 1px 2px rgba(15, 40, 32, 0.06);
  --shadow-md: 0 14px 34px -20px rgba(10, 40, 32, 0.38);
  --shadow-lg: 0 32px 64px -32px rgba(8, 35, 28, 0.45);

  /* Radios */
  --radius-sm: 8px;  --radius: 14px;  --radius-lg: 22px;

  /* Layout */
  --sidebar-width: 278px;  --max-width: 1220px;

  --font-sans: 'Segoe UI', 'Inter', system-ui, -apple-system, 'Helvetica Neue', Arial, sans-serif;
}
```

**Reglas derivadas:**

1. **Nunca se escribe un color literal en una clase**; siempre `var(--…)` o
   `rgba(...)` derivado de la marca (p. ej. `rgba(255,255,255,0.1)` en bordes sobre sidebar).
2. Cada semántico tiene **trío** (`--x`, `--x-soft`, `--x-line`) → fondos, bordes y texto
   consistentes sin recalcular.
3. `--radius` (14px) es el valor por defecto de tarjetas; `--radius-sm` para controles,
   `--radius-lg` para paneles grandes.
4. Reset mínimo: `box-sizing: border-box` universal, `body { margin: 0; min-width: 320px; }`,
   `html { scroll-behavior: smooth; }`.

---

## 3. Convención de nombres: BEM

Uso estricto de BEM con **modificadores `--` y estados `is-`/`:state`**.

| Tipo | Formato | Ejemplos reales |
|---|---|---|
| Bloque | `.bloque` | `.card`, `.badge`, `.alert`, `.toast`, `.modal`, `.dropzone` |
| Elemento | `.bloque__elemento` | `.form-field__label`, `.card__header`, `.evidence-card__preview`, `.topbar__title` |
| Modificador de variante | `.bloque--variante` | `.button--primary`, `.badge--success`, `.input--invalid`, `.state-panel--error` |
| Estado (clase) | `.is-*` | `.app-sidebar.is-open` |
| Estado (pseudo) | `:hover :focus :disabled :not(:disabled)` | `.input:hover:not(:disabled)` |
| Utilidad | `.icon--spin` | en `<Loader2 className="icon icon--spin" />` |

**Ejemplo literal** (`global.css`):

```css
.form-field { display: flex; flex-direction: column; gap: 0.4rem; }
.form-field__label { font-size: 0.82rem; font-weight: 650; color: var(--ink); }
.form-field__required { color: var(--danger); }
.form-field--invalid .form-field__label { color: var(--danger); }
.form-field__message { margin: 0; font-size: 0.76rem; color: var(--muted); }
.form-field__message--error { color: var(--danger); }
```

**La clase compuesta en el componente TSX siempre se genera concatenando** (nunca `clsx`):

```tsx
className={`button button--${variant} button--${size} ${className}`.trim()}
className={`form-field ${error ? 'form-field--invalid' : ''} ${className}`.trim()}
className={`input ${invalid ? 'input--invalid' : ''} ${className}`.trim()}
```

`.trim()` evita el espacio suelto cuando `className` está vacío. **No hay librería de classNames.**

### Secciones por archivo (comentarios de cabecera reales)

- `pages.css`: `/* Estadísticas */`, `/* Tarjetas */`, `/* Tablero */`, `/* Filtros */`,
  `/* Evaluaciones */`, `/* Detalle de evaluación */`, `/* Tablas */`, `/* Formulario de indicador */`
- `modules.css`: `/* Evidencias */`, `/* Recomendaciones */`, `/* Metodología */`
- Cada archivo abre con `/* ====== Bienestar Porcino · ICA ====== */`

---

## 4. Layout: sidebar + topbar + main

`layout.css`. Es **`position: fixed` + `margin-left`**, no grid de página:

```css
.app { min-height: 100vh; background: var(--bg); }

.app-sidebar {
  position: fixed;
  inset: 0 auto 0 0;              /* top right bottom left → pegado a la izquierda */
  z-index: 60;
  display: flex;
  flex-direction: column;
  width: var(--sidebar-width);    /* 278px */
  padding: 1.25rem 1rem;
  overflow-y: auto;
  background: linear-gradient(180deg, #0b3a31, #072b24);
  color: #fff;
}

.app__content {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  margin-left: var(--sidebar-width);   /* compensa el sidebar fixed */
}

.topbar {
  position: sticky;
  top: 0;
  z-index: 40;
  display: flex;
  align-items: center;
  gap: 0.9rem;
  min-height: 64px;
  padding: 0.8rem clamp(1.1rem, 3vw, 2.2rem);
  border-bottom: 1px solid var(--line);
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
}

.app-main {
  flex: 1;
  width: 100%;
  max-width: var(--max-width);          /* 1220px, centrado */
  margin: 0 auto;
  padding: 1.55rem clamp(1.1rem, 3vw, 2.2rem) 2.4rem;
}
```

- **`clamp(1.1rem, 3vw, 2.2rem)`** es el espaciado lateral fluido usado en `.topbar`,
  `.app-main`, `.app__alert` y `.app-footer` — no hay variables de espaciado.
- `.app__content` es **flex column**: topbar arriba, `.app-main` con `flex: 1`, footer abajo.
- `z-index` en escala fija: sidebar `60`, scrim `55`, topbar `40`, `skip-link` `300`.
- `.skip-link` (línea 458): `position: absolute; top: -60px` → `top: 1rem` al recibir foco.
- El **login** es aparte: `.login { display: grid; grid-template-columns: minmax(0,1.06fr) minmax(0,0.94fr); }`.

---

## 5. Grids de páginas

| Clase | Definición | Columnas |
|---|---|---|
| `.stats-grid` | `repeat(4, minmax(0, 1fr)); gap: 0.95rem` | 4 (KPIs del panel) |
| `.stats-grid--three` | `repeat(3, minmax(0, 1fr))` | 3 |
| `.dashboard-grid` / `--two` | columnas de 2 (en `pages.css:202`) | 2 |
| `.evaluation-grid` | `auto-fill, minmax(290px, 1fr)` | fluida |
| `.form-grid` / `--two` / `--three` | 2 y 3 columnas para formularios | 2–3 |
| `.evidence-grid` | grid de tarjetas de evidencia | fluida |
| `.people-farms-grid` | 2 columnas personas/predios | 2 |
| `.data-table` | tabla con `min-width: 680px` (scroll en móvil) | — |

**`minmax(0, 1fr)` en todas partes** — evita el desbordamiento clásico de `1fr` con contenido ancho.
Los modificadores son **clases, no variantes de componente**: `.stats-grid stats-grid--three` en el TSX.

---

## 6. Responsive — 6 breakpoints (todos en `responsive.css`)

| Breakpoint | Qué cambia |
|---|---|
| **`max-width: 1180px`** | `.stats-grid` 4 → 2 columnas; `.evaluation-grid` → `auto-fill minmax(290px,1fr)` |
| **`max-width: 1080px`** | `.dashboard-grid`, `.dashboard-grid--two`, `.people-farms-grid`, `.recent-activity__layout`, `.methodology-grid` → **1 columna** |
| **`max-width: 980px`** | **Colapso del sidebar**: `.app-sidebar { transform: translateX(-100%) }` → `.is-open { translateX(0) }`; aparece `.app-sidebar__close` y `.sidebar-scrim`; `.app__content { margin-left: 0 }`; `.topbar__menu { display: inline-flex }`; login a 1 columna y `.login__brand { display: none }` |
| **`max-width: 820px`** | `.stats-grid--three` → 2 col; `.hero-card` y `.detail-hero` → `flex-direction: column`; `.evaluation-row` reduce a 4 columnas y oculta el primer badge; `.context-banner__controls` a ancho completo |
| **`max-width: 720px`** | **Todo a 1 columna**: `.stats-grid`, `.form-grid*`, `.evaluation-grid`, `.evidence-grid`; `.page-header__actions` a ancho completo con botones `flex: 1`; modal pasa a hoja inferior (`.modal-backdrop { align-items: flex-end }`); `.toast-region` a ancho completo; se oculta `.evaluation-row__chevron` y `.weight-row__bar` |
| **`max-width: 520px`** | Ajustes finos: topbar/main con `padding 0.9rem`; se ocultan `.topbar__title span:last-child` y `.topbar__right .badge`; `.role-switch` a 1 columna; `.score-ring` 112px; `.data-table { min-width: 680px }` (scroll horizontal); `.card { padding: 1rem }` |

**Enfoque**: **mobile-last**. El CSS base es desktop; cada `@media` va *desmontando*
complejidad al bajar de tamaño. No existe `min-width` en todo el archivo — solo `max-width`
(encadenados de mayor a menor) más la regla de movimiento.

### Accesibilidad de movimiento (línea 389)

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    scroll-behavior: auto !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 7. Animaciones

**4 keyframes, todos en `global.css` (líneas 183–212):**

```css
@keyframes spin   { to { transform: rotate(360deg); } }     /* .icon--spin — Loader2 */
@keyframes pulse  { … }                                      /* .skeleton / indicador cargando */
@keyframes modal-in { … }                                    /* .modal */
@keyframes toast-in { … }                                    /* .toast */
```

- `spin` se consume con `.icon--spin` (los `Loader2` de `Button` y `LoadingState`).
- Transiciones cortas y localizadas: `transition: color 0.16s ease` (`.back-link`),
  `transition: top 0.15s ease` (`.skip-link`), `transition: transform 0.25s ease` (sidebar móvil).
- No hay animación JS; todo es CSS.

---

## 8. Controles de formulario (`global.css`)

```css
.form-grid         { display: grid; gap: 1rem; grid-template-columns: repeat(2, minmax(0,1fr)); }
.form-grid--two    { … }   /* 2 col */
.form-grid--three  { … }   /* 3 col */

.input {
  width: 100%;
  padding: 0.68rem 0.8rem;
  border: 1px solid var(--line-strong);
  border-radius: var(--radius-sm);      /* 8px */
  background: var(--surface);
  font: inherit;
  color: var(--ink);
}
.input:hover:not(:disabled) { border-color: var(--brand-400); }
.input:focus                { border-color: var(--brand-500); box-shadow: 0 0 0 3px var(--brand-100); outline: none; }
.input:disabled             { background: var(--surface-soft); color: var(--muted-soft); cursor: not-allowed; }
.input--invalid:hover       { border-color: var(--danger); }
.input--invalid:focus       { box-shadow: 0 0 0 3px var(--danger-soft); border-color: var(--danger); }
.input--textarea            { min-height: 96px; resize: vertical; }
.input--select              { appearance: none; … }
```

Variantes: `.input--invalid`, `.input--textarea`, `.input--select`, `.input-with-icon`
(contenedor con SVG a la izquierda y acción a la derecha).

---

## 9. Estados y feedback

```css
/* Estados de página (States.tsx) */
.state-panel            { display: flex; flex-direction: column; align-items: center; text-align: center; … }
.state-panel--empty     { color: var(--muted); }
.state-panel--error     { … }
.state-panel__icon--danger { color: var(--danger); }
.state-panel[role='status'] { … }

/* Alertas (Alert.tsx) — 4 tonos con el trío color/soft/line */
.alert--info  { background: var(--info-soft);  border-color: var(--info-line);  color: var(--info); }
.alert--success { … var(--success-soft) … }
.alert--warning { … var(--warning-soft) … }
.alert--danger  { … var(--danger-soft) … }

/* Badges (Badge.tsx) — 6 tonos */
.badge--neutral | --success | --warning | --danger | --info | --accent
```

Cada tono de badge/alerta **siempre** se declara con los tres tokens
(`--x`, `--x-soft`, `--x-line`) para que el texto, el fondo y el borde coincidan.

---

## 10. Cómo añadir estilos nuevos (checklist)

1. **Elegir archivo**: utilidad/compartido → `global.css`; estructura de página → `layout.css`;
   específico de una pantalla → `pages.css`; módulo reutilizable → `modules.css`;
   adaptación de tamaño → `responsive.css` (siempre el último `@media` de la cadena).
2. **Usar solo variables** de `:root`. Si hace falta un color nuevo, añadirlo a `:root` primero.
3. **Nombrar en BEM**: `.bloque`, `.bloque__elemento`, `.bloque--modificador`.
4. **Grid con `minmax(0, 1fr)`** para evitar desbordes.
5. **Añadir regla responsive** en `responsive.css` si el componente debe apilarse;
   respetar la cadena 1180 → 1080 → 980 → 820 → 720 → 520.
6. **No importar CSS desde el componente** — todo entra por `main.tsx`.
7. **No usar librerías de clases**: concatenar y `.trim()`.
