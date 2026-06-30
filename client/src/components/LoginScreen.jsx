import { useState } from "react";

const CACMU_BANNER_URL =
  "https://www.cacmu.fin.ec/web/wp-content/uploads/2023/03/logo-cacmu-1024x565.png";

export default function LoginScreen({ onLogin }) {
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
