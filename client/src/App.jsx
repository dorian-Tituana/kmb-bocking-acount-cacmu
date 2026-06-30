import { useEffect, useState } from "react";
import "./App.css";
import { consultarPreguntaSeguridad } from "./api";
import LoginScreen from "./components/LoginScreen";
import CedulaGate from "./components/CedulaGate";
import AppShell from "./components/AppShell";
import { crearJwtMock, decodeJwtPart } from "./utils/jwtUtils";
import { seleccionarPreguntasAleatorias, extraerRespuesta } from "./utils/preguntasUtils";

const SESSION_STORAGE_KEY = "cacmu.mock.session";

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

async function consultarRespuestasPreguntas(preguntas, numeroIdentificacion) {
  try {
    const consultasRespuestas = await Promise.all(
      preguntas.map(async (pregunta) => {
        const respuesta = await consultarPreguntaSeguridad({
          codigo: pregunta.codigo,
          numeroIdentificacion,
        });

        const respuestaExtraida = extraerRespuesta(respuesta);

        return {
          ...pregunta,
          respuesta: respuestaExtraida || "No disponible",
          estado: null,
        };
      })
    );
    return consultasRespuestas;
  } catch (error) {
    console.error("Error consultando respuestas:", error);
    return preguntas.map((p) => ({
      ...p,
      respuesta: "Error al cargar",
      estado: null,
    }));
  }
}

export default function App() {
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
    const preguntasAleatorias = seleccionarPreguntasAleatorias();

    consultarRespuestasPreguntas(preguntasAleatorias, valor.trim())
      .then((preguntas) => {
        setPreguntasIniciales(preguntas);
        setCedulaValidada(true);
      })
      .catch((error) => {
        console.error("Error consultando preguntas:", error);
        setPreguntasIniciales(preguntasAleatorias.map((p) => ({ ...p, respuesta: null, estado: null })));
        setCedulaValidada(true);
      });
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
