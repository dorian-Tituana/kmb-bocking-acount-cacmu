import cors from "cors";
import dotenv from "dotenv";
import express from "express";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8787;
const CACMU_BASE_URL =
  process.env.CACMU_BASE_URL || "https://apis.cacmu.fin.ec/WSIVRCacmu/api";
const CACMU_API_KEY = process.env.CACMU_API_KEY;

if (!CACMU_API_KEY) {
  console.error("Falta CACMU_API_KEY en variables de entorno.");
  process.exit(1);
}

app.use(cors());
app.use(express.json());

function buildHeaders(mode = "bearer") {
  const base = {
    "Content-Type": "application/json",
  };

  if (mode === "none") {
    return base;
  }

  if (mode === "bearer") {
    return { ...base, Authorization: `Bearer ${CACMU_API_KEY}` };
  }
  if (mode === "authorization-raw") {
    return { ...base, Authorization: CACMU_API_KEY };
  }
  if (mode === "x-api-key") {
    return { ...base, "x-api-key": CACMU_API_KEY };
  }
  if (mode === "apikey") {
    return { ...base, apikey: CACMU_API_KEY };
  }
  if (mode === "key") {
    return { ...base, key: CACMU_API_KEY };
  }

  return {
    ...base,
    Authorization: `Bearer ${CACMU_API_KEY}`,
    "x-api-key": CACMU_API_KEY,
    apikey: CACMU_API_KEY,
    key: CACMU_API_KEY,
  };
}

async function cacmuPost(path, payload, mode = "bearer") {
  const upstreamUrl = `${CACMU_BASE_URL}${path}`;
  const response = await fetch(upstreamUrl, {
    method: "POST",
    headers: buildHeaders(mode),
    body: JSON.stringify(payload),
  });

  const contentType = response.headers.get("content-type") || "";
  let data = null;
  let raw = null;
  try {
    if (contentType.includes("application/json")) {
      data = await response.json();
    } else {
      raw = await response.text();
    }
  } catch {
    data = null;
  }

  return {
    ok: response.ok,
    status: response.status,
    data,
    raw,
    contentType,
    upstreamUrl,
  };
}

function sendUpstreamResult(res, result, fallbackMessage) {
  const status = Number.isInteger(result.status) ? result.status : 502;

  if (result.data !== null && result.data !== undefined) {
    return res.status(status).json(result.data);
  }

  return res.status(status).json({
    ok: result.ok,
    messages: [fallbackMessage],
    upstreamStatus: result.status,
    upstreamContentType: result.contentType,
    upstreamRaw: result.raw,
  });
}

function normalizeIdentificacion(body = {}) {
  return (
    body.numeroIdentificacion ||
    body.NumeroIdentificacion ||
    body.identificacion ||
    body.numero_identificacion ||
    ""
  )
    .toString()
    .trim();
}

const CODIGOS_PREGUNTA_VALIDOS = [1, 2, 3, 4, 5, 6, 8, 9, 10];

function normalizeCodigoPregunta(body = {}) {
  const codigo = Number(
    body.codigo ??
      body.codigoPregunta ??
      body.CodigoPregunta
  );
  return CODIGOS_PREGUNTA_VALIDOS.includes(codigo) ? codigo : null;
}

function hasCodigoPregunta(body = {}) {
  return (
    body.codigo !== undefined ||
    body.codigoPregunta !== undefined ||
    body.CodigoPregunta !== undefined
  );
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "cacmu-proxy", date: new Date().toISOString() });
});

app.get("/api/cacmu/debug/pregunta/:identificacion", async (req, res) => {
  try {
    const numeroIdentificacion = (req.params.identificacion || "").trim();
    const payloads = [
      { numeroIdentificacion },
      { codigo: 0, identificacion: numeroIdentificacion },
    ];
    const modes = ["bearer", "authorization-raw", "x-api-key", "apikey", "key", "mixed"];
    const attempts = [];

    for (const payload of payloads) {
      for (const mode of modes) {
        const result = await cacmuPost(
          "/PreguntasSeguridad/ConsultaPregunta",
          payload,
          mode
        );
        attempts.push({
          mode,
          payload,
          upstreamStatus: result.status,
          contentType: result.contentType,
          upstreamPayload: result.data,
          upstreamRaw: result.raw,
        });
      }
    }

    return res.status(200).json({
      ok: true,
      request: { numeroIdentificacion },
      attempts,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      messages: ["Fallo en debug endpoint"],
      detail: error.message,
    });
  }
});

app.post("/api/cacmu/preguntas-seguridad", async (req, res) => {
  try {
    const numeroIdentificacion = normalizeIdentificacion(req.body);
    const codigo = normalizeCodigoPregunta(req.body);
    const codigoFueEnviado = hasCodigoPregunta(req.body);

    if (!numeroIdentificacion) {
      return res
        .status(400)
        .json({
          ok: false,
          messages: [
            "numeroIdentificacion es requerido (tambien acepta identificacion)",
          ],
        });
    }
    if (codigoFueEnviado && !codigo) {
      return res.status(400).json({
        ok: false,
        messages: ["codigo debe ser uno de: 1, 2, 3, 4, 5, 6, 8, 9, 10"],
      });
    }

    const attempts = [];

    if (!codigoFueEnviado) {
      attempts.push({
        NumeroIdentificacion: numeroIdentificacion,
      });

      for (const codigoValido of CODIGOS_PREGUNTA_VALIDOS) {
        attempts.push({
          codigoPregunta: codigoValido,
          NumeroIdentificacion: numeroIdentificacion,
        });
      }
    } else {
      attempts.push({
        codigoPregunta: codigo,
        NumeroIdentificacion: numeroIdentificacion,
      });
    }

    let result = null;
    for (const payload of attempts) {
      result = await cacmuPost(
        "/PreguntasSeguridad/ConsultaPregunta",
        payload,
        "authorization-raw"
      );

      if (result.ok) {
        break;
      }
    }

    return sendUpstreamResult(
      res,
      result,
      "CACMU no devolvio JSON consultando pregunta de seguridad"
    );
  } catch (error) {
    console.error("Error consultando preguntas de seguridad:", error);
    return res.status(500).json({
      ok: false,
      messages: ["Error interno consultando CACMU"],
      detail: error.message,
    });
  }
});

async function bloquearBancaVirtualHandler(req, res) {
  try {
    const numeroIdentificacion = normalizeIdentificacion(req.body);
    if (!numeroIdentificacion) {
      return res.status(400).json({
        ok: false,
        messages: ["numeroIdentificacion es requerido"],
      });
    }

    const payload = {
      NumeroIdentificacion: numeroIdentificacion,
    };

    const result = await cacmuPost(
      "/BancaVirtual/Bloquear",
      payload,
      "authorization-raw"
    );

    if (result.data !== null && result.data !== undefined) {
      return res.status(result.status).json(result.data);
    }

    return res.status(result.status || 502).json({
      ok: result.ok,
      messages: ["CACMU no devolvio JSON bloqueando banca virtual"],
      upstreamUrl: result.upstreamUrl,
      upstreamStatus: result.status,
      upstreamContentType: result.contentType,
      upstreamRaw: result.raw,
      payloadEnviadoACacmu: payload,
    });
  } catch (error) {
    console.error("Error bloqueando banca virtual:", error);
    return res.status(500).json({
      ok: false,
      messages: ["Error interno bloqueando en CACMU"],
      detail: error.message,
    });
  }
}

app.post("/api/BancaVirtual/Bloquear", bloquearBancaVirtualHandler);

app.listen(PORT, () => {
  console.log(`CACMU proxy escuchando en http://localhost:${PORT}`);
});













