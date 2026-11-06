import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { EvaluationsPage } from './EvaluationsPage';
import { renderWithEvaluator } from '../test/renderWithEvaluator';

describe('actividad e historial de evaluaciones', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('muestra la actividad reciente y filtra el historial desde el calendario', async () => {
    await renderWithEvaluator(<EvaluationsPage />);

    expect(await screen.findByText('Última evaluación registrada')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Evaluaciones registradas' })).toBeInTheDocument();
    expect(screen.getByText('Actividad reciente')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /con evaluaciones/ }));
    expect(screen.getByRole('button', { name: /Quitar filtro:/ })).toBeInTheDocument();
    expect(screen.getByText(/evaluación\(es\) el/)).toBeInTheDocument();
  }, 20_000);
});
