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
    fireEvent.change(screen.getByLabelText(/Cédula/, { selector: '#api-person-cedula' }), {
      target: { value: '12345678' }
    });
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
    expect(screen.getByLabelText(/Cédula de la persona responsable/)).toHaveValue('12345678');
    expect(screen.getByLabelText(/^Persona responsable$/)).toHaveValue('Persona registrada');
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

  it('vincula el predio usando una cédula registrada y muestra las tarjetas tras guardarlo', async () => {
    vi.mocked(apiRequest).mockImplementation(async (path, options) => {
      if (path === '/farms' && options?.method === 'POST') {
        return { id: 'new-farm-uuid', nombre: 'Granja Nueva', personId: 'person-uuid' };
      }
      if (path === '/people') {
        return {
          items: [
            { id: 'person-uuid', cedula: '12345678', nombres: 'María Rojas' },
            { id: 'other-person-uuid', cedula: '87654321', nombres: 'Carlos Mejía' },
            { id: 'person-without-farms', cedula: '11223344', nombres: 'Ana Ruiz' }
          ]
        };
      }
      if (path === '/farms') {
        return {
          items: [
            { id: 'farm-uuid', nombre: 'Granja La Esperanza', personId: 'person-uuid' },
            { id: 'other-farm-uuid', nombre: 'Porcícola El Roble', personId: 'other-person-uuid' }
          ]
        };
      }
      throw new Error(`Solicitud inesperada: ${path}`);
    });

    await renderWithEvaluator(<ApiPersonRegistrationPage />);

    const cedulaField = await screen.findByLabelText(/Cédula de la persona responsable/);
    fireEvent.change(cedulaField, { target: { value: '12345678' } });
    expect(screen.getByLabelText(/^Persona responsable$/)).toHaveValue('María Rojas');
    expect(screen.queryByRole('link', { name: /Granja La Esperanza/ })).not.toBeInTheDocument();
    const productionSystemField = screen.getByLabelText('Sistema de producción');
    const productionStratumField = screen.getByLabelText('Estrato productivo ICA');
    expect(productionSystemField).toHaveValue('');
    expect(productionSystemField).toHaveAttribute('readonly');
    expect(productionStratumField).toHaveValue('');
    fireEvent.change(screen.getByLabelText(/Hembras de cría/), {
      target: { value: '5' }
    });
    expect(productionSystemField).toHaveValue('Cría (granjas de reproductoras)');
    expect(productionStratumField).toHaveValue('Comercial familiar');
    fireEvent.change(screen.getByLabelText(/Animales de engorde/), {
      target: { value: '20' }
    });
    expect(productionSystemField).toHaveValue('Ciclo completo / traspatio');
    expect(productionStratumField).toHaveValue('Comercial familiar');

    fireEvent.change(screen.getByLabelText(/Nombre del predio/), {
      target: { value: 'Granja Nueva' }
    });
    fireEvent.change(screen.getByLabelText(/Departamento/), { target: { value: '05' } });
    fireEvent.change(screen.getByLabelText(/Municipio/), { target: { value: '05615' } });
    const totalAnimalsField = screen.getByLabelText(/Total de animales/);
    fireEvent.change(totalAnimalsField, { target: { value: '24' } });
    const submitFarmButton = screen.getByRole('button', { name: 'Registrar predio' });
    fireEvent.click(submitFarmButton);

    expect(await screen.findByText(
      'La suma de hembras de cría y animales de engorde no puede superar el total de animales.'
    )).toBeInTheDocument();
    expect(apiRequest).not.toHaveBeenCalledWith('/farms', expect.objectContaining({
      method: 'POST'
    }));

    fireEvent.change(totalAnimalsField, { target: { value: '25' } });
    expect(screen.queryByText(/La suma de hembras de cría/)).not.toBeInTheDocument();
    fireEvent.click(submitFarmButton);

    const farmLink = await screen.findByRole('link', {
      name: 'Ver evaluaciones de Granja Nueva, responsable María Rojas'
    });
    expect(farmLink).toHaveAttribute('href', '/evaluaciones?persona=person-uuid');
    expect(screen.queryByRole('link', { name: /Granja La Esperanza/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Porcícola El Roble/ })).not.toBeInTheDocument();
    expect(apiRequest).not.toHaveBeenCalledWith('/farms');
    expect(apiRequest).toHaveBeenCalledWith('/farms', {
      method: 'POST',
      body: {
        personId: 'person-uuid',
        codigoDepartamento: '05',
        codigoMunicipio: '05615',
        nombre: 'Granja Nueva',
        vereda: '',
        animales: 25,
        hembrasCria: 5,
        animalesGordos: 20
      }
    });
  }, 20_000);

  it('no crea un predio si la cédula no pertenece a una persona registrada', async () => {
    vi.mocked(apiRequest).mockImplementation(async (path) => {
      if (path === '/people') {
        return { items: [{ id: 'person-uuid', cedula: '12345678', nombres: 'María Rojas' }] };
      }
      if (path === '/farms') return { items: [] };
      throw new Error(`Solicitud inesperada: ${path}`);
    });

    await renderWithEvaluator(<ApiPersonRegistrationPage />);
    fireEvent.change(await screen.findByLabelText(/Cédula de la persona responsable/), {
      target: { value: '99999999' }
    });
    fireEvent.change(screen.getByLabelText(/Nombre del predio/), {
      target: { value: 'Granja sin responsable' }
    });
    fireEvent.change(screen.getByLabelText(/Departamento/), { target: { value: '05' } });
    fireEvent.change(screen.getByLabelText(/Municipio/), { target: { value: '05615' } });
    fireEvent.change(screen.getByLabelText(/Total de animales/), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar predio' }));

    expect(await screen.findByText(/No encontramos una persona registrada con esa cédula/))
      .toBeInTheDocument();
    expect(apiRequest).not.toHaveBeenCalledWith('/farms', expect.objectContaining({
      method: 'POST'
    }));
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  }, 20_000);
});
