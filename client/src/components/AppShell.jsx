import { useState } from "react";
import Header from "./Header";
import QuestionRow from "./QuestionRow";

export default function AppShell({
  session,
  numeroIdentificacion,
  onLogout,
  preguntasIniciales,
}) {
  const [preguntas, setPreguntas] = useState(() => preguntasIniciales);
  const [loadingBloqueo, setLoadingBloqueo] = useState(false);

  const todasCorrectas = preguntas.length === 3 && preguntas.every((p) => p.estado === "correcta");
  const accionPrincipal = todasCorrectas ? "Bloquear cuenta" : "Guardar intento fallido";

  const actualizarRespuesta = (codigo, estado) => {
    setPreguntas((actuales) =>
      actuales.map((pregunta) =>
        pregunta.codigo === codigo
          ? {
              ...pregunta,
              estado,
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
      <Header
        session={session}
        numeroIdentificacion={numeroIdentificacion}
        onLogout={onLogout}
      />

      <section className="workspace-grid">
        <div className="surface workspace-panel">
          <div className="panel-head">
            <div>
              <h3>Preguntas de seguridad</h3>
            </div>
          </div>

          <div className="questions-list">
            {preguntas.map((pregunta) => (
              <QuestionRow
                key={pregunta.codigo}
                pregunta={pregunta}
                onUpdateRespuesta={actualizarRespuesta}
              />
            ))}
          </div>
        </div>

        <aside className="surface workspace-aside">
          <button type="button" disabled={loadingBloqueo} onClick={bloquear}>
            {loadingBloqueo ? "Guardando..." : accionPrincipal}
          </button>
        </aside>
      </section>
    </section>
  );
}
