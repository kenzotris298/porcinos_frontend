import { Compass, Home } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';

export function NotFoundPage() {
  return (
    <div className="page stack">
      <PageHeader
        eyebrow="Navegación"
        title="Página no encontrada"
        description="La ruta que intentaste abrir no existe en el sistema."
      />
      <div className="state-panel state-panel--empty">
        <span className="state-panel__icon" aria-hidden="true">
          <Compass size={32} />
        </span>
        <h2 className="state-panel__title">No encontramos esta pantalla</h2>
        <p className="state-panel__description">
          Puedes volver al panel principal y continuar desde allí con la gestión de evaluaciones,
          indicadores, evidencias y recomendaciones.
        </p>
        <div className="state-panel__action">
          <Link className="button button--primary button--md" to="/">
            <Home size={16} aria-hidden="true" />
            <span>Volver al panel</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
