/* ============================================================
   UBODROP — admin.js
   Logique frontend du dashboard administrateur
   ============================================================
   ARCHITECTURE :
   - adminState   → état courant de la session admin
   - mockData     → données de démonstration centralisées
   - authModule   → login / logout
   - kpiModule    → rendu des KPI
   - certModule   → gestion des certifications pro
   - bankModule   → section compte bancaire / Revolut
   - securityModule → changement de mot de passe
   - uiModule     → navigation, toast, modal

   TODO BACKEND : Chaque module indique les endpoints à brancher.
   Remplacer les appels mock par des fetch() vers l'API correspondante.
   ============================================================ */

'use strict';

/* ================================================================
   STATE GLOBAL
   ================================================================ */
const adminState = {
  isLoggedIn: false,
  adminUsername: '',
  kpiPeriod: 'day',          // 'day' | 'week' | 'month'
  certFilter: 'all',         // 'all' | 'pending' | 'approved' | 'refused'
  certSearch: '',
  bankConnected: true,
  currentSection: 'kpi',
};

/* ================================================================
   MOCK DATA (remplacer par des appels API en production)
   ================================================================
   TODO BACKEND :
   GET /admin/stats → remplace mockKPI
   GET /admin/certifications → remplace mockCerts
   GET /admin/banking → remplace mockBanking
   ================================================================ */
const mockData = {
  credentials: {
    username: 'Sofiane.Aboutaibe',
    // NOTE SÉCURITÉ : En production, l'auth doit être gérée côté backend.
    // Ne jamais stocker de credentials en clair en production.
    password: 'UBODROP',
  },
  kpi: {
    online: { users: 142, pros: 38 },
    total: { users: 4821, pros: 312 },
    orders: {
      day:   { count: 67,   trend: '+12%',  up: true  },
      week:  { count: 489,  trend: '+8%',   up: true  },
      month: { count: 1843, trend: '+22%',  up: true  },
    },
    revenue: {
      day:   { amount: '340 €',   trend: '+9%',   up: true  },
      week:  { amount: '2 480 €', trend: '+14%',  up: true  },
      month: { amount: '9 210 €', trend: '+31%',  up: true  },
    },
    ca: {
      day:   { amount: '3 400 €',   trend: '+9%',   up: true  },
      week:  { amount: '24 800 €',  trend: '+14%',  up: true  },
      month: { amount: '92 100 €',  trend: '+31%',  up: true  },
    },
  },
  certifications: [
    { id: 1, name: 'Amara Diallo',     specialty: 'Coiffeuse',         city: 'Paris 11e',    date: '09 avr. 2025', status: 'pending'  },
    { id: 2, name: 'Kevin Osei',       specialty: 'Barbier',           city: 'Lyon',         date: '08 avr. 2025', status: 'pending'  },
    { id: 3, name: 'Inès Halabi',      specialty: 'Manucure',          city: 'Marseille',    date: '07 avr. 2025', status: 'approved' },
    { id: 4, name: 'Youssef Brahimi',  specialty: 'Tatoueur',          city: 'Toulouse',     date: '06 avr. 2025', status: 'pending'  },
    { id: 5, name: 'Chloé Fontaine',   specialty: 'Esthéticienne',     city: 'Bordeaux',     date: '05 avr. 2025', status: 'refused'  },
    { id: 6, name: 'Marcus Essien',    specialty: 'Barbier',           city: 'Nantes',       date: '04 avr. 2025', status: 'approved' },
    { id: 7, name: 'Fatou Ndiaye',     specialty: 'Tresseuse',         city: 'Strasbourg',   date: '03 avr. 2025', status: 'pending'  },
    { id: 8, name: 'Romain Leclerc',   specialty: 'Micro-pigmentation',city: 'Paris 9e',     date: '02 avr. 2025', status: 'pending'  },
  ],
  banking: {
    holder:   'UBODROP SAS',
    iban:     'FR76 3000 6000 0112 3456 7890 189',
    ibanMasked: 'FR76 •••• •••• •••• •••• 7890 189',
    bic:      'AGRIFRPP',
    lastUpdate: '10 avr. 2025 à 14h22',
    bank:     'Revolut',
  },
};

/* ================================================================
   AUTH MODULE
   TODO BACKEND : remplacer la vérification locale par
   POST /admin/login → { token, username } puis stocker le JWT.
   ================================================================ */
