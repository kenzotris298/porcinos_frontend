import { fireEvent, screen } from '@testing-library/react';
import { useState } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useLocalData } from './LocalDataProvider';
import { renderWithEvaluator, renderWithOwner, renderWithSession } from '../test/renderWithEvaluator';
import type { Session } from '../types';

function DataWriteProbe() {
  const { database, saveEvaluation } = useLocalData();
  const [message, setMessage] = useState('');
  return (
    <div>
      <output data-testid="data-farms">{database.farms.map((farm) => farm.nombre).join(',')}</output>
      <output data-testid="data-evaluations">{database.evaluations.length}</output>
      <button
        type="button"
        onClick={() => {
          try {
            saveEvaluation({
              predioId: 'PR-002',
              fecha: '2026-11-03',
              hora: '08:00',
              evaluador: 'Propietario',
              investigadorNombres: 'Persona',
              investigadorApellidos: 'Prueba',
              observaciones: ''
            });
          } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Error');
          }
        }}
      >
        Intentar escribir
      </button>
      <output data-testid="write-error">{message}</output>
    </div>
  );
}

function RecommendationGenerationProbe() {
  const { generateRecommendationPlan } = useLocalData();
  const [message, setMessage] = useState('');
  function generateTwice() {
    const item = {
      title: 'Recomendación de prueba',
      text: 'Registrar una acción de mejora.',
      source: 'plantilla_local' as const
    };
    generateRecommendationPlan('EV-2026-004', [item], 'Evaluador de prueba');
    try {
      generateRecommendationPlan('EV-2026-004', [item], 'Evaluador de prueba');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Error');
    }
  }
  return (
    <div>
      <button onClick={generateTwice}>Generar dos veces</button>
      <output data-testid="generation-error">{message}</output>
    </div>
  );
}

describe('acceso local por rol', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('limita las lecturas del propietario a sus predios y bloquea escrituras', async () => {
    await renderWithOwner(<DataWriteProbe />);

    expect(screen.getByTestId('data-farms')).toHaveTextContent('Granja La Esperanza');
    expect(screen.getByTestId('data-farms')).not.toHaveTextContent('Porcícola El Roble');
    expect(Number(screen.getByTestId('data-evaluations').textContent)).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: 'Intentar escribir' }));
    expect(screen.getByTestId('write-error')).toHaveTextContent(
      'Esta acción está disponible solo para evaluadores.'
    );
  });

  it('impide dos generaciones del mismo plan dentro de una misma sesión', async () => {
    await renderWithEvaluator(<RecommendationGenerationProbe />);

    fireEvent.click(screen.getByRole('button', { name: 'Generar dos veces' }));
    expect(screen.getByTestId('generation-error')).toHaveTextContent(
      'El plan de recomendaciones de esta evaluación ya fue generado.'
    );
  });

  it('no simula operaciones locales en una sesión autenticada por el backend', async () => {
    const backendSession: Session = {
      email: 'evaluator@example.org',
      name: 'Evaluador',
      role: 'evaluator',
      mustChangePassword: false,
      authBackend: true
    };
    await renderWithSession(<DataWriteProbe />, backendSession);

    fireEvent.click(screen.getByRole('button', { name: 'Intentar escribir' }));
    expect(screen.getByTestId('write-error')).toHaveTextContent(
      'Los módulos operativos siguen desconectados mientras se verifica la procedencia de los registros existentes.'
    );
  });
});
