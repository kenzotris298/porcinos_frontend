import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Leaf,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Alert } from '../../components/Alert';
import { Button } from '../../components/Button';
import { FormField, TextInput } from '../../components/FormField';
import type { Role } from '../../types';
import { errorMessage } from '../../utils/format';
import {
  hasErrors,
  validateLoginDraft,
  type FieldErrors
} from '../../utils/validation';
import { useAuth } from './AuthProvider';

export function LoginPage() {
  const { session, loading, authError, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [role, setRole] = useState<Role>('evaluator');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FieldErrors<'email' | 'password'>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!loading && session) {
    const from = (location.state as { from?: string } | null)?.from;
    return <Navigate to={from && from !== '/login' ? from : '/'} replace />;
  }

  function selectRole(nextRole: Role) {
    setRole(nextRole);
    setEmail('');
    setErrors({});
    setSubmitError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateLoginDraft({ email, password });
    setErrors(nextErrors);
    if (hasErrors(nextErrors)) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      await login({ email, password, role });
      const from = (location.state as { from?: string } | null)?.from;
      const defaultRoute = '/';
      navigate(from && from !== '/login' ? from : defaultRoute, { replace: true });
    } catch (error) {
      setSubmitError(errorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="login-loading" role="status" aria-live="polite">
        <span className="login-loading__mark">
          <img src="/brand/logo-mark.svg" width="34" height="34" alt="" />
        </span>
        <p>Preparando el entorno de bienestar porcino…</p>
      </div>
    );
  }

  return (
    <div className="login">
      <section className="login__brand" aria-label="Presentación de la plataforma">
        <div className="login__brand-top">
          <div className="brand-mark brand-mark--light">
            <img src="/brand/logo-mark.svg" width="28" height="28" alt="" />
          </div>
          <div>
            <p className="login__brand-name">Bienestar Porcino</p>
            <p className="login__brand-sub">Instituto Colombiano Agropecuario · ICA</p>
          </div>
        </div>

        <div className="login__brand-content">
          <span className="login__pill">
            <Sparkles size={14} aria-hidden="true" />
            Registro y seguimiento del bienestar porcino
          </span>
          <h1>
            Evaluar el bienestar animal con evidencia,
            <em> no con suposiciones.</em>
          </h1>
          <p>
            Registra evaluaciones en campo, documenta indicadores y genera recomendaciones
            técnicas claras para cada predio porcícola.
          </p>

          <div className="login__features">
            <div className="login__feature">
              <span className="login__feature-icon">
                <CheckCircle2 size={18} aria-hidden="true" />
              </span>
              <div>
                <strong>43 criterios y 4 libertades</strong>
                <span>Metodología EBA Porcinos 3.0</span>
              </div>
            </div>
            <div className="login__feature">
              <span className="login__feature-icon">
                <ShieldCheck size={18} aria-hidden="true" />
              </span>
              <div>
                <strong>Evidencia trazable</strong>
                <span>Fotografías y soportes por indicador</span>
              </div>
            </div>
            <div className="login__feature">
              <span className="login__feature-icon">
                <Leaf size={18} aria-hidden="true" />
              </span>
              <div>
                <strong>Recomendaciones de apoyo</strong>
                <span>Planes de mejora y seguimiento</span>
              </div>
            </div>
          </div>
        </div>

        <div className="login__brand-footer">
          <Leaf size={16} aria-hidden="true" />
          <p>
            La plataforma apoya el registro y seguimiento de evaluaciones; no emite certificaciones
            oficiales del ICA.
          </p>
        </div>

        <div className="login__decor" aria-hidden="true">
          <span className="login__decor-circle login__decor-circle--one" />
          <span className="login__decor-circle login__decor-circle--two" />
          <span className="login__decor-line" />
        </div>
      </section>

      <section className="login__panel">
        <div className="login__card">
          <div className="login__mobile-brand">
            <span className="brand-mark">
              <img src="/brand/logo-mark.svg" width="23" height="23" alt="" />
            </span>
            <span>Bienestar Porcino</span>
          </div>

          <header className="login__header">
            <p className="eyebrow">Acceso al sistema</p>
            <h2>Bienvenido de nuevo</h2>
            <p>Selecciona tu perfil. Los propietarios ingresan con el correo registrado en su predio.</p>
          </header>

          <div className="role-switch" role="group" aria-label="Selección de perfil">
            <button
              type="button"
              className={`role-switch__option ${role === 'evaluator' ? 'is-active' : ''}`}
              onClick={() => selectRole('evaluator')}
              aria-pressed={role === 'evaluator'}
            >
              <span className="role-switch__title">Evaluador</span>
              <span className="role-switch__hint">Registrar y editar</span>
            </button>
            <button
              type="button"
              className={`role-switch__option ${role === 'owner' ? 'is-active' : ''}`}
              onClick={() => selectRole('owner')}
              aria-pressed={role === 'owner'}
            >
              <span className="role-switch__title">Propietario</span>
              <span className="role-switch__hint">Solo consulta</span>
            </button>
          </div>

          {authError ? <Alert tone="warning">{authError}</Alert> : null}
          {submitError ? <Alert tone="danger">{submitError}</Alert> : null}

          <form className="login__form" onSubmit={handleSubmit} noValidate>
            <FormField
              id="login-email"
              label={role === 'owner' ? 'Correo registrado en el predio' : 'Correo del evaluador'}
              error={errors.email}
              required
            >
              <div className="input-with-icon">
                <Mail size={17} aria-hidden="true" />
                <TextInput
                  id="login-email"
                  type="email"
                  autoComplete="username"
                  placeholder={role === 'owner' ? 'correo registrado en el predio' : 'nombre@ica.gov.co'}
                  value={email}
                  invalid={Boolean(errors.email)}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    if (errors.email) setErrors((current) => ({ ...current, email: undefined }));
                  }}
                />
              </div>
            </FormField>

            <FormField id="login-password" label="Contraseña" error={errors.password} required>
              <div className="input-with-icon">
                <LockKeyhole size={17} aria-hidden="true" />
                <TextInput
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  invalid={Boolean(errors.password)}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    if (errors.password) setErrors((current) => ({ ...current, password: undefined }));
                  }}
                />
                <button
                  type="button"
                  className="input-with-icon__action"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </FormField>

            <Button
              type="submit"
              loading={submitting}
              className="button--block button--lg"
              icon={<ArrowRight size={18} />}
            >
              Ingresar al sistema
            </Button>
          </form>

          <p className="login__legal">
            El acceso requiere una cuenta activa y credenciales válidas para el perfil seleccionado.
          </p>
        </div>
      </section>
    </div>
  );
}
