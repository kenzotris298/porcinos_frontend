import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from 'react';
import type { Role, Session } from '../../types';
import { isValidEmail } from '../../utils/validation';
import { apiRequest, ApiClientError, clearApiCsrfToken } from '../../api/client';

const SESSION_KEY = 'bienestar-porcino.demo.session';

interface LoginInput {
  email: string;
  password: string;
  role: Role;
}

interface ApiUser {
  email: string;
  name: string;
  role: Role;
  personId: string | null;
  mustChangePassword: boolean;
}

function sessionFromApiUser(user: ApiUser): Session {
  return {
    email: user.email,
    name: user.name,
    role: user.role,
    ...(user.personId ? { personId: user.personId } : {}),
    mustChangePassword: user.mustChangePassword,
    authBackend: true,
    backend: true
  };
}

interface AuthContextValue {
  session: Session | null;
  loading: boolean;
  authError: string | null;
  login: (input: LoginInput) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readSession(): Session | null {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Session>;
    if (
      typeof parsed.email === 'string' &&
      typeof parsed.name === 'string' &&
      (parsed.role === 'evaluator' || parsed.role === 'owner') &&
      !(parsed.role === 'owner' && typeof parsed.personId !== 'string')
    ) {
      return {
        email: parsed.email,
        name: parsed.name,
        role: parsed.role,
        ...(typeof parsed.personId === 'string' ? { personId: parsed.personId } : {}),
        mustChangePassword: parsed.mustChangePassword === true,
        ...(parsed.authBackend === true
          ? { authBackend: true, backend: true }
          : parsed.backend === true
            ? { backend: true }
            : {})
      };
    }
    return null;
  } catch {
    return null;
  }
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function restoreSession() {
      if (import.meta.env.MODE === 'test') {
        await wait(350);
        if (active) setSession(readSession());
      } else {
        try {
          await apiRequest<{ csrfToken: string }>('/auth/csrf');
          const result = await apiRequest<{ user: {
            email: string;
            name: string;
            role: Role;
            personId: string | null;
            mustChangePassword: boolean;
          } }>('/auth/me');
          if (active) {
            setSession(sessionFromApiUser(result.user));
          }
        } catch (error) {
          if (active && (!(error instanceof ApiClientError) || error.status !== 401)) {
            setAuthError(error instanceof Error ? error.message : 'No se pudo validar la sesión.');
          }
        }
      }
      if (active) setLoading(false);
    }
    void restoreSession();
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (input: LoginInput) => {
    if (!isValidEmail(input.email)) {
      throw new Error('Escribe un correo electrónico válido.');
    }
    setAuthError(null);
    const result = await apiRequest<{ user: {
      email: string;
      name: string;
      role: Role;
      personId: string | null;
      mustChangePassword: boolean;
    } }>('/auth/login', {
      method: 'POST',
      body: { email: input.email.trim(), password: input.password }
    });
    if (result.user.role !== input.role) {
      await apiRequest<void>('/auth/logout', { method: 'POST' });
      clearApiCsrfToken();
      throw new Error('El perfil seleccionado no coincide con el rol de esta cuenta.');
    }
    setSession(sessionFromApiUser(result.user));
  }, []);

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      if (!session) throw new Error('Inicia sesión para cambiar la contraseña.');
      const minimumLength = session.authBackend ? 12 : 8;
      if (newPassword.trim().length < minimumLength) {
        throw new Error(`La nueva contraseña debe tener al menos ${minimumLength} caracteres.`);
      }
      if (newPassword === currentPassword) {
        throw new Error('La nueva contraseña debe ser diferente a la actual.');
      }
      if (!session.authBackend) {
        throw new Error('La sesión no está autenticada por el backend.');
      }
      const result = await apiRequest<{ user: {
        email: string;
        name: string;
        role: Role;
        personId: string | null;
        mustChangePassword: boolean;
      } }>('/auth/password', {
        method: 'PATCH',
        body: { currentPassword, newPassword }
      });
      setSession(sessionFromApiUser(result.user));
    },
    [session]
  );

  const logout = useCallback(async () => {
    if (session?.authBackend) {
      await apiRequest<void>('/auth/logout', { method: 'POST' });
    }
    clearApiCsrfToken();
    setSession(null);
  }, [session]);

  const value = useMemo(
    () => ({ session, loading, authError, login, changePassword, logout }),
    [session, loading, authError, login, changePassword, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return context;
}

export function roleLabel(role: Role): string {
  return role === 'evaluator' ? 'Evaluador' : 'Propietario';
}
