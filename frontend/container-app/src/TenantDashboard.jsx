import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE = "http://localhost:4000";

const STATUS_PAID = (s) => s === "SUCCEEDED";
const STATUS_LABEL = {
  SUCCEEDED:      "Plačano",
  PARTIALLY_PAID: "Delno plačano",
  PENDING:        "Čaka na plačilo",
  FAILED:         "Neuspešno",
  CANCELLED:      "Preklicano",
};

function fmt(iso, opts = { day: "2-digit", month: "long", year: "numeric" }) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("sl-SI", opts);
}

function fmtShort(iso) {
  return fmt(iso, { day: "2-digit", month: "2-digit", year: "numeric" });
}

function StatusBadge({ status }) {
  const paid = STATUS_PAID(status);
  const partial = status === "PARTIALLY_PAID";
  const cancelled = status === "CANCELLED";
  const bg    = paid ? "#e6f4ea" : (partial || cancelled) ? "#fff8e1" : "#fdecea";
  const color = paid ? "#2e7d32" : (partial || cancelled) ? "#e65100" : "#b71c1c";
  const bdr   = paid ? "#a5d6a7" : (partial || cancelled) ? "#ffcc80" : "#ef9a9a";
  return (
    <span style={{
      display: "inline-block", padding: "2px 10px", borderRadius: 4,
      fontSize: "0.74rem", fontWeight: 600,
      background: bg, color, border: `1px solid ${bdr}`,
    }}>
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={s.infoRow}>
      <span style={s.infoLabel}>{label}</span>
      <span style={s.infoValue}>{value}</span>
    </div>
  );
}

