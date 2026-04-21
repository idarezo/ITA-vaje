import { useEffect, useState } from "react";

const API_BASE = "http://localhost:4000";

const STATUS_LABEL = {
  SUCCEEDED: "Plačano",
  PENDING:   "Čaka na plačilo",
  FAILED:    "Neuspešno",
  CANCELLED: "Preklicano",
};

const STATUS_PAID = (s) => s === "SUCCEEDED";

function StatusBadge({ status }) {
  const paid = STATUS_PAID(status);
  return (
    <span style={{
      display: "inline-block",
      padding: "3px 10px",
      borderRadius: 4,
      fontSize: "0.74rem",
      fontWeight: 600,
      letterSpacing: "0.03em",
      background: paid ? "#e6f4ea" : "#fdecea",
      color:      paid ? "#2e7d32" : "#b71c1c",
      border:     `1px solid ${paid ? "#a5d6a7" : "#ef9a9a"}`,
    }}>
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("sl-SI", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}

function PaymentRow({ payment, isLatest }) {
  const paid = STATUS_PAID(payment.status);
  return (
    <div style={{
      ...s.row,
      background:   isLatest ? (paid ? "#f0faf2" : "#fff8f8") : "#fff",
      borderColor:  isLatest ? (paid ? "#a5d6a7" : "#ef9a9a") : "#e8d9c4",
      borderWidth:  isLatest ? 2 : 1,
    }}>
      <div style={s.rowLeft}>
        {isLatest && <span style={s.latestBadge}>Zadnji račun</span>}
        <div style={s.desc}>{payment.description || "Račun"}</div>
        <div style={s.meta}>Rok: {formatDate(payment.dueDate)}</div>
      </div>
      <div style={s.rowRight}>
        <div style={s.amount}>{Number(payment.amount).toFixed(2)} {payment.currency}</div>
        <StatusBadge status={payment.status} />
      </div>
    </div>
  );
}

export default function App({ propertyId = null, role = "landlord", userName = "" }) {
  const [payments, setPayments]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const url = propertyId
      ? `${API_BASE}/payments/properties/${propertyId}`
      : `${API_BASE}/payments`;

    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error("Napaka pri nalaganju plačil.");
        return r.json();
      })
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        const sorted = [...list].sort(
          (a, b) => new Date(b.dueDate) - new Date(a.dueDate),
        );
        setPayments(sorted);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [propertyId]);

  const latest = payments[0] ?? null;
  const latestPaid = latest ? STATUS_PAID(latest.status) : null;

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.topbar}>
        <div style={s.topbarInner}>
          <div>
            {userName && <p style={s.greeting}>Dobrodošli, {userName}</p>}
            <h1 style={s.title}>
              {propertyId ? `Plačila – nepremičnina #${propertyId}` : "Pregled plačil"}
            </h1>
          </div>
        </div>
      </div>

      <div style={s.content}>
        {/* Latest payment alert */}
        {latest && (
          <div style={{
            ...s.alert,
            background: latestPaid ? "#e6f4ea" : "#fdecea",
            borderColor: latestPaid ? "#a5d6a7" : "#ef9a9a",
            color:       latestPaid ? "#1b5e20" : "#b71c1c",
          }}>
            <span style={s.alertIcon}>{latestPaid ? "✓" : "!"}</span>
            <span>
              {latestPaid
                ? "Zadnji račun je poravnan. Vse obveznosti so urejene."
                : `Opozorilo: zadnji račun (${formatDate(latest.dueDate)}) ni poravnan.`}
            </span>
          </div>
        )}

        {loading && <p style={s.feedback}>Nalaganje plačil…</p>}
        {error   && <p style={{ ...s.feedback, color: "#b04a2a" }}>{error}</p>}

        {!loading && !error && payments.length === 0 && (
          <p style={s.empty}>Ni evidentiranih plačil.</p>
        )}

        {!loading && !error && payments.length > 0 && (
          <>
            <p style={s.sectionLabel}>
              Skupaj: {payments.length} zapis{payments.length === 1 ? "" : "ov"}
            </p>
            <div style={s.list}>
              {payments.map((p, i) => (
                <PaymentRow key={p.id} payment={p} isLatest={i === 0} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const s = {
  page: {
    minHeight: "100vh",
    background: "#faf5ee",
    fontFamily: "'Inter', system-ui, sans-serif",
    color: "#1e1409",
  },
  topbar: {
    background: "#c7ac98",
    borderBottom: "1px solid #b89880",
  },
  topbarInner: {
    margin: "0 auto",
    padding: "12px 28px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  greeting: {
    margin: "0 0 2px",
    fontSize: "0.72rem",
    color: "#6b4020",
    letterSpacing: "0.04em",
    textTransform: "uppercase",
  },
  title: {
    margin: 0,
    fontSize: "1rem",
    fontWeight: 600,
    color: "#1e1409",
  },
  content: {
    maxWidth: 720,
    margin: "0 auto",
    padding: "32px 28px",
  },
  alert: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "14px 18px",
    borderRadius: 8,
    border: "1px solid",
    marginBottom: 24,
    fontSize: "0.9rem",
    fontWeight: 500,
  },
  alertIcon: {
    fontSize: "1.1rem",
    fontWeight: 700,
    flexShrink: 0,
  },
  feedback: {
    fontSize: "0.9rem",
    color: "#9a7455",
  },
  empty: {
    textAlign: "center",
    padding: "60px 20px",
    color: "#9a7455",
    fontSize: "0.95rem",
  },
  sectionLabel: {
    fontSize: "0.76rem",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.07em",
    color: "#b09070",
    marginBottom: 12,
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    padding: "16px 20px",
    borderRadius: 10,
    border: "1px solid #e8d9c4",
    background: "#fff",
    flexWrap: "wrap",
  },
  rowLeft: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  rowRight: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: 6,
    flexShrink: 0,
  },
  latestBadge: {
    fontSize: "0.68rem",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.07em",
    color: "#7a5030",
    background: "#f0e8d8",
    padding: "1px 7px",
    borderRadius: 3,
    alignSelf: "flex-start",
  },
  desc: {
    fontSize: "0.92rem",
    fontWeight: 600,
    color: "#1e1409",
  },
  meta: {
    fontSize: "0.78rem",
    color: "#9a7455",
  },
  amount: {
    fontSize: "1rem",
    fontWeight: 700,
    color: "#c47c3e",
  },
};
