import { CheckCircle2, MailCheck, MapPin, Plus, Search, UserRoundPlus } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert } from '../components/Alert';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { FormField, Select, TextInput } from '../components/FormField';
import { PageHeader } from '../components/PageHeader';
import { useToast } from '../components/ToastProvider';
import { formatDate } from '../utils/format';
import {
  DEPARTMENTS,
  PRODUCTION_SYSTEMS,
  classifyProductionStratum,
  deriveProductionSystem,
  departmentName,
  farmDepartmentName,
  farmMunicipalityName,
  municipalitiesForDepartment,
  productionSystemLabel
} from '../data/colombia';
import {
  getOperationalEmptyState,
  useLocalData
} from '../data/LocalDataProvider';
import type { PersonRecord } from '../types';
import { isValidEmail } from '../utils/validation';
import { useAuth } from '../features/auth/AuthProvider';
import { ApiPersonRegistrationPage } from './ApiPersonRegistrationPage';

interface PersonDraft {
  cedula: string;
  nombres: string;
  celular: string;
  correo: string;
}

interface FarmDraft {
  nombre: string;
  codigoDepartamento: string;
  codigoMunicipio: string;
  vereda: string;
  animales: string;
  hembrasCria: string;
  animalesGordos: string;
}

const EMPTY_PERSON: PersonDraft = { cedula: '', nombres: '', celular: '', correo: '' };
const EMPTY_FARM: FarmDraft = {
  nombre: '',
  codigoDepartamento: '',
  codigoMunicipio: '',
  vereda: '',
  animales: '',
  hembrasCria: '0',
  animalesGordos: '0'
};

function createVerificationCode(): string {
  const value = new Uint32Array(1);
  window.crypto.getRandomValues(value);
  return String(value[0] % 1_000_000).padStart(6, '0');
}

export function PeopleFarmsPage() {
  const { session } = useAuth();
  if (session?.backend) return <ApiPersonRegistrationPage />;
  return <LocalPeopleFarmsPage />;
}

