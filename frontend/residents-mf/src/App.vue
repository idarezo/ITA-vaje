<template>
  <div class="page">
    <div class="topbar">
      <div class="topbar-inner">
        <div class="topbar-left">
          <button v-if="view !== 'list'" class="back-btn" @click="goBack">← nazaj</button>
          <div v-else>
            <p class="greeting">Upravljanje</p>
            <h1 class="page-title">Podnajemniki</h1>
          </div>
          <h1 v-if="view !== 'list'" class="page-title">{{ viewTitle }}</h1>
        </div>
      </div>
    </div>

    <div class="content">
      <p v-if="globalError" class="feedback error">{{ globalError }}</p>

      <!-- LIST -->
      <div v-if="view === 'list'">
        <p v-if="loading" class="feedback">Nalaganje...</p>
        <div v-else-if="residents.length === 0" class="empty-state">
          <p>Ni evidentiranih podnajemnikov.</p>
        </div>
        <div v-else class="grid">
          <div
            v-for="r in residents"
            :key="r.id"
            class="card"
            @click="goDetail(r)"
          >
            <div class="card-top">
              <span class="card-title">{{ r.first_name }} {{ r.last_name }}</span>
            </div>
            <p class="card-address">{{ r.email }}</p>
            <div class="card-meta">
              <span v-if="r.phone" class="meta-item">{{ r.phone }}</span>
              <span v-if="r.move_in_date" class="meta-item">od {{ r.move_in_date }}</span>
              <span v-if="r.property_id" class="meta-item meta-prop">nepremičnina #{{ r.property_id }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- DETAIL -->
      <div v-if="view === 'detail' && selected" class="detail-layout">
        <div class="panel">
          <dl class="detail-list">
            <div class="detail-row">
              <dt>Ime in priimek</dt>
              <dd>{{ selected.first_name }} {{ selected.last_name }}</dd>
            </div>
            <div class="detail-row">
              <dt>E-pošta</dt>
              <dd>{{ selected.email }}</dd>
            </div>
            <div v-if="selected.phone" class="detail-row">
              <dt>Telefon</dt>
              <dd>{{ selected.phone }}</dd>
            </div>
            <div class="detail-row">
              <dt>Nepremičnina</dt>
              <dd>#{{ selected.property_id }}</dd>
            </div>
            <div v-if="selected.move_in_date" class="detail-row">
              <dt>Datum vselitve</dt>
              <dd>{{ selected.move_in_date }}</dd>
            </div>
          </dl>
          <div class="action-row">
            <button class="btn btn-outline" @click="goEdit(selected)">Uredi</button>
            <button
              class="btn btn-ghost-red"
              :disabled="deletingId === selected.id"
              @click="deleteResident(selected.id)"
            >
              {{ deletingId === selected.id ? 'Brisanje…' : 'Izbriši' }}
            </button>
          </div>
        </div>

        <!-- Payments sidebar -->
        <div class="payments-sidebar">
          <h2 class="sidebar-title">Plačila najemnika</h2>
          <p v-if="paymentsLoading" class="feedback">Nalaganje...</p>
          <div v-else-if="payments.length === 0" class="empty-state" style="padding: 20px 0">
            <p>Ni evidentiranih plačil.</p>
          </div>
          <div v-else class="payment-list">
            <div
              v-for="(p, i) in payments"
              :key="p.id"
              class="payment-row"
              :class="i === 0 ? 'payment-latest' : ''"
            >
              <div class="pay-left">
                <span v-if="i === 0" class="latest-tag">Zadnji</span>
                <div class="pay-desc">{{ p.description || 'Račun' }}</div>
                <div class="pay-meta">Rok: {{ fmtDate(p.dueDate) }}</div>
              </div>
              <div class="pay-right">
                <div class="pay-amount">{{ Number(p.amount).toFixed(2) }} {{ p.currency }}</div>
                <span class="pay-badge" :class="p.status === 'SUCCEEDED' ? 'badge-paid' : 'badge-other'">
                  {{ statusLabel(p.status) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- EDIT FORM -->
      <div v-if="view === 'edit'" class="panel">
        <p v-if="formError"   class="feedback error">{{ formError }}</p>
        <p v-if="formSuccess" class="feedback ok">{{ formSuccess }}</p>
        <form class="form" @submit.prevent="submitForm">
          <div class="form-row">
            <div class="field">
              <label>Ime *</label>
              <input v-model="form.first_name" type="text" required placeholder="Jana" />
            </div>
            <div class="field">
              <label>Priimek *</label>
              <input v-model="form.last_name" type="text" required placeholder="Novak" />
            </div>
          </div>
          <div class="field">
            <label>E-pošta *</label>
            <input v-model="form.email" type="email" required placeholder="jana@example.com" />
          </div>
          <div class="form-row">
            <div class="field">
              <label>Telefon</label>
              <input v-model="form.phone" type="text" placeholder="+386 40 123 456" />
            </div>
            <div class="field">
              <label>Datum vselitve</label>
              <input v-model="form.move_in_date" type="date" />
            </div>
          </div>
          <div class="action-row">
            <button type="button" class="btn btn-ghost" @click="goList">Prekliči</button>
            <button type="submit" class="btn btn-primary" :disabled="saving">
              {{ saving ? 'Shranjujem…' : 'Shrani' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
const API_BASE = "http://localhost:4000";

export default {
  name: "ResidentsApp",
  data() {
    return {
      view:            "list",
      residents:       [],
      selected:        null,
      form:            { first_name: "", last_name: "", email: "", phone: "", move_in_date: "" },
      loading:         true,
      saving:          false,
      deletingId:      null,
      globalError:     null,
      formError:       null,
      formSuccess:     null,
      payments:        [],
      paymentsLoading: false,
    };
  },
  computed: {
    viewTitle() {
      if (this.view === "detail") return `${this.selected?.first_name ?? ""} ${this.selected?.last_name ?? ""}`;
      if (this.view === "edit")   return "Uredi podnajemnika";
      return "";
    },
  },
  async mounted() {
    await this.loadResidents();
  },
  methods: {
    async loadResidents() {
      this.loading = true;
      this.globalError = null;
      try {
        const res = await fetch(`${API_BASE}/residents`);
        if (!res.ok) throw new Error("Napaka pri nalaganju.");
        const json = await res.json();
        this.residents = json.residents ?? [];
      } catch (e) {
        this.globalError = e.message;
      } finally {
        this.loading = false;
      }
    },

    async deleteResident(id) {
      if (!confirm("Izbriši podnajemnika?")) return;
      this.deletingId = id;
      try {
        const res = await fetch(`${API_BASE}/residents/${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Brisanje ni uspelo.");
        this.residents = this.residents.filter((r) => r.id !== id);
        this.goList();
      } catch (e) {
        this.globalError = e.message;
      } finally {
        this.deletingId = null;
      }
    },

    async submitForm() {
      this.formError = null;
      this.saving = true;
      const payload = {
        first_name:   this.form.first_name,
        last_name:    this.form.last_name,
        email:        this.form.email,
        phone:        this.form.phone || null,
        move_in_date: this.form.move_in_date || null,
      };
      try {
        const res = await fetch(`${API_BASE}/residents/${this.selected.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) { const err = await res.json(); throw new Error(err.detail || "Napaka pri shranjevanju."); }
        const json = await res.json();
        const updated = json.data ?? { ...this.selected, ...payload };
        const idx = this.residents.findIndex((r) => r.id === this.selected.id);
        if (idx !== -1) this.residents[idx] = updated;
        this.goDetail(updated);
      } catch (e) {
        this.formError = e.message;
      } finally {
        this.saving = false;
      }
    },

    fmtDate(iso) {
      if (!iso) return "—";
      return new Date(iso).toLocaleDateString("sl-SI", { day: "2-digit", month: "2-digit", year: "numeric" });
    },
    statusLabel(s) {
      return { SUCCEEDED: "Plačano", PENDING: "Čaka", FAILED: "Neuspešno", CANCELLED: "Preklicano" }[s] ?? s;
    },
    async loadPayments(residentId) {
      this.payments = [];
      this.paymentsLoading = true;
      try {
        const res = await fetch(`${API_BASE}/payments/residents/${residentId}`);
        if (res.ok) {
          const data = await res.json();
          this.payments = (Array.isArray(data) ? data : [])
            .sort((a, b) => new Date(b.dueDate) - new Date(a.dueDate));
        }
      } catch { /* ignore */ }
      this.paymentsLoading = false;
    },
    goList() {
      this.view = "list";
      this.selected = null;
      this.formError = null;
      this.formSuccess = null;
    },
    goDetail(r) { this.selected = r; this.view = "detail"; this.loadPayments(r.id); },
    goEdit(r) {
      this.selected = r;
      this.form = {
        first_name:   r.first_name   ?? "",
        last_name:    r.last_name    ?? "",
        email:        r.email        ?? "",
        phone:        r.phone        ?? "",
        move_in_date: r.move_in_date ?? "",
      };
      this.view = "edit";
    },
    goBack() {
      if (this.view === "edit") { this.goDetail(this.selected); return; }
      this.goList();
    },
  },
};
</script>

<style scoped>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

.page {
  min-height: 100vh;
  background: #faf5ee;
  font-family: "Inter", system-ui, sans-serif;
  color: #1e1409;
}

.topbar { background: #c7ac98; border-bottom: 1px solid #b89880; }
.topbar-inner {
  margin: 0 auto;
  padding: 10px 28px;
  min-height: 58px;
  display: flex;
  align-items: center;
}
.topbar-left { display: flex; align-items: center; gap: 16px; }

.greeting {
  font-size: 0.72rem;
  color: #6b4020;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  margin-bottom: 1px;
}
.page-title { font-size: 1rem; font-weight: 600; color: #1e1409; letter-spacing: -0.01em; }
.back-btn {
  background: none; border: none; color: #6b4020;
  font-size: 0.85rem; cursor: pointer; padding: 0;
}
.back-btn:hover { color: #1e1409; }

.content { max-width: 1080px; margin: 0 auto; padding: 36px 28px; }

.feedback { font-size: 0.9rem; margin-bottom: 20px; }
.feedback.error { color: #b04a2a; }
.feedback.ok    { color: #5a7a42; font-weight: 500; }

.empty-state { text-align: center; padding: 60px 20px; color: #9a7455; font-size: 0.95rem; }

.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 14px; }

.card {
  background: #fff; border: 1px solid #e8d9c4; border-radius: 10px;
  padding: 20px 22px; cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.card:hover { border-color: #c47c3e; box-shadow: 0 2px 16px rgba(196,124,62,0.1); }

.card-top { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; margin-bottom: 6px; }
.card-title   { font-size: 0.95rem; font-weight: 600; color: #1e1409; line-height: 1.3; }
.card-address { font-size: 0.8rem; color: #9a7455; line-height: 1.4; margin-bottom: 10px; }
.card-meta    { display: flex; flex-wrap: wrap; gap: 6px; }
.meta-item    { font-size: 0.72rem; background: #f5ede0; color: #7a5030; border-radius: 4px; padding: 2px 8px; font-weight: 500; }
.meta-prop    { background: #ede8f5; color: #5a4a7a; }

.panel { background: #fff; border: 1px solid #e8d9c4; border-radius: 10px; padding: 28px 32px; max-width: 520px; }

.detail-list { list-style: none; }
.detail-row  { display: flex; gap: 20px; padding: 11px 0; border-bottom: 1px solid #f0e6d6; }
.detail-row:last-child { border-bottom: none; }
.detail-row dt {
  width: 130px; min-width: 130px;
  font-size: 0.78rem; font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.06em;
  color: #b09070; padding-top: 1px;
}
.detail-row dd { font-size: 0.92rem; color: #1e1409; }

.form { display: flex; flex-direction: column; }
.field { margin-bottom: 16px; }
.field label {
  display: block; font-size: 0.78rem; font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.06em;
  color: #b09070; margin-bottom: 6px;
}
.field input {
  width: 100%; padding: 9px 12px;
  border: 1px solid #e0cdb8; border-radius: 6px;
  font-size: 0.92rem; font-family: inherit;
  color: #1e1409; background: #fdfaf6;
  outline: none; transition: border-color 0.15s;
}
.field input:focus { border-color: #c47c3e; }
.form-row { display: flex; gap: 14px; }
.form-row .field { flex: 1; }

.action-row { display: flex; gap: 10px; margin-top: 20px; }

.btn {
  padding: 8px 20px; border-radius: 6px;
  font-size: 0.86rem; font-weight: 600; letter-spacing: 0.01em;
  cursor: pointer; border: 1px solid transparent;
  transition: opacity 0.15s, background 0.15s;
}
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-primary  { background: #c47c3e; color: #fff; border-color: #c47c3e; }
.btn-primary:hover { background: #a8662e; border-color: #a8662e; }
.btn-outline  { background: transparent; color: #1e1409; border-color: #d0bea8; }
.btn-outline:hover { border-color: #c47c3e; color: #c47c3e; }
.btn-ghost    { background: transparent; color: #9a7455; border-color: transparent; }
.btn-ghost:hover { color: #1e1409; }
.btn-ghost-red { background: transparent; color: #b04a2a; border-color: transparent; font-weight: 500; }
.btn-ghost-red:hover { text-decoration: underline; }

/* detail split layout */
.detail-layout { display: flex; gap: 20px; align-items: flex-start; }
.detail-layout .panel { flex-shrink: 0; }

.payments-sidebar {
  flex: 1; min-width: 0;
  background: #fff; border: 1px solid #e8d9c4;
  border-radius: 10px; padding: 20px 24px;
}
.sidebar-title {
  font-size: 0.82rem; font-weight: 600; text-transform: uppercase;
  letter-spacing: 0.07em; color: #b09070; margin-bottom: 14px;
}
.payment-list { display: flex; flex-direction: column; gap: 6px; }
.payment-row {
  display: flex; justify-content: space-between; align-items: center;
  gap: 10px; padding: 10px 12px; border-radius: 7px;
  background: #fdfaf6; border-left: 3px solid #e8d9c4; flex-wrap: wrap;
}
.payment-latest { border-left-color: #c47c3e; border-left-width: 4px; background: #fef9f3; }
.pay-left  { display: flex; flex-direction: column; gap: 3px; }
.pay-right { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; flex-shrink: 0; }
.latest-tag {
  font-size: 0.66rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em;
  color: #7a5030; background: #f0e8d8; padding: 1px 6px; border-radius: 3px; align-self: flex-start;
}
.pay-desc   { font-size: 0.86rem; font-weight: 600; color: #1e1409; }
.pay-meta   { font-size: 0.74rem; color: #9a7455; }
.pay-amount { font-size: 0.9rem; font-weight: 700; color: #c47c3e; }
.pay-badge {
  font-size: 0.7rem; font-weight: 600; padding: 2px 8px;
  border-radius: 4px; border: 1px solid;
}
.badge-paid  { background: #e6f4ea; color: #2e7d32; border-color: #a5d6a7; }
.badge-other { background: #fdecea; color: #b71c1c; border-color: #ef9a9a; }
</style>
