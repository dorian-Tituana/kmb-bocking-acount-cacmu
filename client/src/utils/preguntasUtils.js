export const PREGUNTAS_SEGURIDAD = [
  {
    codigo: 1,
    pregunta: "Cual es su fecha de nacimiento? (DD/MM/AAAA)",
    dificultad: "Basica",
  },
  {
    codigo: 2,
    pregunta: "Cual es su estado civil registrado en la cooperativa?",
    dificultad: "Basica",
  },
  {
    codigo: 3,
    pregunta: "Cual es su correo electronico registrado en la cooperativa?",
    dificultad: "Intermedia",
  },
  {
    codigo: 4,
    pregunta: "Cual es su numero celular registrado en la cooperativa?",
    dificultad: "Intermedia",
  },
  {
    codigo: 5,
    pregunta: "Cual es su lugar de residencia registrado en la cooperativa?",
    dificultad: "Intermedia",
  },
  {
    codigo: 6,
    pregunta: "En que agencia de nuestra cooperativa abrio su cuenta?",
    dificultad: "Avanzada",
  },
  {
    codigo: 8,
    pregunta: "Ha realizado transferencias en su cuenta en los ultimos 5 dias?",
    dificultad: "Avanzada",
  },
  {
    codigo: 9,
    pregunta: "Ha realizado depositos en su cuenta en el ultimo mes?",
    dificultad: "Avanzada",
  },
  {
    codigo: 10,
    pregunta: "Ha realizado una actualizacion de informacion en los ultimos 3 meses?",
    dificultad: "Avanzada",
  },
];

function tomarAleatoria(items) {
  return items[Math.floor(Math.random() * items.length)];
}

export function seleccionarPreguntasAleatorias() {
  return ["Basica", "Intermedia", "Avanzada"].map((dificultad) =>
    tomarAleatoria(
      PREGUNTAS_SEGURIDAD.filter((pregunta) => pregunta.dificultad === dificultad)
    )
  );
}

export function extraerRespuesta(payload) {
  if (!payload) return "";

  if (typeof payload === "string" || typeof payload === "number") {
    return String(payload);
  }

  if (payload.data && payload.data.respuesta) {
    return String(payload.data.respuesta);
  }

  const CAMPOS_RESPUESTA = [
    "respuesta",
    "Respuesta",
    "respuestaCorrecta",
    "RespuestaCorrecta",
    "dato",
    "Dato",
    "valor",
    "Valor",
  ];

  for (const campo of CAMPOS_RESPUESTA) {
    if (payload[campo]) {
      return String(payload[campo]);
    }
  }

  if (payload.data) {
    for (const campo of CAMPOS_RESPUESTA) {
      if (payload.data[campo]) {
        return String(payload.data[campo]);
      }
    }
  }

  for (const [clave, valor] of Object.entries(payload)) {
    if (!["ok", "Ok", "messages", "Messages", "idTransaccion", "IdTransaccion", "data", "Data"].includes(clave)) {
      if (valor && typeof valor === "string") {
        return valor;
      }
    }
  }

  return "";
}
