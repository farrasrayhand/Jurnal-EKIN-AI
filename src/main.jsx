import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
          background: "#f8fafc",
          fontFamily: "sans-serif"
        }}>
          <div style={{
            maxWidth: "480px",
            width: "100%",
            background: "#ffffff",
            borderRadius: "12px",
            padding: "2rem",
            boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
            border: "1px solid #e2e8f0",
            textAlign: "center"
          }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>⚠️</div>
            <h2 style={{ fontSize: "1.2rem", fontWeight: "700", color: "#0f172a", marginBottom: "0.5rem" }}>
              Terjadi Kendala Memuat Halaman
            </h2>
            <p style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: "1.5rem", lineHeight: "1.5" }}>
              {this.state.error?.message || "Komponen tidak dapat dimuat."}
            </p>
            <button
              onClick={() => {
                localStorage.removeItem("ekinerja_journals_temp");
                window.location.reload();
              }}
              style={{
                background: "#2563eb",
                color: "#ffffff",
                border: "none",
                borderRadius: "8px",
                padding: "0.65rem 1.25rem",
                fontWeight: "600",
                fontSize: "0.9rem",
                cursor: "pointer"
              }}
            >
              Muat Ulang Halaman
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
