import { ArrowRight, CheckCircle2, MailCheck, Search, UserRoundPlus } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Alert } from '../components/Alert';
import { Button } from '../components/Button';
import { FormField, TextInput } from '../components/FormField';
import { Modal } from '../components/Modal';
import { PageHeader } from '../components/PageHeader';
import { apiRequest } from '../api/client';
import {
  classifyProductionStratum,
  DEPARTMENTS,
  deriveProductionSystem,
  municipalitiesForDepartment,
  PRODUCTION_SYSTEMS
} from '../data/colombia';
import { useToast } from '../components/ToastProvider';

interface ApiPerson {
  id: string;
  cedula: string;
  nombres: string;
}

interface ApiFarm {
  id: string;
  nombre: string;
  personId: string;
}

interface PersonDraft {
  cedula: string;
  nombres: string;
  celular: string;
  correo: string;
}

const EMPTY_PERSON: PersonDraft = { cedula: '', nombres: '', celular: '', correo: '' };

export function ApiPersonRegistrationPage() {
  const { notify } = useToast();
  const [person, setPerson] = useState<PersonDraft>(EMPTY_PERSON);
  const [ownerInitialPassword, setOwnerInitialPassword] = useState('');
  const [codeRequested, setCodeRequested] = useState(false);
  const [code, setCode] = useState('');
  const [verificationToken, setVerificationToken] = useState('');
  const [personId, setPersonId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sendingCode, setSendingCode] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [saving, setSaving] = useState(false);
  const [people, setPeople] = useState<ApiPerson[]>([]);
  const [registeredPerson, setRegisteredPerson] = useState<ApiPerson | null>(null);
  const [createdFarms, setCreatedFarms] = useState<ApiFarm[]>([]);
  const [farmCedula, setFarmCedula] = useState('');
  const [personSearchOpen, setPersonSearchOpen] = useState(false);
  const [personSearchCedula, setPersonSearchCedula] = useState('');
  const [farmPersonError, setFarmPersonError] = useState<string | undefined>();
  const [farmCountError, setFarmCountError] = useState<string | undefined>();
  const [submittedFarmPersonId, setSubmittedFarmPersonId] = useState('');
  const [farmName, setFarmName] = useState('');
  const [departmentCode, setDepartmentCode] = useState('');
  const [municipalityCode, setMunicipalityCode] = useState('');
  const [farmPath, setFarmPath] = useState('');
  const [animalCount, setAnimalCount] = useState('');
  const [breedingFemales, setBreedingFemales] = useState('');
  const [fatteningAnimals, setFatteningAnimals] = useState('');
  const [savingFarm, setSavingFarm] = useState(false);
  const municipalities = municipalitiesForDepartment(departmentCode);
  const phaseCountsEntered = breedingFemales !== '' || fatteningAnimals !== '';
  const breedingCount = Number(breedingFemales || 0);
  const fatteningCount = Number(fatteningAnimals || 0);
  const productionSystem = phaseCountsEntered
    ? deriveProductionSystem({
      hembrasCria: breedingCount,
      animalesGordos: fatteningCount
    })
    : '';
  const productionSystemLabel =
    PRODUCTION_SYSTEMS.find((item) => item.value === productionSystem)?.label ?? '';
  const productionStratum = classifyProductionStratum({
    tipo: productionSystem,
    hembrasCria: breedingCount,
    animalesGordos: fatteningCount
  });
  const availablePeople =
    registeredPerson && !people.some((item) => item.id === registeredPerson.id)
      ? [...people, registeredPerson]
      : people;
  const matchedFarmPerson = availablePeople.find((item) => item.cedula === farmCedula.trim());
  const searchedPeople = personSearchCedula.trim()
    ? availablePeople.filter((item) => item.cedula.includes(personSearchCedula.trim()))
    : [];
  const selectedFarms = matchedFarmPerson
    ? createdFarms.filter((farm) => farm.personId === matchedFarmPerson.id)
    : [];
  const showSubmittedFarms =
    Boolean(matchedFarmPerson) && submittedFarmPersonId === matchedFarmPerson?.id;

  const loadPeople = async () => {
    try {
      const peopleResponse = await apiRequest<{ items: ApiPerson[] }>('/people');
      setPeople(peopleResponse.items);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudieron cargar las personas.');
    }
  };

  useEffect(() => {
    void loadPeople();
  }, []);

  function updatePerson<K extends keyof PersonDraft>(key: K, value: PersonDraft[K]) {
    setPerson((current) => ({ ...current, [key]: value }));
    setOwnerInitialPassword('');
    setVerificationToken('');
    setCodeRequested(false);
    setPersonId('');
    setError(null);
  }

  async function sendCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSendingCode(true);
    setError(null);
    setVerificationToken('');
    setOwnerInitialPassword('');
    setPersonId('');
    try {
      await apiRequest<{ message: string }>('/people/verification-codes', {
        method: 'POST',
        body: { email: person.correo.trim().toLowerCase() }
      });
      setCodeRequested(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo enviar el código.');
    } finally {
      setSendingCode(false);
    }
  }

  async function verifyEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setVerifying(true);
    setError(null);
    try {
      const response = await apiRequest<{ verificationToken: string }>(
        '/people/verification-codes/verify',
        {
          method: 'POST',
          body: { email: person.correo.trim().toLowerCase(), code }
        }
      );
      setVerificationToken(response.verificationToken);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo verificar el correo.');
    } finally {
      setVerifying(false);
    }
  }

  async function registerPerson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!verificationToken) {
      setError('Primero verifica el correo con el código recibido.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const response = await apiRequest<{
        id: string;
        nombres: string;
        ownerAccountCreated: boolean;
      }>('/people', {
        method: 'POST',
        body: {
          cedula: person.cedula.trim(),
          nombres: person.nombres.trim(),
          celular: person.celular.trim(),
          correo: person.correo.trim().toLowerCase(),
          verificationToken,
          ownerInitialPassword
        }
      });
      if (response.ownerAccountCreated !== true) {
        throw new Error(
          'El backend no confirmó la creación de la cuenta propietaria. No repitas el registro; solicita verificar la cuenta.'
        );
      }
      setRegisteredPerson({
        id: response.id,
        cedula: person.cedula.trim(),
        nombres: response.nombres
      });
      setPersonId(response.id);
      setVerificationToken('');
      setOwnerInitialPassword('');
      setFarmCedula(person.cedula.trim());
      setPerson(EMPTY_PERSON);
      setCode('');
      notify('Persona y cuenta propietaria registradas correctamente.');
      await loadPeople();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo registrar la persona.');
    } finally {
      setSaving(false);
    }
  }

  async function createFarm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!matchedFarmPerson) {
      setFarmPersonError(
        'No encontramos una persona registrada con esa cédula. Verifica primero su correo y regístrala.'
      );
      return;
    }
    if (Number(breedingFemales) + Number(fatteningAnimals) > Number(animalCount)) {
      setFarmCountError(
        'La suma de hembras de cría y animales de engorde no puede superar el total de animales.'
      );
      return;
    }
    setSavingFarm(true);
    setError(null);
    setFarmPersonError(undefined);
    setFarmCountError(undefined);
    try {
      const response = await apiRequest<ApiFarm>('/farms', {
        method: 'POST',
        body: {
          personId: matchedFarmPerson.id,
          codigoDepartamento: departmentCode,
          codigoMunicipio: municipalityCode,
          nombre: farmName.trim(),
          vereda: farmPath.trim(),
          animales: Number(animalCount),
          hembrasCria: Number(breedingFemales),
          animalesGordos: Number(fatteningAnimals)
        }
      });
      if (response.personId !== matchedFarmPerson.id) {
        throw new Error('El backend no confirmó que el predio pertenezca a la persona indicada.');
      }
      notify('Predio registrado y vinculado a la persona.');
      setSubmittedFarmPersonId(matchedFarmPerson.id);
      setFarmName('');
      setFarmPath('');
      setAnimalCount('');
      setBreedingFemales('');
      setFatteningAnimals('');
      setCreatedFarms((current) => [...current, response]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo registrar el predio.');
    } finally {
      setSavingFarm(false);
    }
  }

  return (
    <div className="page stack">
      <PageHeader
        eyebrow="Registro en el backend"
        title="Registrar persona"
        description="El registro en MariaDB crea también la cuenta Propietario vinculada. Configura una contraseña temporal única para cada propietario y entrégasela por un canal seguro."
      />

      {error ? <Alert tone="danger">{error}</Alert> : null}
      {personId ? (
        <Alert tone="success" title="Persona y cuenta propietaria creadas">
          La cuenta usa el correo verificado. Entrega al propietario, por un canal seguro, la contraseña temporal única que configuraste; deberá cambiarla antes de usar el sistema. UUID de la persona:
          <p><code>{personId}</code></p>
        </Alert>
      ) : null}

      <div className="people-farms-grid">
        <div className="stack">
          <section className="card">
            <header className="card__header">
              <div>
                <p className="eyebrow">Datos personales</p>
                <h2>Información de la persona</h2>
              </div>
              <UserRoundPlus size={22} aria-hidden="true" />
            </header>
            <form className="form" onSubmit={sendCode}>
              <div className="form-grid form-grid--two">
                <FormField id="api-person-cedula" label="Cédula" hint="Solo números, de 5 a 15 dígitos." required>
                  <TextInput
                    id="api-person-cedula"
                    inputMode="numeric"
                    pattern="[0-9]{5,15}"
                    minLength={5}
                    maxLength={15}
                    value={person.cedula}
                    onChange={(event) => updatePerson('cedula', event.target.value)}
                    required
                  />
                </FormField>
                <FormField id="api-person-name" label="Nombres y apellidos" required>
                  <TextInput
                    id="api-person-name"
                    minLength={3}
                    maxLength={180}
                    value={person.nombres}
                    onChange={(event) => updatePerson('nombres', event.target.value)}
                    required
                  />
                </FormField>
                <FormField id="api-person-phone" label="Celular" required>
                  <TextInput
                    id="api-person-phone"
                    type="tel"
                    minLength={7}
                    maxLength={20}
                    value={person.celular}
                    onChange={(event) => updatePerson('celular', event.target.value)}
                    required
                  />
                </FormField>
                <FormField
                  id="api-person-email"
                  label="Correo de la persona"
                  hint="Debe poder recibir el código y se usará también para su cuenta propietaria."
                  required
                >
                  <TextInput
                    id="api-person-email"
                    type="email"
                    autoComplete="email"
                    maxLength={254}
                    value={person.correo}
                    onChange={(event) => updatePerson('correo', event.target.value)}
                    required
                  />
                </FormField>
              </div>
              <Button
                type="submit"
                icon={<MailCheck size={17} />}
                loading={sendingCode}
                disabled={sendingCode || Boolean(personId)}
              >
                Enviar código al correo
              </Button>
            </form>
          </section>

          <section className="card">
            <header className="card__header">
              <div>
                <p className="eyebrow">Verificación de correo</p>
                <h2>Confirma que puedes recibir mensajes</h2>
              </div>
              <CheckCircle2 size={22} aria-hidden="true" />
            </header>
            <form
              className="form"
              onSubmit={verificationToken ? registerPerson : verifyEmail}
            >
              <FormField id="api-person-code" label="Código de seis dígitos" required>
                <TextInput
                  id="api-person-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  minLength={6}
                  maxLength={6}
                  value={code}
                  disabled={!codeRequested || Boolean(personId)}
                  onChange={(event) => {
                    setCode(event.target.value);
                    setError(null);
                  }}
                  required
                />
              </FormField>
              {verificationToken ? (
                <Alert tone="success">Correo verificado. El comprobante vence en 15 minutos.</Alert>
              ) : null}
              {verificationToken ? (
                <FormField
                  id="api-owner-initial-password"
                  label="Contraseña temporal del propietario"
                  hint="Mínimo 12 caracteres. Usa una distinta para cada propietario y entrégala por un canal seguro."
                  required
                >
                  <TextInput
                    id="api-owner-initial-password"
                    type="password"
                    autoComplete="new-password"
                    minLength={12}
                    maxLength={128}
                    value={ownerInitialPassword}
                    onChange={(event) => setOwnerInitialPassword(event.target.value)}
                    required
                  />
                </FormField>
              ) : null}
              <Button
                type="submit"
                icon={<CheckCircle2 size={17} />}
                loading={verifying || saving}
                disabled={verifying || saving || Boolean(personId) || !codeRequested}
              >
                {verificationToken ? 'Registrar persona y crear cuenta' : 'Verificar código'}
              </Button>
            </form>
          </section>
        </div>

        <section className="card">
          <header className="card__header">
            <div>
              <p className="eyebrow">Predios</p>
              <h2>Vincular un predio a una persona</h2>
            </div>
          </header>
          <form className="form" onSubmit={createFarm}>
            <div className="form-grid form-grid--two">
              <FormField
                id="api-farm-cedula"
                label="Cédula de la persona responsable"
                error={farmPersonError}
                required
              >
                <TextInput
                  id="api-farm-cedula"
                  inputMode="numeric"
                  pattern="[0-9]{5,15}"
                  minLength={5}
                  maxLength={15}
                  value={farmCedula}
                  onChange={(event) => {
                    setFarmCedula(event.target.value);
                    setFarmPersonError(undefined);
                    setSubmittedFarmPersonId('');
                  }}
                  required
                />
                <Button
                  type="button"
                  variant="secondary"
                  icon={<Search size={16} />}
                  onClick={() => {
                    setPersonSearchCedula(farmCedula);
                    setPersonSearchOpen(true);
                  }}
                >
                  Buscar persona
                </Button>
              </FormField>
              <FormField id="api-farm-person" label="Persona responsable">
                <TextInput id="api-farm-person" value={matchedFarmPerson?.nombres ?? ''} readOnly />
              </FormField>
              <FormField
                id="api-farm-type"
                label="Sistema de producción"
                hint="Se determina según las fases productivas registradas."
              >
                <TextInput
                  id="api-farm-type"
                  value={productionSystemLabel}
                  placeholder="Ingresa las cantidades por fase"
                  readOnly
                />
              </FormField>
              <FormField
                id="api-farm-stratum"
                label="Estrato productivo ICA"
                hint={productionStratum.detail}
              >
                <TextInput
                  id="api-farm-stratum"
                  value={productionStratum.value === 'incomplete' ? '' : productionStratum.label}
                  readOnly
                />
              </FormField>
            </div>
            <div className="form-grid form-grid--two">
              <FormField id="api-farm-name" label="Nombre del predio" required>
                <TextInput id="api-farm-name" value={farmName} maxLength={180} onChange={(event) => setFarmName(event.target.value)} required />
              </FormField>
              <FormField id="api-farm-path" label="Vereda">
                <TextInput id="api-farm-path" value={farmPath} maxLength={180} onChange={(event) => setFarmPath(event.target.value)} />
              </FormField>
              <FormField id="api-farm-department" label="Departamento" required>
                <select id="api-farm-department" className="input input--select" value={departmentCode} onChange={(event) => { setDepartmentCode(event.target.value); setMunicipalityCode(''); }} required>
                  <option value="">Selecciona un departamento</option>
                  {DEPARTMENTS.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}
                </select>
              </FormField>
              <FormField id="api-farm-municipality" label="Municipio" required>
                <select id="api-farm-municipality" className="input input--select" value={municipalityCode} onChange={(event) => setMunicipalityCode(event.target.value)} disabled={!departmentCode} required>
                  <option value="">Selecciona un municipio</option>
                  {municipalities.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}
                </select>
              </FormField>
              <FormField
                id="api-farm-animals"
                label="Total de animales"
                error={farmCountError}
                required
              >
                <TextInput
                  id="api-farm-animals"
                  type="number"
                  min={1}
                  step={1}
                  value={animalCount}
                  onChange={(event) => {
                    setAnimalCount(event.target.value);
                    setFarmCountError(undefined);
                  }}
                  invalid={Boolean(farmCountError)}
                  required
                />
              </FormField>
              <FormField id="api-farm-breeding" label="Hembras de cría">
                <TextInput
                  id="api-farm-breeding"
                  type="number"
                  min={0}
                  step={1}
                  value={breedingFemales}
                  onChange={(event) => {
                    setBreedingFemales(event.target.value);
                    setFarmCountError(undefined);
                  }}
                />
              </FormField>
              <FormField id="api-farm-fattening" label="Animales de engorde">
                <TextInput
                  id="api-farm-fattening"
                  type="number"
                  min={0}
                  step={1}
                  value={fatteningAnimals}
                  onChange={(event) => {
                    setFatteningAnimals(event.target.value);
                    setFarmCountError(undefined);
                  }}
                />
              </FormField>
            </div>
            <Button type="submit" loading={savingFarm} disabled={savingFarm}>Registrar predio</Button>
          </form>
          {showSubmittedFarms && selectedFarms.length ? (
            <div className="saved-list">
              {selectedFarms.map((farm) => {
                const personName = availablePeople.find((item) => item.id === farm.personId)?.nombres ?? 'Persona vinculada';
                return (
                  <Link
                    className="saved-card saved-card--link"
                    key={farm.id}
                    to={`/evaluaciones?persona=${encodeURIComponent(farm.personId)}`}
                    aria-label={`Ver evaluaciones de ${farm.nombre}, responsable ${personName}`}
                  >
                    <h3>{farm.nombre}</h3>
                    <p>Responsable: {personName}</p>
                    <span className="saved-card__action">Ver evaluaciones <ArrowRight size={15} aria-hidden="true" /></span>
                  </Link>
                );
              })}
            </div>
          ) : showSubmittedFarms ? (
            <Alert tone="info">La persona no tiene predios registrados.</Alert>
          ) : null}
        </section>
      </div>
      <Modal
        open={personSearchOpen}
        title="Buscar persona por cédula"
        description="Busca una persona registrada y selecciónala para vincular su predio."
        onClose={() => setPersonSearchOpen(false)}
      >
        <div className="form">
          <FormField id="api-person-search-cedula" label="Cédula">
            <div className="search-box people-search">
              <Search size={17} aria-hidden="true" />
              <TextInput
                id="api-person-search-cedula"
                type="search"
                inputMode="numeric"
                value={personSearchCedula}
                onChange={(event) => setPersonSearchCedula(event.target.value)}
                autoFocus
              />
            </div>
          </FormField>
          <div className="person-results" aria-live="polite">
            {searchedPeople.length ? (
              searchedPeople.map((item) => (
                <button
                  type="button"
                  className="person-result"
                  key={item.id}
                  onClick={() => {
                    setFarmCedula(item.cedula);
                    setFarmPersonError(undefined);
                    setSubmittedFarmPersonId('');
                    setPersonSearchOpen(false);
                  }}
                >
                  <span className="person-result__main">
                    <strong>{item.nombres}</strong>
                    <small>C.C. {item.cedula}</small>
                  </span>
                  <span className="person-result__farms">Seleccionar</span>
                </button>
              ))
            ) : (
              <p className="people-empty">
                {personSearchCedula.trim()
                  ? 'No encontramos personas con esa cédula.'
                  : 'Ingresa una cédula para buscar.'}
              </p>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
