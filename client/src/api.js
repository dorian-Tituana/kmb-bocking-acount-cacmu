const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8787";

async function post(path, payload) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  let data;
  try {
    data = await response.json();
  } catch {
    data = {
      ok: false,
      messages: ["Respuesta no JSON del backend"],
    };
  }
  if (!response.ok) {
    const error = new Error("Error en llamada al backend");
    error.status = response.status;
    error.payload = data;
    throw error;
  }

  return data;
}

export function consultarPreguntaSeguridad({
  codigo,
  numeroIdentificacion,
}) {
  const payload = { numeroIdentificacion };

  if (codigo) {
    payload.codigo = codigo;
  }

  return post("/api/cacmu/preguntas-seguridad", payload);
}

export function bloquearBancaVirtual({ numeroIdentificacion }) {
  return post("/api/BancaVirtual/Bloquear", {
    numeroIdentificacion,
    NumeroIdentificacion: numeroIdentificacion,
  });
}





