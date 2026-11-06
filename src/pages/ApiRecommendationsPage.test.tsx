import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiRequest } from '../api/client';
import { ApiRecommendationsPage } from './ApiRecommendationsPage';
import { renderWithEvaluator, renderWithOwner } from '../test/renderWithEvaluator';

vi.mock('../api/client', () => ({
  apiRequest: vi.fn()
}));

const evaluationId = '89011034-5e4e-43e7-ae46-314ec5fe2698';
const evaluation = {
  id: evaluationId,
  farmId: 'farm-1',
  fecha: '2026-11-04',
  estado: 'Finalizada',
  investigadorNombres: 'Evaluador',
  investigadorApellidos: 'Prueba'
};
const farm = { id: 'farm-1', nombre: 'Predio de prueba' };
const result = {
  methodologyVersion: 'EBA Porcinos 3.0',
  formula: 'No calculable',
  calculability: 'not_calculable',
  score: null,
  classification: null,
  coverage: { registered: 1, total: 43, percentage: 2.33, pendingReview: 0, missing: [] },
  reasons: ['Faltan ponderaciones oficiales.']
};
const generatedPlan = {
  id: 'plan-1',
  evaluationId,
  generatedBy: 'Evaluador',
  provider: 'Gemini',
  model: 'gemini-2.5-flash',
  source: 'ia',
  title: 'Mejora de bienestar',
  recommendation: 'Aplicar medidas correctivas.',
  createdAt: '2026-11-04T05:00:00.000Z',
  actions: [{
    id: 'action-1',
    criterionId: 'agua',
    indicatorName: 'Disponibilidad de agua',
    title: 'Agua',
    recommendation: 'Revisar los bebederos.',
    action: 'Inspeccionar los bebederos.',
    responsible: null,
    dueDate: null,
    status: 'Pendiente'
  }]
};

