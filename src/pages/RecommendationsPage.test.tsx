import { fireEvent, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { createSeedDatabase } from '../data/seed';
import { STORAGE_KEY } from '../data/store';
import { RecommendationsPage } from './RecommendationsPage';
import { renderWithEvaluator } from '../test/renderWithEvaluator';

describe('plan de mejora', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('permite ajustar la acción y recomendación sugeridas antes de publicarlas', async () => {
    const seed = createSeedDatabase();
    seed.recommendations = seed.recommendations.filter(
      (item) => item.evaluationId !== 'EV-2026-003'
    );
    seed.recommendationPlans = seed.recommendationPlans.filter(
      (item) => item.evaluationId !== 'EV-2026-003'
    );
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
    await renderWithEvaluator(<RecommendationsPage />);

    fireEvent.change(screen.getByLabelText('Cambiar evaluación'), {
      target: { value: 'EV-2026-003' }
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Revisar acciones y recomendaciones' })
    );

    const dialog = await screen.findByRole('dialog', { name: 'Preparar plan de mejora' });
    const actionFields = within(dialog).getAllByLabelText(/Acción a realizar/);
    const recommendationFields = within(dialog).getAllByLabelText(/Recomendación sugerida/);
    expect(actionFields.length).toBeGreaterThan(0);
    fireEvent.change(actionFields[0], {
      target: { value: 'Asignar una persona responsable y verificar el cambio.' }
    });
    fireEvent.change(recommendationFields[0], {
      target: { value: 'Repetir la inspección y documentar el resultado.' }
    });
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Publicar plan una sola vez' })
    );

    expect(await screen.findByText('Plan ya generado')).toBeInTheDocument();
    expect(
      screen.getByText(/Asignar una persona responsable y verificar el cambio/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Repetir la inspección y documentar el resultado/)
    ).toBeInTheDocument();
  }, 20_000);
});
