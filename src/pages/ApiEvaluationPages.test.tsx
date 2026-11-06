import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Link, Navigate, Route, Routes } from 'react-router-dom';
import { apiRequest } from '../api/client';
import { CRITERIA, LIBERTIES } from '../features/indicators/catalog';
import { renderWithEvaluator, renderWithOwner } from '../test/renderWithEvaluator';
import {
  ApiDashboardPage,
  ApiEvaluationDetailPage,
  ApiEvaluationsPage
} from './ApiEvaluationPages';

vi.mock('../api/client', () => ({
  apiRequest: vi.fn()
}));

describe('evaluaciones conectadas al sistema', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('genera recomendaciones desde la tarjeta del detalle cuando la evaluación está finalizada', async () => {
    const evaluation = {
      id: 'evaluation-uuid',
      farmId: 'farm-uuid',
      farmName: 'Predio de prueba',
      fecha: '2026-11-04',
      hora: '08:30',
      estado: 'Finalizada',
      investigadorNombres: 'Ana',
      investigadorApellidos: 'Pérez',
      observaciones: ''
    };
    const generatedPlan = {
      id: 'plan-uuid',
      evaluationId: evaluation.id,
      generatedBy: 'Evaluador',
      provider: null,
      model: null,
      source: 'plantillas',
      title: 'Plan de mejora EBA',
      recommendation: 'Recomendaciones creadas.',
      createdAt: '2026-11-04T08:30:00.000Z',
      actions: []
    };
    vi.mocked(apiRequest).mockImplementation(async (path, options) => {
      if (path === '/evaluations/evaluation-uuid') return { item: evaluation };
      if (path === '/indicators?evaluationId=evaluation-uuid') {
        return {
          items: [{
            id: 'indicator-uuid',
            evaluationId: evaluation.id,
            criterionId: 'limpieza-comederos',
            nombre: 'Estado de los comederos',
            metodo: 'Visual',
            resultado: 'No cumple',
            estado: 'Requiere seguimiento',
            aplicabilidad: 'aplica',
            puntaje: 0,
            observaciones: ''
          }]
        };
      }
      if (path === '/evaluations/evaluation-uuid/result') {
        return {
          result: {
            methodologyVersion: 'EBA-Porcinos-3.0',
            calculability: 'not_calculable',
            score: null,
            classification: null,
            coverage: { registered: 1, total: 43, pendingReview: 0, missing: [] },
            liberties: [],
            reasons: []
          }
        };
      }
      if (path === '/evidence?evaluationId=evaluation-uuid') return { items: [] };
      if (path === '/recommendation-plans') return { items: [] };
      if (path === '/recommendation-plans/generate' && options?.method === 'POST') {
        return { item: generatedPlan, idempotent: false };
      }
      throw new Error(`Solicitud inesperada: ${path}`);
    });

    await renderWithEvaluator(
      <Routes>
        <Route path="/" element={<Navigate to="/evaluaciones/evaluation-uuid" replace />} />
        <Route path="/evaluaciones/:id" element={<ApiEvaluationDetailPage />} />
      </Routes>
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Generar recomendaciones' }));
    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith(
        '/recommendation-plans/generate',
        { method: 'POST', body: { evaluationId: evaluation.id } }
      );
    });
    expect(await screen.findByText('Recomendaciones creadas.')).toBeInTheDocument();
  });

  it('carga una foto desde el detalle y la asocia al indicador seleccionado', async () => {
    const evaluation = {
      id: 'evaluation-uuid',
      farmId: 'farm-uuid',
      farmName: 'Predio de prueba',
      fecha: '2026-11-04',
      hora: '08:30',
      estado: 'En proceso',
      investigadorNombres: 'Ana',
      investigadorApellidos: 'Pérez',
      observaciones: ''
    };
    const indicator = {
      id: 'indicator-uuid',
      evaluationId: evaluation.id,
      criterionId: 'limpieza-comederos',
      nombre: 'Estado de los comederos',
      metodo: 'Visual',
      resultado: 'No cumple',
      estado: 'Requiere seguimiento' as const,
      aplicabilidad: 'aplica' as const,
      puntaje: 0,
      observaciones: ''
    };
    const uploadedEvidence = {
      id: 'evidence-uuid',
      evaluationId: evaluation.id,
      indicatorId: indicator.id,
      nombre: 'comedero.png',
      mimeType: 'image/png',
      size: 5,
      createdAt: '2026-11-04T08:30:00.000Z'
    };
    vi.mocked(apiRequest).mockImplementation(async (path, options) => {
      if (path === '/evaluations/evaluation-uuid') return { item: evaluation };
      if (path === '/indicators?evaluationId=evaluation-uuid') return { items: [indicator] };
      if (path === '/evaluations/evaluation-uuid/result') {
        return {
          result: {
            methodologyVersion: 'EBA-Porcinos-3.0',
            calculability: 'not_calculable',
            score: null,
            classification: null,
            coverage: { registered: 1, total: 43, pendingReview: 0, missing: [] },
            liberties: [],
            reasons: []
          }
        };
      }
      if (path === '/evidence?evaluationId=evaluation-uuid') return { items: [] };
      if (path === '/recommendation-plans') return { items: [] };
      if (path === '/evidence' && options?.method === 'POST') {
        return { item: uploadedEvidence };
      }
      throw new Error(`Solicitud inesperada: ${path}`);
    });

    await renderWithEvaluator(
      <Routes>
        <Route path="/" element={<Navigate to="/evaluaciones/evaluation-uuid" replace />} />
        <Route path="/evaluaciones/:id" element={<ApiEvaluationDetailPage />} />
      </Routes>
    );

    expect(await screen.findByRole('navigation', { name: 'Indicadores para adjuntar fotos' })).toBeInTheDocument();
    const recommendationsCard = screen.getByRole('heading', { name: 'Recomendaciones' }).closest('section');
    const evidenceCard = screen.getByRole('heading', { name: 'Evidencias (0)' }).closest('section');
    if (!(recommendationsCard instanceof HTMLElement) || !(evidenceCard instanceof HTMLElement)) {
      throw new Error('No se encontraron las tarjetas de recomendaciones y evidencias.');
    }
    expect(
      recommendationsCard.compareDocumentPosition(evidenceCard) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(recommendationsCard.parentElement).toHaveClass('dashboard-grid--stacked');
    const file = new File(['photo'], 'comedero.png', { type: 'image/png' });
    Object.defineProperty(file, 'arrayBuffer', {
      value: async () => new TextEncoder().encode('photo').buffer
    });
    fireEvent.change(screen.getByLabelText(/Seleccionar fotos/), { target: { files: [file] } });
    const uploadButton = screen.getByRole('button', { name: 'Asociar foto' });
    await waitFor(() => expect(uploadButton).toBeEnabled());
    const uploadForm = uploadButton.closest('form');
    if (!(uploadForm instanceof HTMLFormElement)) throw new Error('No se encontró el formulario de carga.');
    fireEvent.submit(uploadForm);

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith('/evidence', {
        method: 'POST',
        body: {
          evaluationId: evaluation.id,
          indicatorId: indicator.id,
          name: 'comedero.png',
          mimeType: 'image/png',
          contentBase64: 'cGhvdG8='
        }
      });
    });
    expect(await screen.findByAltText('comedero.png')).toBeInTheDocument();
    expect(screen.getByText('1 foto')).toBeInTheDocument();
  });

  it('conserva la composición del panel cuando el backend no tiene registros', async () => {
    vi.mocked(apiRequest).mockImplementation(async (path) => {
      if (path === '/evaluations' || path === '/farms' || path === '/indicators' || path === '/evidence') {
        return { items: [] };
      }
      throw new Error(`Solicitud inesperada: ${path}`);
    });

    await renderWithEvaluator(<ApiDashboardPage />);

    expect(await screen.findByRole('heading', { name: 'Hola, Evaluador' })).toBeInTheDocument();
    expect(screen.getByText('Las cuatro libertades')).toBeInTheDocument();
    expect(screen.getByText('Oportunidades de mejora')).toBeInTheDocument();
    expect(screen.getByText('Evidencias recientes')).toBeInTheDocument();
    expect(screen.getByText('Todavía no hay evaluaciones registradas.')).toBeInTheDocument();
  }, 20_000);

  it('crea y asigna una evaluación a la cuenta evaluadora autenticada mediante la API', async () => {
    vi.mocked(apiRequest).mockImplementation(async (path, options) => {
      if (path === '/evaluations' && !options?.method) return { items: [] };
      if (path === '/farms') return { items: [{ id: 'farm-uuid', nombre: 'Predio' }] };
      if (path === '/evaluations' && options?.method === 'POST') return { id: 'evaluation-uuid' };
      throw new Error(`Solicitud inesperada: ${path}`);
    });

    await renderWithEvaluator(<ApiEvaluationsPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Nueva evaluación' }));
    const dialog = screen.getByRole('dialog', { name: 'Nueva visita' });
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByRole('heading', { name: 'Nueva visita' })).toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText(/Nombres del investigador/), {
      target: { value: 'Kevin' }
    });
    fireEvent.change(within(dialog).getByLabelText(/Apellidos del investigador/), {
      target: { value: 'Santiago' }
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar evaluación' }));

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith(
        '/evaluations',
        expect.objectContaining({
          method: 'POST',
          body: expect.objectContaining({
            farmId: 'farm-uuid',
            investigadorNombres: 'Kevin',
            investigadorApellidos: 'Santiago'
          })
        })
      );
    });
  });

  it('no muestra acciones de creación para el propietario', async () => {
    vi.mocked(apiRequest).mockImplementation(async (path) => {
      if (path === '/evaluations') return { items: [] };
      if (path === '/farms') return { items: [] };
      throw new Error(`Solicitud inesperada: ${path}`);
    });

    await renderWithOwner(<ApiEvaluationsPage />);
    expect(await screen.findByText('No hay evaluaciones registradas')).toBeInTheDocument();
    expect(screen.getByRole('grid', { name: 'Actividad mensual' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Evaluaciones registradas' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Nueva evaluación' })).not.toBeInTheDocument();
    expect(apiRequest).not.toHaveBeenCalledWith('/evaluations', expect.objectContaining({ method: 'POST' }));
  });

  it('filtra por todas las evaluaciones de la persona responsable del predio', async () => {
    const evaluations = [
      {
        id: 'evaluation-for-person',
        farmId: 'farm-for-person',
        farmName: 'Predio de María',
        fecha: '2026-11-04',
        hora: '08:30',
        estado: 'En proceso',
        investigadorNombres: 'Ana',
        investigadorApellidos: 'Pérez',
        observaciones: ''
      },
      {
        id: 'evaluation-for-other',
        farmId: 'farm-for-other',
        farmName: 'Predio de Carlos',
        fecha: '2026-11-03',
        hora: '08:30',
        estado: 'En proceso',
        investigadorNombres: 'Ana',
        investigadorApellidos: 'Pérez',
        observaciones: ''
      }
    ];
    vi.mocked(apiRequest).mockImplementation(async (path) => {
      if (path === '/evaluations') return { items: evaluations };
      if (path === '/farms') {
        return {
          items: [
            { id: 'farm-for-person', personId: 'person-uuid', nombre: 'Predio de María' },
            { id: 'farm-for-other', personId: 'other-person-uuid', nombre: 'Predio de Carlos' }
          ]
        };
      }
      throw new Error(`Solicitud inesperada: ${path}`);
    });

    await renderWithEvaluator(
      <Routes>
        <Route path="/" element={<Link to="/evaluaciones?persona=person-uuid">Abrir predios de María</Link>} />
        <Route path="/evaluaciones" element={<ApiEvaluationsPage />} />
      </Routes>
    );
    fireEvent.click(screen.getByRole('link', { name: 'Abrir predios de María' }));

    expect(await screen.findByText('evaluation-for-person')).toBeInTheDocument();
    expect(screen.queryByText('evaluation-for-other')).not.toBeInTheDocument();
    expect(screen.getByText('Mostrando evaluaciones de los predios vinculados a la persona seleccionada.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ver todas las evaluaciones' }));
    expect(await screen.findByText('evaluation-for-other')).toBeInTheDocument();
  });

  it('mantiene el detalle completo y permite editar la evaluación desde la vista conectada', async () => {
    let currentIndicators = CRITERIA
      .filter((criterion) => criterion.libertadId === LIBERTIES[3].id)
      .map((criterion, index) => ({
        id: `indicator-${index}`,
        evaluationId: 'evaluation-uuid',
        criterionId: criterion.id,
        nombre: criterion.nombre,
        metodo: 'Observación directa',
        resultado: 'Cumple',
        estado: 'Registrado' as 'Registrado' | 'Pendiente de revisión' | 'Requiere seguimiento',
        aplicabilidad: 'aplica' as const,
        puntaje: 100,
        observaciones: ''
      }));
    const buildResult = () => {
      const missingCriteria = CRITERIA.filter(
        (criterion) => !currentIndicators.some((indicator) => indicator.criterionId === criterion.id)
      );
      const liberties = LIBERTIES.map((liberty) => {
        const criteria = CRITERIA.filter((criterion) => criterion.libertadId === liberty.id);
        const scoredIndicators = criteria
          .map((criterion) => currentIndicators.find((indicator) => indicator.criterionId === criterion.id))
          .filter((indicator) => indicator && indicator.estado !== 'Pendiente de revisión');
        const score = scoredIndicators.length
          ? Math.round(
              scoredIndicators.reduce((total, indicator) => total + (indicator?.puntaje ?? 0), 0) /
                scoredIndicators.length * 100
            ) / 100
          : null;
        return {
          ...liberty,
          puntuacion: score,
          indicadoresPuntuados: scoredIndicators.length,
          noAplicables: 0,
          faltantes: missingCriteria
            .filter((criterion) => criterion.libertadId === liberty.id)
            .map((criterion) => criterion.nombre)
        };
      });
      return {
        result: {
          methodologyVersion: 'EBA-Porcinos-3.0',
          calculability: 'not_calculable',
          score: null,
          classification: null,
          coverage: {
            registered: CRITERIA.length - missingCriteria.length,
            total: CRITERIA.length,
            pendingReview: 0,
            missing: missingCriteria.map((criterion) => criterion.id)
          },
          liberties,
          reasons: [`Faltan ${missingCriteria.length} criterios.`]
        }
      };
    };
    const evaluation = {
      id: 'evaluation-uuid',
      farmId: 'farm-uuid',
      farmName: 'Predio de prueba',
      fecha: '2026-11-04',
      hora: '08:30',
      estado: 'En proceso',
      investigadorNombres: 'Ana',
      investigadorApellidos: 'Pérez',
      observaciones: 'Visita de seguimiento'
    };
    vi.mocked(apiRequest).mockImplementation(async (path, options) => {
      if (path === '/evaluations' && !options?.method) return { items: [evaluation] };
      if (path === '/farms') return { items: [{ id: 'farm-uuid', nombre: 'Predio de prueba' }] };
      if (path === '/evaluations/evaluation-uuid' && !options?.method) return { item: evaluation };
      if (path === '/indicators?evaluationId=evaluation-uuid') return { items: currentIndicators };
      if (path === '/evaluations/evaluation-uuid/result') return buildResult();
      if (path === '/evidence?evaluationId=evaluation-uuid') return { items: [] };
      if (path === '/recommendation-plans') return { items: [] };
      if (path === '/indicators' && options?.method === 'POST') {
        currentIndicators = [
          ...currentIndicators,
          {
            id: 'indicator-created',
            evaluationId: 'evaluation-uuid',
            criterionId: 'limpieza-comederos',
            nombre: 'Estado de los comederos',
            metodo: 'Rúbrica EBA Porcinos 3.0',
            resultado: '50% o menos limpios, o con riesgo de contaminación.',
            estado: 'Requiere seguimiento' as const,
            aplicabilidad: 'aplica' as const,
            puntaje: 0,
            observaciones: ''
          }
        ];
        return { id: 'indicator-created' };
      }
      if (path === '/evaluations/evaluation-uuid' && options?.method === 'PATCH') {
        return { item: evaluation };
      }
      throw new Error(`Solicitud inesperada: ${path}`);
    });

    await renderWithEvaluator(
      <Routes>
        <Route path="/" element={<ApiEvaluationsPage />} />
        <Route path="/evaluaciones/:id" element={<ApiEvaluationDetailPage />} />
        <Route path="/evaluaciones/:id/indicadores/:libertyId" element={<ApiEvaluationDetailPage />} />
      </Routes>
    );
    fireEvent.click(await screen.findByRole('link', { name: 'Abrir evaluación de Predio de prueba' })        );

    expect(await screen.findByRole('heading', { name: 'Resumen de la visita' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Las cuatro libertades' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Indicadores por libertad' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Registro por criterio' })).not.toBeInTheDocument();
    expect(screen.getByText('Evidencias (0)')).toBeInTheDocument();
    expect(screen.queryByText(/Estimado parcial|Resultado provisional/)).not.toBeInTheDocument();
    expect(screen.getByText('No calculable', { selector: '.stat-card__value' })).toBeInTheDocument();
    expect(screen.getByText(/Estado de los comederos \(sin registro\)/)).toBeInTheDocument();
    const editButtons = screen.getAllByRole('button', { name: 'Editar' });
    expect(editButtons.length).toBeGreaterThan(0);

    const libertyNavigation = screen.getByRole('navigation', { name: 'Navegación por las cuatro libertades' });
    const sectionLibertyButton = within(libertyNavigation).getByRole('button', { name: /Hambre, sed y malnutrición/ });
    expect(sectionLibertyButton).toHaveTextContent('9 pendientes');
    fireEvent.click(sectionLibertyButton);
    expect(sectionLibertyButton).toHaveAttribute('aria-pressed', 'true');
    const libertyScore = screen.getByRole('progressbar', { name: 'Puntuación de Hambre, sed y malnutrición' });
    expect(libertyScore).toHaveAttribute('aria-valuetext', 'Sin puntaje');
    expect(within(libertyScore).getByText('—')).toBeInTheDocument();
    expect(screen.queryByText('Pendiente de evaluar')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Evaluar' })).not.toBeInTheDocument();
    const completedLibertySectionButton = within(libertyNavigation).getByRole('button', {
      name: /Comportamiento natural, temor y angustia/
    });
    fireEvent.click(completedLibertySectionButton);
    expect(screen.getByRole('progressbar', {
      name: 'Puntuación de Comportamiento natural, temor y angustia'
    })).toHaveAttribute('aria-valuenow', '100');

    fireEvent.click(screen.getByRole('button', { name: 'Agregar indicador' }));
    const indicatorDialog = screen.getByRole('dialog', { name: 'Agregar indicador' });
    expect(within(indicatorDialog).getByRole('navigation', { name: 'Navegar por libertades' })).toBeInTheDocument();
    const pendingLibertyButton = within(indicatorDialog).getByRole('link', { name: /Hambre, sed y malnutrición/ });
    const completedLibertyButton = within(indicatorDialog).getByRole('link', { name: /Comportamiento natural, temor y angustia/ });
    expect(pendingLibertyButton).toHaveTextContent('9 pendientes');
    expect(within(pendingLibertyButton).getByText('9 pendientes')).toHaveClass('badge--warning');
    expect(completedLibertyButton).toHaveTextContent('Completa');
    expect(within(completedLibertyButton).getByText('Completa')).toHaveClass('badge--success');
    expect(within(indicatorDialog).queryByLabelText('Aplicabilidad')).not.toBeInTheDocument();
    expect(within(indicatorDialog).getAllByRole('link')).toHaveLength(4);
    expect(within(indicatorDialog).queryByRole('textbox')).not.toBeInTheDocument();
    fireEvent.click(completedLibertyButton);
    expect(completedLibertyButton).toHaveAttribute('href', '/evaluaciones/evaluation-uuid/indicadores/comportamiento-temor-angustia');
    expect(completedLibertyButton).toHaveAttribute('aria-current', 'page');
    const savedCriterionCard = within(indicatorDialog)
      .getByRole('heading', { name: CRITERIA.find((criterion) => criterion.libertadId === LIBERTIES[3].id)!.nombre })
      .closest('article');
    if (!(savedCriterionCard instanceof HTMLElement)) throw new Error('No se encontró el indicador guardado.');
    expect(within(savedCriterionCard).getAllByRole('button', { pressed: false }).length).toBeGreaterThan(0);
    fireEvent.click(pendingLibertyButton);
    expect(pendingLibertyButton).toHaveAttribute('aria-current', 'page');
    const criterionHeading = within(indicatorDialog).getByRole('heading', { name: 'Estado de los comederos' });
    const criterionCard = criterionHeading.closest('article');
    if (!(criterionCard instanceof HTMLElement)) throw new Error('No se encontró la tarjeta del criterio.');
    fireEvent.click(within(criterionCard).getByRole('button', {
      name: /Puntaje 0: 50% o menos limpios/
    }));
    fireEvent.click(within(indicatorDialog).getByRole('button', { name: 'Guardar indicador' }));

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith(
        '/indicators',
        expect.objectContaining({
          method: 'POST',
          body: expect.objectContaining({
            evaluationId: 'evaluation-uuid',
            criterionId: 'limpieza-comederos',
            metodo: 'Rúbrica EBA Porcinos 3.0',
            aplicabilidad: 'aplica',
            puntaje: 0,
            resultado: '50% o menos limpios, o con riesgo de contaminación.',
            observaciones: ''
          })
        })
      );
      expect(within(indicatorDialog).getByRole('link', { name: /8 pendientes/ })).toBeInTheDocument();
      expect(within(indicatorDialog).getByText(/Estado de los comederos/)).toBeInTheDocument();
    });
    expect(screen.getByRole('dialog', { name: 'Agregar indicador' })).toBeInTheDocument();
    expect(within(indicatorDialog).queryByRole('textbox')).not.toBeInTheDocument();

    fireEvent.click(editButtons[0]);
    fireEvent.change(screen.getByLabelText(/Nombres del investigador/), {
      target: { value: 'Andrea' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith(
        '/evaluations/evaluation-uuid',
        expect.objectContaining({
          method: 'PATCH',
          body: expect.objectContaining({ investigadorNombres: 'Andrea' })
        })
      );
    });
  }, 20_000);
});
