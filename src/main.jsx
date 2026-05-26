const DummyIcon = () => null;
window.phone = undefined;
window.smartphone = undefined;
window.Smartphone = DummyIcon;
window.Phone = DummyIcon;
window.smartphone_icon = DummyIcon;
window.phone_icon = DummyIcon;

import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import Swal from 'sweetalert2'

// Global SweetAlert2 Interceptor / Wrapper
const originalSwalFire = Swal.fire;
Swal.fire = function (options, ...args) {
  if (!options) return originalSwalFire.apply(this, [options, ...args]);

  // Normalleştirme (String veya obje olması durumu)
  let opts = typeof options === 'string' ? { text: options } : { ...options };

  // Onay penceresi (showCancelButton), input alanları veya explicitly timer kapatılmadıysa
  const isConfirmation = opts.showCancelButton || opts.input;

  // Konumlandırmayı ekranın üst kısmına al
  opts.position = 'top';

  // Bilgi/uyarı amaçlı ise 5 saniye otomatik kapanma ekle
  if (!isConfirmation) {
    opts.timer = 5000;
    opts.timerProgressBar = true;
  }

  // Modern CSS sınıflarını enjekte et
  const existingClasses = opts.customClass || {};
  opts.customClass = {
    ...existingClasses,
    popup: `${existingClasses.popup || ''} modern-top-popup`.trim(),
    title: `${existingClasses.title || ''} modern-top-title`.trim(),
    htmlContainer: `${existingClasses.htmlContainer || ''} modern-top-content`.trim(),
    confirmButton: `${existingClasses.confirmButton || ''} modern-top-confirm`.trim(),
    cancelButton: `${existingClasses.cancelButton || ''} modern-top-cancel`.trim(),
  };

  return originalSwalFire.apply(this, [opts, ...args]);
};


class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "40px", color: "#1d1d1f", fontFamily: "sans-serif", textAlign: "center", backgroundColor: "#f5f5f7", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>Bir şeyler ters gitti.</h1>
          <p style={{ color: "#666", marginBottom: "2rem" }}>Uygulama başlatılırken bir sorun oluştu.</p>
          <div style={{ backgroundColor: "#fff", padding: "20px", borderRadius: "12px", border: "1px solid #ddd", marginBottom: "20px", maxWidth: "80%", overflow: "auto", textAlign: "left" }}>
            <p><strong>Hata:</strong> {this.state.error && this.state.error.toString()}</p>
          </div>
          <button
            onClick={() => { localStorage.clear(); sessionStorage.clear(); window.location.reload(); }}
            style={{ padding: "12px 24px", backgroundColor: "#0071e3", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}
          >
            Verileri Sıfırla ve Yeniden Başlat
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

import { AppProvider } from './context/AppContext.jsx'
import { appAlert } from './utils/alert.js'

// Tarayıcı alert fonksiyonunu tüm uygulama için modern hale getirir
window.alert = (msg) => appAlert(msg);

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error("Critical: Root element not found in DOM.");
} else {
  createRoot(rootElement).render(
    <StrictMode>
      <ErrorBoundary>
        <AppProvider>
          <App />
        </AppProvider>
      </ErrorBoundary>
    </StrictMode>,
  );
}
