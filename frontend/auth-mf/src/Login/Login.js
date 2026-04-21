import { useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE = process.env.REACT_APP_API_BASE_URL || "http://localhost:4000";

function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || "Prijava ni uspela."); return; }
      sessionStorage.setItem("user", JSON.stringify(data.user));
      navigate(data.user.role === "tenant" ? "/dashboard" : "/properties");
    } catch {
      setError("Napaka pri povezavi s strežnikom.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.page}>
      <div style={s.card}>
        <p style={s.eyebrow}>Dobrodošli nazaj</p>
        <h1 style={s.heading}>Prijava</h1>

        {error && <p style={s.error}>{error}</p>}

        <form onSubmit={handleSubmit}>
          <Field label="E-pošta">
            <input type="email" name="email" value={formData.email}
              onChange={handleChange} required placeholder="vas@email.com" style={s.input} />
          </Field>
          <Field label="Geslo">
            <input type="password" name="password" value={formData.password}
              onChange={handleChange} required placeholder="••••••••" style={s.input} />
          </Field>
          <button type="submit" disabled={loading} style={s.btn}>
            {loading ? "Prijavljanje…" : "Prijava"}
          </button>
        </form>

        <p style={s.foot}>
          Nimate računa?{" "}
          <span style={s.link} onClick={() => navigate("/register")}>Registracija</span>
        </p>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "block", fontSize: "0.76rem", fontWeight: 600,
        textTransform: "uppercase", letterSpacing: "0.06em", color: "#b09070", marginBottom: 6 }}>
        {label}
      </label>
      {children}
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
    fontFamily: "'Inter', system-ui, sans-serif",
    padding: "24px 16px",
  },
  card: {
    background: "#fff",
    border: "1px solid #e8d9c4",
    borderRadius: 12,
    padding: "40px 36px",
    width: "100%",
    maxWidth: 380,
  },
  eyebrow: {
    margin: "0 0 4px",
    fontSize: "0.74rem",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "#c47c3e",
  },
  heading: {
    margin: "0 0 28px",
    fontSize: "1.6rem",
    fontWeight: 600,
    color: "#1e1409",
    letterSpacing: "-0.02em",
  },
  input: {
    width: "100%",
    padding: "9px 12px",
    border: "1px solid #e0cdb8",
    borderRadius: 6,
    fontSize: "0.93rem",
    background: "#fdfaf6",
    color: "#1e1409",
    outline: "none",
    boxSizing: "border-box",
    fontFamily: "inherit",
  },
  btn: {
    width: "100%",
    padding: "10px",
    marginTop: 4,
    background: "#c47c3e",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    fontSize: "0.9rem",
    fontWeight: 600,
    cursor: "pointer",
    letterSpacing: "0.01em",
  },
  error:   { color: "#b04a2a", fontSize: "0.86rem", marginBottom: 14 },
  foot:    { marginTop: 22, fontSize: "0.85rem", color: "#9a7455", textAlign: "center" },
  link:    { color: "#c47c3e", cursor: "pointer", fontWeight: 600 },
};

export default Login;
