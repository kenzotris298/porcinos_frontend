import { describe, expect, it } from 'vitest';
import { validateEvidenceFile } from './file';
import { validateEvaluationDraft, validateLoginDraft } from './validation';

describe('validación de acceso', () => {
  it('exige correo válido y contraseña de al menos 6 caracteres', () => {
    const errors = validateLoginDraft({ email: 'correo', password: '123' });
    expect(errors.email).toBeDefined();
    expect(errors.password).toBeDefined();

    expect(validateLoginDraft({ email: 'demo@ica.gov.co', password: 'demo1234' })).toEqual({});
  });
});

describe('validación de evaluación', () => {
  it('exige predio, fecha, evaluador e investigador', () => {
    const errors = validateEvaluationDraft({
      predioId: '',
      fecha: '',
      hora: '08:00',
      evaluador: ' ',
      investigadorNombres: '',
      investigadorApellidos: '',
      observaciones: ''
    });
    expect(errors.predioId).toBeDefined();
    expect(errors.fecha).toBeDefined();
    expect(errors.evaluador).toBeDefined();
    expect(errors.investigadorNombres).toBeDefined();
    expect(errors.investigadorApellidos).toBeDefined();
  });
});

describe('validación de evidencias', () => {
  it('acepta imágenes y PDF', () => {
    const image = new File(['contenido'], 'foto.png', { type: 'image/png' });
    const document = new File(['contenido'], 'soporte.pdf', { type: 'application/pdf' });
    expect(validateEvidenceFile(image).valid).toBe(true);
    expect(validateEvidenceFile(document).valid).toBe(true);
  });

  it('rechaza archivos sin extensión permitida', () => {
    const file = new File(['contenido'], 'script.exe', { type: 'application/octet-stream' });
    expect(validateEvidenceFile(file).valid).toBe(false);
  });
});
