import { useEffect, useMemo, useState } from "react";
import "./App.css";

const SESSION_STORAGE_KEY = "cacmu.mock.session";
const CACMU_BANNER_URL =
  "https://www.cacmu.fin.ec/web/wp-content/uploads/2023/03/logo-cacmu-1024x565.png";

const PREGUNTAS_SEGURIDAD = [
  {
    codigo: 1,
    pregunta: "¿Cuál es su fecha de nacimiento? (DD/MM/AAAA)",
    dificultad: "Básica",
    aclaracion:
      "Socio/a deberá mencionar su fecha de nacimiento registrada en su cédula.",
  },
  {
    codigo: 2,
    pregunta: "¿Cuál es su estado civil registrado en la cooperativa?",
    dificultad: "Básica",
    aclaracion:
      "Socio/a deberá mencionar el estado civil que registró en la cooperativa.",
  },
  {
    codigo: 3,
    pregunta: "¿Cuál es su correo electrónico registrado en la cooperativa?",
    dificultad: "Intermedia",
    aclaracion: "Socio/a deberá mencionar el correo electrónico registrado.",
  },
  {
    codigo: 4,
    pregunta: "¿Cuál es su número celular registrado en la cooperativa?",
    dificultad: "Intermedia",
    aclaracion:
      "Socio/a deberá mencionar el número celular registrado en la cooperativa.",
  },
  {
    codigo: 5,
    pregunta: "¿Cuál es su lugar de residencia registrada en la cooperativa?",
    dificultad: "Intermedia",
    aclaracion:
      "Socio/a deberá mencionar el lugar de residencia registrado al aperturar su cuenta de ahorros.",
  },
  {
    codigo: 6,
    pregunta: "¿En qué agencia de nuestra cooperativa aperturó su cuenta?",
    dificultad: "Avanzada",
    aclaracion:
      "Socio/a deberá mencionar el nombre de la agencia o ciudad donde abrió la cuenta de ahorros.",
  },
  {
    codigo: 8,
    pregunta:
      "¿Ha realizado transferencias en su cuenta de la cooperativa en los últimos 5 días?",
    dificultad: "Avanzada",
    aclaracion:
      "Socio/a deberá mencionar sí o no ha realizado transferencias en los últimos 5 días.",
  },
  {
    codigo: 9,
    pregunta:
      "¿Ha realizado depósitos en su cuenta de la cooperativa en el último mes?",
    dificultad: "Avanzada",
    aclaracion:
      "Socio/a deberá mencionar sí o no ha realizado depósitos en el último mes.",
  },
  {
    codigo: 10,
    pregunta:
      "¿Ha realizado una actualización de información en los últimos 3 meses?",
    dificultad: "Avanzada",
    aclaracion:
      "Socio/a deberá mencionar sí o no ha realizado actualización de información.",
  },
];

function decodeJwtPart(value) {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    "="
  );
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));

  return JSON.parse(new TextDecoder().decode(bytes));
}

function encodeJwtPart(value) {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  let binary = "";

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function crearJwtMock(username) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "none", typ: "JWT" };
  const payload = {
    sub: username,
    name: username,
    username,
    kind: "mock-login",
    iat: now,
    exp: now + 60 * 60 * 8,
  };

  return `${encodeJwtPart(header)}.${encodeJwtPart(payload)}.mock`;
}

function validarCedulaEcuatoriana(valor) {
  const cedula = String(valor || "").trim();

  if (!/^\d{10}$/.test(cedula)) {
    return false;
  }

  const provincia = Number(cedula.slice(0, 2));
  const tercerDigito = Number(cedula[2]);

  if (provincia < 1 || provincia > 24) {
    return false;
  }

  if (tercerDigito >= 6) {
    return false;
  }

  let suma = 0;
  for (let i = 0; i < 9; i += 1) {
    let valorDigito = Number(cedula[i]);
    if (i % 2 === 0) {
      valorDigito *= 2;
      if (valorDigito > 9) {
        valorDigito -= 9;
      }
    }
    suma += valorDigito;
  }

  const digitoVerificador = (10 - (suma % 10)) % 10;
  return digitoVerificador === Number(cedula[9]);
}