export default function TenantDashboard() {
  const navigate = useNavigate();
  const stored   = sessionStorage.getItem("user");
  const user     = stored ? JSON.parse(stored) : null;

  const [payments,  setPayments]  = useState([]);
  const [property,  setProperty]  = useState(null);
  const [resident,  setResident]  = useState(null);
  const [owner,     setOwner]     = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [deleted,   setDeleted]   = useState(false);
  const [payError,    setPayError]    = useState(null);
  const [paying,      setPaying]      = useState(null);
  const [confirm,     setConfirm]     = useState(null);
  const [payAmount,   setPayAmount]   = useState("");
  const [detailPay,   setDetailPay]   = useState(null);
  const [logoutHover, setLogoutHover] = useState(false);
  const propIdRef    = useRef(null);
  const residentIdRef = useRef(null);

  async function fetchPayments(propId, residentId) {
    try {
      const r = await fetch(`${API_BASE}/payments/properties/${propId}`);
      if (r.ok) {
        const data = await r.json();
        const all = Array.isArray(data) ? data : [];
        const list = residentId ? all.filter((p) => p.residentId === residentId) : all;
        setPayments(list.sort((a, b) => new Date(b.dueDate) - new Date(a.dueDate)));
      }
    } catch { /* ignore polling errors */ }
  }

  useEffect(() => {
    if (!user) { navigate("/login"); return; }

    async function load() {
      let propId = null;
      let residentId = null;
      try {
        const r = await fetch(`${API_BASE}/residents?limit=1000&include_inactive=true`);
        if (r.ok) {
          const data = await r.json();
          const residents = data?.residents ?? [];
          let match = residents.find((res) => res.user_id === user.id);

          if (!match && user.email) {
            match = residents.find(
              (res) => res.email?.toLowerCase() === user.email.toLowerCase()
            );
            if (match && match.is_active) {
              fetch(`${API_BASE}/residents/${match.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ user_id: user.id }),
              }).catch(() => {});
            }
          }

          if (match && match.is_active) { setResident(match); propId = match.property_id; residentId = match.id; }
          else { setDeleted(true); }
        }
      } catch { /* ignore */ }

      if (propId) {
        propIdRef.current    = propId;
        residentIdRef.current = residentId;
        try {
          const r = await fetch(`${API_BASE}/properties/${propId}`);
          if (r.ok) {
            const data = await r.json();
            const prop = data.data ?? data;
            setProperty(prop);
            if (prop?.ownerUserId) {
              try {
                const ro = await fetch(`${API_BASE}/users/${prop.ownerUserId}`);
                if (ro.ok) setOwner(await ro.json());
              } catch { /* ignore */ }
            }
          }
        } catch { /* ignore */ }
      }

      if (propId) {
        await fetchPayments(propId, residentId);
      } else {
        setPayError("Plačila trenutno niso dosegljiva.");
      }

      setLoading(false);
    }

    load();

    const interval = setInterval(() => {
      if (propIdRef.current) fetchPayments(propIdRef.current, residentIdRef.current);
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  function handlePay(payment) {
    const remaining = payment.status === "PARTIALLY_PAID" && payment.paidAmount != null
      ? Number(payment.amount) - Number(payment.paidAmount)
      : Number(payment.amount);
    setPayAmount(String(remaining.toFixed(2)));
    setConfirm(payment);
  }

  async function confirmPay() {
    const paymentId = confirm.id;
    const totalAmount = Number(confirm.amount);
    const alreadyPaid = confirm.status === "PARTIALLY_PAID" && confirm.paidAmount != null
      ? Number(confirm.paidAmount) : 0;
    const remaining = totalAmount - alreadyPaid;
    const thisPay = Math.min(Math.max(Number(payAmount) || remaining, 0.01), remaining);
    const newPaidTotal = alreadyPaid + thisPay;
    const isPartial = newPaidTotal < totalAmount;
    setConfirm(null);
    setPaying(paymentId);
    try {
      const r = await fetch(`${API_BASE}/payments/${paymentId}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: newPaidTotal }),
      });
      if (r.ok) {
        const newStatus = isPartial ? "PARTIALLY_PAID" : "SUCCEEDED";
        setPayments((prev) =>
          prev.map((p) => p.id === paymentId ? { ...p, status: newStatus, paidAmount: newPaidTotal } : p)
        );
      }
    } catch { /* ignore */ }
    setPaying(null);
  }

  async function handleCancel(paymentId) {
    setPaying(paymentId);
    try {
      const r = await fetch(`${API_BASE}/payments/${paymentId}/cancel`, { method: "POST" });
      if (r.ok) {
        setPayments((prev) =>
          prev.map((p) => p.id === paymentId ? { ...p, status: "CANCELLED" } : p)
        );
      }
    } catch { /* ignore */ }
    setPaying(null);
  }

  async function handleRetry(paymentId) {
    setPaying(paymentId);
    try {
      const r = await fetch(`${API_BASE}/payments/${paymentId}/retry`, { method: "POST" });
      if (r.ok) {
        setPayments((prev) =>
          prev.map((p) => p.id === paymentId ? { ...p, status: "PENDING" } : p)
        );
      }
    } catch { /* ignore */ }
    setPaying(null);
  }

  async function handleLogout() {
    try { await fetch(`${API_BASE}/auth/logout`, { method: "POST" }); } catch { /* ignore */ }
    sessionStorage.removeItem("user");
    navigate("/");
  }

  if (!user) return null;

  const latest          = payments[0] ?? null;
  const latestPaid      = latest ? STATUS_PAID(latest.status) : null;
  const latestPartial   = latest?.status === "PARTIALLY_PAID";
  const latestCancelled = latest?.status === "CANCELLED";
  const hasPendingBill  = payments.some((p) => p.status === "PENDING" || p.status === "PARTIALLY_PAID" || p.status === "FAILED");
  const recent     = payments.slice(0, 6);

  return (
    <div style={s.page}>

      {/* ── Topbar ── */}
      <div style={s.topbar}>
        <div style={s.topbarInner}>
          <div style={s.appBrand}>
            <span style={s.appName}>RentMate</span>
          </div>
          <button
            style={{ ...s.logoutBtn, ...(logoutHover ? s.logoutBtnHover : {}) }}
            onMouseEnter={() => setLogoutHover(true)}
            onMouseLeave={() => setLogoutHover(false)}
            onClick={handleLogout}
          >odjava</button>
        </div>
      </div>

      {/* ── Payment confirm modal ── */}
      {confirm && (
        <div style={s.overlay} onClick={() => setConfirm(null)}>
          <div style={s.modal} onClick={(e) => e.stopPropagation()}>
            <p style={s.modalEyebrow}>Potrditev plačila</p>
            <div style={s.modalAmount}>
              {Number(confirm.amount).toFixed(2)}
              <span style={s.modalCurrency}> {confirm.currency}</span>
            </div>

            <div style={s.modalDivider} />

            <div style={s.modalRows}>
              <div style={s.modalRow}>
                <span style={s.modalRowLabel}>Opis</span>
                <span style={s.modalRowValue}>{confirm.description || "Račun"}</span>
              </div>
              <div style={s.modalRow}>
                <span style={s.modalRowLabel}>Rok plačila</span>
                <span style={s.modalRowValue}>{fmt(confirm.dueDate)}</span>
              </div>
              {property && (
                <div style={s.modalRow}>
                  <span style={s.modalRowLabel}>Nepremičnina</span>
                  <span style={s.modalRowValue}>{property.title}</span>
                </div>
              )}
              {owner && (
                <div style={s.modalRow}>
                  <span style={s.modalRowLabel}>Prejemnik</span>
                  <span style={s.modalRowValue}>{owner.firstName} {owner.lastName}</span>
                </div>
              )}
            </div>

            <div style={s.modalDivider} />

            <div style={s.modalRow}>
              <span style={s.modalRowLabel}>Znesek plačila ({confirm.currency})</span>
              <input
                type="number"
                min="0.01"
                max={Number(confirm.amount)}
                step="0.01"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                style={s.amountInput}
              />
            </div>
            {Number(payAmount) < Number(confirm.amount) && Number(payAmount) > 0 && (
              <p style={s.partialNote}>
                Delno plačilo — preostalo: {(Number(confirm.amount) - Number(payAmount)).toFixed(2)} {confirm.currency}
              </p>
            )}

            <p style={s.modalNote}>
              S klikom na "Potrdi plačilo" boste potrdili nakazilo najemnine.
            </p>

            <div style={s.modalActions}>
              <button style={s.modalCancel} onClick={() => setConfirm(null)}>Prekliči</button>
              <button style={s.modalConfirm} onClick={confirmPay}>Potrdi plačilo</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Payment detail modal ── */}
      {detailPay && (
        <div style={s.overlay} onClick={() => setDetailPay(null)}>
          <div style={s.modal} onClick={(e) => e.stopPropagation()}>
            <p style={s.modalEyebrow}>Podrobnosti računa</p>
            <div style={s.modalAmount}>
              {Number(detailPay.amount).toFixed(2)}
              <span style={s.modalCurrency}> {detailPay.currency}</span>
            </div>
            <div style={s.modalDivider} />
            <div style={s.modalRows}>
              <div style={s.modalRow}>
                <span style={s.modalRowLabel}>Opis</span>
                <span style={s.modalRowValue}>{detailPay.description || "Račun"}</span>
              </div>
              <div style={s.modalRow}>
                <span style={s.modalRowLabel}>Rok plačila</span>
                <span style={s.modalRowValue}>{fmt(detailPay.dueDate)}</span>
              </div>
              <div style={s.modalRow}>
                <span style={s.modalRowLabel}>Status</span>
                <span style={s.modalRowValue}><StatusBadge status={detailPay.status} /></span>
              </div>
              {detailPay.paidAmount != null && (
                <div style={s.modalRow}>
                  <span style={s.modalRowLabel}>Plačano</span>
                  <span style={{ ...s.modalRowValue, color: "#2e7d32", fontWeight: 700 }}>
                    {Number(detailPay.paidAmount).toFixed(2)} {detailPay.currency}
                  </span>
                </div>
              )}
              {detailPay.status === "PARTIALLY_PAID" && (
                <div style={s.modalRow}>
                  <span style={s.modalRowLabel}>Preostalo</span>
                  <span style={{ ...s.modalRowValue, color: "#e65100", fontWeight: 700 }}>
                    {(Number(detailPay.amount) - Number(detailPay.paidAmount)).toFixed(2)} {detailPay.currency}
                  </span>
                </div>
              )}
            </div>
            <div style={s.modalDivider} />
            <div style={s.modalActions}>
              <button style={s.modalConfirm} onClick={() => setDetailPay(null)}>Zapri</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Main content ── */}
      <div style={s.content}>
        {!loading && deleted && (
          <div style={s.deletedBanner}>
            <span style={{ fontSize: "1.4rem" }}>⚠</span>
            <div>
              <strong>Vaš račun je bil izbrisan.</strong>
              <p style={{ margin: "4px 0 0", fontSize: "0.84rem", opacity: 0.85 }}>
                Stopite v stik z lastnikom nepremičnine za več informacij.
              </p>
            </div>
          </div>
        )}
        <div style={s.grid}>

          {/* ── LEFT: property info ── */}
          <div style={s.propertyCard}>
            {/* Greeting inside the card */}
            <div style={s.cardGreeting}>
              <p style={s.cardWelcome}>Dobrodošli nazaj</p>
              <p style={s.cardUserName}>
                {resident ? `${resident.first_name} ${resident.last_name}` : `${user.firstName} ${user.lastName}`}
              </p>
            </div>

            <p style={s.cardLabel}>Moja nepremičnina</p>

            {loading && <p style={s.muted}>Nalaganje…</p>}

            {!loading && !property && (
              <p style={s.muted}>Podatki o nepremičnini niso dosegljivi.</p>
            )}

            {!loading && property && (
              <>
                <h2 style={s.propTitle}>{property.title}</h2>
                <p style={s.propAddress}>{property.address}</p>

                <div style={s.propStats}>
                  {property.bedrooms  && <div style={s.stat}><span style={s.statNum}>{property.bedrooms}</span><span style={s.statLbl}>sobe</span></div>}
                  {property.bathrooms && <div style={s.stat}><span style={s.statNum}>{property.bathrooms}</span><span style={s.statLbl}>kop.</span></div>}
                  {property.area      && <div style={s.stat}><span style={s.statNum}>{property.area}</span><span style={s.statLbl}>m²</span></div>}
                  <div style={s.stat}>
                    <span style={s.statNum}>{Number(property.price).toFixed(0)}</span>
                    <span style={s.statLbl}>€/mes</span>
                  </div>
                </div>

                <div style={s.divider} />

                <div style={s.infoTable}>
                  <InfoRow
                    label="Začetek najema"
                    value={resident?.move_in_date
                      ? fmt(resident.move_in_date + "T00:00:00")
                      : "—"}
                  />
                  <InfoRow label="Konec najema"  value="Nedoločen čas" />
                  <InfoRow label="Lastnik"       value={owner ? `${owner.firstName} ${owner.lastName}` : "—"} />
                  {resident?.phone && <InfoRow label="Telefon" value={resident.phone} />}
                </div>
              </>
            )}
          </div>

          {/* ── RIGHT: payments ── */}
          <div style={s.paymentCol}>

            {/* Status alert */}
            {!loading && !payError && latest && (
              <div style={{
                ...s.alert,
                background:  latestPaid && !hasPendingBill ? "#e6f4ea" : latestPartial ? "#fff8e1" : latestCancelled && !hasPendingBill ? "#fff8e1" : "#fdecea",
                borderColor: latestPaid && !hasPendingBill ? "#a5d6a7" : latestPartial ? "#ffcc80" : latestCancelled && !hasPendingBill ? "#ffcc80" : "#ef9a9a",
                color:       latestPaid && !hasPendingBill ? "#1b5e20" : latestPartial ? "#e65100" : latestCancelled && !hasPendingBill ? "#e65100" : "#b71c1c",
              }}>
                <span style={s.alertIcon}>{latestPaid && !hasPendingBill ? "✓" : latestPartial ? "½" : latestCancelled && !hasPendingBill ? "✕" : "⚠"}</span>
                <div>
                  <strong>
                    {hasPendingBill
                      ? (latestPartial ? "Zadnji račun je delno poravnan!" : "Obstajajo neporavnani računi!")
                      : latestCancelled
                      ? "Zadnji račun je bil preklican."
                      : latestPaid
                      ? "Vse obveznosti so poravnane."
                      : "Obstajajo neporavnani računi!"}
                  </strong>
                  <p style={s.alertSub}>
                    {hasPendingBill
                      ? (latestPartial ? `Račun z dne ${fmtShort(latest.dueDate)} je bil delno plačan.` : `Nekateri računi še niso poravnani.`)
                      : latestCancelled
                      ? `Račun z dne ${fmtShort(latest.dueDate)} je bil preklican.`
                      : latestPaid
                      ? `Zadnji račun (${fmtShort(latest.dueDate)}) je bil plačan.`
                      : `Nekateri računi še niso poravnani.`}
                  </p>
                </div>
              </div>
            )}

            {/* Recent payments */}
            <div style={s.section}>
              <p style={s.cardLabel}>Zadnja plačila</p>

              {loading   && <p style={s.muted}>Nalaganje…</p>}
              {payError  && <p style={{ ...s.muted, color: "#b04a2a" }}>{payError}</p>}
              {!loading && !payError && recent.length === 0 && (
                <p style={s.muted}>Ni evidentiranih plačil.</p>
              )}

              {!loading && !payError && recent.length > 0 && (
                <div style={s.payList}>
                  {recent.map((p, i) => {
                    const paid = STATUS_PAID(p.status);
                    return (
                      <div key={p.id} style={{
                        ...s.payRow,
                        borderLeftColor: paid ? "#a5d6a7" : p.status === "PARTIALLY_PAID" ? "#ffcc80" : "#ef9a9a",
                        borderLeftWidth: i === 0 ? 4 : 3,
                        cursor: "pointer",
                      }} onClick={() => setDetailPay(p)}>
                        <div style={s.payLeft}>
                          {i === 0 && <span style={s.latestTag}>Zadnji</span>}
                          <div style={s.payDesc}>{p.description || "Račun"}</div>
                          <div style={s.payMeta}>Rok: {fmtShort(p.dueDate)}</div>
                        </div>
                        <div style={s.payRight}>
                          <div style={s.payAmount}>{Number(p.amount).toFixed(2)} {p.currency}</div>
                          <StatusBadge status={p.status} />
                          {p.status === "PENDING" && (
                            <div style={{ display: "flex", gap: 4 }} onClick={(e) => e.stopPropagation()}>
                              <button style={{ ...s.payBtn, opacity: paying === p.id ? 0.6 : 1 }}
                                disabled={paying === p.id} onClick={() => handlePay(p)}>
                                {paying === p.id ? "…" : "Plačaj"}
                              </button>
                            </div>
                          )}
                          {p.status === "PARTIALLY_PAID" && (
                            <button style={{ ...s.payBtn, opacity: paying === p.id ? 0.6 : 1 }}
                              disabled={paying === p.id} onClick={(e) => { e.stopPropagation(); handlePay(p); }}>
                              {paying === p.id ? "…" : "Doplačaj"}
                            </button>
                          )}
                          {p.status === "FAILED" && (
                            <button style={{ ...s.payBtn, background: "#5a7a42", opacity: paying === p.id ? 0.6 : 1 }}
                              disabled={paying === p.id} onClick={(e) => { e.stopPropagation(); handleRetry(p.id); }}>
                              {paying === p.id ? "…" : "Ponovi"}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

const s = {
  page: {
    minHeight: "100vh",
    background: "#faf5ee",
    fontFamily: "'Montserrat', system-ui, sans-serif",
    color: "#1e1409",
  },

  /* topbar */
  topbar:      { background: "#c7ac98", borderBottom: "1px solid #b89880" },
  topbarInner: {
    padding: "12px 36px",
    display: "flex", alignItems: "center", justifyContent: "space-between",
  },
  appBrand: { display: "flex", alignItems: "center" },
  appName:  { fontSize: "1.5rem", fontWeight: 700, color: "#6b4020", letterSpacing: "-0.02em" },
  logoutBtn: {
    background: "none", border: "1px solid rgba(107,64,32,0.45)",
    color: "#6b4020", fontSize: "0.9rem", letterSpacing: "0.06em",
    textTransform: "uppercase", padding: "7px 18px", borderRadius: 20, cursor: "pointer",
    transition: "background 0.35s ease, border-color 0.35s ease, color 0.35s ease",
  },
  logoutBtnHover: {
    background: "rgba(255,255,255,0.3)",
    borderColor: "rgba(107,64,32,0.45)",
    color: "#1e1409",
  },

  /* greeting inside property card */
  cardGreeting: {
    borderBottom: "1px solid #f0e6d6",
    marginBottom: 18,
    paddingBottom: 16,
  },
  cardWelcome: {
    margin: "0 0 2px", fontSize: "0.72rem", fontWeight: 600,
    textTransform: "uppercase", letterSpacing: "0.08em", color: "#c47c3e",
  },
  cardUserName: {
    margin: 0, fontSize: "1.3rem", fontWeight: 600,
    color: "#1e1409", letterSpacing: "-0.02em",
  },

  /* layout */
  content: { maxWidth: 1080, margin: "0 auto", padding: "32px 28px" },
  grid: {
    display: "grid",
    gridTemplateColumns: "380px 1fr",
    gap: 20,
    alignItems: "start",
  },

  /* property card */
  propertyCard: {
    background: "#fff",
    border: "1px solid #e8d9c4",
    borderRadius: 12,
    padding: "24px 26px",
  },
  cardLabel: {
    margin: "0 0 12px",
    fontSize: "0.72rem", fontWeight: 700,
    textTransform: "uppercase", letterSpacing: "0.08em", color: "#b09070",
  },
  propTitle:   { margin: "0 0 4px", fontSize: "1.25rem", fontWeight: 600, color: "#1e1409", letterSpacing: "-0.01em" },
  propAddress: { margin: "0 0 18px", fontSize: "0.86rem", color: "#9a7455", lineHeight: 1.4 },
  propStats: {
    display: "flex", gap: 16, marginBottom: 20,
  },
  stat: { display: "flex", flexDirection: "column", alignItems: "center", gap: 1 },
  statNum: { fontSize: "1.1rem", fontWeight: 700, color: "#c47c3e" },
  statLbl: { fontSize: "0.68rem", color: "#b09070", textTransform: "uppercase", letterSpacing: "0.05em" },
  divider: { height: 1, background: "#f0e6d6", margin: "0 0 18px" },

  /* info table */
  infoTable: { display: "flex", flexDirection: "column", gap: 0 },
  infoRow: {
    display: "flex", justifyContent: "space-between", alignItems: "baseline",
    gap: 12, padding: "9px 0", borderBottom: "1px solid #f0e6d6",
  },
  infoLabel: { fontSize: "0.76rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#b09070", flexShrink: 0 },
  infoValue: { fontSize: "0.88rem", color: "#1e1409", textAlign: "right" },

  /* right column */
  paymentCol: { display: "flex", flexDirection: "column", gap: 16 },
  alert: {
    display: "flex", alignItems: "flex-start", gap: 12,
    padding: "14px 18px", borderRadius: 10, border: "1px solid",
  },
  alertIcon:  { fontSize: "1.2rem", fontWeight: 700, flexShrink: 0, marginTop: 1 },
  alertSub:   { margin: "3px 0 0", fontSize: "0.83rem", opacity: 0.85 },
  section: {
    background: "#fff", border: "1px solid #e8d9c4",
    borderRadius: 12, padding: "20px 22px",
  },
  muted: { fontSize: "0.86rem", color: "#9a7455" },
  payList:  { display: "flex", flexDirection: "column", gap: 7 },
  payRow: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    gap: 12, padding: "10px 12px", borderRadius: 7,
    background: "#fdfaf6", borderLeft: "3px solid #e8d9c4", flexWrap: "wrap",
  },
  payLeft:  { display: "flex", flexDirection: "column", gap: 3 },
  payRight: { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 },
  latestTag: {
    fontSize: "0.64rem", fontWeight: 700, textTransform: "uppercase",
    letterSpacing: "0.07em", color: "#7a5030", background: "#f0e8d8",
    padding: "1px 6px", borderRadius: 3, alignSelf: "flex-start",
  },
  payDesc:   { fontSize: "0.86rem", fontWeight: 600, color: "#1e1409" },
  payMeta:   { fontSize: "0.74rem", color: "#9a7455" },
  payAmount: { fontSize: "0.9rem", fontWeight: 700, color: "#c47c3e" },
  deletedBanner: {
    display: "flex", alignItems: "flex-start", gap: 14,
    background: "#fdecea", border: "1px solid #ef9a9a",
    borderRadius: 10, padding: "18px 22px", marginBottom: 20,
    color: "#b71c1c",
  },
  moreBtn: {
    marginTop: 12, background: "none", border: "none",
    color: "#c47c3e", fontSize: "0.84rem", fontWeight: 600,
    cursor: "pointer", padding: 0,
  },
  payBtn: {
    marginTop: 2,
    background: "#c47c3e", color: "#fff",
    border: "none", borderRadius: 4,
    fontSize: "0.74rem", fontWeight: 700,
    padding: "4px 10px", cursor: "pointer",
    letterSpacing: "0.03em",
  },

  /* modal */
  overlay: {
    position: "fixed", inset: 0,
    background: "rgba(30, 20, 9, 0.45)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 1000,
    backdropFilter: "blur(2px)",
  },
  modal: {
    background: "#fff",
    borderRadius: 14,
    padding: "32px 36px",
    width: "100%", maxWidth: 420,
    boxShadow: "0 8px 40px rgba(30,20,9,0.18)",
  },
  modalEyebrow: {
    margin: "0 0 6px",
    fontSize: "0.72rem", fontWeight: 700,
    textTransform: "uppercase", letterSpacing: "0.08em", color: "#c47c3e",
  },
  modalAmount: {
    fontSize: "2.4rem", fontWeight: 700,
    color: "#1e1409", letterSpacing: "-0.02em",
    margin: "0 0 4px",
  },
  modalCurrency: {
    fontSize: "1.1rem", fontWeight: 400, color: "#9a7455",
  },
  modalDivider: {
    height: 1, background: "#f0e6d6", margin: "20px 0",
  },
  modalRows: {
    display: "flex", flexDirection: "column", gap: 0,
  },
  modalRow: {
    display: "flex", justifyContent: "space-between", alignItems: "baseline",
    gap: 12, padding: "9px 0", borderBottom: "1px solid #f5ede0",
  },
  modalRowLabel: {
    fontSize: "0.76rem", fontWeight: 600,
    textTransform: "uppercase", letterSpacing: "0.06em",
    color: "#b09070", flexShrink: 0,
  },
  modalRowValue: {
    fontSize: "0.92rem", color: "#1e1409", textAlign: "right",
  },
  amountInput: {
    border: "1px solid #d0bea8", borderRadius: 6, padding: "6px 10px",
    fontSize: "0.95rem", width: "120px", textAlign: "right", color: "#1e1409",
  },
  partialNote: {
    fontSize: "0.78rem", color: "#b04a2a", margin: "4px 0 12px",
    textAlign: "right",
  },
  modalNote: {
    fontSize: "0.78rem", color: "#9a7455",
    lineHeight: 1.5, margin: "0 0 20px",
  },
  modalActions: {
    display: "flex", gap: 10, justifyContent: "flex-end",
  },
  modalCancel: {
    background: "none", border: "1px solid #d0bea8",
    color: "#7a5030", fontSize: "0.88rem", fontWeight: 600,
    padding: "9px 20px", borderRadius: 7, cursor: "pointer",
  },
  modalConfirm: {
    background: "#c47c3e", border: "none",
    color: "#fff", fontSize: "0.88rem", fontWeight: 700,
    padding: "9px 24px", borderRadius: 7, cursor: "pointer",
  },
};
