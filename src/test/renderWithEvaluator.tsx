import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from '../features/auth/AuthProvider';
import { LocalDataProvider } from '../data/LocalDataProvider';
import { ToastProvider } from '../components/ToastProvider';
import type { Session } from '../types';

function SessionReady() {
  const { session } = useAuth();
  return session ? <span data-testid="test-session-ready" /> : null;
}

export async function renderWithSession(ui: ReactNode, session: Session) {
  window.localStorage.setItem(
    'bienestar-porcino.demo.session',
    JSON.stringify(session)
  );
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
  await screen.findByTestId('test-session-ready', {}, { timeout: 5000 });
  return result;
}

export function renderWithEvaluator(ui: ReactNode) {
  return renderWithSession(ui, {
    email: 'evaluador@ica.gov.co',
    name: 'Evaluador de prueba',
    role: 'evaluator',
    mustChangePassword: false
  });
}

export function renderWithOwner(ui: ReactNode) {
  return renderWithSession(ui, {
    email: 'maria.rojas@example.com',
    name: 'María Fernanda Rojas',
    role: 'owner',
    personId: 'PER-001',
    mustChangePassword: false
  });
}
