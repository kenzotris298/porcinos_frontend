import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiRequest } from '../api/client';
import { renderWithEvaluator } from '../test/renderWithEvaluator';
import { ApiEvidencePage } from './ApiEvidencePage';

vi.mock('../api/client', () => ({
  apiRequest: vi.fn()
}));

describe('evidencias conectadas al sistema', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('muestra las evaluaciones como carpetas y permite consultar sus evidencias', async () => {
    vi.mocked(apiRequest).mockImplementation(async (path) => {
      if (path === '/evaluations') {
        return {
          items: [{
            id: 'evaluation-1',
            farmId: 'farm-1',
            farmName: 'Predio de prueba',
            fecha: '2026-11-04',
            estado: 'En proceso'
          }]
        };
      }
      if (path === '/farms') return { items: [{ id: 'farm-1', nombre: 'Predio de prueba' }] };
      if (path === '/evidence') {
        return {
          items: [{
            id: 'evidence-1',
            evaluationId: 'evaluation-1',
            indicatorId: 'indicator-1',
            nombre: 'registro.pdf',
            mimeType: 'application/pdf',
            size: 1024,
            uploadedBy: 'Evaluador',
            createdAt: '2026-11-04T08:30:00.000Z'
          }]
        };
      }
      if (path === '/indicators?evaluationId=evaluation-1') {
        return { items: [{ id: 'indicator-1', nombre: 'Acceso al agua' }] };
      }
      throw new Error(`Solicitud inesperada: ${path}`);
    });

    await renderWithEvaluator(<ApiEvidencePage />);
    expect(await screen.findByRole('button', { name: 'Abrir carpeta Predio de prueba, 1 evidencias' })).toBeInTheDocument();
    expect(screen.queryByText('Cargar evidencia')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Abrir carpeta Predio de prueba, 1 evidencias' }));

    expect(await screen.findByRole('heading', { name: 'registro.pdf' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Filtros de evidencias' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver evidencia registro.pdf' })).toHaveAttribute(
      'href',
      '/api/v1/evidence/evidence-1/content'
    );
    expect(screen.getByText('Acceso al agua', { selector: 'p' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Eliminar|Descargar/ })).not.toBeInTheDocument();
    expect(document.querySelector('input[type="file"]')).not.toBeInTheDocument();
  });

  it('muestra el estado vacío dentro de una carpeta sin evidencias', async () => {
    vi.mocked(apiRequest).mockImplementation(async (path) => {
      if (path === '/evaluations') {
        return {
          items: [{
            id: 'evaluation-1',
            farmId: 'farm-1',
            farmName: 'Predio vacío',
            fecha: '2026-11-04',
            estado: 'En proceso'
          }]
        };
      }
      if (path === '/farms') return { items: [{ id: 'farm-1', nombre: 'Predio vacío' }] };
      if (path === '/evidence') return { items: [] };
      if (path === '/indicators?evaluationId=evaluation-1') {
        return { items: [{ id: 'indicator-1', nombre: 'Acceso al agua' }] };
      }
      throw new Error(`Solicitud inesperada: ${path}`);
    });

    await renderWithEvaluator(<ApiEvidencePage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Abrir carpeta Predio vacío, 0 evidencias' }));

    expect(await screen.findByRole('heading', { name: 'No hay evidencias registradas' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cargar evidencia' })).toBeInTheDocument();
    expect(document.querySelector('input[type="file"]')).not.toBeInTheDocument();
  });
});
