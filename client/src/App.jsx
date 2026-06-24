import { useCallback, useMemo, useState } from "react";
import { bloquearBancaVirtual, consultarPreguntaSeguridad } from "./api";
import "./App.css";

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
    aclaracion:
      "Socio/a deberá mencionar el correo electrónico registrado.",
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

const CAMPOS_RESPUESTA = [
  "respuesta",
  "Respuesta",
  "respuestaCorrecta",
  "RespuestaCorrecta",
  "dato",
  "Dato",
  "valor",
  "Valor",
  "data",
  "Data",
];

function JsonBox({ data }) {
  return <pre className="json-box">{JSON.stringify(data, null, 2)}</pre>;
}

function tomarAleatoria(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function seleccionarPreguntasAleatorias() {
  return ["Básica", "Intermedia", "Avanzada"].map((dificultad) =>
    tomarAleatoria(
      PREGUNTAS_SEGURIDAD.filter((pregunta) => pregunta.dificultad === dificultad)
    )
  );
}

function extraerRespuesta(payload) {
  if (payload === null || payload === undefined) {
    return "";
  }

  if (["string", "number", "boolean"].includes(typeof payload)) {
    return String(payload);
  }

  if (Array.isArray(payload)) {
    for (const item of payload) {
      const respuesta = extraerRespuesta(item);
      if (respuesta) {
        return respuesta;
      }
    }
    return "";
  }

  for (const campo of CAMPOS_RESPUESTA) {
    if (Object.prototype.hasOwnProperty.call(payload, campo)) {
      const respuesta = extraerRespuesta(payload[campo]);
      if (respuesta) {
        return respuesta;
      }
    }
  }

  const camposIgnorados = new Set([
    "ok",
    "Ok",
    "messages",
    "Messages",
    "idTransaccion",
    "IdTransaccion",
  ]);

  for (const [campo, valor] of Object.entries(payload)) {
    if (camposIgnorados.has(campo)) {
      continue;
    }
    const respuesta = extraerRespuesta(valor);
    if (respuesta) {
      return respuesta;
    }
  }

  return "";
}

function App() {
  const [numeroIdentificacion, setNumeroIdentificacion] = useState("1003434410");
  const [preguntas, setPreguntas] = useState([]);
  const [resultadoConsulta, setResultadoConsulta] = useState({});
  const [resultadoBloqueo, setResultadoBloqueo] = useState({});
  const [loadingPreguntas, setLoadingPreguntas] = useState(false);
  const [loadingBloqueo, setLoadingBloqueo] = useState(false);

  const todasRespondidas = preguntas.length === 3;
  const todasCorrectas = todasRespondidas && preguntas.every(
    (pregunta) => pregunta.correcta
  );

  const resumenValidacion = useMemo(() => {
    if (!preguntas.length) {
      return "Genere 3 preguntas aleatorias para iniciar la validación.";
    }
    return todasCorrectas
      ? "Las 3 respuestas coinciden. Se puede bloquear."
      : "Marque Coincide solo cuando la respuesta sea la misma.";
  }, [preguntas.length, todasCorrectas]);

  const generarPreguntas = async (event) => {
    event.preventDefault();
    setLoadingPreguntas(true);
    setResultadoBloqueo({});

    const seleccionadas = seleccionarPreguntasAleatorias();

    try {
      const consultas = await Promise.all(
        seleccionadas.map(async (pregunta) => {
          const payload = await consultarPreguntaSeguridad({
            codigo: pregunta.codigo,
            numeroIdentificacion: numeroIdentificacion.trim(),
          });

          return {
            ...pregunta,
            respuestaEsperada: extraerRespuesta(payload),
            correcta: false,
            payload,
          };
        })
      );

      setPreguntas(consultas);
      setResultadoConsulta({
        ok: true,
        preguntas: consultas.map(
          ({ codigo, dificultad, pregunta, respuestaEsperada }) => ({
            codigo,
            dificultad,
            pregunta,
            respuestaEsperada,
          })
        ),
      });
    } catch (error) {
      setPreguntas([]);
      setResultadoConsulta({
        ok: false,
        status: error.status || 500,
        error: error.payload || error.message,
      });
    } finally {
      setLoadingPreguntas(false);
    }
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

  const bloquear = useCallback(async () => {
    setLoadingBloqueo(true);

    try {
      const data = await bloquearBancaVirtual({
        numeroIdentificacion: numeroIdentificacion.trim(),
      });
      setResultadoBloqueo(data);
    } catch (error) {
      setResultadoBloqueo({
        ok: false,
        status: error.status || 500,
        error: error.payload || error.message,
      });
    } finally {
      setLoadingBloqueo(false);
    }
  }, [numeroIdentificacion]);


  return (
    <main className="container">
      <header>
        <h1>CACMU Integración Segura</h1>
        <p>
          Validación con 1 pregunta básica, 1 intermedia y 1 avanzada antes del
          bloqueo.
        </p>
      </header>

      <section className="card compact-card">
        <div className="section-heading">
          <div>
            <h2>Validar preguntas</h2>
            <p className="status-text">Ingrese la identificación y genere las 3 preguntas.</p>
          </div>
        </div>
        <form className="inline-form" onSubmit={generarPreguntas}>
          <label htmlFor="numero-identificacion">Identificación</label>
          <input
            id="numero-identificacion"
            value={numeroIdentificacion}
            onChange={(event) => setNumeroIdentificacion(event.target.value)}
            required
          />

          <button type="submit" disabled={loadingPreguntas}>
            {loadingPreguntas ? "Consultando..." : "Generar 3 preguntas"}
          </button>
        </form>
      </section>

      <section className="card compact-card">
        <div className="section-heading">
          <h2>Respuestas del cliente</h2>
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
          {preguntas.map((pregunta) => (
            <article className="question-card compact-question" key={pregunta.codigo}>
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
                      actualizarRespuesta(pregunta.codigo, event.target.checked)
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
          ))}
        </div>
      </section>

      <section className="card compact-card block-card">
        <div>
          <h2>Bloqueo</h2>
          <p className="status-text">
            Marque las 3 respuestas como correctas y presione el botón para bloquear.
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

      <section className="card compact-card">
        <details className="debug-details">
          <summary>Resumen técnico de consulta</summary>
          <JsonBox data={resultadoConsulta} />
        </details>
      </section>
    </main>
  );
}

export default App;