function leerSesionInicial() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const session = JSON.parse(raw);
    const [, payloadPart] = String(session?.token || "").split(".");

    if (!payloadPart) {
      return null;
    }

    const payload = decodeJwtPart(payloadPart);
    if (!payload?.exp || payload.exp * 1000 < Date.now()) {
      return null;
    }

    return {
      token: session.token,
      user: payload,
    };
  } catch {
    return null;
  }
}

function JsonBox({ data }) {
  return <pre className="json-box">{JSON.stringify(data, null, 2)}</pre>;
}

function tomarAleatoria(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function seleccionarPreguntasAleatorias() {
  return ["Básica", "Intermedia", "Avanzada"].map((dificultad) =>
    tomarAleatoria(
      PREGUNTAS_SEGURIDAD.filter(
        (pregunta) => pregunta.dificultad === dificultad
      )
    )
  );
}

function LoginScreen({ onLogin }) {
  const [usuario, setUsuario] = useState("");
  const [contrasenia, setContrasenia] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();

    const username = usuario.trim();
    const password = contrasenia.trim();

    if (!username || !password) {
      setError("Ingresa usuario y contraseña para entrar.");
      return;
    }

    setLoading(true);
    setError("");
    onLogin({ username, password });
    setLoading(false);
  };

  return (
    <section className="login-wrap">
      <form className="surface auth-card" onSubmit={submit}>
        <div className="login-brand">
          <img
            className="brand-banner"
            src={CACMU_BANNER_URL}
            alt="CACMU Cooperativa de Ahorro y Crédito Mujeres Unidas"
          />
          <h1 className="login-title">Bloqueo de cuenta</h1>
        </div>

        <div className="field">
          <label htmlFor="login-user">Usuario</label>
          <input
            id="login-user"
            value={usuario}
            onChange={(event) => {
              setUsuario(event.target.value);
              if (error) {
                setError("");
              }
            }}
            placeholder="Usuario"
            autoComplete="username"
          />
        </div>

        <div className="field">
          <label htmlFor="login-pass">Contraseña</label>
          <input
            id="login-pass"
            type="password"
            value={contrasenia}
            onChange={(event) => {
              setContrasenia(event.target.value);
              if (error) {
                setError("");
              }
            }}
            placeholder="Contraseña"
            autoComplete="current-password"
          />
        </div>

        {error ? <p className="inline-alert">{error}</p> : null}

        <button type="submit" disabled={loading}>
          {loading ? "Ingresando..." : "Ingresar"}
        </button>
      </form>
    </section>
  );
}

function CedulaGate({ onValidate, onLogout, username }) {
  const [cedula, setCedula] = useState("");
  const [error, setError] = useState("");

  const submit = (event) => {
    event.preventDefault();

    const valor = cedula.trim();
    if (!valor) {
      setError("Ingresa una cédula para continuar.");
      return;
    }

    if (!validarCedulaEcuatoriana(valor)) {
      setError("La cédula ecuatoriana no es válida.");
      return;
    }

    onValidate(valor);
  };

  return (
    <section className="surface gate-panel">
      <div className="gate-copy">
        <span className="eyebrow">Sesión activa</span>
        <h2>Hola, {username}</h2>
        <p>Ahora valida la cédula para desplegar la consulta de preguntas.</p>
      </div>

      <form className="gate-form" onSubmit={submit}>
        <div className="field">
          <label htmlFor="cedula-input">Cédula</label>
          <input
            id="cedula-input"
            value={cedula}
            onChange={(event) => {
              const soloNumeros = event.target.value.replace(/\D/g, "");
              setCedula(soloNumeros);
              if (error) {
                setError("");
              }
            }}
            placeholder="Ingresa la cédula"
            inputMode="numeric"
            maxLength={10}
          />
        </div>

        {error ? <p className="inline-alert">{error}</p> : null}

        <div className="gate-actions">
          <button type="submit">Validar cédula</button>
          <button type="button" className="ghost-button" onClick={onLogout}>
            Cerrar sesión
          </button>
        </div>
      </form>
    </section>
  );
}

