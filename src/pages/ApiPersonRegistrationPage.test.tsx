import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiRequest } from '../api/client';
import { renderWithEvaluator } from '../test/renderWithEvaluator';
import { ApiPersonRegistrationPage } from './ApiPersonRegistrationPage';

vi.mock('../api/client', () => ({
  apiRequest: vi.fn()
}));

describe('registro de persona conectado al backend', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('solicita y valida el código antes de crear la persona en MariaDB', async () => {
    vi.mocked(apiRequest).mockImplementation(async (path, options) => {
      if (path === '/people/verification-codes') return { message: 'Código enviado.' };
      if (path === '/people/verification-codes/verify') {
        return { verificationToken: 'verification-proof-from-api' };
      }
      if (path === '/people' && options?.method === 'POST') {
        return { id: 'person-uuid-from-api', nombres: 'Persona registrada' };
      }
      if (path === '/people') return { items: [] };
      if (path === '/farms') return { items: [] };
      throw new Error(`Solicitud inesperada: ${path}`);
    });

    await renderWithEvaluator(<ApiPersonRegistrationPage />);
    fireEvent.change(screen.getByLabelText(/Cédula/), { target: { value: '12345678' } });
    fireEvent.change(screen.getByLabelText(/Nombres y apellidos/), {
      target: { value: 'Persona registrada' }
    });
    fireEvent.change(screen.getByLabelText(/Celular/), { target: { value: '3001234567' } });
    fireEvent.change(screen.getByLabelText(/Correo de la persona/), {
      target: { value: 'persona@example.org' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar código al correo' }));
    await waitFor(() =>
      expect(apiRequest).toHaveBeenCalledWith('/people/verification-codes', {
        method: 'POST',
        body: { email: 'persona@example.org' }
      })
    );
    fireEvent.change(screen.getByLabelText(/Código de seis dígitos/), {
      target: { value: '123456' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Verificar código' }));
    await waitFor(() =>
      expect(apiRequest).toHaveBeenCalledWith('/people/verification-codes/verify', {
        method: 'POST',
        body: { email: 'persona@example.org', code: '123456' }
      })
    );

    fireEvent.click(screen.getByRole('button', { name: 'Registrar persona en el backend' }));
    expect(await screen.findByText('person-uuid-from-api')).toBeInTheDocument();
    expect(apiRequest).toHaveBeenCalledWith('/people', {
      method: 'POST',
      body: {
        cedula: '12345678',
        nombres: 'Persona registrada',
        celular: '3001234567',
        correo: 'persona@example.org',
        verificationToken: 'verification-proof-from-api'
      }
    });
  }, 20_000);

  it('muestra cada predio como enlace a las evaluaciones de su persona responsable', async () => {
    vi.mocked(apiRequest).mockImplementation(async (path) => {
      if (path === '/people') {
        return { items: [{ id: 'person-uuid', nombres: 'María Rojas' }] };
      }
      if (path === '/farms') {
        return { items: [{ id: 'farm-uuid', nombre: 'Granja La Esperanza', personId: 'person-uuid' }] };
      }
      throw new Error(`Solicitud inesperada: ${path}`);
    });

    await renderWithEvaluator(<ApiPersonRegistrationPage />);

    const farmLink = await screen.findByRole('link', {
      name: 'Ver evaluaciones de Granja La Esperanza, responsable María Rojas'
    });
    expect(farmLink).toHaveAttribute('href', '/evaluaciones?persona=person-uuid');
  }, 20_000);
});