const authModule = {
  init() {
    // Vérifier session existante
    const saved = sessionStorage.getItem('ubo_admin_session');
    if (saved) {
      try {
        const session = JSON.parse(saved);
        if (session.username) {
          adminState.isLoggedIn = true;
          adminState.adminUsername = session.username;
          uiModule.showDashboard();
          return;
        }
      } catch(e) { /* session corrompue */ }
    }
    uiModule.showLogin();
  },

  login(username, password) {
    // TODO BACKEND : fetch('POST /admin/login', { username, password })
    if (
      username === mockData.credentials.username &&
      password === mockData.credentials.password
    ) {
      adminState.isLoggedIn = true;
      adminState.adminUsername = username;
      // Stocker session (sessionStorage = fermeture onglet = déconnexion)
      sessionStorage.setItem('ubo_admin_session', JSON.stringify({ username }));
      uiModule.showDashboard();
      return true;
    }
    return false;
  },

  logout() {
    adminState.isLoggedIn = false;
    adminState.adminUsername = '';
    sessionStorage.removeItem('ubo_admin_session');
    uiModule.showLogin();
  },
};

/* ================================================================
   KPI MODULE
   ================================================================ */
const kpiModule = {
  render() {
    const p = adminState.kpiPeriod;
    const d = mockData.kpi;

    // Online
    document.getElementById('kpiUsersOnline').textContent = d.online.users;
    document.getElementById('kpiProsOnline').textContent  = d.online.pros;
    // Total
    document.getElementById('kpiUsersTotal').textContent  = d.total.users.toLocaleString('fr-FR');
    document.getElementById('kpiProsTotal').textContent   = d.total.pros.toLocaleString('fr-FR');
    // Orders
    document.getElementById('kpiOrders').textContent      = d.orders[p].count.toLocaleString('fr-FR');
    this._setTrend('kpiOrdersTrend', d.orders[p]);
    // Revenue
    document.getElementById('kpiRevenue').textContent     = d.revenue[p].amount;
    this._setTrend('kpiRevenueTrend', d.revenue[p]);
    // CA
    document.getElementById('kpiCA').textContent          = d.ca[p].amount;
    this._setTrend('kpiCATrend', d.ca[p]);

    // Mise à jour des labels périodiques
    const periodLabels = { day: 'Aujourd\'hui', week: 'Cette semaine', month: 'Ce mois' };
    document.querySelectorAll('.kpi-period-label').forEach(el => {
      el.textContent = periodLabels[p];
    });
  },

  _setTrend(id, data) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = data.trend;
    el.className = `kpi-trend ${data.up ? 'up' : 'down'}`;
    el.innerHTML = `${data.up
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="18 15 12 9 6 15"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>'
    } ${data.trend}`;
  },

  setPeriod(period) {
    adminState.kpiPeriod = period;
    document.querySelectorAll('.kpi-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.period === period);
    });
    this.render();
  },
};

/* ================================================================
   CERTIFICATIONS MODULE
   ================================================================ */
