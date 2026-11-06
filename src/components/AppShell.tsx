import {
  BookOpen,
  ClipboardList,
  Images,
  LayoutDashboard,
  ListChecks,
  LockKeyhole,
  LogOut,
  Menu,
  Sparkles,
  UsersRound,
  X,
  type LucideIcon
} from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Alert } from '../components/Alert';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';
import { Button } from '../components/Button';
import { FormField, TextInput } from '../components/FormField';
import { useLocalData } from '../data/LocalDataProvider';
import { initials } from '../utils/format';
import { roleLabel, useAuth } from '../features/auth/AuthProvider';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

const EVALUATOR_NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Panel del evaluador', icon: LayoutDashboard, end: true },
  { to: '/evaluaciones', label: 'Evaluaciones', icon: ClipboardList },
  { to: '/personas-predios', label: 'Personas y predios', icon: UsersRound },
  { to: '/indicadores', label: 'Indicadores', icon: ListChecks },
  { to: '/evidencias', label: 'Evidencias', icon: Images },
  { to: '/recomendaciones', label: 'Planes de mejora', icon: Sparkles },
  { to: '/metodologia', label: 'Metodología', icon: BookOpen }
];

const OWNER_NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Mi panel', icon: LayoutDashboard, end: true },
  { to: '/evaluaciones', label: 'Mis evaluaciones', icon: ClipboardList },
  { to: '/indicadores', label: 'Mis indicadores', icon: ListChecks },
  { to: '/evidencias', label: 'Mis evidencias', icon: Images },
  { to: '/recomendaciones', label: 'Mis planes de mejora', icon: Sparkles },
  { to: '/metodologia', label: 'Metodología', icon: BookOpen }
];

export function AppShell() {
  const { session, logout } = useAuth();
  const { storageError, dismissStorageError } = useLocalData();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const [passwordOpen, setPasswordOpen] = useState(false);
  if (!session) return null;

  const navItems = session.role === 'owner' ? OWNER_NAV_ITEMS : EVALUATOR_NAV_ITEMS;

  async function handleLogout() {
    setLoggingOut(true);
    setLogoutError(null);
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (error) {
      setLogoutError(error instanceof Error ? error.message : 'No se pudo cerrar la sesión.');
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <div className="app">
      <a className="skip-link" href="#contenido">
        Saltar al contenido
      </a>

      {menuOpen ? (
        <button
          type="button"
          className="sidebar-scrim"
          aria-label="Cerrar menú"
          onClick={() => setMenuOpen(false)}
        />
      ) : null}
      {logoutError ? (
        <div className="app__alert">
          <Alert tone="danger">{logoutError}</Alert>
        </div>
      ) : null}

      <aside className={`app-sidebar ${menuOpen ? 'is-open' : ''}`}>
        <div className="app-sidebar__brand">
          <span className="brand-mark brand-mark--light">
            <img src="/brand/logo-mark.svg" width="25" height="25" alt="" />
          </span>
          <div>
            <p className="app-sidebar__name">Bienestar Porcino</p>
            <p className="app-sidebar__entity">ICA · Evaluación EBA</p>
          </div>
          <button
            type="button"
            className="icon-button icon-button--light app-sidebar__close"
            onClick={() => setMenuOpen(false)}
            aria-label="Cerrar menú"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="app-nav" aria-label="Navegación principal">
          <p className="app-nav__label">Operación</p>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `app-nav__link ${isActive ? 'is-active' : ''}`}
              onClick={() => setMenuOpen(false)}
            >
              <item.icon size={19} aria-hidden="true" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="app-sidebar__footer">
          <div className="session-card">
            <span className="avatar" aria-hidden="true">
              {initials(session.name)}
            </span>
            <div className="session-card__info">
              <p className="session-card__name">{session.name}</p>
              <p className="session-card__email">{session.email}</p>
              <Badge tone={session.role === 'evaluator' ? 'success' : 'info'}>
                {roleLabel(session.role)}
              </Badge>
            </div>
          </div>
          <div className="app-sidebar__actions">
            <button
              type="button"
              className="sidebar-action"
              onClick={() => setPasswordOpen(true)}
            >
              <LockKeyhole size={15} aria-hidden="true" />
              Cambiar contraseña
            </button>
            <button
              type="button"
              className="sidebar-action sidebar-action--danger"
              onClick={handleLogout}
              disabled={loggingOut}
            >
              <LogOut size={15} aria-hidden="true" />
              {loggingOut ? 'Saliendo…' : 'Cerrar sesión'}
            </button>
          </div>
        </div>
      </aside>

      <div className="app__content">
        <header className="topbar">
          <button
            type="button"
            className="icon-button topbar__menu"
            onClick={() => setMenuOpen(true)}
            aria-label="Abrir menú"
            aria-expanded={menuOpen}
          >
            <Menu size={21} />
          </button>
          <div className="topbar__title">
            <span className="topbar__dot" aria-hidden="true" />
            <span>Sistema de evaluación de bienestar animal</span>
          </div>
          <div className="topbar__right">
            <Badge tone="neutral">Sesión activa</Badge>
            <span className="topbar__role">{roleLabel(session.role)}</span>
          </div>
        </header>

        {!session.backend && storageError ? (
          <div className="app__alert">
            <Alert
              tone="warning"
              title="No se pudieron guardar los últimos cambios"
              actions={
                <button type="button" className="text-button" onClick={dismissStorageError}>
                  Entendido
                </button>
              }
            >
              {storageError}
            </Alert>
          </div>
        ) : null}

        <main className="app-main" id="contenido">
          <Outlet />
        </main>

        <footer className="app-footer">
          <p>Sistema de gestión y seguimiento del bienestar porcino.</p>
          <p>Los resultados son operativos y no equivalen a una certificación oficial ICA.</p>
        </footer>
      </div>

      <PasswordChangeDialog
        open={passwordOpen || Boolean(session.mustChangePassword)}
        onClose={() => setPasswordOpen(false)}
      />
    </div>
  );
}

