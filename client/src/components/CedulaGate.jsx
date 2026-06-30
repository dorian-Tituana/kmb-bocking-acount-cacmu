import { useState } from "react";
import { validarCedulaEcuatoriana } from "../utils/cedulaUtils";

export default function CedulaGate({ onValidate, onLogout, username }) {
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
    <section className="cedula-wrap">
      <form className="surface gate-panel" onSubmit={submit}>
        <div className="gate-copy">
          <span className="eyebrow">Sesion activa</span>
          <h2>Hola, {username}</h2>
        </div>

        <div className="gate-form">
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

          <button type="submit" style={{ marginTop: "4px" }}>
            Validar cedula
          </button>
        </div>

        <div style={{ textAlign: "center", marginTop: "6px" }}>
          <button
            type="button"
            className="ghost-button"
            onClick={onLogout}
            style={{ fontSize: "11px", minHeight: "32px" }}
          >
            Cerrar sesion
          </button>
        </div>
      </form>
    </section>
  );
}
