import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import jwt from "jsonwebtoken";
import mysql from "mysql2/promise";
import crypto from "node:crypto";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8787;
const CACMU_BASE_URL =
  process.env.CACMU_BASE_URL || "https://apis.cacmu.fin.ec/WSIVRCacmu/api";
const CACMU_API_KEY = process.env.CACMU_API_KEY;
const JWT_SECRET = process.env.JWT_SECRET;

const MYSQL_CONFIG = {
  host: process.env.MYSQL_HOST || "172.19.1.78",
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER || "",
  password: process.env.MYSQL_PASSWORD || "",
  database: process.env.MYSQL_DATABASE || "cck_dev",
  waitForConnections: true,
  connectionLimit: 5,
  connectTimeout: 5000,
  namedPlaceholders: false,
};

const pool = mysql.createPool(MYSQL_CONFIG);

if (!JWT_SECRET) {
  console.warn("JWT_SECRET no esta configurado. El login no podra emitir JWT.");
}

if (!CACMU_API_KEY) {
  console.warn("CACMU_API_KEY no esta configurado. Los endpoints CACMU no funcionaran.");
}

app.use(cors());
app.use(express.json());

function buildHeaders(mode = "bearer") {
  const base = {
    "Content-Type": "application/json",
  };

  if (!CACMU_API_KEY) {
    return base;
  }

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
  if (!CACMU_API_KEY) {
    return {
      ok: false,
      status: 503,
      data: null,
      raw: null,
      contentType: "application/json",
      upstreamUrl: `${CACMU_BASE_URL}${path}`,
    };
  }

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
  const codigo = Number(body.codigo ?? body.codigoPregunta ?? body.CodigoPregunta);
  return CODIGOS_PREGUNTA_VALIDOS.includes(codigo) ? codigo : null;
}

function hasCodigoPregunta(body = {}) {
  return (
    body.codigo !== undefined ||
    body.codigoPregunta !== undefined ||
    body.CodigoPregunta !== undefined
  );
}

function normalizeAuthValue(value) {
  return String(value ?? "").trim();
}

function safeEquals(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function signLoginToken(username) {
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET no esta configurado");
  }

  return jwt.sign(
    {
      sub: username,
      username,
      name: username,
      scope: ["cacmu-dashboard"],
      kind: "login",
    },
    JWT_SECRET,
    {
      expiresIn: "8h",
      issuer: "cacmu-dashboard",
    }
  );
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "cacmu-proxy", date: new Date().toISOString() });
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const username = normalizeAuthValue(
      req.body.username ??
        req.body.usuario ??
        req.body.identificacion ??
        req.body.Identification
    );
    const password = normalizeAuthValue(req.body.password ?? req.body.contrasenia);

    if (!username || !password) {
      return res.status(400).json({
        ok: false,
        messages: ["username y password son requeridos"],
      });
    }

    if (!JWT_SECRET) {
      return res.status(500).json({
        ok: false,
        messages: ["JWT_SECRET no esta configurado en el backend"],
      });
    }

    const [rows] = await pool.query(
      "SELECT Id, Identification, Password, UserGroup FROM `user` WHERE Id = ? OR Identification = ? LIMIT 1",
      [username, username]
    );

    const user = Array.isArray(rows) ? rows[0] : null;
    if (!user) {
      return res.status(401).json({
        ok: false,
        messages: ["Credenciales invalidas"],
      });
    }

    if (!safeEquals(user.Password ?? "", password)) {
      return res.status(401).json({
        ok: false,
        messages: ["Credenciales invalidas"],
      });
    }

    const token = signLoginToken(user.Id || user.Identification || username);

    return res.json({
      ok: true,
      token,
      user: {
        username: user.Id || user.Identification || username,
        name: user.Id || user.Identification || username,
        identification: user.Identification || null,
        userGroup: user.UserGroup || null,
      },
    });
  } catch (error) {
    if (error.code === "ETIMEDOUT" || error.code === "ECONNREFUSED") {
      return res.status(503).json({
        ok: false,
        messages: ["No se pudo conectar a la base de datos MySQL"],
        detail: error.message,
      });
    }

    console.error("Error autenticando usuario:", error);
    return res.status(500).json({
      ok: false,
      messages: ["Error interno autenticando usuario"],
      detail: error.message,
    });
  }
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
      return res.status(400).json({
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
