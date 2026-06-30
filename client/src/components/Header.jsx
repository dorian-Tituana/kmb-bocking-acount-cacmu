export default function Header({ session, numeroIdentificacion, onLogout }) {
  return (
    <header className="surface workspace-header">
      <div className="workspace-title">
        <span className="eyebrow">Atencion en llamada</span>
        <h2>Bloqueo de cuenta</h2>
      </div>

      <div className="workspace-meta">
        <span className="status-chip">
          <strong>Operador</strong>
          {session?.user?.name || session?.user?.sub || "Sesion"}
        </span>
        <span className="status-chip">
          <strong>Cedula</strong>
          {numeroIdentificacion}
        </span>
        <button type="button" className="ghost-button meta-action" onClick={onLogout}>
          Cerrar sesion
        </button>
      </div>
    </header>
  );
}
