import { useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE = process.env.REACT_APP_API_BASE_URL || "http://localhost:4000";

const initialState = {
  firstName: "", lastName: "", birthYear: "",
  role: "tenant", email: "", password: "", confirmPassword: "",
};

function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState(initialState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [emailExists, setEmailExists] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setEmailExists(false);
    if (formData.password !== formData.confirmPassword) {
      setError("Gesli se ne ujemata.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName:  formData.lastName,
          birthYear: Number(formData.birthYear),
          role:      formData.role,
          email:     formData.email,
          password:  formData.password,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          setEmailExists(true);
          setError("Ta e-poštni naslov je že registriran.");
        } else {
          setError(data.message || "Registracija ni uspela.");
        }
        return;
      }
      setFormData(initialState);
      navigate("/login");
    } catch {
      setError("Napaka pri povezavi s strežnikom.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.page}>
      <div style={s.card}>
        <p style={s.eyebrow}>Nov račun</p>
        <h1 style={s.heading}>Registracija</h1>

        {error && (
          <div style={s.errorBox}>
            <p style={s.error}>{error}</p>
            {emailExists && (
              <p style={{ margin: "4px 0 0", fontSize: "0.84rem", color: "#9a7455" }}>
                <span style={s.link} onClick={() => navigate("/login")}>Kliknite tukaj za prijavo →</span>
              </p>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={s.row}>
            <Field label="Ime">
              <input type="text" name="firstName" value={formData.firstName}
                onChange={handleChange} required placeholder="Jana" style={s.input} />
            </Field>
            <Field label="Priimek">
              <input type="text" name="lastName" value={formData.lastName}
                onChange={handleChange} required placeholder="Novak" style={s.input} />
            </Field>
          </div>

          <div style={s.row}>
            <Field label="Leto rojstva">
              <input type="number" name="birthYear" value={formData.birthYear}
                onChange={handleChange} required min="1900" max={new Date().getFullYear()}
                placeholder="1990" style={s.input} />
            </Field>
            <Field label="Vloga">
              <select name="role" value={formData.role} onChange={handleChange}
                required style={s.input}>
                <option value="tenant">Najemnik</option>
                <option value="landlord">Lastnik</option>
              </select>
            </Field>
          </div>

          <Field label="E-pošta">
            <input type="email" name="email" value={formData.email}
              onChange={handleChange} required placeholder="vas@email.com" style={s.input} />
          </Field>

          <div style={s.row}>
            <Field label="Geslo">
              <input type="password" name="password" value={formData.password}
                onChange={handleChange} required placeholder="••••••••" style={s.input} />
            </Field>
            <Field label="Potrdi geslo">
              <input type="password" name="confirmPassword" value={formData.confirmPassword}
                onChange={handleChange} required placeholder="••••••••" style={s.input} />
            </Field>
          </div>

          <button type="submit" disabled={loading} style={s.btn}>
            {loading ? "Registracija…" : "Ustvari račun"}
          </button>
        </form>

        <p style={s.foot}>
          Že imate račun?{" "}
          <span style={s.link} onClick={() => navigate("/login")}>Prijava</span>
        </p>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ flex: 1, marginBottom: 16 }}>
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
    padding: "32px 16px",
  },
  card: {
    background: "#fff",
    border: "1px solid #e8d9c4",
    borderRadius: 12,
    padding: "40px 36px",
    width: "100%",
    maxWidth: 480,
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
  row: { display: "flex", gap: 14 },
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
  errorBox: { background: "#fdecea", border: "1px solid #ef9a9a", borderRadius: 6, padding: "10px 14px", marginBottom: 14 },
  error: { color: "#b04a2a", fontSize: "0.86rem", margin: 0 },
  foot:  { marginTop: 22, fontSize: "0.85rem", color: "#9a7455", textAlign: "center" },
  link:  { color: "#c47c3e", cursor: "pointer", fontWeight: 600 },
};

export default Register;
