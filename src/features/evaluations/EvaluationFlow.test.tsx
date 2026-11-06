import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { ToastProvider } from '../../components/ToastProvider';
import { LocalDataProvider, useLocalData } from '../../data/LocalDataProvider';
import { AuthProvider } from '../auth/AuthProvider';
import { EvaluationForm } from './EvaluationForm';
import { renderWithEvaluator } from '../../test/renderWithEvaluator';

function EvaluationStateActions() {
  const { database, saveEvaluation, finalizeEvaluation } = useLocalData();
  const [createdId, setCreatedId] = useState('');
  const evaluation = database.evaluations.find((item) => item.id === createdId);

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          const created = saveEvaluation({
            predioId: 'PR-001',
            fecha: '2026-11-03',
            hora: '08:00',
            evaluador: 'Evaluador de prueba',
            investigadorNombres: 'Nombre',
            investigadorApellidos: 'Prueba',
            observaciones: ''
          });
          setCreatedId(created.id);
        }}
      >
        Crear
      </button>
      <button
        type="button"
        onClick={() =>
          evaluation &&
          saveEvaluation(
            {
              predioId: evaluation.predioId,
              fecha: evaluation.fecha,
              hora: evaluation.hora,
              evaluador: evaluation.evaluador,
              investigadorNombres: evaluation.investigadorNombres,
              investigadorApellidos: evaluation.investigadorApellidos,
              observaciones: evaluation.observaciones
            },
            evaluation.id
          )
        }
      >
        Guardar cambios
      </button>
      <button type="button" onClick={() => evaluation && finalizeEvaluation(evaluation.id)}>
        Enviar
      </button>
      <output data-testid="evaluation-status">{evaluation?.estado ?? 'Sin evaluación creada'}</output>
    </div>
  );
}

describe('flujo de estado de evaluación', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('crea en proceso, conserva estado al editar y finaliza con el envío', async () => {
    await renderWithEvaluator(<EvaluationStateActions />);

    fireEvent.click(screen.getByRole('button', { name: 'Crear' }));
    expect(screen.getByTestId('evaluation-status')).toHaveTextContent('En proceso');

    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    expect(screen.getByTestId('evaluation-status')).toHaveTextContent('En proceso');

    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));
    expect(screen.getByTestId('evaluation-status')).toHaveTextContent('Finalizada');
  }, 20_000);

  it('no muestra un selector manual de estado ni cédulas junto a los predios', async () => {
    render(
      <ToastProvider>
        <AuthProvider>
          <LocalDataProvider>
            <EvaluationForm open onClose={() => undefined} />
          </LocalDataProvider>
        </AuthProvider>
      </ToastProvider>
    );

    expect(await screen.findByRole('option', { name: 'Granja La Esperanza · Mosquera' })).toBeInTheDocument();
    expect(screen.queryByText(/C\.C\./)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^Estado/)).not.toBeInTheDocument();
  }, 20_000);
});
