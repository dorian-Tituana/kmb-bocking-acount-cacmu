export default function QuestionRow({ pregunta, onUpdateRespuesta }) {
  return (
    <article
      className="question-row"
      data-dificultad={pregunta.dificultad}
      data-estado={pregunta.estado}
    >
      <div className="question-copy">
        <h4>{pregunta.pregunta}</h4>
        {pregunta.respuesta ? (
          <p className="question-answer">✓ Respuesta esperada: {pregunta.respuesta}</p>
        ) : (
          <p className="question-answer" style={{ color: "var(--muted)", opacity: 0.6 }}>
            Cargando respuesta...
          </p>
        )}
      </div>

      <div className="question-actions">
        <button
          type="button"
          className={`answer-toggle ${pregunta.estado === "correcta" ? "active" : ""}`}
          onClick={() =>
            onUpdateRespuesta(
              pregunta.codigo,
              pregunta.estado === "correcta" ? null : "correcta"
            )
          }
        >
          ✓
        </button>
        <button
          type="button"
          className={`answer-toggle ${pregunta.estado === "fallada" ? "active" : ""}`}
          onClick={() =>
            onUpdateRespuesta(
              pregunta.codigo,
              pregunta.estado === "fallada" ? null : "fallada"
            )
          }
        >
          ✗
        </button>
      </div>
    </article>
  );
}