function PasswordChangeDialog({
  open,
  onClose
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { session, changePassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const required = Boolean(session?.mustChangePassword);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const minimumLength = session?.authBackend ? 12 : 8;
    if (newPassword.length < minimumLength) {
      setError(`La nueva contraseña debe tener al menos ${minimumLength} caracteres.`);
      return;
    }
    if (newPassword !== confirmation) {
      setError('La confirmación no coincide con la nueva contraseña.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmation('');
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo cambiar la contraseña.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      title={required ? 'Cambia tu contraseña temporal' : 'Cambiar contraseña'}
      description={
        required
          ? 'Debes crear una contraseña personal antes de acceder al sistema.'
          : 'Actualiza la contraseña de tu cuenta.'
      }
      onClose={() => {
        if (!required && !saving) onClose();
      }}
      footer={
        <Button type="submit" form="password-change-form" loading={saving}>
          Guardar contraseña
        </Button>
      }
    >
      <form id="password-change-form" className="form" onSubmit={submit}>
        {error ? <Alert tone="danger">{error}</Alert> : null}
        <FormField id="current-password" label="Contraseña actual" required>
          <TextInput
            id="current-password"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
          />
        </FormField>
        <FormField
          id="new-password"
          label="Nueva contraseña"
          hint={`Mínimo ${session?.authBackend ? 12 : 8} caracteres.`}
          required
        >
          <TextInput
            id="new-password"
            type="password"
            autoComplete="new-password"
            minLength={session?.authBackend ? 12 : 8}
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
          />
        </FormField>
        <FormField id="confirm-password" label="Confirmar nueva contraseña" required>
          <TextInput
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
          />
        </FormField>
      </form>
    </Modal>
  );
}