describe('planes de recomendaciones conectados al backend', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('publica usando la API y después muestra el plan recuperado del servidor', async () => {
    let plan: typeof generatedPlan | undefined;
    vi.mocked(apiRequest).mockImplementation(async (path, options) => {
      if (path === '/evaluations') return { items: [evaluation] };
      if (path === '/farms') return { items: [farm] };
      if (path === '/recommendation-plans') return { items: plan ? [plan] : [] };
      if (path.startsWith('/indicators?')) {
        return {
          items: [{
            id: 'indicator-1',
            criterionId: 'agua',
            nombre: 'Disponibilidad de agua',
            puntaje: 0,
            estado: 'Requiere seguimiento',
            aplicabilidad: 'aplica',
            observaciones: ''
          }]
        };
      }
      if (path.endsWith('/result')) return { result };
      if (path === '/recommendation-plans/generate' && options?.method === 'POST') {
        expect(options.body).toEqual({ evaluationId });
        plan = generatedPlan;
        return { item: generatedPlan, idempotent: false };
      }
      throw new Error(`Solicitud inesperada: ${path}`);
    });

    await renderWithEvaluator(<ApiRecommendationsPage canGenerate />);
    await screen.findByRole('button', { name: 'Generar y publicar recomendaciones' });
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Generar y publicar recomendaciones' })).toBeEnabled()
    );
    fireEvent.click(screen.getByRole('button', { name: 'Generar y publicar recomendaciones' }));

    expect(await screen.findByText('Plan publicado')).toBeInTheDocument();
    expect(screen.getByText('Inspeccionar los bebederos.')).toBeInTheDocument();
    expect(apiRequest).toHaveBeenCalledWith(
      '/recommendation-plans/generate',
      { method: 'POST', body: { evaluationId } }
    );
  });

  it('permite mejorar con IA un plan de plantillas que aún no tiene acciones iniciadas', async () => {
    const templatePlan = {
      ...generatedPlan,
      provider: null,
      model: null,
      source: 'plantillas'
    };
    const aiPlan = {
      ...generatedPlan,
      recommendation: 'Plan mejorado con IA.',
      source: 'ia'
    };
    let currentPlan: typeof templatePlan | typeof aiPlan = templatePlan;
    vi.mocked(apiRequest).mockImplementation(async (path, options) => {
      if (path === '/evaluations') return { items: [evaluation] };
      if (path === '/farms') return { items: [farm] };
      if (path === '/recommendation-plans') return { items: [currentPlan] };
      if (path.startsWith('/indicators?')) {
        return {
          items: [{
            id: 'indicator-1',
            criterionId: 'agua',
            nombre: 'Disponibilidad de agua',
            puntaje: 55,
            estado: 'Requiere seguimiento',
            aplicabilidad: 'aplica',
            observaciones: ''
          }]
        };
      }
      if (path.endsWith('/result')) return { result };
      if (
        path === `/recommendation-plans/${templatePlan.id}/regenerate-with-ai` &&
        options?.method === 'POST'
      ) {
        currentPlan = aiPlan;
        return { item: aiPlan };
      }
      throw new Error(`Solicitud inesperada: ${path}`);
    });

    await renderWithEvaluator(<ApiRecommendationsPage canGenerate />);
    fireEvent.click(await screen.findByRole('button', { name: 'Mejorar plan con IA' }));

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith(
        `/recommendation-plans/${templatePlan.id}/regenerate-with-ai`,
        { method: 'POST', body: {} }
      );
    });
    expect(screen.getByText('Plan mejorado con IA.')).toBeInTheDocument();
  });

  it('mantiene la pantalla de propietario en modo de solo lectura', async () => {
    vi.mocked(apiRequest).mockImplementation(async (path) => {
      if (path === '/evaluations') return { items: [evaluation] };
      if (path === '/farms') return { items: [farm] };
      if (path === '/recommendation-plans') return { items: [] };
      if (path.startsWith('/indicators?')) return { items: [] };
      if (path.endsWith('/result')) return { result };
      throw new Error(`Solicitud inesperada: ${path}`);
    });

    await renderWithOwner(<ApiRecommendationsPage canGenerate={false} />);
    expect(await screen.findByText('Solo el evaluador puede generar y publicar recomendaciones.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Generar y publicar recomendaciones' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Eliminar plan de recomendaciones' })).not.toBeInTheDocument();
    expect(apiRequest).not.toHaveBeenCalledWith(
      '/recommendation-plans/generate',
      expect.anything()
    );
  });

  it('elimina el plan con confirmación y permite generar otro', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    let plan: typeof generatedPlan | undefined = generatedPlan;
    vi.mocked(apiRequest).mockImplementation(async (path, options) => {
      if (path === '/evaluations') return { items: [evaluation] };
      if (path === '/farms') return { items: [farm] };
      if (path === '/recommendation-plans') return { items: plan ? [plan] : [] };
      if (path.startsWith('/indicators?')) {
        return {
          items: [{
            id: 'indicator-1',
            criterionId: 'agua',
            nombre: 'Disponibilidad de agua',
            puntaje: 55,
            estado: 'Requiere seguimiento',
            aplicabilidad: 'aplica',
            observaciones: ''
          }]
        };
      }
      if (path.endsWith('/result')) return { result };
      if (path === `/recommendation-plans/${generatedPlan.id}` && options?.method === 'DELETE') {
        plan = undefined;
        return undefined;
      }
      throw new Error(`Solicitud inesperada: ${path}`);
    });

    await renderWithEvaluator(<ApiRecommendationsPage canGenerate />);
    fireEvent.click(await screen.findByRole('button', { name: 'Eliminar plan de recomendaciones' }));

    expect(confirm).toHaveBeenCalledOnce();
    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith(
        `/recommendation-plans/${generatedPlan.id}`,
        { method: 'DELETE' }
      );
    });
    expect(await screen.findByRole('button', { name: 'Generar y publicar recomendaciones' })).toBeInTheDocument();
    expect(screen.queryByText('Inspeccionar los bebederos.')).not.toBeInTheDocument();
    confirm.mockRestore();
  });

  it('muestra un mensaje general cuando falla la generación de IA', async () => {
    vi.mocked(apiRequest).mockImplementation(async (path, options) => {
      if (path === '/evaluations') return { items: [evaluation] };
      if (path === '/farms') return { items: [farm] };
      if (path === '/recommendation-plans') return { items: [] };
      if (path.startsWith('/indicators?')) {
        return {
          items: [{
            id: 'indicator-1',
            criterionId: 'agua',
            nombre: 'Disponibilidad de agua',
            puntaje: 55,
            estado: 'Requiere seguimiento',
            aplicabilidad: 'aplica',
            observaciones: ''
          }]
        };
      }
      if (path.endsWith('/result')) return { result };
      if (path === '/recommendation-plans/generate' && options?.method === 'POST') {
        throw new Error('gemini-3.8-flash: HTTP 503; modelo interno');
      }
      throw new Error(`Solicitud inesperada: ${path}`);
    });

    await renderWithEvaluator(<ApiRecommendationsPage canGenerate />);
    fireEvent.click(await screen.findByRole('button', { name: 'Generar y publicar recomendaciones' }));

    expect(await screen.findAllByText(
      'No se pudieron generar las recomendaciones en este momento. Inténtalo nuevamente más tarde.'
    )).not.toHaveLength(0);
    expect(screen.queryByText(/gemini-3\.8-flash|HTTP 503/)).not.toBeInTheDocument();
  });

  it('conserva el contexto y las tarjetas del módulo cuando no hay evaluaciones', async () => {
    vi.mocked(apiRequest).mockImplementation(async (path) => {
      if (path === '/evaluations' || path === '/farms' || path === '/recommendation-plans') {
        return { items: [] };
      }
      throw new Error(`Solicitud inesperada: ${path}`);
    });

    await renderWithEvaluator(<ApiRecommendationsPage canGenerate />);

    expect(await screen.findByText('Sin evaluación seleccionada')).toBeInTheDocument();
    expect(screen.getByText('Indicadores registrados')).toBeInTheDocument();
    expect(screen.getByText('Requieren seguimiento')).toBeInTheDocument();
    expect(screen.getByText('Plan de mejora con IA')).toBeInTheDocument();
    expect(screen.getByText('No hay evaluaciones disponibles')).toBeInTheDocument();
  });
});