function AppShell({ session, numeroIdentificacion, onLogout }) {
  const [preguntas, setPreguntas] = useState([]);
  const [resultadoConsulta, setResultadoConsulta] = useState({});
  const [resultadoBloqueo, setResultadoBloqueo] = useState({});
  const [loadingPreguntas, setLoadingPreguntas] = useState(false);
  const [loadingBloqueo, setLoadingBloqueo] = useState(false);

  const todasRespondidas = preguntas.length === 3;
  const todasCorrectas =
    todasRespondidas && preguntas.every((pregunta) => pregunta.correcta);

  const resumenValidacion = useMemo(() => {
    if (!preguntas.length) {
      return "Genera 3 preguntas aleatorias para iniciar la validación.";
    }

    return todasCorrectas
      ? "Las 3 respuestas coinciden. Se puede bloquear."
      : "Marca Coincide solo cuando la respuesta sea la misma.";
  }, [preguntas.length, todasCorrectas]);

  const generarPreguntas = (event) => {
    event.preventDefault();
    setLoadingPreguntas(true);
    setResultadoBloqueo({});

    const seleccionadas = seleccionarPreguntasAleatorias();
    const consultas = seleccionadas.map((pregunta) => ({
      ...pregunta,
      respuestaEsperada: `Respuesta simulada ${pregunta.codigo}`,
      correcta: false,
      payload: {
        ok: true,
        source: "mock-postlogin",
        codigo: pregunta.codigo,
        numeroIdentificacion: numeroIdentificacion.trim(),
      },
    }));

    setPreguntas(consultas);
    setResultadoConsulta({
      ok: true,
      mock: true,
      preguntas: consultas.map(
        ({ codigo, dificultad, pregunta, respuestaEsperada }) => ({
          codigo,
          dificultad,
          pregunta,
          respuestaEsperada,
        })
      ),
    });
    setLoadingPreguntas(false);
  };

  const actualizarRespuesta = (codigo, correcta) => {
    setPreguntas((actuales) =>
      actuales.map((pregunta) =>
        pregunta.codigo === codigo
          ? {
              ...pregunta,
              correcta,
            }
          : pregunta
      )
    );
  };

  const bloquear = () => {
    setLoadingBloqueo(true);
    setResultadoBloqueo({
      ok: true,
      mock: true,
      messages: [
        `Bloqueo simulado para ${numeroIdentificacion.trim()} con 3 coincidencias.`,
      ],
    });
    setLoadingBloqueo(false);
  };

  return (
    <section className="workflow">
      <div className="workflow-header">
        <div>
          <span className="eyebrow">Flujo operativo</span>
          <h2>Cédula validada: {numeroIdentificacion}</h2>
          <p>
            Primero se consultan las preguntas, luego se confirma si coinciden
            y recién ahí se habilita el bloqueo.
          </p>
        </div>

        <div className="session-card">
          <span>Usuario</span>
          <strong>{session?.user?.name || session?.user?.sub || "Sesión"}</strong>
          <button type="button" className="ghost-button" onClick={onLogout}>
            Cerrar sesión
          </button>
        </div>
      </div>

      <section className="surface compact-card">
        <div className="section-heading">
          <div>
            <h3>Validar preguntas</h3>
            <p className="status-text">
              Ingrese la identificación y genere las 3 preguntas.
            </p>
          </div>
          <span className="step-badge">Paso 2</span>
        </div>

        <form className="inline-form" onSubmit={generarPreguntas}>
          <div className="field">
            <label htmlFor="numero-identificacion">Identificación</label>
            <input
              id="numero-identificacion"
              value={numeroIdentificacion}
              readOnly
            />
          </div>

          <button type="submit" disabled={loadingPreguntas}>
            {loadingPreguntas ? "Consultando..." : "Generar 3 preguntas"}
          </button>
        </form>
      </section>

      <section className="surface compact-card">
        <div className="section-heading">
          <div>
            <h3>Respuestas del cliente</h3>
            <p className="status-text">
              Marca las preguntas que coinciden con la respuesta registrada.
            </p>
          </div>
          <span
            className={`answer-result ${
              !preguntas.length || !todasRespondidas
                ? "pending"
                : todasCorrectas
                  ? "ok"
                  : "bad"
            }`}
          >
            {resumenValidacion}
          </span>
        </div>

        <div className="questions-grid compact-questions">
          {preguntas.length ? (
            preguntas.map((pregunta) => (
              <article
                className="question-card compact-question"
                key={pregunta.codigo}
              >
                <div className="question-main">
                  <div className="question-header">
                    <span className="badge">{pregunta.dificultad}</span>
                    <span>Código {pregunta.codigo}</span>
                  </div>
                  <h3>{pregunta.pregunta}</h3>
                  <p>{pregunta.aclaracion}</p>
                </div>

                <div className="registered-answer">
                  <span>Registrado</span>
                  <strong>{pregunta.respuestaEsperada || "Sin dato"}</strong>
                </div>

                <div className="answer-tools">
                  <label className="check-option ok-check single-check">
                    <input
                      type="checkbox"
                      checked={pregunta.correcta}
                      onChange={(event) =>
                        actualizarRespuesta(
                          pregunta.codigo,
                          event.target.checked
                        )
                      }
                    />
                    Coincide
                  </label>
                  <details className="question-debug">
                    <summary>Ver endpoint</summary>
                    <JsonBox data={pregunta.payload} />
                  </details>
                </div>
              </article>
            ))
          ) : (
            <div className="empty-state">
              Genera las preguntas para revisar la validación.
            </div>
          )}
        </div>
      </section>

      <section className="surface compact-card block-card">
        <div>
          <h3>Bloqueo</h3>
          <p className="status-text">
            Solo se habilita cuando las 3 respuestas están marcadas como
            correctas.
          </p>
        </div>

        <button
          type="button"
          disabled={!todasCorrectas || loadingBloqueo}
          onClick={bloquear}
        >
          {loadingBloqueo ? "Bloqueando..." : "Bloquear banca virtual"}
        </button>

        <details className="debug-details" open={Boolean(resultadoBloqueo.error)}>
          <summary>Ver respuesta de bloqueo</summary>
          <JsonBox data={resultadoBloqueo} />
        </details>
      </section>

      <section className="surface compact-card">
        <details className="debug-details">
          <summary>Resumen técnico de consulta</summary>
          <JsonBox data={resultadoConsulta} />
        </details>
      </section>
    </section>
  );
}

