import { fireEvent, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { CRITERIA, LIBERTIES } from './catalog';
import { IndicatorForm } from './IndicatorForm';
import { renderWithEvaluator } from '../../test/renderWithEvaluator';

describe('selección de criterios por libertad', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('muestra solo criterios de la libertad seleccionada y permite elegir uno', async () => {
    await renderWithEvaluator(
      <IndicatorForm open defaultEvalId="EV-2026-001" onClose={() => undefined} />
    );

    const liberty = LIBERTIES[3];
    fireEvent.change(screen.getByLabelText(/^Libertad/), {
      target: { value: liberty.id }
    });

    const criteriaForLiberty = CRITERIA.filter((item) => item.libertadId === liberty.id);
    const criterionGroup = screen.getByRole('group', {
      name: `Selecciona un criterio de «${liberty.nombre}»`
    });
    expect(within(criterionGroup).getAllByRole('radio')).toHaveLength(criteriaForLiberty.length);
    expect(within(criterionGroup).getByText('Material de enriquecimiento')).toBeInTheDocument();
    expect(within(criterionGroup).queryByText('Estado de los comederos')).not.toBeInTheDocument();

    fireEvent.click(within(criterionGroup).getByLabelText(/Material de enriquecimiento/));

    const expandedCriterion = within(criterionGroup).getByRole('group', {
      name: 'Rangos de calificación'
    });
    expect(
      within(expandedCriterion).getByRole('button', {
        name: /100 pts.*Cumple/
      })
    ).toBeInTheDocument();
    expect(within(criterionGroup).getByText('Aplicabilidad')).toBeInTheDocument();
    fireEvent.click(
      within(expandedCriterion).getByRole('button', {
        name: /100 pts.*Cumple/
      })
    );
    expect(
      within(expandedCriterion).getByRole('button', {
        name: /100 pts.*Cumple/
      })
    ).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'Guardar evaluación' }));

    expect(await screen.findByRole('dialog', { name: 'Evaluar criterio' })).toBeInTheDocument();
    expect(screen.getByLabelText(/^Evaluación/)).toHaveValue('EV-2026-001');
    expect(screen.getByLabelText(/^Libertad/)).toHaveValue(liberty.id);
    expect(
      within(criterionGroup).getByText('Material de enriquecimiento')
    ).toBeInTheDocument();
    expect(
      within(criterionGroup).getByLabelText(/Material de enriquecimiento/)
    ).toBeDisabled();
    expect(within(criterionGroup).getAllByText('Respondido').length).toBeGreaterThan(1);
    expect(
      within(criterionGroup)
        .getAllByText('Respondido', { selector: '.criterion-choice__status' })
        .some((status) => status.classList.contains('criterion-choice__status--answered'))
    ).toBe(true);
  }, 20_000);

  it('abre desde un criterio pendiente con su pregunta y rangos preseleccionados', async () => {
    await renderWithEvaluator(
      <IndicatorForm
        open
        defaultEvalId="EV-2026-002"
        defaultCriterionId="procedimiento-manejo"
        onClose={() => undefined}
      />
    );

    expect(screen.getByLabelText(/^Evaluación/)).toHaveValue('EV-2026-002');
    expect(screen.getByLabelText(/^Libertad/)).toHaveValue('dolor-lesion-enfermedad');
    expect(screen.getByLabelText(/Procedimiento de manejo de los animales/)).toBeChecked();
    expect(
      screen
        .getAllByText('Pendiente', { selector: '.criterion-choice__status' })
        .some((status) => status.classList.contains('criterion-choice__status--pending'))
    ).toBe(true);
    expect(screen.getByText('Rangos de calificación')).toBeInTheDocument();
    expect(screen.getByText(/¿Existe un procedimiento documentado/)).toBeInTheDocument();
  });
});
