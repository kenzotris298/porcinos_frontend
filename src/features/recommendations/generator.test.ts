import { describe, expect, it } from 'vitest';
import { createSeedDatabase } from '../../data/seed';
import { allEvaluationInsights } from '../evaluations/results';
import { generateRecommendations } from './generator';

describe('sugerencias de mejora', () => {
  it('incluye todos los puntajes bajo 75 y destaca los puntajes cero', () => {
    const database = createSeedDatabase();
    const evaluation = allEvaluationInsights(database).find(
      (item) => item.evaluation.id === 'EV-2026-003'
    );
    expect(evaluation).toBeDefined();

    const suggestions = generateRecommendations(evaluation!);
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions.every((item) => item.score < 75)).toBe(true);
    expect(suggestions.some((item) => item.score === 0)).toBe(true);
    expect(suggestions.find((item) => item.score === 0)?.text).toContain('Puntaje 0/100');
    expect(suggestions.every((item) => item.action.trim().length > 0)).toBe(true);
  });
});
