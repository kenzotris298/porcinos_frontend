import { ArrowRight, CheckCircle2, MailCheck, UserRoundPlus } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Alert } from '../components/Alert';
import { Button } from '../components/Button';
import { FormField, TextInput } from '../components/FormField';
import { PageHeader } from '../components/PageHeader';
import { apiRequest } from '../api/client';
import { DEPARTMENTS, municipalitiesForDepartment } from '../data/colombia';
import { useToast } from '../components/ToastProvider';

interface ApiPerson {
  id: string;
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
  const [codeRequested, setCodeRequested] = useState(false);
  const [code, setCode] = useState('');
  const [verificationToken, setVerificationToken] = useState('');
  const [personId, setPersonId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sendingCode, setSendingCode] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [saving, setSaving] = useState(false);
  const [people, setPeople] = useState<ApiPerson[]>([]);
  const [farms, setFarms] = useState<ApiFarm[]>([]);
  const [farmPersonId, setFarmPersonId] = useState('');
  const [farmName, setFarmName] = useState('');
  const [departmentCode, setDepartmentCode] = useState('');
  const [municipalityCode, setMunicipalityCode] = useState('');
  const [farmPath, setFarmPath] = useState('');
  const [animalCount, setAnimalCount] = useState('');
  const [breedingFemales, setBreedingFemales] = useState('0');
  const [fatteningAnimals, setFatteningAnimals] = useState('0');
  const [savingFarm, setSavingFarm] = useState(false);
  const municipalities = municipalitiesForDepartment(departmentCode);

  const loadPeopleAndFarms = async () => {
    try {
      const [peopleResponse, farmResponse] = await Promise.all([
        apiRequest<{ items: ApiPerson[] }>('/people'),
        apiRequest<{ items: ApiFarm[] }>('/farms')
      ]);
      setPeople(peopleResponse.items);
      setFarms(farmResponse.items);
      setFarmPersonId((current) =>
        peopleResponse.items.some((item) => item.id === current)
          ? current
          : peopleResponse.items[0]?.id ?? ''
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudieron cargar personas y predios.');
    }
  };

  useEffect(() => {
    void loadPeopleAndFarms();
  }, []);

  function updatePerson<K extends keyof PersonDraft>(key: K, value: PersonDraft[K]) {
    setPerson((current) => ({ ...current, [key]: value }));
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
      const response = await apiRequest<{ id: string; nombres: string }>('/people', {
        method: 'POST',
        body: {
          cedula: person.cedula.trim(),
          nombres: person.nombres.trim(),
          celular: person.celular.trim(),
          correo: person.correo.trim().toLowerCase(),
          verificationToken
        }
      });
      setPersonId(response.id);
      setVerificationToken('');
      setPerson(EMPTY_PERSON);
      setCode('');
      notify('Persona registrada en el sistema.');
      await loadPeopleAndFarms();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo registrar la persona.');
    } finally {
      setSaving(false);
    }
  }

  async function createFarm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingFarm(true);
    setError(null);
    try {
      const response = await apiRequest<ApiFarm>('/farms', {
        method: 'POST',
        body: {
          personId: farmPersonId,
          codigoDepartamento: departmentCode,
          codigoMunicipio: municipalityCode,
          nombre: farmName.trim(),
          vereda: farmPath.trim(),
          animales: Number(animalCount),
          hembrasCria: Number(breedingFemales),
          animalesGordos: Number(fatteningAnimals)
        }
      });
      notify('Predio registrado y vinculado a la persona.');
      setFarmName('');
      setFarmPath('');
      setAnimalCount('');
      setBreedingFemales('0');
      setFatteningAnimals('0');
      setFarms((current) => [...current, response]);
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
        description="Este registro se guarda en MariaDB. Verifica primero el correo; la verificación no crea por sí misma una cuenta de acceso."
      />

      {error ? <Alert tone="danger">{error}</Alert> : null}
      {personId ? (
        <Alert tone="success" title="Persona creada en el backend">
          Copia el UUID de esta persona para vincularla al crear su cuenta propietaria:
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
              <Button
                type="submit"
                icon={<CheckCircle2 size={17} />}
                loading={verifying || saving}
                disabled={verifying || saving || Boolean(personId) || !codeRequested}
              >
                {verificationToken ? 'Registrar persona en el backend' : 'Verificar código'}
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
          {!people.length ? (
            <Alert tone="info">Registra primero a la persona responsable para crear su predio.</Alert>
          ) : (
            <form className="form" onSubmit={createFarm}>
              <FormField id="api-farm-person" label="Persona responsable" required>
                <select id="api-farm-person" className="input input--select" value={farmPersonId} onChange={(event) => setFarmPersonId(event.target.value)} required>
                  {people.map((item) => <option key={item.id} value={item.id}>{item.nombres}</option>)}
                </select>
              </FormField>
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
                <FormField id="api-farm-animals" label="Total de animales" required>
                  <TextInput id="api-farm-animals" type="number" min={1} step={1} value={animalCount} onChange={(event) => setAnimalCount(event.target.value)} required />
                </FormField>
                <FormField id="api-farm-breeding" label="Hembras de cría">
                  <TextInput id="api-farm-breeding" type="number" min={0} step={1} value={breedingFemales} onChange={(event) => setBreedingFemales(event.target.value)} />
                </FormField>
                <FormField id="api-farm-fattening" label="Animales de engorde">
                  <TextInput id="api-farm-fattening" type="number" min={0} step={1} value={fatteningAnimals} onChange={(event) => setFatteningAnimals(event.target.value)} />
                </FormField>
              </div>
              <Button type="submit" loading={savingFarm} disabled={savingFarm || !farmPersonId}>Registrar predio</Button>
            </form>
          )}
          {farms.length ? (
            <div className="saved-list">
              {farms.map((farm) => {
                const personName = people.find((item) => item.id === farm.personId)?.nombres ?? 'Persona vinculada';
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
          ) : null}
        </section>
      </div>
    </div>
  );
}
