export type FieldErrors<T extends string = string> = Partial<Record<T, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim());
}

export function isBlank(value: string | null | undefined): boolean {
  return !value || !value.trim();
}

export function isScore(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 100;
}

export function isCount(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

export interface EvaluationDraft {
  predioId: string;
  fecha: string;
  hora: string;
  evaluador: string;
  investigadorNombres: string;
  investigadorApellidos: string;
  observaciones: string;
}

export type EvaluationField = keyof EvaluationDraft;

export function validateEvaluationDraft(draft: EvaluationDraft): FieldErrors<EvaluationField> {
  const errors: FieldErrors<EvaluationField> = {};
  if (!draft.predioId) errors.predioId = 'Selecciona el predio evaluado.';
  if (!draft.fecha) errors.fecha = 'Ingresa la fecha de la evaluación.';
  else if (Number.isNaN(new Date(`${draft.fecha}T00:00:00`).getTime())) {
    errors.fecha = 'La fecha no es válida.';
  }
  if (isBlank(draft.evaluador)) errors.evaluador = 'Ingresa el nombre del evaluador.';
  if (isBlank(draft.investigadorNombres)) {
    errors.investigadorNombres = 'Ingresa los nombres del investigador.';
  }
  if (isBlank(draft.investigadorApellidos)) {
    errors.investigadorApellidos = 'Ingresa los apellidos del investigador.';
  }
  if (draft.observaciones.length > 2_000) {
    errors.observaciones = 'Las observaciones no pueden superar 2.000 caracteres.';
  }
  return errors;
}

export function hasErrors(errors: FieldErrors): boolean {
  return Object.keys(errors).length > 0;
}

export interface LoginDraft {
  email: string;
  password: string;
}

export function validateLoginDraft(draft: LoginDraft): FieldErrors<keyof LoginDraft> {
  const errors: FieldErrors<keyof LoginDraft> = {};
  if (!draft.email) errors.email = 'Ingresa tu correo institucional.';
  else if (!isValidEmail(draft.email)) errors.email = 'Escribe un correo electrónico válido.';
  if (!draft.password) errors.password = 'Ingresa tu contraseña.';
  else if (draft.password.length < 6) errors.password = 'La contraseña debe tener al menos 6 caracteres.';
  return errors;
}