function LocalPeopleFarmsPage() {
  const {
    database,
    addPerson,
    addFarm,
    provenance,
    provenanceLoading,
    provenanceError,
    retryProvenance
  } = useLocalData();
  const { notify } = useToast();
  const navigate = useNavigate();
  const [personDraft, setPersonDraft] = useState<PersonDraft>(EMPTY_PERSON);
  const [personErrors, setPersonErrors] = useState<Record<string, string>>({});
  const [verificationCode, setVerificationCode] = useState('');
  const [enteredCode, setEnteredCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [cedulaSearch, setCedulaSearch] = useState('');
  const [selectedPersonId, setSelectedPersonId] = useState('');
  const [farmDraft, setFarmDraft] = useState<FarmDraft>(EMPTY_FARM);
  const [farmErrors, setFarmErrors] = useState<Record<string, string>>({});

  const peopleMatches = useMemo(() => {
    const query = cedulaSearch.trim().toLowerCase();
    return database.personas.filter(
      (person) =>
        !query ||
        person.cedula.includes(query) ||
        person.nombres.toLowerCase().includes(query)
    );
  }, [database.personas, cedulaSearch]);

  const selectedPerson = database.personas.find((person) => person.id === selectedPersonId);
  const selectedFarms = selectedPerson
    ? database.farms.filter((farm) => farm.personaId === selectedPerson.id)
    : [];
  const peopleEmptyState = getOperationalEmptyState(
    provenance?.people,
    {
      title: 'No se encontraron personas',
      description: 'No se encontraron personas con esa cédula o nombre.'
    },
    provenanceLoading,
    provenanceError
  );
  const farmsEmptyState = getOperationalEmptyState(
    provenance?.farms,
    {
      title: 'Sin predios registrados',
      description: 'Esta persona todavía no tiene predios registrados.'
    },
    provenanceLoading,
    provenanceError
  );
  const breedingFemales =
    farmDraft.hembrasCria === '' ? null : Number(farmDraft.hembrasCria);
  const fatteningAnimals =
    farmDraft.animalesGordos === '' ? null : Number(farmDraft.animalesGordos);
  const productionSystem = deriveProductionSystem({
    hembrasCria: breedingFemales,
    animalesGordos: fatteningAnimals
  });
  const municipalities = municipalitiesForDepartment(farmDraft.codigoDepartamento);
  const productionStratum = classifyProductionStratum({
    tipo: productionSystem,
    hembrasCria: breedingFemales,
    animalesGordos: fatteningAnimals
  });

  function validatePerson(): Record<string, string> {
    const next: Record<string, string> = {};
    const cedula = personDraft.cedula.trim();
    const correo = personDraft.correo.trim().toLowerCase();
    const phoneDigits = personDraft.celular.replace(/\D/g, '');
    const phoneCharactersValid = /^\+?[\d\s()-]+$/.test(personDraft.celular.trim());

    if (!/^\d{5,15}$/.test(cedula)) {
      next.cedula = 'Ingresa una cédula válida, solo con números (5 a 15 dígitos).';
    } else if (database.personas.some((person) => person.cedula === cedula)) {
      next.cedula = 'Ya existe una persona registrada con esta cédula.';
    }
    if (personDraft.nombres.trim().length < 3) {
      next.nombres = 'Ingresa los nombres y apellidos de la persona.';
    }
    if (!phoneCharactersValid || phoneDigits.length < 7 || phoneDigits.length > 15) {
      next.celular = 'Ingresa un número de celular válido.';
    }
    if (!isValidEmail(correo)) {
      next.correo = 'Ingresa un correo electrónico válido.';
    } else if (
      database.personas.some((person) => person.correo.toLowerCase() === correo)
    ) {
      next.correo = 'Ya existe una persona registrada con este correo.';
    }
    return next;
  }

  function requestVerification(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validatePerson();
    setPersonErrors(nextErrors);
    setCodeError('');
    setEnteredCode('');
    if (Object.keys(nextErrors).length) return;
    setVerificationCode(createVerificationCode());
  }

  function verifyAndRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!verificationCode || enteredCode.trim() !== verificationCode) {
      setCodeError('El código ingresado no es correcto. Verifica los seis dígitos.');
      return;
    }
    const nextErrors = validatePerson();
    setPersonErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      setVerificationCode('');
      return;
    }

    try {
      const person: PersonRecord = addPerson({
        cedula: personDraft.cedula.trim(),
        nombres: personDraft.nombres.trim(),
        celular: personDraft.celular.trim(),
        correo: personDraft.correo.trim().toLowerCase()
      });
      setSelectedPersonId(person.id);
      setCedulaSearch(person.cedula);
      setPersonDraft(EMPTY_PERSON);
      setVerificationCode('');
      setEnteredCode('');
      setPersonErrors({});
      notify('Persona registrada correctamente.');
    } catch (error) {
      setCodeError(
        error instanceof Error ? error.message : 'No se pudo registrar la persona.'
      );
    }
  }

  function updatePerson<K extends keyof PersonDraft>(key: K, value: PersonDraft[K]) {
    setPersonDraft((current) => ({ ...current, [key]: value }));
    setVerificationCode('');
    setEnteredCode('');
    setCodeError('');
    if (personErrors[key]) {
      setPersonErrors((current) => ({ ...current, [key]: '' }));
    }
  }

  function createFarm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    const animalCount = Number(farmDraft.animales);
    const municipality = municipalities.find((item) => item.code === farmDraft.codigoMunicipio);
    if (!selectedPerson) nextErrors.personaId = 'Selecciona primero a la persona responsable.';
    if (!farmDraft.nombre.trim()) nextErrors.nombre = 'Ingresa el nombre del predio.';
    if (!farmDraft.codigoDepartamento) nextErrors.codigoDepartamento = 'Selecciona el departamento.';
    if (!municipality) nextErrors.codigoMunicipio = 'Selecciona un municipio válido para el departamento.';
    if (!Number.isInteger(animalCount) || animalCount < 1) {
      nextErrors.animales = 'Ingresa una cantidad de animales mayor que cero.';
    }
    if (
      breedingFemales === null ||
      !Number.isInteger(breedingFemales) ||
      breedingFemales < 0 ||
      breedingFemales > animalCount
    ) {
      nextErrors.hembrasCria = 'Ingresa un entero entre 0 y el total de animales.';
    }
    if (
      fatteningAnimals === null ||
      !Number.isInteger(fatteningAnimals) ||
      fatteningAnimals < 0 ||
      fatteningAnimals > animalCount
    ) {
      nextErrors.animalesGordos = 'Ingresa un entero entre 0 y el total de animales.';
    }
    if (
      breedingFemales !== null &&
      fatteningAnimals !== null &&
      breedingFemales + fatteningAnimals > animalCount
    ) {
      nextErrors.animalesGordos =
        'La suma de hembras de cría y animales gordos no puede superar el total del predio.';
    }
    if (!productionSystem) {
      nextErrors.tipo = 'Ingresa al menos una cantidad mayor que cero en las fases productivas.';
    }
    setFarmErrors(nextErrors);
    if (
      Object.keys(nextErrors).length ||
      !selectedPerson ||
      !municipality ||
      !productionSystem ||
      breedingFemales === null ||
      fatteningAnimals === null
    ) return;

    try {
      addFarm({
        personaId: selectedPerson.id,
        nombre: farmDraft.nombre.trim(),
        codigoDepartamento: municipality.departmentCode,
        codigoMunicipio: municipality.code,
        departamento: departmentName(municipality.departmentCode) ?? '',
        municipio: municipality.name,
        vereda: farmDraft.vereda.trim(),
        responsable: selectedPerson.nombres,
        animales: animalCount,
        hembrasCria: breedingFemales,
        animalesGordos: fatteningAnimals,
        tipo: productionSystem
      });
      setFarmDraft(EMPTY_FARM);
      notify('Predio vinculado a la persona seleccionada.');
    } catch (error) {
      setFarmErrors((current) => ({
        ...current,
        personaId:
          error instanceof Error ? error.message : 'No se pudo crear el predio vinculado.'
      }));
    }
  }

  function selectPerson(person: PersonRecord) {
    setSelectedPersonId(person.id);
    setFarmErrors({});
  }

  return (
    <div className="page stack">
      <PageHeader
        eyebrow="Directorio"
        title="Personas y predios"
        description="Registra personas después de verificar su correo y vincula uno o varios predios a la cédula seleccionada."
      />

      <Alert tone="warning" title="Código de verificación">
        El código se genera en esta pantalla y no se envía al correo electrónico.
      </Alert>

      <div className="people-farms-grid">
        <section className="card people-card">
          <header className="card__header">
            <div>
              <p className="eyebrow">Paso 1</p>
              <h2>Registrar persona</h2>
            </div>
            <UserRoundPlus size={20} className="card__header-icon" aria-hidden="true" />
          </header>

          <form className="form" onSubmit={verificationCode ? verifyAndRegister : requestVerification}>
            <div className="form-grid form-grid--two">
              <FormField id="person-cedula" label="Cédula" error={personErrors.cedula} required>
                <TextInput
                  id="person-cedula"
                  inputMode="numeric"
                  value={personDraft.cedula}
                  invalid={Boolean(personErrors.cedula)}
                  placeholder="Solo números"
                  onChange={(event) => updatePerson('cedula', event.target.value)}
                />
              </FormField>
              <FormField id="person-nombres" label="Nombres y apellidos" error={personErrors.nombres} required>
                <TextInput
                  id="person-nombres"
                  value={personDraft.nombres}
                  invalid={Boolean(personErrors.nombres)}
                  onChange={(event) => updatePerson('nombres', event.target.value)}
                />
              </FormField>
              <FormField id="person-celular" label="Celular" error={personErrors.celular} required>
                <TextInput
                  id="person-celular"
                  type="tel"
                  value={personDraft.celular}
                  invalid={Boolean(personErrors.celular)}
                  placeholder="+57 300 000 0000"
                  onChange={(event) => updatePerson('celular', event.target.value)}
                />
              </FormField>
              <FormField id="person-correo" label="Correo electrónico" error={personErrors.correo} required>
                <TextInput
                  id="person-correo"
                  type="email"
                  value={personDraft.correo}
                  invalid={Boolean(personErrors.correo)}
                  onChange={(event) => updatePerson('correo', event.target.value)}
                />
              </FormField>
            </div>

            {verificationCode ? (
              <>
                <Alert tone="info" title="Código generado">
                  Ingresa este código para continuar: <strong>{verificationCode}</strong>.
                </Alert>
                <FormField id="person-code" label="Código de verificación" error={codeError} required>
                  <TextInput
                    id="person-code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={enteredCode}
                    invalid={Boolean(codeError)}
                    placeholder="6 dígitos"
                    onChange={(event) => {
                      setEnteredCode(event.target.value.replace(/\D/g, '').slice(0, 6));
                      setCodeError('');
                    }}
                  />
                </FormField>
              </>
            ) : null}

            <Button
              type="submit"
              icon={<MailCheck size={17} />}
            >
              {verificationCode ? 'Verificar y registrar persona' : 'Enviar código de verificación'}
            </Button>
          </form>
        </section>

        <section className="card people-card">
          <header className="card__header">
            <div>
              <p className="eyebrow">Paso 2</p>
              <h2>Buscar por cédula y vincular predio</h2>
            </div>
            <Search size={20} className="card__header-icon" aria-hidden="true" />
          </header>
          <FormField id="person-search" label="Buscar persona por cédula o nombre">
            <div className="search-box people-search">
              <Search size={17} aria-hidden="true" />
              <TextInput
                id="person-search"
                type="search"
                value={cedulaSearch}
                placeholder="Escribe la cédula"
                onChange={(event) => {
                  setCedulaSearch(event.target.value);
                  setSelectedPersonId('');
                }}
              />
            </div>
          </FormField>

          <div className="person-results" aria-live="polite">
            {peopleMatches.length ? (
              peopleMatches.map((person) => (
                <button
                  type="button"
                  key={person.id}
                  className={`person-result ${
                    selectedPersonId === person.id ? 'person-result--selected' : ''
                  }`}
                  onClick={() => selectPerson(person)}
                >
                  <span className="person-result__main">
                    <strong>{person.nombres}</strong>
                    <small>C.C. {person.cedula} · {person.correo}</small>
                  </span>
                  <span className="person-result__farms">
                    {database.farms.filter((farm) => farm.personaId === person.id).length} predios
                  </span>
                </button>
              ))
            ) : (
              <>
                <p className="people-empty">{peopleEmptyState.description}</p>
                {provenanceError ? (
                  <Button variant="secondary" onClick={() => void retryProvenance()}>
                    Reintentar
                  </Button>
                ) : null}
              </>
            )}
          </div>

          {selectedPerson ? (
            <div className="selected-person">
              <div className="selected-person__heading">
                <div>
                  <Badge tone="success">
                    <CheckCircle2 size={13} aria-hidden="true" /> Persona seleccionada
                  </Badge>
                  <h3>{selectedPerson.nombres}</h3>
                  <p>C.C. {selectedPerson.cedula} · {selectedPerson.celular} · {selectedPerson.correo}</p>
                </div>
              </div>

              <form className="form farm-form" onSubmit={createFarm}>
                <h3>Nuevo predio de esta persona</h3>
                <div className="form-grid form-grid--two">
                  <FormField id="farm-name" label="Nombre del predio" error={farmErrors.nombre} required>
                    <TextInput
                      id="farm-name"
                      value={farmDraft.nombre}
                      invalid={Boolean(farmErrors.nombre)}
                      onChange={(event) => setFarmDraft((current) => ({ ...current, nombre: event.target.value }))}
                    />
                  </FormField>
                  <FormField
                    id="farm-type"
                    label="Sistema de producción"
                    error={farmErrors.tipo}
                    required
                    hint="Se calcula con las cantidades de hembras de cría y animales gordos, no solo con el total."
                  >
                    <Select
                      id="farm-type"
                      value={productionSystem}
                      invalid={Boolean(farmErrors.tipo)}
                      disabled
                    >
                      <option value="">Ingresa cantidades por fase</option>
                      {PRODUCTION_SYSTEMS.map((system) => (
                        <option key={system.value} value={system.value}>{system.label}</option>
                      ))}
                    </Select>
                  </FormField>
                  <FormField id="farm-animals" label="Cantidad total de animales" error={farmErrors.animales} required>
                    <TextInput
                      id="farm-animals"
                      type="number"
                      min={1}
                      step={1}
                      value={farmDraft.animales}
                      invalid={Boolean(farmErrors.animales)}
                      onChange={(event) => setFarmDraft((current) => ({ ...current, animales: event.target.value }))}
                    />
                  </FormField>
                  <FormField
                    id="farm-breeding-females"
                    label="Hembras de cría"
                    error={farmErrors.hembrasCria}
                    required
                    hint="Estrato: menos de 3 = traspatio; 3–9 = comercial familiar; 10–99 = comercial industrial; más de 100 = tecnificado comercial."
                  >
                    <TextInput
                      id="farm-breeding-females"
                      type="number"
                      min={0}
                      step={1}
                      value={farmDraft.hembrasCria}
                      invalid={Boolean(farmErrors.hembrasCria)}
                      onChange={(event) => setFarmDraft((current) => ({ ...current, hembrasCria: event.target.value }))}
                    />
                  </FormField>
                  <FormField
                    id="farm-fattening-animals"
                    label="Animales gordos"
                    error={farmErrors.animalesGordos}
                    required
                    hint="Estrato: menos de 15 = traspatio; 15–99 = comercial familiar; 100–599 = comercial industrial; más de 600 = tecnificado comercial."
                  >
                    <TextInput
                      id="farm-fattening-animals"
                      type="number"
                      min={0}
                      step={1}
                      value={farmDraft.animalesGordos}
                      invalid={Boolean(farmErrors.animalesGordos)}
                      onChange={(event) => setFarmDraft((current) => ({ ...current, animalesGordos: event.target.value }))}
                    />
                  </FormField>
                  <FormField
                    id="farm-department"
                    label="Departamento"
                    error={farmErrors.codigoDepartamento}
                    required
                  >
                    <Select
                      id="farm-department"
                      value={farmDraft.codigoDepartamento}
                      invalid={Boolean(farmErrors.codigoDepartamento)}
                      onChange={(event) => {
                        setFarmDraft((current) => ({
                          ...current,
                          codigoDepartamento: event.target.value,
                          codigoMunicipio: ''
                        }));
                        setFarmErrors((current) => ({
                          ...current,
                          codigoDepartamento: '',
                          codigoMunicipio: ''
                        }));
                      }}
                    >
                      <option value="">Selecciona un departamento</option>
                      {DEPARTMENTS.map((department) => (
                        <option key={department.code} value={department.code}>
                          {department.name}
                        </option>
                      ))}
                    </Select>
                  </FormField>
                  <FormField
                    id="farm-municipality"
                    label="Municipio"
                    error={farmErrors.codigoMunicipio}
                    required
                  >
                    <Select
                      id="farm-municipality"
                      value={farmDraft.codigoMunicipio}
                      disabled={!farmDraft.codigoDepartamento}
                      invalid={Boolean(farmErrors.codigoMunicipio)}
                      onChange={(event) => setFarmDraft((current) => ({ ...current, codigoMunicipio: event.target.value }))}
                    >
                      <option value="">Selecciona un municipio</option>
                      {municipalities.map((municipality) => (
                        <option key={municipality.code} value={municipality.code}>
                          {municipality.name}
                          {municipality.type !== 'MUNICIPIO'
                            ? ` (${municipality.type.toLocaleLowerCase('es-CO')})`
                            : ''}
                        </option>
                      ))}
                    </Select>
                  </FormField>
                  <FormField id="farm-vereda" label="Vereda (opcional)" error={farmErrors.vereda}>
                    <TextInput
                      id="farm-vereda"
                      value={farmDraft.vereda}
                      invalid={Boolean(farmErrors.vereda)}
                      onChange={(event) => setFarmDraft((current) => ({ ...current, vereda: event.target.value }))}
                    />
                  </FormField>
                </div>
                {productionSystem ? (
                  <Alert
                    tone={
                      productionStratum.value === 'review' ||
                      productionStratum.value === 'commercial-industrial' ||
                      productionStratum.value === 'commercial-technical'
                        ? 'warning'
                        : 'info'
                    }
                    title={`Estrato productivo calculado: ${productionStratum.label}`}
                  >
                    {productionStratum.detail} Sistema seleccionado:{' '}
                    {productionSystemLabel(productionSystem)}. Para ciclo completo, ambas cantidades
                    deben coincidir en el mismo estrato; si no, se solicita revisión.
                  </Alert>
                ) : null}
                {farmErrors.personaId ? <Alert tone="danger">{farmErrors.personaId}</Alert> : null}
                <Button type="submit" icon={<Plus size={17} />}>Crear predio vinculado</Button>
              </form>

              <div className="owned-farms">
                <h3>
                  <MapPin size={16} aria-hidden="true" /> Predios vinculados ({selectedFarms.length})
                </h3>
                {selectedFarms.length ? (
                  <ul>
                    {selectedFarms.map((farm) => (
                      <li key={farm.id}>
                        {(() => {
                          const latestEvaluation = database.evaluations
                            .filter((evaluation) => evaluation.predioId === farm.id)
                            .sort(
                              (a, b) =>
                                b.fecha.localeCompare(a.fecha) ||
                                b.hora.localeCompare(a.hora)
                            )[0];
                          return (
                            <button
                              type="button"
                              className="owned-farm-button"
                              disabled={!latestEvaluation}
                              onClick={() => {
                                if (latestEvaluation) {
                                  navigate(`/evaluaciones/${latestEvaluation.id}`);
                                }
                              }}
                            >
                              <span className="owned-farm-button__heading">
                                <strong>{farm.nombre}</strong>
                                <span className="owned-farm-button__action">
                                  {latestEvaluation
                                    ? 'Abrir evaluación'
                                    : 'Aún sin evaluación'}
                                </span>
                              </span>
                              <span>
                                {farm.vereda}, {farmMunicipalityName(farm)}, {farmDepartmentName(farm)} ·{' '}
                                {productionSystemLabel(farm.tipo)} · {farm.animales} animales ·{' '}
                                {classifyProductionStratum(farm).label}
                              </span>
                              {latestEvaluation ? (
                                <span className="owned-farm-button__date">
                                  Evaluación más reciente: {formatDate(latestEvaluation.fecha)} ·{' '}
                                  {latestEvaluation.estado}
                                </span>
                              ) : null}
                            </button>
                          );
                        })()}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <>
                    <p className="people-empty">{farmsEmptyState.description}</p>
                    {provenanceError ? (
                      <Button variant="secondary" onClick={() => void retryProvenance()}>
                        Reintentar
                      </Button>
                    ) : null}
                  </>
                )}
              </div>
            </div>
          ) : (
            <Alert tone="info">Selecciona una persona para consultar sus predios o registrar uno nuevo.</Alert>
          )}
        </section>
      </div>
    </div>
  );
}
