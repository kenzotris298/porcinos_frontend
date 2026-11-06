import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearApiCsrfToken } from '../../api/client';
import { AuthProvider, useAuth } from './AuthProvider';

function AuthProbe() {
  const { loading, session, login, changePassword, logout } = useAuth();
  return (
    <div>
      <output data-testid="auth-state">
        {loading
          ? 'loading'
          : session
            ? `${session.email}|${session.mustChangePassword ? 'required' : 'changed'}|${session.backend ? 'api' : 'local'}`
            : 'signed-out'}
      </output>
      <button
        type="button"
        onClick={() => void login({
          email: 'evaluator@example.org',
          password: 'not-a-real-password',
          role: 'evaluator'
        })}
      >
        Iniciar sesión
      </button>
      <button type="button" onClick={() => void changePassword('initial-password', 'new-strong-password')}>
        Cambiar contraseña
      </button>
      <button type="button" onClick={() => void logout()}>
        Cerrar sesión
      </button>
    </div>
  );
}

describe('autenticación API', () => {
  afterEach(() => {
    clearApiCsrfToken();
    window.localStorage.clear();
    vi.unstubAllGlobals();
  });

  it('inicia sesión con API y mantiene la sesión fuera de localStorage', async () => {
    window.localStorage.clear();
    const setItem = vi.spyOn(window.localStorage, 'setItem');
    const fetchMock = vi
      .fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ csrfToken: 'csrf-test-token' }), { status: 200 })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({
          csrfToken: 'csrf-session-token',
          user: {
            email: 'evaluator@example.org',
            name: 'Evaluador',
            role: 'evaluator',
            personId: null,
            mustChangePassword: true
          }
        }), { status: 200 })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({
          user: {
            email: 'evaluator@example.org',
            name: 'Evaluador',
            role: 'evaluator',
            personId: null,
            mustChangePassword: false
          }
        }), { status: 200 })
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);
    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId('auth-state')).toHaveTextContent('signed-out'));
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    await waitFor(() =>
      expect(screen.getByTestId('auth-state')).toHaveTextContent(
        'evaluator@example.org|required|api'
      )
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/v1/auth/login',
      expect.objectContaining({ method: 'POST', credentials: 'include' })
    );

    fireEvent.click(screen.getByRole('button', { name: 'Cambiar contraseña' }));
    await waitFor(() =>
      expect(screen.getByTestId('auth-state')).toHaveTextContent(
        'evaluator@example.org|changed|api'
      )
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      '/api/v1/auth/password',
      expect.objectContaining({ method: 'PATCH' })
    );

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
    await waitFor(() =>
      expect(screen.getByTestId('auth-state')).toHaveTextContent('signed-out')
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      '/api/v1/auth/logout',
      expect.objectContaining({ method: 'POST' })
    );
    expect(setItem).not.toHaveBeenCalled();
  });
});
