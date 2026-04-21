import { Suspense, lazy } from "react";
import { Routes, Route, Link, Navigate } from "react-router-dom";
import PropertyMfWrapper from "./PropertyMfWrapper";
import ResidentsMfWrapper from "./ResidentsMfWrapper";
import PaymentMfWrapper from "./PaymentMfWrapper";
import TenantDashboard from "./TenantDashboard";

const AuthApp     = lazy(() => import("auth/App"));
const RegisterApp = lazy(() => import("auth/Register"));

function Home() {
  return (
    <div style={s.page}>
      <div style={s.card}>
        <p style={s.eyebrow}>Upravljanje nepremičnin</p>
        <h1 style={s.heading}>RentMate<br />Enostavno.<br />Pregledno.</h1>
        <p style={s.sub}>Upravljajte svoje nepremičnine, najemnike in plačila na enem mestu.</p>
        <div style={s.actions}>
          <Link to="/login" style={s.btnPrimary}>Prijava</Link>
          <Link to="/register" style={s.btnOutline}>Ustvari račun</Link>
        </div>
      </div>
    </div>
  );
}

const s = {
  page: {
    minHeight: "100vh",
    background: "#faf5ee",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'Montserrat', 'Inter', system-ui, sans-serif",
    padding: "24px",
  },
  card: {
    maxWidth: 420,
    width: "100%",
  },
  eyebrow: {
    margin: "0 0 16px",
    fontSize: "0.74rem",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    color: "#c47c3e",
  },
  heading: {
    margin: "0 0 16px",
    fontSize: "clamp(2.4rem, 6vw, 3.2rem)",
    fontWeight: 500,
    lineHeight: 1.1,
    color: "#1e1409",
    letterSpacing: "-0.03em",
  },
  sub: {
    margin: "0 0 36px",
    fontSize: "1rem",
    lineHeight: 1.6,
    color: "#9a7455",
  },
  actions: {
    display: "flex",
    gap: 12,
  },
  btnPrimary: {
    padding: "10px 24px",
    background: "#c47c3e",
    color: "#fff",
    textDecoration: "none",
    borderRadius: 6,
    fontSize: "0.9rem",
    fontWeight: 600,
    letterSpacing: "0.01em",
  },
  btnOutline: {
    padding: "10px 24px",
    background: "transparent",
    color: "#1e1409",
    textDecoration: "none",
    borderRadius: 6,
    fontSize: "0.9rem",
    fontWeight: 600,
    border: "1px solid #d0bea8",
  },
};

function RoleRoute({ landlordEl, tenantEl }) {
  const stored = sessionStorage.getItem("user");
  const user = stored ? JSON.parse(stored) : null;
  if (!user) return <Navigate to="/login" replace />;
  return user.role === "tenant" ? tenantEl : landlordEl;
}

function App() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#faf5ee" }} />}>
      <Routes>
        <Route path="/"           element={<Home />} />
        <Route path="/login"      element={<AuthApp />} />
        <Route path="/register"   element={<RegisterApp />} />
        <Route path="/properties" element={<PropertyMfWrapper />} />
        <Route path="/residents"  element={<ResidentsMfWrapper />} />
        <Route path="/payments"   element={<PaymentMfWrapper />} />
        <Route path="/dashboard"  element={
          <RoleRoute
            landlordEl={<Navigate to="/properties" replace />}
            tenantEl={<TenantDashboard />}
          />
        } />
      </Routes>
    </Suspense>
  );
}

export default App;