const certModule = {
  init() {
    this.renderList();
  },

  renderList() {
    const list = document.getElementById('certList');
    const search = adminState.certSearch.toLowerCase();
    const filter = adminState.certFilter;

    let certs = mockData.certifications.filter(c => {
      const matchFilter = filter === 'all' || c.status === filter;
      const matchSearch = !search ||
        c.name.toLowerCase().includes(search) ||
        c.specialty.toLowerCase().includes(search) ||
        c.city.toLowerCase().includes(search);
      return matchFilter && matchSearch;
    });

    if (certs.length === 0) {
      list.innerHTML = '<div class="cert-empty">Aucune demande trouvée.</div>';
      return;
    }

    list.innerHTML = certs.map((c, i) => `
      <div class="cert-card" style="animation-delay:${i * 0.06}s" data-id="${c.id}">
        <div class="cert-avatar">${c.name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()}</div>
        <div class="cert-info">
          <div class="cert-name">${c.name}</div>
          <div class="cert-meta">${c.specialty} · ${c.city}</div>
        </div>
        <div class="cert-date">${c.date}</div>
        <span class="cert-status ${c.status}">${this._statusLabel(c.status)}</span>
        <div class="cert-actions">
          <button class="btn-action see" onclick="certModule.openDetail(${c.id})">Voir</button>
          <button class="btn-action approve" onclick="certModule.updateStatus(${c.id},'approved')"
            ${c.status !== 'pending' ? 'disabled' : ''}>Valider</button>
          <button class="btn-action refuse" onclick="certModule.updateStatus(${c.id},'refused')"
            ${c.status !== 'pending' ? 'disabled' : ''}>Refuser</button>
        </div>
      </div>
    `).join('');
  },

  _statusLabel(s) {
    return { pending: 'En attente', approved: 'Validé', refused: 'Refusé' }[s] || s;
  },

  updateStatus(id, status) {
    // TODO BACKEND : PUT /admin/certifications/:id { status }
    const cert = mockData.certifications.find(c => c.id === id);
    if (!cert || cert.status !== 'pending') return;
    cert.status = status;
    this.renderList();
    uiModule.toast(
      status === 'approved'
        ? `✅ ${cert.name} validé avec succès`
        : `❌ ${cert.name} refusé`,
      status === 'approved' ? 'success' : 'error'
    );
  },

  openDetail(id) {
    const cert = mockData.certifications.find(c => c.id === id);
    if (!cert) return;
    document.getElementById('modalTitle').textContent = cert.name;
    document.getElementById('modalBody').innerHTML = `
      <div class="modal-detail-row"><span class="modal-detail-label">Spécialité</span><span class="modal-detail-value">${cert.specialty}</span></div>
      <div class="modal-detail-row"><span class="modal-detail-label">Ville</span><span class="modal-detail-value">${cert.city}</span></div>
      <div class="modal-detail-row"><span class="modal-detail-label">Demande le</span><span class="modal-detail-value">${cert.date}</span></div>
      <div class="modal-detail-row"><span class="modal-detail-label">Statut</span><span class="modal-detail-value"><span class="cert-status ${cert.status}">${this._statusLabel(cert.status)}</span></span></div>
    `;
    document.getElementById('modalOverlay').classList.remove('hidden');
  },

  closeModal() {
    document.getElementById('modalOverlay').classList.add('hidden');
  },

  setFilter(filter) {
    adminState.certFilter = filter;
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.filter === filter);
    });
    this.renderList();
  },

  setSearch(val) {
    adminState.certSearch = val;
    this.renderList();
  },
};

/* ================================================================
   BANKING MODULE
   ================================================================ */
const bankModule = {
  render() {
    const b = mockData.banking;
    // IBAN
    document.getElementById('bankIBAN').textContent = b.ibanMasked;
    document.getElementById('bankHolder').textContent = b.holder;
    document.getElementById('bankLastUpdate').textContent = `Dernière modification : ${b.lastUpdate}`;
    // Statut
    const statusEl = document.getElementById('bankStatus');
    statusEl.className = `bank-status-badge ${adminState.bankConnected ? 'connected' : 'disconnected'}`;
    statusEl.innerHTML = `<span class="bank-status-dot"></span> ${adminState.bankConnected ? 'Connecté' : 'Non connecté'}`;
    // Bouton
    document.getElementById('btnBankConnect').textContent = adminState.bankConnected ? 'Modifier le compte' : 'Connecter Revolut';
  },

  toggleConnect() {
    // TODO BACKEND : POST /admin/banking/connect → OAuth Revolut
    adminState.bankConnected = !adminState.bankConnected;
    this.render();
    uiModule.toast(
      adminState.bankConnected ? '✅ Compte Revolut connecté' : '⚡ Compte déconnecté',
      adminState.bankConnected ? 'success' : 'error'
    );
  },

  copyIBAN() {
    const iban = mockData.banking.iban;
    navigator.clipboard?.writeText(iban).then(() => {
      uiModule.toast('📋 IBAN copié dans le presse-papiers', 'success');
    }).catch(() => {
      uiModule.toast('IBAN : ' + iban, 'success');
    });
  },
};

/* ================================================================
   SECURITY MODULE
   ================================================================ */