function App() {
  const [session, setSession] = useState(() => leerSesionInicial());
  const [numeroIdentificacion, setNumeroIdentificacion] = useState("");
  const [cedulaValidada, setCedulaValidada] = useState(false);

  useEffect(() => {
    if (!session) {
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({ token: session.token })
    );
  }, [session]);

  const handleLogin = ({ username }) => {
    const token = crearJwtMock(username);
    setSession({
      token,
      user: decodeJwtPart(token.split(".")[1]),
    });
    setCedulaValidada(false);
    setNumeroIdentificacion("");
  };

  const handleValidateCedula = (valor) => {
    setNumeroIdentificacion(valor);
    setCedulaValidada(true);
  };

  const handleLogout = () => {
    setSession(null);
    setNumeroIdentificacion("");
    setCedulaValidada(false);
  };

  return (
    <main className="app-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      {!session ? (
        <LoginScreen onLogin={handleLogin} />
      ) : !cedulaValidada ? (
        <CedulaGate
          onValidate={handleValidateCedula}
          onLogout={handleLogout}
          username={session.user?.name || session.user?.sub || "Usuario"}
        />
      ) : (
        <AppShell
          session={session}
          numeroIdentificacion={numeroIdentificacion}
          onLogout={handleLogout}
        />
      )}
    </main>
  );
}

export default App;
