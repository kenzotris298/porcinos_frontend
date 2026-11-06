import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { STORAGE_KEY } from '../data/store';
import { renderWithEvaluator } from '../test/renderWithEvaluator';
import { EvidencePage } from './EvidencePage';

describe('explorador local de evidencias', () => {
  beforeEach(() => {
    window.localStorage.removeItem(STORAGE_KEY);
  });

  it('mantiene visibles las carpetas vacías y solo permite consultar desde esta ruta', async () => {
    await renderWithEvaluator(<EvidencePage />);
    await userEvent.click(
      await screen.findByRole('button', { name: 'Abrir carpeta Granja La Esperanza, 0 evidencias' })
    );

    expect(await screen.findByRole('heading', { name: 'No hay evidencias registradas' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cargar evidencia' })).toBeInTheDocument();
    expect(document.querySelector('input[type="file"]')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Todas las carpetas' })).toBeInTheDocument();
  });
});