const securityModule = {
  // NOTE : En production, le changement de mot de passe doit passer par
  // PUT /admin/password avec authentification JWT + hachage bcrypt côté backend.
  changePassword(current, newPw, confirm) {
    const msgEl = document.getElementById('pwMsg');
    msgEl.classList.add('hidden');

    if (current !== mockData.credentials.password) {
      this._showMsg(msgEl, 'error', 'Mot de passe actuel incorrect.');
      return false;
    }
    if (newPw.length < 6) {
      this._showMsg(msgEl, 'error', 'Le nouveau mot de passe doit contenir au moins 6 caractères.');
      return false;
    }
    if (newPw !== confirm) {
      this._showMsg(msgEl, 'error', 'Les mots de passe ne correspondent pas.');
      return false;
    }
    // TODO BACKEND : PUT /admin/password { currentPassword, newPassword }
    mockData.credentials.password = newPw;
    this._showMsg(msgEl, 'success', 'Mot de passe mis à jour avec succès.');
    document.getElementById('pwForm').reset();
    return true;
  },

  _showMsg(el, type, text) {
    el.className = `settings-msg ${type}`;
    el.innerHTML = `${type === 'success'
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'
    } ${text}`;
    el.classList.remove('hidden');
  },
};

/* ================================================================
   UI MODULE
   ================================================================ */
const uiModule = {
  showLogin() {
    document.getElementById('loginScreen').classList.remove('hidden');
    document.getElementById('dashboard').classList.add('hidden');
  },

  showDashboard() {
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');
    document.getElementById('topbarAdminName').textContent = adminState.adminUsername;

    // Skeleton puis rendu réel
    setTimeout(() => {
      kpiModule.render();
      certModule.init();
      bankModule.render();
    }, 600);

    this.navigateTo('kpi');
  },

  navigateTo(section) {
    adminState.currentSection = section;

    document.querySelectorAll('.admin-section').forEach(el => {
      el.classList.toggle('active', el.id === `section-${section}`);
    });
    document.querySelectorAll('.sidenav-item, .mobile-nav-item').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.section === section);
    });
  },

  toast(message, type = 'success') {
    const el = document.getElementById('toast');
    const icon = type === 'success'
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';
    el.innerHTML = icon + `<span>${message}</span>`;
    el.className = `toast ${type}`;
    el.classList.remove('hidden');
    clearTimeout(el._timeout);
    el._timeout = setTimeout(() => el.classList.add('hidden'), 3500);
  },
};

/* ================================================================
   INIT
   ================================================================ */
document.addEventListener('DOMContentLoaded', () => {

  // — LOGIN —
  const loginForm = document.getElementById('loginForm');
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    const ok = authModule.login(username, password);
    if (!ok) {
      const err = document.getElementById('loginError');
      err.classList.remove('hidden');
      document.getElementById('loginPassword').value = '';
      setTimeout(() => err.classList.add('hidden'), 4000);
    }
  });

  // Toggle password visibility (login)
  document.getElementById('toggleLoginPw').addEventListener('click', () => {
    const inp = document.getElementById('loginPassword');
    const icon = document.getElementById('eyeIconLogin');
    if (inp.type === 'password') {
      inp.type = 'text';
      icon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;
    } else {
      inp.type = 'password';
      icon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
    }
  });

  // — NAVIGATION —
  document.querySelectorAll('[data-section]').forEach(btn => {
    btn.addEventListener('click', () => uiModule.navigateTo(btn.dataset.section));
  });

  // — LOGOUT —
  document.getElementById('btnLogout').addEventListener('click', () => authModule.logout());

  // — KPI TABS —
  document.querySelectorAll('.kpi-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => kpiModule.setPeriod(btn.dataset.period));
  });

  // — CERTIFICATIONS —
  document.getElementById('certSearch').addEventListener('input', (e) => certModule.setSearch(e.target.value));
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => certModule.setFilter(btn.dataset.filter));
  });

  // — MODAL —
  document.getElementById('modalClose').addEventListener('click', () => certModule.closeModal());
  document.getElementById('modalOverlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('modalOverlay')) certModule.closeModal();
  });

  // — BANKING —
  document.getElementById('btnBankConnect').addEventListener('click', () => bankModule.toggleConnect());
  document.getElementById('btnCopyIBAN').addEventListener('click', () => bankModule.copyIBAN());

  // — PASSWORD FORM —
  document.getElementById('pwForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const cur = document.getElementById('pwCurrent').value;
    const nw  = document.getElementById('pwNew').value;
    const cf  = document.getElementById('pwConfirm').value;
    securityModule.changePassword(cur, nw, cf);
  });

  // Toggle password visibility (settings)
  document.querySelectorAll('.toggle-pw-settings').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.target;
      const inp = document.getElementById(targetId);
      inp.type = inp.type === 'password' ? 'text' : 'password';
    });
  });

  // — START —
  authModule.init();
});
