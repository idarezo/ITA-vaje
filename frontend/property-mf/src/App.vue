<template>
  <div class="page">
    <div class="topbar">
      <div class="topbar-inner">
        <div class="topbar-left">
          <button v-if="showBack" class="back-btn" @click="goBack">
            ← nazaj
          </button>
          <div v-else>
            <p class="greeting">Dobrodošli nazaj, {{ userName }}</p>
            <h1 class="page-title">{{ tabTitle }}</h1>
          </div>
          <h1 v-if="showBack" class="page-title">{{ viewTitle }}</h1>
        </div>
        <div class="topbar-right">
          <div class="tabs">
            <button
              class="tab-btn"
              :class="{ active: activeTab === 'properties' }"
              @click="switchTab('properties')"
            >
              Nepremičnine
            </button>
            <button
              class="tab-btn"
              :class="{ active: activeTab === 'residents' }"
              @click="switchTab('residents')"
            >
              Podnajemniki
            </button>
          </div>
          <button class="logout-btn" @click="logout">odjava</button>
        </div>
      </div>
    </div>

    <div class="content">
      <p v-if="globalError" class="feedback error">{{ globalError }}</p>

      <!-- ═══ PROPERTIES TAB ═══ -->
      <template v-if="activeTab === 'properties'">
        <!-- LIST -->
        <div v-if="view === 'list'">
          <p v-if="loading" class="feedback">Nalaganje...</p>
          <div v-else class="grid">
            <div
              v-for="p in properties"
              :key="p.id"
              class="card"
              @click="goDetail(p)"
            >
              <div class="card-top">
                <span class="card-title">{{ p.title }}</span>
                <span class="card-price"
                  >{{ p.price }} €<span class="per">/mes</span></span
                >
              </div>
              <p class="card-address">{{ p.address }}</p>
              <div class="card-meta">
                <span v-if="p.bedrooms" class="meta-item"
                  >{{ p.bedrooms }} sobe</span
                >
                <span v-if="p.bathrooms" class="meta-item"
                  >{{ p.bathrooms }} kop.</span
                >
                <span v-if="p.area" class="meta-item">{{ p.area }} m²</span>
                <span class="meta-item meta-tenants"
                  >{{ p.registeredCount }} najemnikov</span
                >
              </div>
            </div>
            <div class="card card-add" @click="goAdd">
              <span class="add-icon">+</span>
              <span class="add-label">Dodaj nepremičnino</span>
            </div>
          </div>
        </div>

        <!-- DETAIL -->
        <div v-if="view === 'detail' && selected" class="detail-layout">
          <div class="panel">
            <dl class="detail-list">
              <div class="detail-row">
                <dt>Naslov</dt>
                <dd>{{ selected.title }}</dd>
              </div>
              <div class="detail-row">
                <dt>Lokacija</dt>
                <dd>{{ selected.address }}</dd>
              </div>
              <div class="detail-row">
                <dt>Cena</dt>
                <dd>
                  <strong>{{ selected.price }} €</strong> / mes
                </dd>
              </div>
              <div v-if="selected.description" class="detail-row">
                <dt>Opis</dt>
                <dd>{{ selected.description }}</dd>
              </div>
              <div v-if="selected.bedrooms" class="detail-row">
                <dt>Sobe</dt>
                <dd>{{ selected.bedrooms }}</dd>
              </div>
              <div v-if="selected.bathrooms" class="detail-row">
                <dt>Kopalnice</dt>
                <dd>{{ selected.bathrooms }}</dd>
              </div>
              <div v-if="selected.area" class="detail-row">
                <dt>Površina</dt>
                <dd>{{ selected.area }} m²</dd>
              </div>
              <div class="detail-row">
                <dt>Najemniki</dt>
                <dd>{{ selected.registeredCount }}</dd>
              </div>
            </dl>
            <div class="action-row">
              <button class="btn btn-outline" @click="goEdit(selected)">
                Uredi
              </button>
              <button
                class="btn btn-ghost-red"
                :disabled="deletingId === selected.id"
                @click="deleteProperty(selected.id)"
              >
                {{ deletingId === selected.id ? "Brisanje…" : "Izbriši" }}
              </button>
            </div>
          </div>

          <!-- RIGHT PANEL: residents + payments -->
          <div class="detail-right-panel">

            <!-- RESIDENTS SECTION -->
            <div class="residents-sidebar detail-collapsible">
              <div class="sidebar-header collapsible-header" @click="detailPanelResidentsOpen = !detailPanelResidentsOpen">
                <h2 class="sidebar-title">Podnajemniki</h2>
                <div style="display:flex;align-items:center;gap:8px">
                  <button
                    v-if="detailPanelResidentsOpen && !propResidentsLoading && propResidents.length === 0"
                    class="btn btn-primary btn-sm"
                    @click.stop="showAddResidentForm = !showAddResidentForm"
                  >{{ showAddResidentForm ? 'Prekliči' : '+ Dodaj' }}</button>
                  <span class="collapse-arrow">{{ detailPanelResidentsOpen ? '▾' : '▸' }}</span>
                </div>
              </div>
              <template v-if="detailPanelResidentsOpen">
                <!-- Add resident form -->
                <div v-if="showAddResidentForm" class="new-payment-form">
                  <p v-if="addResidentError" class="feedback error">{{ addResidentError }}</p>
                  <div class="form-row">
                    <div class="field">
                      <label>Ime *</label>
                      <input v-model="addResidentForm.first_name" type="text" placeholder="Ana" required />
                    </div>
                    <div class="field">
                      <label>Priimek *</label>
                      <input v-model="addResidentForm.last_name" type="text" placeholder="Novak" required />
                    </div>
                  </div>
                  <div class="field">
                    <label>E-pošta *</label>
                    <input v-model="addResidentForm.email" type="email" placeholder="ana@example.com" required />
                  </div>
                  <div class="form-row">
                    <div class="field">
                      <label>Telefon</label>
                      <input v-model="addResidentForm.phone" type="text" placeholder="+386 40 123 456" />
                    </div>
                    <div class="field">
                      <label>Datum vselitve</label>
                      <input v-model="addResidentForm.move_in_date" type="date" />
                    </div>
                  </div>
                  <button class="btn btn-primary" :disabled="addResidentSaving" @click="submitAddResident">
                    {{ addResidentSaving ? 'Shranjevanje…' : 'Dodaj podnajemnika' }}
                  </button>
                </div>
                <p v-if="propResidentsLoading" class="feedback">Nalaganje...</p>
                <div v-else-if="propResidents.length === 0 && !showAddResidentForm" class="empty-state">
                  <p>Na tej nepremičnini ni evidentiranih podnajemnikov.</p>
                </div>
                <div v-else class="resident-list">
                  <div v-for="r in propResidents" :key="r.id" class="resident-row" @click="goResidentDetail(r)">
                    <div class="resident-name">{{ r.first_name }} {{ r.last_name }}</div>
                    <div class="resident-meta">
                      <span>{{ r.email }}</span>
                      <span v-if="r.phone">{{ r.phone }}</span>
                      <span v-if="r.move_in_date" class="meta-item">od {{ r.move_in_date }}</span>
                    </div>
                  </div>
                </div>
              </template>
            </div>

            <!-- PAYMENTS SECTION -->
            <div class="residents-sidebar detail-collapsible">
              <div class="sidebar-header collapsible-header" @click="detailPanelPaymentsOpen = !detailPanelPaymentsOpen">
                <h2 class="sidebar-title">Plačila</h2>
                <div style="display:flex;align-items:center;gap:8px">
                  <button
                    v-if="detailPanelPaymentsOpen"
                    class="btn btn-primary btn-sm"
                    @click.stop="propResidents.length === 0 ? showNoResidentToast() : (showNewPaymentForm = !showNewPaymentForm)"
                  >{{ showNewPaymentForm ? "Prekliči" : "+ Dodaj račun" }}</button>
                  <span class="collapse-arrow">{{ detailPanelPaymentsOpen ? '▾' : '▸' }}</span>
                </div>
              </div>
              <template v-if="detailPanelPaymentsOpen">
                <!-- New payment form -->
                <div v-if="showNewPaymentForm" class="new-payment-form">
                  <p v-if="newPaymentError" class="feedback error">{{ newPaymentError }}</p>
                  <div class="form-row">
                    <div class="field">
                      <label>Opis</label>
                      <input v-model="newPaymentForm.description" type="text" placeholder="Najemnina - Maj 2025" />
                    </div>
                  </div>
                  <div class="form-row">
                    <div class="field">
                      <label>Znesek (€) *</label>
                      <input v-model="newPaymentForm.amount" type="number" min="0" step="0.01" :placeholder="selected?.price ?? '0'" required />
                    </div>
                    <div class="field">
                      <label>Rok plačila *</label>
                      <input v-model="newPaymentForm.dueDate" type="date" required />
                    </div>
                  </div>
                  <button class="btn btn-primary" :disabled="newPaymentSaving" @click="submitNewPayment">
                    {{ newPaymentSaving ? "Shranjevanje…" : "Ustvari račun" }}
                  </button>
                </div>
                <p v-if="propPaymentsLoading" class="feedback">Nalaganje...</p>
                <div v-else-if="propPayments.length === 0 && !showNewPaymentForm" class="empty-state">
                  <p>Za to nepremičnino ni evidentiranih plačil.</p>
                </div>
                <div v-else-if="propPayments.length > 0">
                  <template v-if="currentResidentPayments.length > 0">
                    <div class="payment-alert" :class="hasPendingPayments ? (currentResidentPayments[0].status === 'PARTIALLY_PAID' ? 'alert-partial' : 'alert-warn') : currentResidentPayments[0].status === 'CANCELLED' ? 'alert-partial' : currentResidentPayments[0].status === 'SUCCEEDED' ? 'alert-ok' : 'alert-warn'">
                      <span class="alert-icon">{{ hasPendingPayments ? (currentResidentPayments[0].status === 'PARTIALLY_PAID' ? '½' : '!') : currentResidentPayments[0].status === 'CANCELLED' ? '✕' : currentResidentPayments[0].status === 'SUCCEEDED' ? '✓' : '!' }}</span>
                      <span>{{ hasPendingPayments ? (currentResidentPayments[0].status === 'PARTIALLY_PAID' ? 'Zadnji račun je delno poravnan!' : 'Obstajajo neporavnani računi!') : currentResidentPayments[0].status === 'CANCELLED' ? 'Zadnji račun je bil preklican.' : currentResidentPayments[0].status === 'SUCCEEDED' ? 'Zadnji račun je poravnan.' : 'Obstajajo neporavnani računi!' }}</span>
                    </div>
                  </template>
                  <div v-else-if="propResidents.length > 0" class="payment-alert alert-ok">
                    <span class="alert-icon">ℹ</span><span>Ni plačil za trenutnega podnajemnika.</span>
                  </div>
                  <div class="payment-list">
                    <div v-for="(p, i) in currentResidentPayments" :key="p.id" class="payment-row" :class="i === 0 ? 'payment-latest' : ''" style="cursor:pointer" @click="detailPayment = p">
                      <div class="payment-left">
                        <span v-if="i === 0" class="latest-tag">Zadnji</span>
                        <div class="payment-desc">{{ p.description || "Račun" }}</div>
                        <div class="payment-meta">Rok: {{ formatPayDate(p.dueDate) }}</div>
                        <div v-if="p.residentName" class="payment-payer">Plačal/a: {{ p.residentName }}</div>
                      </div>
                      <div class="payment-right">
                        <div class="payment-amount">{{ Number(p.amount).toFixed(2) }} {{ p.currency }}</div>
                        <span class="pay-badge" :class="p.status === 'SUCCEEDED' ? 'badge-paid' : p.status === 'PARTIALLY_PAID' ? 'badge-partial' : p.status === 'CANCELLED' ? 'badge-cancelled' : 'badge-unpaid'">{{ statusLabel(p.status) }}</span>
                        <div v-if="p.status === 'PENDING'" class="pay-actions" @click.stop>
                          <button class="pay-action-btn pay-btn" :disabled="paymentActionId === p.id" @click="paymentAction(p.id, 'pay')">{{ paymentActionId === p.id ? "…" : "Potrdi" }}</button>
                          <button class="pay-action-btn cancel-btn" :disabled="paymentActionId === p.id" @click="paymentAction(p.id, 'cancel')">Prekliči</button>
                        </div>
                        <div v-if="p.status === 'FAILED'" class="pay-actions">
                          <button class="pay-action-btn retry-btn" :disabled="paymentActionId === p.id" @click="paymentAction(p.id, 'retry')">{{ paymentActionId === p.id ? "…" : "Ponovi" }}</button>
                        </div>
                      </div>
                    </div>
                  </div>
                  <template v-if="pastResidentGroups.length > 0">
                    <div class="past-residents-header">Plačila prejšnjih podnajemnikov</div>
                    <div v-for="group in pastResidentGroups" :key="group.name" class="past-resident-group">
                      <div class="past-resident-name">
                        <span class="past-expand-icon" @click.stop="expandedPastGroups[group.name] = !expandedPastGroups[group.name]">{{ expandedPastGroups[group.name] ? '▾' : '▸' }}</span>
                        <span class="past-resident-name-link" @click="group.resident && openPastResidentDetail(group.resident)">{{ group.name }}</span>
                        <span class="past-count">({{ group.payments.length }})</span>
                        <span v-if="group.resident" class="past-stats-btn" @click.stop="openPastResidentDetail(group.resident)">📊</span>
                      </div>
                      <div v-if="expandedPastGroups[group.name]" class="payment-list">
                        <div v-for="p in group.payments" :key="p.id" class="payment-row payment-past" style="cursor:pointer" @click="detailPayment = p">
                          <div class="payment-left">
                            <div class="payment-desc">{{ p.description || "Račun" }}</div>
                            <div class="payment-meta">Rok: {{ formatPayDate(p.dueDate) }}</div>
                          </div>
                          <div class="payment-right">
                            <div class="payment-amount">{{ Number(p.amount).toFixed(2) }} {{ p.currency }}</div>
                            <span class="pay-badge" :class="p.status === 'SUCCEEDED' ? 'badge-paid' : p.status === 'PARTIALLY_PAID' ? 'badge-partial' : p.status === 'CANCELLED' ? 'badge-cancelled' : 'badge-unpaid'">{{ statusLabel(p.status) }}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </template>
                </div>
              </template>
            </div>
          </div>
        </div>

        <!-- EDIT / ADD FORM -->
        <div v-if="view === 'edit' || view === 'add'" class="panel">
          <p v-if="formError" class="feedback error">{{ formError }}</p>
          <p v-if="formSuccess" class="feedback ok">{{ formSuccess }}</p>
          <form class="form" @submit.prevent="submitForm">
            <div class="form-row">
              <div class="field">
                <label>Naziv *</label>
                <input
                  v-model="form.title"
                  type="text"
                  required
                  placeholder="npr. Riverside Loft"
                />
              </div>
              <div class="field">
                <label>Cena (€/mes) *</label>
                <input
                  v-model="form.price"
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  placeholder="950"
                />
              </div>
            </div>
            <div class="field">
              <label>Naslov lokacije *</label>
              <input
                v-model="form.address"
                type="text"
                required
                placeholder="npr. Prešernova 10, Ljubljana"
              />
            </div>
            <div class="field">
              <label>Opis</label>
              <textarea
                v-model="form.description"
                rows="3"
                placeholder="Kratko besedilo o nepremičnini…"
              ></textarea>
            </div>
            <div class="form-row">
              <div class="field">
                <label>Sobe</label>
                <input
                  v-model="form.bedrooms"
                  type="number"
                  min="0"
                  placeholder="2"
                />
              </div>
              <div class="field">
                <label>Kopalnice</label>
                <input
                  v-model="form.bathrooms"
                  type="number"
                  min="0"
                  placeholder="1"
                />
              </div>
              <div class="field">
                <label>Površina (m²)</label>
                <input
                  v-model="form.area"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="78.5"
                />
              </div>
            </div>
            <div class="action-row">
              <button type="button" class="btn btn-ghost" @click="goList">
                Prekliči
              </button>
              <button type="submit" class="btn btn-primary" :disabled="saving">
                {{
                  saving ? "Shranjujem…" : view === "add" ? "Dodaj" : "Shrani"
                }}
              </button>
            </div>
          </form>
        </div>
      </template>

      <!-- ═══ RESIDENTS TAB ═══ -->
      <template v-if="activeTab === 'residents'">
        <!-- ALL RESIDENTS LIST -->
        <div v-if="resView === 'list'">
          <p v-if="resLoading" class="feedback">Nalaganje...</p>
          <div v-else-if="allResidents.length === 0" class="empty-state">
            <p>Ni evidentiranih podnajemnikov.</p>
          </div>
          <template v-else>
            <!-- Active residents -->
            <div class="residents-section-header">Trenutni podnajemniki</div>
            <div v-if="activeResidents.length === 0" class="empty-state" style="margin-bottom:24px">
              <p>Ni aktivnih podnajemnikov.</p>
            </div>
            <div v-else class="grid">
              <div
                v-for="r in activeResidents"
                :key="r.id"
                class="card resident-card"
                @click="goResidentDetail(r)"
              >
                <div class="card-top">
                  <span class="card-title">{{ r.first_name }} {{ r.last_name }}</span>
                </div>
                <p class="card-address">{{ r.email }}</p>
                <div class="card-meta">
                  <span v-if="r.phone" class="meta-item">{{ r.phone }}</span>
                  <span v-if="r.move_in_date" class="meta-item">od {{ r.move_in_date }}</span>
                  <span v-if="r.property_id" class="meta-item meta-tenants">nepremičnina #{{ r.property_id }}</span>
                </div>
              </div>
            </div>

            <!-- Inactive residents -->
            <template v-if="inactiveResidents.length > 0">
              <div class="residents-section-header residents-section-past">Prejšnji podnajemniki</div>
              <div class="grid">
                <div
                  v-for="r in inactiveResidents"
                  :key="r.id"
                  class="card resident-card resident-card-inactive"
                  @click="openPastResidentDetail(r)"
                >
                  <div class="card-top">
                    <span class="card-title">{{ r.first_name }} {{ r.last_name }}</span>
                    <span class="badge-inactive">Neaktiven</span>
                  </div>
                  <p class="card-address">{{ r.email }}</p>
                  <div class="card-meta">
                    <span v-if="r.phone" class="meta-item">{{ r.phone }}</span>
                    <span v-if="r.move_in_date" class="meta-item">od {{ r.move_in_date }}</span>
                    <span v-if="r.property_id" class="meta-item meta-tenants">nepremičnina #{{ r.property_id }}</span>
                  </div>
                </div>
              </div>
            </template>
          </template>
        </div>

        <!-- RESIDENT DETAIL -->
        <div
          v-if="resView === 'detail' && selectedResident"
          class="detail-layout"
        >
          <div class="panel">
            <dl class="detail-list">
              <div class="detail-row">
                <dt>Ime</dt>
                <dd>
                  {{ selectedResident.first_name }}
                  {{ selectedResident.last_name }}
                </dd>
              </div>
              <div class="detail-row">
                <dt>E-pošta</dt>
                <dd>{{ selectedResident.email }}</dd>
              </div>
              <div v-if="selectedResident.phone" class="detail-row">
                <dt>Telefon</dt>
                <dd>{{ selectedResident.phone }}</dd>
              </div>
              <div class="detail-row">
                <dt>Nepremičnina</dt>
                <dd>#{{ selectedResident.property_id }}</dd>
              </div>
              <div v-if="selectedResident.move_in_date" class="detail-row">
                <dt>Datum vselitve</dt>
                <dd>{{ selectedResident.move_in_date }}</dd>
              </div>
            </dl>
            <div class="action-row">
              <button
                class="btn btn-outline"
                @click="goResidentEdit(selectedResident)"
              >
                Uredi
              </button>
              <button
                class="btn btn-ghost-red"
                :disabled="deletingResidentId === selectedResident.id"
                @click="deleteResident(selectedResident.id)"
              >
                {{
                  deletingResidentId === selectedResident.id
                    ? "Brisanje…"
                    : "Izbriši"
                }}
              </button>
            </div>
          </div>

          <!-- Resident payments sidebar -->
          <div class="residents-sidebar">
            <h2 class="sidebar-title">Plačila najemnika</h2>
            <p v-if="residentPaymentsLoading" class="feedback">Nalaganje...</p>
            <div
              v-else-if="residentPayments.length === 0"
              class="empty-state"
              style="padding: 20px 0"
            >
              <p>Ni evidentiranih plačil.</p>
            </div>
            <div v-else class="payment-list">
              <div
                v-for="(p, i) in residentPayments"
                :key="p.id"
                class="payment-row"
                :class="i === 0 ? 'payment-latest' : ''"
              >
                <div class="payment-left">
                  <span v-if="i === 0" class="latest-tag">Zadnji</span>
                  <div class="payment-desc">{{ p.description || "Račun" }}</div>
                  <div class="payment-meta">Rok: {{ formatPayDate(p.dueDate) }}</div>
                  <div v-if="p.residentName" class="payment-payer">
                    Plačal/a: {{ p.residentName }}
                  </div>
                </div>
                <div class="payment-right">
                  <div class="payment-amount">
                    {{ Number(p.amount).toFixed(2) }} {{ p.currency }}
                  </div>
                  <span
                    class="pay-badge"
                    :class="
                      p.status === 'SUCCEEDED' ? 'badge-paid' : p.status === 'PARTIALLY_PAID' ? 'badge-partial' : p.status === 'CANCELLED' ? 'badge-cancelled' : 'badge-unpaid'
                    "
                  >
                    {{ statusLabel(p.status) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- RESIDENT EDIT FORM -->
        <div v-if="resView === 'edit'" class="panel">
          <p v-if="resFormError" class="feedback error">{{ resFormError }}</p>
          <p v-if="resFormSuccess" class="feedback ok">{{ resFormSuccess }}</p>
          <form class="form" @submit.prevent="submitResidentForm">
            <div class="form-row">
              <div class="field">
                <label>Ime *</label>
                <input
                  v-model="resForm.first_name"
                  type="text"
                  required
                  placeholder="Jana"
                />
              </div>
              <div class="field">
                <label>Priimek *</label>
                <input
                  v-model="resForm.last_name"
                  type="text"
                  required
                  placeholder="Novak"
                />
              </div>
            </div>
            <div class="field">
              <label>E-pošta *</label>
              <input
                v-model="resForm.email"
                type="email"
                required
                placeholder="jana@example.com"
              />
            </div>
            <div class="form-row">
              <div class="field">
                <label>Telefon</label>
                <input
                  v-model="resForm.phone"
                  type="text"
                  placeholder="+386 40 123 456"
                />
              </div>
              <div class="field">
                <label>Datum vselitve</label>
                <input v-model="resForm.move_in_date" type="date" />
              </div>
            </div>
            <div class="action-row">
              <button
                type="button"
                class="btn btn-ghost"
                @click="goResidentsList"
              >
                Prekliči
              </button>
              <button
                type="submit"
                class="btn btn-primary"
                :disabled="resSaving"
              >
                {{ resSaving ? "Shranjujem…" : "Shrani" }}
              </button>
            </div>
          </form>
        </div>
      </template>
    </div>
  </div>

  <!-- Payment detail modal -->
  <teleport to="body">
    <div v-if="detailPayment" class="modal-overlay" @click.self="detailPayment = null">
      <div class="modal-box">
        <p style="font-size:0.75rem;font-weight:600;letter-spacing:0.08em;color:#9a7455;margin:0 0 6px">PODROBNOSTI RAČUNA</p>
        <div style="font-size:2rem;font-weight:800;color:#1e1409;margin-bottom:4px">
          {{ Number(detailPayment.amount).toFixed(2) }}
          <span style="font-size:1rem;font-weight:500;color:#9a7455"> {{ detailPayment.currency }}</span>
        </div>
        <div style="height:1px;background:#e8ddd2;margin:14px 0" />
        <div style="display:flex;flex-direction:column;gap:10px;text-align:left">
          <div style="display:flex;justify-content:space-between">
            <span style="font-size:0.78rem;color:#9a7455;font-weight:600;letter-spacing:0.05em">OPIS</span>
            <span style="font-size:0.88rem;color:#1e1409">{{ detailPayment.description || "Račun" }}</span>
          </div>
          <div style="display:flex;justify-content:space-between">
            <span style="font-size:0.78rem;color:#9a7455;font-weight:600;letter-spacing:0.05em">ROK PLAČILA</span>
            <span style="font-size:0.88rem;color:#1e1409">{{ formatPayDate(detailPayment.dueDate) }}</span>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span style="font-size:0.78rem;color:#9a7455;font-weight:600;letter-spacing:0.05em">STATUS</span>
            <span class="pay-badge" :class="detailPayment.status === 'SUCCEEDED' ? 'badge-paid' : detailPayment.status === 'PARTIALLY_PAID' ? 'badge-partial' : detailPayment.status === 'CANCELLED' ? 'badge-cancelled' : 'badge-unpaid'">
              {{ statusLabel(detailPayment.status) }}
            </span>
          </div>
          <template v-if="detailPayment.paidAmount != null">
            <div style="display:flex;justify-content:space-between">
              <span style="font-size:0.78rem;color:#9a7455;font-weight:600;letter-spacing:0.05em">PLAČANO</span>
              <span style="font-size:0.88rem;color:#2e7d32;font-weight:700">{{ Number(detailPayment.paidAmount).toFixed(2) }} {{ detailPayment.currency }}</span>
            </div>
          </template>
          <template v-if="detailPayment.status === 'PARTIALLY_PAID'">
            <div style="display:flex;justify-content:space-between">
              <span style="font-size:0.78rem;color:#9a7455;font-weight:600;letter-spacing:0.05em">PREOSTALO</span>
              <span style="font-size:0.88rem;color:#e65100;font-weight:700">{{ (Number(detailPayment.amount) - Number(detailPayment.paidAmount)).toFixed(2) }} {{ detailPayment.currency }}</span>
            </div>
          </template>
          <div v-if="detailPayment.residentName" style="display:flex;justify-content:space-between">
            <span style="font-size:0.78rem;color:#9a7455;font-weight:600;letter-spacing:0.05em">PLAČNIK</span>
            <span style="font-size:0.88rem;color:#1e1409">{{ detailPayment.residentName }}</span>
          </div>
        </div>
        <div style="height:1px;background:#e8ddd2;margin:18px 0 14px" />
        <div class="modal-actions">
          <button class="btn btn-primary" @click="detailPayment = null">Zapri</button>
        </div>
      </div>
    </div>
  </teleport>

  <!-- Delete confirmation modal -->
  <teleport to="body">
    <div v-if="showDeleteModal" class="modal-overlay" @click.self="showDeleteModal = false">
      <div class="modal-box">
        <div class="modal-icon">🗑️</div>
        <h3 class="modal-title">Izbriši podnajemnika</h3>
        <p class="modal-body">Ali ste prepričani, da želite odstraniti tega podnajemnika? Dejanje je mogoče razveljaviti le z ročnim posegom.</p>
        <div class="modal-actions">
          <button class="btn btn-outline" @click="showDeleteModal = false">Prekliči</button>
          <button class="btn btn-danger" @click="confirmDeleteResident">Izbriši</button>
        </div>
      </div>
    </div>
  </teleport>

  <!-- Past resident stats modal -->
  <teleport to="body">
    <div v-if="pastResidentDetail" class="modal-overlay" @click.self="pastResidentDetail = null">
      <div class="modal-box modal-stats-box">
        <div class="stats-modal-header">
          <div>
            <p class="modal-eyebrow">Prejšnji podnajemnik</p>
            <h2 class="stats-modal-name">{{ pastResidentDetail.first_name }} {{ pastResidentDetail.last_name }}</h2>
            <p v-if="pastResidentDetail.email" class="stats-modal-email">{{ pastResidentDetail.email }}</p>
          </div>
          <button class="modal-close-x" @click="pastResidentDetail = null">✕</button>
        </div>
        <div class="modal-divider" />
        <p v-if="pastResidentDetailLoading" class="feedback">Nalaganje...</p>
        <template v-else-if="pastResidentDetailPayments.length === 0">
          <p class="stats-empty">Ni evidentiranih plačil za tega podnajemnika.</p>
        </template>
        <template v-else>
          <div class="stats-dates">
            <div class="stats-date-cell">
              <span class="stats-date-label">Vselitev</span>
              <span class="stats-date-val">{{ pastResidentDetail.move_in_date || '—' }}</span>
            </div>
            <div class="stats-date-cell">
              <span class="stats-date-label">Zadnje plačilo</span>
              <span class="stats-date-val">{{ formatPayDate(pastResidentDetailPayments[pastResidentDetailPayments.length - 1].dueDate) }}</span>
            </div>
          </div>
          <div class="stats-grid">
            <div class="stats-tile">
              <span class="stats-tile-num">{{ pastResidentDetailPayments.filter(p => p.status === 'SUCCEEDED').length }}</span>
              <span class="stats-tile-lbl">Plačanih računov</span>
            </div>
            <div class="stats-tile">
              <span class="stats-tile-num">{{ pastResidentDetailPayments.length }}</span>
              <span class="stats-tile-lbl">Vseh računov</span>
            </div>
            <div class="stats-tile stats-tile-accent">
              <span class="stats-tile-num">{{ totalPaidAmount }} €</span>
              <span class="stats-tile-lbl">Skupaj plačano</span>
            </div>
          </div>
          <div class="chart-wrap">
            <p class="chart-lbl">Pregled plačil</p>
            <div class="chart-scroll">
              <svg :width="Math.max(300, pastResidentDetailPayments.length * 40 + 20)" height="160">
                <template v-for="(bar, i) in pastResidentChartBars" :key="i">
                  <rect
                    :x="i * 40 + 6"
                    :y="140 - bar.height"
                    width="28"
                    :height="bar.height"
                    :fill="bar.fill"
                    rx="4"
                  />
                  <text :x="i * 40 + 20" y="157" text-anchor="middle" font-size="9" fill="#b09070">{{ bar.shortLabel }}</text>
                </template>
              </svg>
            </div>
            <div class="chart-legend">
              <span class="legend-dot" style="background:#5a7a42"></span> Plačano
              <span class="legend-dot" style="background:#e0a050;margin-left:10px"></span> Preklicano
              <span class="legend-dot" style="background:#b04a2a;margin-left:10px"></span> Neuspešno
              <span class="legend-dot" style="background:#9a7455;margin-left:10px"></span> Ostalo
            </div>
          </div>
        </template>
        <div class="modal-actions" style="margin-top:20px">
          <button class="btn btn-primary" @click="pastResidentDetail = null">Zapri</button>
        </div>
      </div>
    </div>
  </teleport>

  <teleport to="body">
    <transition name="toast">
      <div v-if="errorToast" class="toast-popup toast-popup-error">
        <span class="toast-icon">⚠</span>
        <div>
          <strong>Opozorilo</strong>
          <p>{{ errorToast }}</p>
        </div>
        <button class="toast-close" @click="errorToast = null">✕</button>
      </div>
    </transition>
  </teleport>

  <teleport to="body">
    <transition name="toast">
      <div v-if="noResidentToast" class="toast-popup">
        <span class="toast-icon">⚠</span>
        <div>
          <strong>Ni podnajemnika</strong>
          <p>Pred dodajanjem računa morate najprej dodati podnajemnika.</p>
        </div>
        <button class="toast-close" @click="noResidentToast = false">✕</button>
      </div>
    </transition>
  </teleport>
</template>

<script>
const API_BASE = process.env.API_BASE_URL || "http://localhost:4000";

const emptyForm = () => ({
  title: "",
  address: "",
  price: "",
  description: "",
  bedrooms: "",
  bathrooms: "",
  area: "",
});

const emptyResForm = () => ({
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  move_in_date: "",
});

export default {
  name: "PropertyApp",
  props: {
    userId: { type: Number, required: true },
    userName: { type: String, default: "" },
  },
  data() {
    return {
      activeTab: "properties",

      // properties
      view: "list",
      properties: [],
      selected: null,
      form: emptyForm(),
      loading: true,
      saving: false,
      deletingId: null,
      globalError: null,
      formError: null,
      formSuccess: null,

      // property residents sidebar
      showPropResidents: false,
      propResidents: [],
      propResidentsLoading: false,

      // property payments sidebar
      showPropPayments: false,
      propPayments: [],
      propPaymentsLoading: false,
      paymentActionId: null,
      showNewPaymentForm: false,
      newPaymentForm: {
        description: "",
        amount: "",
        currency: "EUR",
        dueDate: "",
      },
      newPaymentSaving: false,
      newPaymentError: null,
      residentMap: {},
      residentById: {},

      // add resident form
      showAddResidentForm: false,
      addResidentForm: { first_name: "", last_name: "", email: "", phone: "", move_in_date: "" },
      addResidentSaving: false,
      addResidentError: null,

      // resident payments (in detail view)
      residentPayments: [],
      residentPaymentsLoading: false,

      // residents tab
      resView: "list",
      allResidents: [],
      resLoading: false,
      selectedResident: null,
      resForm: emptyResForm(),
      resSaving: false,
      deletingResidentId: null,
      resFormError: null,
      resFormSuccess: null,
      showDeleteModal: false,
      expandedPastGroups: {},
      noResidentToast: false,
      errorToast: null,
      detailPanelResidentsOpen: true,
      detailPanelPaymentsOpen: true,
      pendingDeleteId: null,
      detailPayment: null,
      pastResidentDetail: null,
      pastResidentDetailPayments: [],
      pastResidentDetailLoading: false,
    };
  },
  computed: {
    activeResidents() {
      return this.allResidents.filter((r) => r.is_active !== false);
    },
    inactiveResidents() {
      return this.allResidents.filter((r) => r.is_active === false);
    },
    hasPendingPayments() {
      return this.propPayments.some(
        (p) => p.status === "PENDING" || p.status === "PARTIALLY_PAID" || p.status === "FAILED"
      );
    },
    activeResidentIds() {
      return new Set(this.propResidents.map((r) => r.id));
    },
    currentResidentPayments() {
      return this.propPayments.filter((p) => this.activeResidentIds.has(p.residentId));
    },
    pastResidentPayments() {
      return this.propPayments.filter((p) => !this.activeResidentIds.has(p.residentId));
    },
    pastResidentGroups() {
      const groups = {};
      for (const p of this.pastResidentPayments) {
        const key = p.residentId ?? "unknown";
        if (!groups[key]) groups[key] = {
          name: p.residentName ?? "Neznan najemnik",
          payments: [],
          residentId: key,
          resident: this.residentById[key] || null,
        };
        groups[key].payments.push(p);
      }
      return Object.values(groups);
    },
    totalPaidAmount() {
      return this.pastResidentDetailPayments
        .filter(p => p.status === 'SUCCEEDED')
        .reduce((sum, p) => sum + Number(p.amount), 0)
        .toFixed(2);
    },
    pastResidentChartBars() {
      if (!this.pastResidentDetailPayments.length) return [];
      const maxAmt = Math.max(...this.pastResidentDetailPayments.map(p => Number(p.amount)));
      const fillMap = { SUCCEEDED: '#5a7a42', CANCELLED: '#e0a050', FAILED: '#b04a2a' };
      return this.pastResidentDetailPayments.map(p => {
        const amt = Number(p.amount);
        const d = new Date(p.dueDate);
        return {
          height: maxAmt > 0 ? Math.max(4, Math.round((amt / maxAmt) * 120)) : 4,
          fill: fillMap[p.status] || '#9a7455',
          shortLabel: `${d.getMonth() + 1}/${String(d.getFullYear()).slice(2)}`,
          amount: amt.toFixed(2),
        };
      });
    },
    activeTab_() {
      return this.activeTab;
    },
    showBack() {
      if (this.activeTab === "properties")
        return (
          this.view === "detail" || this.view === "edit" || this.view === "add"
        );
      return this.resView !== "list";
    },
    tabTitle() {},
    viewTitle() {
      if (this.activeTab === "properties") {
        if (this.view === "detail") return this.selected?.title ?? "";
        if (this.view === "edit") return "Uredi nepremičnino";
        if (this.view === "add") return "Nova nepremičnina";
      } else {
        if (this.resView === "detail")
          return `${this.selectedResident?.first_name ?? ""} ${this.selectedResident?.last_name ?? ""}`;
        if (this.resView === "edit") return "Uredi podnajemnika";
      }
      return "";
    },
  },
  async mounted() {
    await this.loadProperties();
    this._pollInterval = setInterval(() => {
      if (this.view === "detail" && this.selected) {
        this.loadDetailPanel(this.selected, true);
      }
    }, 5000);
  },
  beforeUnmount() {
    clearInterval(this._pollInterval);
  },
  methods: {
    /* ── Tab switching ── */
    async switchTab(tab) {
      this.activeTab = tab;
      if (tab === "residents" && this.allResidents.length === 0) {
        await this.loadAllResidents();
      }
    },

    /* ── Properties ── */
    async loadProperties() {
      this.loading = true;
      this.globalError = null;
      try {
        const res = await fetch(`${API_BASE}/owners/${this.userId}/properties`);
        if (!res.ok) throw new Error("Napaka pri nalaganju.");
        const json = await res.json();
        this.properties = json.data ?? [];
      } catch (e) {
        this.globalError = e.message;
      } finally {
        this.loading = false;
      }
    },

    async deleteProperty(id) {
      if (!confirm("Izbriši nepremičnino?")) return;
      this.deletingId = id;
      try {
        const res = await fetch(
          `${API_BASE}/owners/${this.userId}/properties/${id}`,
          { method: "DELETE" },
        );
        if (!res.ok) throw new Error("Brisanje ni uspelo.");
        this.properties = this.properties.filter((p) => p.id !== id);
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
        title: this.form.title,
        address: this.form.address,
        price: Number(this.form.price),
        description: this.form.description || null,
        bedrooms: this.form.bedrooms ? Number(this.form.bedrooms) : null,
        bathrooms: this.form.bathrooms ? Number(this.form.bathrooms) : null,
        area: this.form.area ? Number(this.form.area) : null,
      };
      try {
        const isAdd = this.view === "add";
        const url = isAdd
          ? `${API_BASE}/owners/${this.userId}/properties`
          : `${API_BASE}/owners/${this.userId}/properties/${this.selected.id}`;
        const res = await fetch(url, {
          method: isAdd ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Napaka pri shranjevanju.");
        }
        await this.loadProperties();
        if (isAdd) {
          this.formSuccess = "Nepremičnina dodana!";
          setTimeout(() => this.goList(), 800);
        } else {
          const updated = this.properties.find(
            (p) => p.id === this.selected.id,
          ) ?? { ...this.selected, ...payload };
          this.goDetail(updated);
        }
      } catch (e) {
        this.formError = e.message;
      } finally {
        this.saving = false;
      }
    },

    /* ── Property payments ── */
    async togglePropPayments(p) {
      if (this.showPropPayments) {
        this.showPropPayments = false;
        this.propPayments = [];
        this.showNewPaymentForm = false;
        return;
      }
      this.showPropResidents = false;
      this.showPropPayments = true;
      this.propPaymentsLoading = true;
      this.globalError = null;
      try {
        const [paymentsRes, residentsRes, propResidentsRes] = await Promise.all([
          fetch(`${API_BASE}/payments/properties/${p.id}`),
          fetch(`${API_BASE}/residents?limit=1000&include_inactive=true`),
          fetch(`${API_BASE}/owners/${this.userId}/properties/${p.id}/residents`),
        ]);
        if (!paymentsRes.ok) throw new Error("Napaka pri nalaganju plačil.");
        const [json, rJson, prJson] = await Promise.all([
          paymentsRes.json(),
          residentsRes.ok ? residentsRes.json() : Promise.resolve({ residents: [] }),
          propResidentsRes.ok ? propResidentsRes.json() : Promise.resolve({ residents: [] }),
        ]);
        this.propResidents = (prJson.residents ?? []).filter(r => r.is_active);
        const nameById = {};
        for (const r of (rJson.residents ?? [])) {
          nameById[r.id] = `${r.first_name} ${r.last_name}`;
        }
        const list = (Array.isArray(json) ? json : []).map(pay => ({
          ...pay,
          residentName: nameById[pay.residentId] ?? (pay.residentId ? "Neznan najemnik" : null),
        }));
        this.propPayments = list.sort((a, b) => new Date(b.dueDate) - new Date(a.dueDate));
      } catch (e) {
        this.globalError = e.message;
      } finally {
        this.propPaymentsLoading = false;
      }
    },

    formatPayDate(iso) {
      if (!iso) return "—";
      return new Date(iso).toLocaleDateString("sl-SI", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    },

    statusLabel(status) {
      return (
        {
          SUCCEEDED:      "Plačano",
          PARTIALLY_PAID: "Delno plačano",
          PENDING:        "Čaka",
          FAILED:         "Neuspešno",
          CANCELLED:      "Preklicano",
        }[status] ?? status
      );
    },

    /* ── Payment actions (cancel / retry / pay) ── */
    async paymentAction(paymentId, action) {
      this.paymentActionId = paymentId;
      try {
        const res = await fetch(`${API_BASE}/payments/${paymentId}/${action}`, {
          method: "POST",
        });
        if (!res.ok) throw new Error();
        const statusMap = {
          pay: "SUCCEEDED",
          cancel: "CANCELLED",
          retry: "PENDING",
        };
        const newStatus = statusMap[action];
        this.propPayments = this.propPayments.map((p) =>
          p.id === paymentId ? { ...p, status: newStatus } : p,
        );
      } catch {
        /* ignore */
      }
      this.paymentActionId = null;
    },

    showNoResidentToast() {
      this.noResidentToast = true;
      clearTimeout(this._noResidentToastTimer);
      this._noResidentToastTimer = setTimeout(() => {
        this.noResidentToast = false;
      }, 5000);
    },

    async submitNewPayment() {
      this.newPaymentError = null;
      const resident = this.propResidents[0];
      if (!resident) {
        this.newPaymentError = "Na tej nepremičnini ni podnajemnika.";
        return;
      }
      this.newPaymentSaving = true;
      try {
        await fetch(`${API_BASE}/payments/rent`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            propertyId: this.selected.id,
            residentId: resident.id,
            amount: Number(this.newPaymentForm.amount),
            currency: this.newPaymentForm.currency || "EUR",
            description: this.newPaymentForm.description || null,
            dueDate: this.newPaymentForm.dueDate
              ? new Date(this.newPaymentForm.dueDate).toISOString()
              : new Date().toISOString(),
          }),
        });
        this.newPaymentForm = { description: "", amount: "", currency: "EUR", dueDate: "" };
        this.showNewPaymentForm = false;
        await this.loadDetailPanel(this.selected, true);
      } catch (e) {
        this.newPaymentError = e.message;
      } finally {
        this.newPaymentSaving = false;
      }
    },

    /* ── Resident payments ── */
    async loadResidentPayments(residentId) {
      this.residentPayments = [];
      this.residentPaymentsLoading = true;
      try {
        const res = await fetch(`${API_BASE}/payments/residents/${residentId}`);
        if (res.ok) {
          const data = await res.json();
          this.residentPayments = (Array.isArray(data) ? data : []).sort(
            (a, b) => new Date(b.dueDate) - new Date(a.dueDate),
          );
        }
      } catch {
        /* ignore */
      }
      this.residentPaymentsLoading = false;
    },

    /* ── Property residents ── */
    async submitAddResident() {
      this.addResidentError = null;
      if (!this.addResidentForm.first_name || !this.addResidentForm.last_name || !this.addResidentForm.email) {
        this.addResidentError = "Ime, priimek in e-pošta so obvezni.";
        return;
      }
      this.addResidentSaving = true;
      try {
        const res = await fetch(`${API_BASE}/residents`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            first_name: this.addResidentForm.first_name,
            last_name: this.addResidentForm.last_name,
            email: this.addResidentForm.email,
            phone: this.addResidentForm.phone || null,
            move_in_date: this.addResidentForm.move_in_date || null,
            property_id: this.selected.id,
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.detail || err.message || "Napaka pri dodajanju.");
        }
        const json = await res.json();
        this.propResidents.push(json.data);
        this.showAddResidentForm = false;
        this.addResidentForm = { first_name: "", last_name: "", email: "", phone: "", move_in_date: "" };
      } catch (e) {
        this.addResidentError = e.message;
      } finally {
        this.addResidentSaving = false;
      }
    },

    async goPropertyResidents(p) {
      if (this.showPropResidents) {
        this.showPropResidents = false;
        this.propResidents = [];
        this.showAddResidentForm = false;
        return;
      }
      this.showPropPayments = false;
      this.propPayments = [];
      this.showPropResidents = true;
      this.propResidentsLoading = true;
      this.globalError = null;
      try {
        const res = await fetch(
          `${API_BASE}/owners/${this.userId}/properties/${p.id}/residents`,
        );
        if (!res.ok) throw new Error("Napaka pri nalaganju podnajemnikov.");
        const json = await res.json();
        this.propResidents = json.residents ?? [];
      } catch (e) {
        this.globalError = e.message;
      } finally {
        this.propResidentsLoading = false;
      }
    },

    /* ── Residents tab ── */
    async loadAllResidents() {
      this.resLoading = true;
      this.globalError = null;
      try {
        const res = await fetch(`${API_BASE}/residents?limit=1000&include_inactive=true`);
        if (!res.ok) throw new Error("Napaka pri nalaganju podnajemnikov.");
        const json = await res.json();
        this.allResidents = json.residents ?? [];
      } catch (e) {
        this.globalError = e.message;
      } finally {
        this.resLoading = false;
      }
    },

    showErrorToast(message) {
      this.errorToast = message;
      clearTimeout(this._errorToastTimer);
      this._errorToastTimer = setTimeout(() => { this.errorToast = null; }, 5000);
    },

    async deleteResident(id) {
      const hasPending = this.residentPayments.some((p) => p.status === "PENDING");
      if (hasPending) {
        this.showErrorToast("Najemnik ima neporavnana plačila. Pred brisanjem poravnajte vse odprte račune.");
        return;
      }
      this.pendingDeleteId = id;
      this.showDeleteModal = true;
    },

    async confirmDeleteResident() {
      const id = this.pendingDeleteId;
      this.showDeleteModal = false;
      this.pendingDeleteId = null;
      this.deletingResidentId = id;
      try {
        const res = await fetch(`${API_BASE}/residents/${id}`, { method: "DELETE" });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "Brisanje ni uspelo.");
        }
        // mark inactive instead of removing so they appear under past residents
        this.allResidents = this.allResidents.map((r) =>
          r.id === id ? { ...r, is_active: false } : r
        );
        // update property card counts
        await this.loadProperties();
        this.goResidentsList();
      } catch (e) {
        this.globalError = e.message;
      } finally {
        this.deletingResidentId = null;
      }
    },

    async submitResidentForm() {
      this.resFormError = null;
      this.resSaving = true;
      const payload = {
        first_name: this.resForm.first_name,
        last_name: this.resForm.last_name,
        email: this.resForm.email,
        phone: this.resForm.phone || null,
        move_in_date: this.resForm.move_in_date || null,
      };
      try {
        const res = await fetch(
          `${API_BASE}/residents/${this.selectedResident.id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          },
        );
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.detail || "Napaka pri shranjevanju.");
        }
        const json = await res.json();
        const updated = json.data ?? { ...this.selectedResident, ...payload };
        // refresh list
        const idx = this.allResidents.findIndex(
          (r) => r.id === this.selectedResident.id,
        );
        if (idx !== -1) this.allResidents[idx] = updated;
        this.goResidentDetail(updated);
      } catch (e) {
        this.resFormError = e.message;
      } finally {
        this.resSaving = false;
      }
    },

    /* ── Navigation ── */
    goList() {
      this.view = "list";
      this.selected = null;
      this.formError = null;
      this.formSuccess = null;
      this.showPropResidents = false;
      this.propResidents = [];
      this.showPropPayments = false;
      this.propPayments = [];
    },
    goDetail(p) {
      this.selected = p;
      this.view = "detail";
      this.showPropResidents = false;
      this.showPropPayments = false;
      this.propResidents = [];
      this.propPayments = [];
      this.detailPanelResidentsOpen = true;
      this.detailPanelPaymentsOpen = true;
      this.expandedPastGroups = {};
      this.showAddResidentForm = false;
      this.addResidentForm = { first_name: "", last_name: "", email: "", phone: "", move_in_date: "" };
      this.addResidentError = null;
      this.showNewPaymentForm = false;
      this.newPaymentForm = { description: "", amount: "", currency: "EUR", dueDate: "" };
      this.newPaymentError = null;
      this.loadDetailPanel(p);
    },

    async openPastResidentDetail(resident) {
      this.pastResidentDetail = resident;
      this.pastResidentDetailPayments = [];
      this.pastResidentDetailLoading = true;
      try {
        const res = await fetch(`${API_BASE}/payments/residents/${resident.id}`);
        if (res.ok) {
          const data = await res.json();
          this.pastResidentDetailPayments = Array.isArray(data)
            ? data.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
            : [];
        }
      } catch { /* ignore */ }
      finally { this.pastResidentDetailLoading = false; }
    },

    async loadDetailPanel(p, silent = false) {
      if (!silent) {
        this.propResidentsLoading = true;
        this.propPaymentsLoading = true;
      }
      try {
        const [residentsRes, paymentsRes, allResidentsRes] = await Promise.all([
          fetch(`${API_BASE}/owners/${this.userId}/properties/${p.id}/residents`),
          fetch(`${API_BASE}/payments/properties/${p.id}`),
          fetch(`${API_BASE}/residents?limit=1000&include_inactive=true`),
        ]);
        const [rJson, pJson, arJson] = await Promise.all([
          residentsRes.ok ? residentsRes.json() : Promise.resolve({ residents: [] }),
          paymentsRes.ok ? paymentsRes.json() : Promise.resolve([]),
          allResidentsRes.ok ? allResidentsRes.json() : Promise.resolve({ residents: [] }),
        ]);
        this.propResidents = (rJson.residents ?? []).filter(r => r.is_active);
        const nameById = {};
        this.residentById = {};
        for (const r of (arJson.residents ?? [])) {
          nameById[r.id] = `${r.first_name} ${r.last_name}`;
          this.residentById[r.id] = r;
        }
        const list = (Array.isArray(pJson) ? pJson : []).map(pay => ({
          ...pay,
          residentName: nameById[pay.residentId] ?? (pay.residentId ? "Neznan najemnik" : null),
        }));
        this.propPayments = list.sort((a, b) => new Date(b.dueDate) - new Date(a.dueDate));
      } catch (e) {
        this.globalError = e.message;
      } finally {
        this.propResidentsLoading = false;
        this.propPaymentsLoading = false;
      }
    },
    goEdit(p) {
      this.selected = p;
      this.form = {
        title: p.title ?? "",
        address: p.address ?? "",
        price: p.price ?? "",
        description: p.description ?? "",
        bedrooms: p.bedrooms ?? "",
        bathrooms: p.bathrooms ?? "",
        area: p.area ?? "",
      };
      this.view = "edit";
    },
    goAdd() {
      this.selected = null;
      this.form = emptyForm();
      this.view = "add";
    },
    goBack() {
      if (this.activeTab === "properties") {
        if (this.view === "prop-residents") {
          this.goDetail(this.selected);
          return;
        }
        if (this.view === "edit" || this.view === "add") {
          this.goList();
          return;
        }
        this.goList();
      } else {
        if (this.resView === "edit") {
          this.goResidentDetail(this.selectedResident);
          return;
        }
        this.goResidentsList();
      }
    },

    goResidentsList() {
      this.resView = "list";
      this.selectedResident = null;
      this.resFormError = null;
      this.resFormSuccess = null;
    },
    async goResidentDetail(r) {
      this.selectedResident = r;
      this.resView = "detail";
      this.resFormError = null;
      try {
        const res = await fetch(`${API_BASE}/residents/${r.id}`);
        if (res.ok) {
          const json = await res.json();
          this.selectedResident = json.data ?? r;
        }
      } catch {
        /* use cached data */
      }
      this.loadResidentPayments(r.id);
    },
    goResidentEdit(r) {
      this.selectedResident = r;
      this.resForm = {
        first_name: r.first_name ?? "",
        last_name: r.last_name ?? "",
        email: r.email ?? "",
        phone: r.phone ?? "",
        move_in_date: r.move_in_date ?? "",
      };
      this.resView = "edit";
      this.activeTab = "residents";
    },

    async logout() {
      try {
        await fetch(`${API_BASE}/auth/logout`, { method: "POST" });
      } catch {
        /* ignore */
      }
      sessionStorage.removeItem("user");
      window.location.assign("/");
    },
  },
};
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700&display=swap');

*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

.page {
  min-height: 100vh;
  background: #faf5ee;
  font-family: 'Montserrat', system-ui, sans-serif;
  color: #1e1409;
}

/* ── TOPBAR ── */
.topbar {
  background: #c7ac98;
  border-bottom: 1px solid #b89880;
}
.topbar-inner {
  margin: 0 auto;
  padding: 20px 36px;
  min-height: 72px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}
.topbar-left {
  display: flex;
  align-items: center;
  gap: 16px;
}
.topbar-right {
  display: flex;
  align-items: center;
  gap: 14px;
}

.greeting {
  font-family: 'Montserrat', system-ui, sans-serif;
  font-size: 1.15rem;
  font-weight: 600;
  color: #6b4020;
  letter-spacing: 0.02em;
  text-transform: none;
  margin-bottom: 1px;
}
.page-title {
  font-size: 1rem;
  font-weight: 600;
  color: #1e1409;
  letter-spacing: -0.01em;
}
.back-btn {
  background: none;
  border: none;
  color: #6b4020;
  font-size: 0.85rem;
  cursor: pointer;
  padding: 0;
  letter-spacing: 0.01em;
}
.back-btn:hover {
  color: #1e1409;
}

/* Tabs */
.tabs {
  display: flex;
  gap: 4px;
}
.tab-btn {
  background: transparent;
  border: 1px solid transparent;
  border-radius: 5px;
  padding: 7px 18px;
  font-size: 0.96rem;
  font-weight: 500;
  color: #6b4020;
  cursor: pointer;
  letter-spacing: 0.01em;
  transition:
    background 0.15s,
    color 0.15s;
}
.tab-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}
.tab-btn.active {
  background: rgba(255, 255, 255, 0.45);
  color: #1e1409;
  font-weight: 600;
  border-color: rgba(255, 255, 255, 0.4);
}

.logout-btn {
  background: none;
  border: 1px solid rgba(107, 64, 32, 0.45);
  color: #6b4020;
  font-size: 0.9rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 7px 18px;
  border-radius: 20px;
  cursor: pointer;
  transition: background 0.35s ease, border-color 0.35s ease, color 0.35s ease;
}
.logout-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  border-color: #a07050;
  color: #1e1409;
}

/* ── CONTENT ── */
.content {
  max-width: 1080px;
  margin: 0 auto;
  padding: 36px 28px;
}

.feedback {
  font-size: 0.9rem;
  margin-bottom: 20px;
}
.feedback.error {
  color: #b04a2a;
}
.feedback.ok {
  color: #5a7a42;
  font-weight: 500;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #9a7455;
  font-size: 0.95rem;
}

/* ── GRID ── */
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 14px;
}

.card {
  background: #fff;
  border: 1px solid #e8d9c4;
  border-radius: 10px;
  padding: 40px 22px;
  min-height: 200px;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  cursor: pointer;
  transition:
    border-color 0.15s,
    box-shadow 0.15s;
}
.card:hover {
  border-color: #c47c3e;
  box-shadow: 0 2px 16px rgba(196, 124, 62, 0.1);
}

.card-top {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 6px;
}
.card-title {
  font-size: 1.15rem;
  font-weight: 600;
  color: #1e1409;
  line-height: 1.3;
}
.card-price {
  font-size: 1.1rem;
  font-weight: 700;
  color: #c47c3e;
  white-space: nowrap;
}
.per {
  font-size: 0.82rem;
  font-weight: 400;
  color: #a08060;
}
.card-address {
  font-size: 0.92rem;
  color: #9a7455;
  line-height: 1.4;
  margin-bottom: 12px;
}

.card-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 2px;
}
.meta-item {
  font-size: 0.82rem;
  background: #f5ede0;
  color: #7a5030;
  border-radius: 4px;
  padding: 2px 8px;
  font-weight: 500;
}
.meta-tenants {
  background: #ede8f5;
  color: #5a4a7a;
}

.resident-card .card-title {
  color: #1e1409;
}

/* add card */
.card-add {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-style: dashed;
  border-color: #d9c8b4;
  background: #fdf8f3;
  color: #b09070;
}
.card-add:hover {
  border-color: #c47c3e;
  color: #c47c3e;
  box-shadow: none;
}
.add-icon {
  font-size: 1.4rem;
  font-weight: 300;
  line-height: 1;
}
.add-label {
  font-size: 0.82rem;
  font-weight: 500;
  letter-spacing: 0.02em;
}

/* ── PANEL ── */
.panel {
  background: #fff;
  border: 1px solid #e8d9c4;
  border-radius: 10px;
  padding: 28px 32px;
  max-width: 560px;
}

.detail-list {
  list-style: none;
}
.detail-row {
  display: flex;
  gap: 20px;
  padding: 11px 0;
  border-bottom: 1px solid #f0e6d6;
}
.detail-row:last-child {
  border-bottom: none;
}
.detail-row dt {
  width: 120px;
  min-width: 120px;
  font-size: 0.78rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #b09070;
  padding-top: 1px;
}
.detail-row dd {
  font-size: 0.92rem;
  color: #1e1409;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 0;
}
.field {
  margin-bottom: 16px;
}
.field label {
  display: block;
  font-size: 0.78rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #b09070;
  margin-bottom: 6px;
}
.field input,
.field textarea,
.field select {
  width: 100%;
  padding: 9px 12px;
  border: 1px solid #e0cdb8;
  border-radius: 6px;
  font-size: 0.92rem;
  font-family: inherit;
  color: #1e1409;
  background: #fdfaf6;
  outline: none;
  transition: border-color 0.15s;
}
.field input:focus,
.field textarea:focus {
  border-color: #c47c3e;
}
.field textarea {
  resize: vertical;
}
.form-row {
  display: flex;
  gap: 14px;
}
.form-row .field {
  flex: 1;
}

.action-row {
  display: flex;
  gap: 10px;
  margin-top: 20px;
  flex-wrap: wrap;
}

/* buttons */
.btn {
  padding: 8px 20px;
  border-radius: 6px;
  font-size: 0.86rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  cursor: pointer;
  border: 1px solid transparent;
  transition:
    opacity 0.15s,
    background 0.15s;
}
.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.btn-primary {
  background: #c47c3e;
  color: #fff;
  border-color: #c47c3e;
}
.btn-primary:hover {
  background: #a8662e;
  border-color: #a8662e;
}
.btn-outline {
  background: transparent;
  color: #1e1409;
  border-color: #d0bea8;
}
.btn-outline:hover {
  border-color: #c47c3e;
  color: #c47c3e;
}
.btn-secondary {
  background: #f0e8d8;
  color: #7a5030;
  border-color: #ddd0bc;
}
.btn-secondary:hover {
  background: #e8dcc8;
  border-color: #c47c3e;
}
.btn-ghost {
  background: transparent;
  color: #9a7455;
  border-color: transparent;
}
.btn-ghost:hover {
  color: #1e1409;
}
.btn-ghost-red {
  background: transparent;
  color: #b04a2a;
  border-color: transparent;
  font-weight: 500;
}
.btn-ghost-red:hover {
  text-decoration: underline;
}
.btn-danger {
  background: #b04a2a;
  color: #fff;
  border-color: #b04a2a;
  font-weight: 600;
}
.btn-danger:hover {
  background: #8e3820;
  border-color: #8e3820;
}

/* ── DELETE MODAL ── */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.modal-box {
  background: #fff;
  border-radius: 16px;
  padding: 36px 32px 28px;
  max-width: 420px;
  width: 90%;
  box-shadow: 0 20px 60px rgba(0,0,0,0.18);
  text-align: center;
}
.modal-icon {
  font-size: 2.4rem;
  margin-bottom: 12px;
}
.modal-title {
  font-size: 1.2rem;
  font-weight: 700;
  color: #1e1409;
  margin: 0 0 10px;
}
.modal-body {
  font-size: 0.92rem;
  color: #6b5744;
  margin: 0 0 28px;
  line-height: 1.5;
}
.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

/* ── DETAIL SPLIT LAYOUT ── */
.detail-layout {
  display: flex;
  gap: 20px;
  align-items: flex-start;
}
.detail-layout .panel {
  flex-shrink: 0;
}

.residents-sidebar {
  flex: 1;
  min-width: 0;
  background: #fff;
  border: 1px solid #e8d9c4;
  border-radius: 10px;
  padding: 20px 24px;
}
.sidebar-title {
  font-size: 0.82rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: #b09070;
  margin-bottom: 14px;
}
.resident-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.resident-row {
  padding: 10px 12px;
  border-radius: 7px;
  cursor: pointer;
  transition: background 0.12s;
}
.resident-row:hover {
  background: #faf0e6;
}
.resident-name {
  font-size: 0.92rem;
  font-weight: 600;
  color: #1e1409;
  margin-bottom: 3px;
}
.resident-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 0.78rem;
  color: #9a7455;
}

/* active state for sidebar toggle buttons */
.btn-secondary.active {
  background: #e0d0b8;
  border-color: #c47c3e;
  color: #5a3a18;
}

/* ── PAYMENT SIDEBAR ── */
.payment-alert {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 7px;
  font-size: 0.84rem;
  font-weight: 500;
  margin-bottom: 14px;
}
.alert-ok {
  background: #e6f4ea;
  color: #1b5e20;
  border: 1px solid #a5d6a7;
}
.alert-warn {
  background: #fdecea;
  color: #b71c1c;
  border: 1px solid #ef9a9a;
}
.alert-partial {
  background: #fff8e1;
  color: #e65100;
  border: 1px solid #ffcc80;
}
.alert-icon {
  font-size: 1rem;
  font-weight: 700;
  flex-shrink: 0;
}

.payment-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.payment-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 7px;
  background: #fdfaf6;
  border-left: 3px solid #e8d9c4;
  flex-wrap: wrap;
}
.payment-latest {
  border-left-color: #c47c3e;
  border-left-width: 4px;
  background: #fef9f3;
}
.payment-left {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.payment-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  flex-shrink: 0;
}
.latest-tag {
  font-size: 0.66rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: #7a5030;
  background: #f0e8d8;
  padding: 1px 6px;
  border-radius: 3px;
  align-self: flex-start;
}
.payment-desc {
  font-size: 0.86rem;
  font-weight: 600;
  color: #1e1409;
}
.payment-payer {
  font-size: 0.74rem;
  color: #7a5030;
  font-weight: 500;
  margin-top: 1px;
}
.payment-meta {
  font-size: 0.74rem;
  color: #9a7455;
}
.payment-amount {
  font-size: 0.9rem;
  font-weight: 700;
  color: #c47c3e;
}
.pay-badge {
  font-size: 0.7rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 4px;
  border: 1px solid;
}
.badge-paid {
  background: #e6f4ea;
  color: #2e7d32;
  border-color: #a5d6a7;
}
.badge-unpaid {
  background: #fdecea;
  color: #b71c1c;
  border-color: #ef9a9a;
}
.badge-partial {
  background: #fff8e1;
  color: #e65100;
  border-color: #ffcc80;
}
.badge-cancelled {
  background: #fff8e1;
  color: #e65100;
  border-color: #ffcc80;
}

/* sidebar header with button */
.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}
.sidebar-header .sidebar-title {
  margin-bottom: 0;
}

.btn-sm {
  padding: 5px 12px;
  font-size: 0.78rem;
}

/* new payment inline form */
.new-payment-form {
  background: #fdf8f3;
  border: 1px solid #e8d9c4;
  border-radius: 8px;
  padding: 14px 16px;
  margin-bottom: 16px;
}
.new-payment-form .field {
  margin-bottom: 10px;
}
.new-payment-form .field label {
  display: block;
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #b09070;
  margin-bottom: 5px;
}
.new-payment-form input {
  width: 100%;
  padding: 7px 10px;
  border: 1px solid #e0cdb8;
  border-radius: 5px;
  font-size: 0.88rem;
  font-family: inherit;
  color: #1e1409;
  background: #fff;
  outline: none;
}
.new-payment-form input:focus {
  border-color: #c47c3e;
}

/* pay action buttons */
.pay-actions {
  display: flex;
  gap: 4px;
  margin-top: 3px;
}
.pay-action-btn {
  font-size: 0.7rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 4px;
  cursor: pointer;
  border: none;
  letter-spacing: 0.02em;
}
.pay-action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.pay-btn {
  background: #c47c3e;
  color: #fff;
}
.cancel-btn {
  background: #9a7455;
  color: #fff;
}
.retry-btn {
  background: #5a7a42;
  color: #fff;
}

/* past residents section */
.past-residents-header {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: #b09070;
  margin: 18px 0 8px;
  padding-top: 14px;
  border-top: 1px dashed #e0cdb8;
}
.past-resident-group {
  margin-bottom: 12px;
}
.past-resident-name {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.82rem;
  font-weight: 600;
  color: #7a5030;
  background: #fdf5ec;
  border: 1px solid #e8d9c4;
  border-radius: 6px;
  padding: 7px 12px;
  margin-bottom: 6px;
  user-select: none;
}
.past-resident-name:hover {
  background: #f5ece0;
}
.past-expand-icon {
  font-size: 0.7rem;
  color: #b09070;
}
.past-count {
  font-size: 0.72rem;
  font-weight: 400;
  color: #b09070;
  margin-left: 2px;
}
.payment-past {
  opacity: 0.8;
}

/* combined right panel */
.detail-right-panel {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.detail-collapsible {
  flex: unset;
}
.collapsible-header {
  cursor: pointer;
  user-select: none;
}
.collapsible-header:hover .sidebar-title {
  color: #7a5030;
}
.collapse-arrow {
  font-size: 0.72rem;
  color: #b09070;
}

/* residents section headers */
.residents-section-header {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: #b09070;
  margin: 0 0 14px;
}
.residents-section-past {
  margin-top: 28px;
  padding-top: 18px;
  border-top: 1px dashed #e0cdb8;
}
.resident-card-inactive {
  opacity: 0.65;
}
.badge-inactive {
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: #f0e8d8;
  color: #9a7455;
  border: 1px solid #d4bfa0;
  border-radius: 4px;
  padding: 2px 7px;
  margin-left: auto;
}

/* toast popup */
.toast-popup {
  position: fixed;
  bottom: 32px;
  right: 32px;
  z-index: 9999;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  background: #fff;
  border: 1px solid #f5c2a0;
  border-left: 4px solid #c47c3e;
  border-radius: 10px;
  padding: 16px 18px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.13);
  min-width: 280px;
  max-width: 360px;
}
.toast-icon {
  font-size: 1.1rem;
  color: #c47c3e;
  flex-shrink: 0;
  margin-top: 1px;
}
.toast-popup strong {
  font-size: 0.92rem;
  color: #1e1409;
  display: block;
  margin-bottom: 3px;
}
.toast-popup p {
  font-size: 0.82rem;
  color: #7a5030;
  margin: 0;
  line-height: 1.4;
}
.toast-close {
  margin-left: auto;
  background: none;
  border: none;
  font-size: 0.8rem;
  color: #b09070;
  cursor: pointer;
  padding: 0;
  flex-shrink: 0;
  line-height: 1;
}
.toast-close:hover {
  color: #7a5030;
}

/* past resident name link */
.past-resident-name-link {
  cursor: pointer;
  text-decoration: underline dotted;
  text-underline-offset: 2px;
}
.past-resident-name-link:hover {
  color: #c47c3e;
}
.past-stats-btn {
  margin-left: auto;
  font-size: 0.85rem;
  cursor: pointer;
  opacity: 0.7;
  transition: opacity 0.15s;
}
.past-stats-btn:hover {
  opacity: 1;
}

/* stats modal */
.modal-stats-box {
  max-width: 560px;
  text-align: left;
}
.stats-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}
.stats-modal-name {
  font-size: 1.3rem;
  font-weight: 700;
  color: #1e1409;
  margin: 4px 0 3px;
}
.stats-modal-email {
  font-size: 0.82rem;
  color: #9a7455;
  margin: 0;
}
.modal-close-x {
  background: none;
  border: none;
  font-size: 1rem;
  color: #b09070;
  cursor: pointer;
  padding: 2px 4px;
  line-height: 1;
  flex-shrink: 0;
}
.modal-close-x:hover { color: #1e1409; }
.modal-divider {
  height: 1px;
  background: #e8ddd2;
  margin: 16px 0;
}
.stats-empty {
  text-align: center;
  color: #9a7455;
  font-size: 0.9rem;
  padding: 20px 0;
}
.stats-dates {
  display: flex;
  gap: 24px;
  margin-bottom: 16px;
}
.stats-date-cell {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.stats-date-label {
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: #b09070;
}
.stats-date-val {
  font-size: 0.9rem;
  font-weight: 600;
  color: #1e1409;
}
.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 20px;
}
.stats-tile {
  background: #faf5ee;
  border: 1px solid #e8d9c4;
  border-radius: 8px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.stats-tile-accent {
  background: #fff8f0;
  border-color: #f5c2a0;
}
.stats-tile-num {
  font-size: 1.3rem;
  font-weight: 800;
  color: #1e1409;
  line-height: 1;
}
.stats-tile-accent .stats-tile-num {
  color: #c47c3e;
}
.stats-tile-lbl {
  font-size: 0.72rem;
  color: #9a7455;
  font-weight: 500;
}
.chart-wrap {
  border: 1px solid #e8d9c4;
  border-radius: 8px;
  padding: 14px 16px;
  background: #fdfaf6;
}
.chart-lbl {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: #b09070;
  margin-bottom: 10px;
}
.chart-scroll {
  overflow-x: auto;
  padding-bottom: 4px;
}
.chart-legend {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  font-size: 0.72rem;
  color: #9a7455;
  margin-top: 10px;
}
.legend-dot {
  display: inline-block;
  width: 9px;
  height: 9px;
  border-radius: 2px;
  vertical-align: middle;
  margin-right: 3px;
}

.toast-popup-error {
  border-color: #ef9a9a;
  border-left-color: #b04a2a;
}
.toast-popup-error .toast-icon {
  color: #b04a2a;
}
.toast-popup-error strong {
  color: #b04a2a;
}
.toast-popup-error p {
  color: #7a3020;
}

/* toast transition */
.toast-enter-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.toast-leave-active {
  transition: opacity 0.6s ease, transform 0.6s ease;
}
.toast-enter-from {
  opacity: 0;
  transform: translateY(16px);
}
.toast-leave-to {
  opacity: 0;
  transform: translateY(16px);
}
</style>
