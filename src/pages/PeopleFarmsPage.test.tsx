import { fireEvent, screen, within } from '@testing-library/react';
import { useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { STORAGE_KEY } from '../data/store';
import { PeopleFarmsPage } from './PeopleFarmsPage';
import { renderWithEvaluator } from '../test/renderWithEvaluator';

function CurrentPath() {
  const location = useLocation();
  return <output data-testid="current-path">{location.pathname}</output>;
}

describe('registro de personas y predios', () => {
  beforeEach(() => {
    window.localStorage.removeItem(STORAGE_KEY);
  });

  it('solo registra tras validar el código y vincula el predio a la persona seleccionada', async () => {
    await renderWithEvaluator(<PeopleFarmsPage />);
    expect(screen.queryByText('Nuevo predio de esta persona')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/^Cédula/), { target: { value: '123456789' } });
    fireEvent.change(screen.getByLabelText(/^Nombres y apellidos/), {
      target: { value: 'Persona de prueba' }
    });
    fireEvent.change(screen.getByLabelText(/^Celular/), { target: { value: '3001234567' } });
    fireEvent.change(screen.getByLabelText(/^Correo electrónico/), {
      target: { value: 'persona@test.com' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar código de verificación' }));

    const codeAlert = await screen.findByText('Código generado');
    const code = within(codeAlert.closest('.alert') as HTMLElement).getByText(/^\d{6}$/).textContent!;
    fireEvent.change(screen.getByLabelText(/^Código de verificación/), {
      target: { value: code === '000000' ? '000001' : '000000' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Verificar y registrar persona' }));
    expect(await screen.findByText(/El código ingresado no es correcto/)).toBeInTheDocument();
    expect(screen.queryByText('Persona de prueba')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/^Código de verificación/), { target: { value: code } });
    fireEvent.click(screen.getByRole('button', { name: 'Verificar y registrar persona' }));
    expect(await screen.findAllByText('Persona de prueba')).toHaveLength(2);
    expect(await screen.findAllByText(/C\.C\. 123456789/)).toHaveLength(2);

    fireEvent.change(screen.getByLabelText(/^Nombre del predio/), {
      target: { value: 'Predio de prueba' }
    });
    fireEvent.change(screen.getByLabelText(/^Cantidad total de animales/), { target: { value: '25' } });
    fireEvent.change(screen.getByLabelText(/^Hembras de cría/), { target: { value: '5' } });
    fireEvent.change(screen.getByLabelText(/^Animales gordos/), { target: { value: '20' } });
    expect(screen.getByLabelText(/^Sistema de producción/)).toHaveValue('full-cycle');
    fireEvent.change(screen.getByLabelText(/^Departamento/), { target: { value: '25' } });
    fireEvent.change(screen.getByLabelText(/^Municipio/), { target: { value: '25473' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear predio vinculado' }));

    expect(await screen.findByText('Predio de prueba')).toBeInTheDocument();
    expect(screen.getByText(/Predios vinculados \(1\)/)).toBeInTheDocument();
    expect(screen.getByText(/Comercial familiar/)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/^Nombre del predio/), {
      target: { value: 'Segundo predio' }
    });
    fireEvent.change(screen.getByLabelText(/^Cantidad total de animales/), { target: { value: '40' } });
    fireEvent.change(screen.getByLabelText(/^Hembras de cría/), { target: { value: '0' } });
    fireEvent.change(screen.getByLabelText(/^Animales gordos/), { target: { value: '20' } });
    expect(screen.getByLabelText(/^Sistema de producción/)).toHaveValue('fattening');
    fireEvent.change(screen.getByLabelText(/^Departamento/), { target: { value: '05' } });
    fireEvent.change(screen.getByLabelText(/^Municipio/), { target: { value: '05615' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear predio vinculado' }));
    expect(await screen.findByText('Segundo predio')).toBeInTheDocument();
    expect(screen.getByText(/Predios vinculados \(2\)/)).toBeInTheDocument();
  }, 15_000);

  it('permite abrir la evaluación más reciente desde el botón del predio vinculado', async () => {
    await renderWithEvaluator(
      <>
        <PeopleFarmsPage />
        <CurrentPath />
      </>
    );

    fireEvent.click(screen.getByRole('button', { name: /María Fernanda Rojas/ }));
    fireEvent.click(screen.getByRole('button', { name: /Granja La Esperanza/ }));

    expect(screen.getByTestId('current-path')).toHaveTextContent(
      /^\/evaluaciones\/EV-2026-001$/
    );
  });
});
