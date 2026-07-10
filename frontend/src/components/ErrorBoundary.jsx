import React from "react";
import { AlertTriangle, RefreshCw, ExternalLink } from "lucide-react";
import { reportError } from "@/lib/errorReporter";

// Captura errores de renderizado de React para que la app NO se quede en
// pantalla en blanco sin explicación. Muestra el motivo, lo reporta al backend
// (y a GitHub) y ofrece recargar.
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: "", reference: "", issueUrl: "" };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || "Error inesperado" };
  }

  async componentDidCatch(error, info) {
    const res = await reportError({
      source: "frontend",
      message: error?.message || "Error de renderizado (React)",
      stack: `${error?.stack || ""}\n\nComponent stack:${info?.componentStack || ""}`,
      context: { type: "react-error-boundary" },
    });
    if (res) {
      this.setState({ reference: res.fingerprint || res.reference || "", issueUrl: res.github_issue_url || "" });
    }
  }

  handleReload = () => {
    try { window.location.reload(); } catch { /* ignore */ }
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div
        data-testid="error-boundary-screen"
        style={{
          minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
          padding: "24px", background: "#0f0f1a", color: "#e6e6f0",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{
          maxWidth: 520, width: "100%", background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: 32,
          backdropFilter: "blur(16px)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14, background: "rgba(239,68,68,0.15)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <AlertTriangle size={26} color="#f87171" />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Algo salió mal</h1>
              <p style={{ margin: 0, fontSize: 13, opacity: 0.7 }}>La incidencia se registró automáticamente.</p>
            </div>
          </div>

          <div style={{
            background: "rgba(0,0,0,0.3)", borderRadius: 12, padding: "12px 14px",
            fontSize: 13, marginBottom: 16, wordBreak: "break-word",
          }} data-testid="error-boundary-message">
            {this.state.message}
          </div>

          {this.state.reference && (
            <p style={{ fontSize: 12, opacity: 0.65, marginBottom: 8 }}>
              Referencia: <code>{this.state.reference}</code>
            </p>
          )}
          {this.state.issueUrl && (
            <a
              href={this.state.issueUrl} target="_blank" rel="noreferrer"
              data-testid="error-boundary-issue-link"
              style={{ fontSize: 12, color: "#93c5fd", display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 16 }}
            >
              Ver incidencia en GitHub <ExternalLink size={13} />
            </a>
          )}

          <button
            onClick={this.handleReload}
            data-testid="error-boundary-reload-btn"
            style={{
              marginTop: 16, width: "100%", padding: "12px 16px", borderRadius: 12,
              border: "none", cursor: "pointer", fontWeight: 600, fontSize: 14,
              background: "linear-gradient(135deg,#7c3aed,#db2777)", color: "white",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}
          >
            <RefreshCw size={16} /> Recargar la aplicación
          </button>
        </div>
      </div>
    );
  }
}
