import { useEffect, useMemo, useState } from "react";
import "./App.css";

const SESSION_STORAGE_KEY = "cacmu.mock.session";
const CACMU_BANNER_URL =
  "https://www.cacmu.fin.ec/web/wp-content/uploads/2023/03/logo-cacmu-1024x565.png";

const PREGUNTAS_SEGURIDAD = [
  {
    codigo: 1,
    pregunta: "Cual es su fecha de nacimiento? (DD/MM/AAAA)",
    dificultad: "Basica",
    aclaracion:
      "El socio debe mencionar la fecha de nacimiento registrada en su cedula.",
  },
  {
    codigo: 2,
    pregunta: "Cual es su estado civil registrado en la cooperativa?",
    dificultad: "Basica",
    aclaracion:
      "El socio debe mencionar el estado civil registrado en la cooperativa.",
  },
  {
    codigo: 3,
    pregunta: "Cual es su correo electronico registrado en la cooperativa?",
    dificultad: "Intermedia",
    aclaracion: "El socio debe mencionar el correo electronico registrado.",
  },
  {
    codigo: 4,
    pregunta: "Cual es su numero celular registrado en la cooperativa?",
    dificultad: "Intermedia",
    aclaracion: "El socio debe mencionar el numero celular registrado.",
  },
  {
    codigo: 5,
    pregunta: "Cual es su lugar de residencia registrado en la cooperativa?",
    dificultad: "Intermedia",
    aclaracion:
      "El socio debe mencionar el lugar de residencia registrado al aperturar su cuenta.",
  },
  {
    codigo: 6,
    pregunta: "En que agencia de nuestra cooperativa abrio su cuenta?",
    dificultad: "Avanzada",
    aclaracion:
      "El socio debe mencionar la agencia o ciudad donde abrio la cuenta.",
  },
  {
    codigo: 8,
    pregunta: "Ha realizado transferencias en su cuenta en los ultimos 5 dias?",
    dificultad: "Avanzada",
    aclaracion: "El socio debe responder si o no sobre transferencias recientes.",
  },
  {
    codigo: 9,
    pregunta: "Ha realizado depositos en su cuenta en el ultimo mes?",
    dificultad: "Avanzada",
    aclaracion: "El socio debe responder si o no sobre depositos recientes.",
  },
  {
    codigo: 10,
    pregunta: "Ha realizado una actualizacion de informacion en los ultimos 3 meses?",
    dificultad: "Avanzada",
    aclaracion:
      "El socio debe responder si o no sobre la actualizacion de informacion.",
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

function tomarAleatoria(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function seleccionarPreguntasAleatorias() {
  return ["Basica", "Intermedia", "Avanzada"].map((dificultad) =>
    tomarAleatoria(
      PREGUNTAS_SEGURIDAD.filter(
        (pregunta) => pregunta.dificultad === dificultad
      )
    )
  );
}

function crearPreguntasIniciales() {
  return seleccionarPreguntasAleatorias().map((pregunta) => ({
    ...pregunta,
    correcta: false,
  }));
}

function LoginScreen({ onLogin }) {
  const [usuario, setUsuario] = useState("");
  const [contrasenia, setContrasenia] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = (event) => {
    event.preventDefault();

    const username = usuario.trim();
    const password = contrasenia.trim();

    if (!username || !password) {
      setError("Ingresa usuario y contrasena para entrar.");
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
            alt="CACMU Cooperativa de Ahorro y Credito Mujeres Unidas"
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
          <label htmlFor="login-pass">Contrasena</label>
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
            placeholder="Contrasena"
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
      setError("Ingresa una cedula para continuar.");
      return;
    }

    if (!validarCedulaEcuatoriana(valor)) {
      setError("La cedula ecuatoriana no es valida.");
      return;
    }

    onValidate(valor);
  };

  return (
    <section className="surface gate-panel">
      <div className="gate-copy">
        <span className="eyebrow">Sesion activa</span>
        <h2>Hola, {username}</h2>
      </div>

      <form className="gate-form" onSubmit={submit}>
        <div className="field">
          <label htmlFor="cedula-input">Cedula</label>
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
            placeholder="Ingresa la cedula"
            inputMode="numeric"
            maxLength={10}
          />
        </div>

        {error ? <p className="inline-alert">{error}</p> : null}

        <div className="gate-actions">
          <button type="submit">Validar cedula</button>
          <button type="button" className="ghost-button" onClick={onLogout}>
            Cerrar sesion
          </button>
        </div>
      </form>
    </section>
  );
}

function AppShell({ session, numeroIdentificacion, onLogout, preguntasIniciales }) {
  const [preguntas, setPreguntas] = useState(() => preguntasIniciales);
  const [loadingBloqueo, setLoadingBloqueo] = useState(false);

  const respondidas = preguntas.filter((pregunta) => pregunta.correcta).length;
  const todasRespondidas = preguntas.length === 3 && respondidas === 3;
  const resultadoCaso = todasRespondidas ? "Bloqueo aprobado" : "Intento fallido";
  const accionPrincipal = todasRespondidas
    ? "Guardar y bloquear"
    : "Guardar intento fallido";

  const resumenValidacion = useMemo(() => {
    if (!preguntas.length) {
      return "Las preguntas se cargan apenas validas la cedula del socio.";
    }

    if (todasRespondidas) {
      return "Las 3 validaciones estan completas y el bloqueo puede registrarse.";
    }

    return `Progreso de validacion: ${respondidas}/3 preguntas marcadas.`;
  }, [preguntas.length, respondidas, todasRespondidas]);

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
    window.setTimeout(() => {
      setLoadingBloqueo(false);
    }, 700);
  };

  return (
    <section className="workspace">
      <header className="surface workspace-header">
        <div className="workspace-title">
          <span className="eyebrow">Atencion en llamada</span>
          <h2>Bloqueo de cuenta</h2>
        </div>

        <div className="workspace-meta">
          <span className="status-chip">
            <strong>Operador</strong>
            {session?.user?.name || session?.user?.sub || "Sesion"}
          </span>
          <span className="status-chip">
            <strong>Cedula</strong>
            {numeroIdentificacion}
          </span>
          <button type="button" className="ghost-button meta-action" onClick={onLogout}>
            Cerrar sesion
          </button>
        </div>
      </header>

      <section className="workspace-grid">
        <div className="surface workspace-panel">
          <div className="panel-head">
            <div>
              <span className="step-tag">Paso 2 de 3</span>
              <h3>Preguntas de seguridad</h3>
            </div>

            <span className="answer-result">
              {resumenValidacion}
            </span>
          </div>

          <div className="questions-list">
            {preguntas.map((pregunta) => (
              <article className="question-row" key={pregunta.codigo}>
                <div className="question-copy">
                  <div className="question-meta">
                    <span className="question-code">#{pregunta.codigo}</span>
                    <span className="question-divider">/</span>
                    <span>{pregunta.dificultad}</span>
                  </div>
                  <h4>{pregunta.pregunta}</h4>
                </div>

                <label className="check-option ok-check question-toggle">
                  <input
                    type="checkbox"
                    checked={pregunta.correcta}
                    onChange={(event) =>
                      actualizarRespuesta(pregunta.codigo, event.target.checked)
                    }
                  />
                  Validada
                </label>
              </article>
            ))}
          </div>
        </div>

        <aside className="surface workspace-aside">
          <div className="aside-block">
            <span className="identity-label">Cedula</span>
            <strong>{numeroIdentificacion}</strong>
          </div>

          <div className="aside-block">
            <span className="identity-label">Registro</span>
            <strong>{resultadoCaso}</strong>
          </div>

          <div className="aside-block">
            <span className="identity-label">Accion</span>
            <strong>{accionPrincipal}</strong>
          </div>

          <button type="button" disabled={loadingBloqueo} onClick={bloquear}>
            {loadingBloqueo ? "Guardando..." : accionPrincipal}
          </button>
        </aside>
      </section>
    </section>
  );
}

function App() {
  const [session, setSession] = useState(() => leerSesionInicial());
  const [numeroIdentificacion, setNumeroIdentificacion] = useState("");
  const [cedulaValidada, setCedulaValidada] = useState(false);
  const [preguntasIniciales, setPreguntasIniciales] = useState([]);

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
    setPreguntasIniciales([]);
  };

  const handleValidateCedula = (valor) => {
    setNumeroIdentificacion(valor);
    setPreguntasIniciales(crearPreguntasIniciales());
    setCedulaValidada(true);
  };

  const handleLogout = () => {
    setSession(null);
    setNumeroIdentificacion("");
    setCedulaValidada(false);
    setPreguntasIniciales([]);
  };

  return (
    <main className="app-shell">
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
          key={numeroIdentificacion}
          session={session}
          numeroIdentificacion={numeroIdentificacion}
          onLogout={handleLogout}
          preguntasIniciales={preguntasIniciales}
        />
      )}
    </main>
  );
}

export default App;
