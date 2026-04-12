/* ============================================================
   UBODROP — admin.js
   Dashboard admin branché sur les vrais endpoints backend existants
   Backend réel détecté :
   - POST /api/v1/auth/login
   - GET  /api/v1/auth/me
   - GET  /api/v1/admin/professionals/pending
   - PATCH /api/v1/admin/professionals/:id/verify
   - PATCH /api/v1/admin/professionals/:id/visibility
   - GET  /api/v1/admin/bookings
   - GET  /api/v1/admin/audit-logs
   ============================================================ */

'use strict';

const ADMIN_SESSION_KEY = 'ubo_admin_session';

const adminState = {
  isLoggedIn: false,
  adminUsername: '',
  adminEmail: '',
  currentSection: 'kpi',
  kpiPeriod: 'day',
  certFilter: 'all',
  certSearch: '',
  bankConnected: false,
  token: '',
  me: null,
  professionalsPending: [],
  bookings: [],
  auditLogs: [],
};

const api = {
  getSession() {
    try {
      return JSON.parse(sessionStorage.getItem(ADMIN_SESSION_KEY) || 'null');
    } catch (_) {
      return null;
    }
  },

  saveSession(session) {
    sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
  },

  clearSession() {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
  },

  getToken() {
    return adminState.token || this.getSession()?.token || '';
  },

  getHeaders(extra = {}) {
    const token = this.getToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...extra,
    };
  },

  async request(path, options = {}) {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: this.getHeaders(options.headers || {}),
    });

    let data = null;
    const contentType = response.headers.get('content-type') || '';

    try {
      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        data = text ? { message: text } : null;
      }
    } catch (_) {
      data = null;
    }

    if (!response.ok) {
      const message = Array.isArray(data?.message)
        ? data.message.join(' | ')
        : data?.message || `Erreur API (${response.status})`;

      const error = new Error(message);
      error.status = response.status;
      error.payload = data;
      throw error;
    }

    return data;
  },

  async login(email, password) {
    return this.request('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  async me() {
    return this.request('/api/v1/auth/me', { method: 'GET' });
  },

  async getPendingProfessionals() {
    return this.request('/api/v1/admin/professionals/pending', { method: 'GET' });
  },

  async verifyProfessional(id) {
    const payloads = [
      { verified: true },
      { isVerified: true },
      { status: 'verified' },
      {},
    ];

    let lastError = null;
    for (const payload of payloads) {
      try {
        return await this.request(`/api/v1/admin/professionals/${id}/verify`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error('Impossible de vérifier le professionnel.');
  },

  async hideProfessional(id) {
    const payloads = [
      { visible: false },
      { isVisible: false },
      { status: 'hidden' },
      {},
    ];

    let lastError = null;
    for (const payload of payloads) {
      try {
        return await this.request(`/api/v1/admin/professionals/${id}/visibility`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error('Impossible de masquer le professionnel.');
  },

  async getBookings() {
    return this.request('/api/v1/admin/bookings', { method: 'GET' });
  },

  async getAuditLogs() {
    return this.request('/api/v1/admin/audit-logs', { method: 'GET' });
  },
};

const helpers = {
  normalizeCollection(data) {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.items)) return data.items;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.results)) return data.results;
    if (Array.isArray(data?.rows)) return data.rows;
    return [];
  },

  extractToken(data) {
    return (
      data?.accessToken ||
      data?.token ||
      data?.data?.accessToken ||
      data?.data?.token ||
      data?.tokens?.accessToken ||
      data?.tokens?.token ||
      ''
    );
  },

  extractRole(me) {
    if (typeof me?.role === 'string') return me.role;
    if (typeof me?.user?.role === 'string') return me.user.role;
    if (Array.isArray(me?.roles) && me.roles.length) return me.roles[0];
    if (Array.isArray(me?.user?.roles) && me.user.roles.length) return me.user.roles[0];
    return '';
  },

  isAdmin(me) {
    const role = this.extractRole(me);
    if (typeof me?.isAdmin === 'boolean') return me.isAdmin;
    if (typeof me?.user?.isAdmin === 'boolean') return me.user.isAdmin;
    return ['ADMIN', 'SUPER_ADMIN', 'admin', 'super_admin'].includes(role);
  },

  getDisplayName(me) {
    return (
      me?.fullName ||
      me?.name ||
      me?.username ||
      me?.email ||
      me?.user?.fullName ||
      me?.user?.name ||
      me?.user?.username ||
      me?.user?.email ||
      'Administrateur'
    );
  },

  getDisplayEmail(me) {
    return me?.email || me?.user?.email || '';
  },

  getProName(item) {
    return (
      item?.fullName ||
      item?.name ||
      [item?.firstName, item?.lastName].filter(Boolean).join(' ').trim() ||
      item?.email ||
      'Professionnel'
    );
  },

  getProSpecialty(item) {
    return (
      item?.specialty ||
      item?.profession ||
      item?.categoryName ||
      item?.serviceCategory ||
      item?.jobTitle ||
      'Spécialité non renseignée'
    );
  },

  getProCity(item) {
    return (
      item?.city ||
      item?.addressCity ||
      item?.locationCity ||
      item?.address?.city ||
      'Ville non renseignée'
    );
  },

  formatDate(value) {
    if (!value) return 'Date non renseignée';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  },

  initials(name) {
    return String(name)
      .split(' ')
      .filter(Boolean)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  },
};

const authModule = {
  async init() {
    const saved = api.getSession();

    if (saved?.token) {
      adminState.token = saved.token;

      try {
        const me = await api.me();

        if (!helpers.isAdmin(me)) {
          this.logout(false);
          uiModule.showLogin();
          return;
        }

        adminState.isLoggedIn = true;
        adminState.me = me;
        adminState.adminUsername = helpers.getDisplayName(me);
        adminState.adminEmail = helpers.getDisplayEmail(me);
        await uiModule.showDashboard();
        return;
      } catch (_) {
        this.logout(false);
      }
    }

    uiModule.showLogin();
  },

  async login(email, password) {
    try {
      const loginData = await api.login(email, password);
      const token = helpers.extractToken(loginData);

      if (!token) {
        throw new Error('Aucun token reçu depuis le backend.');
      }

      adminState.token = token;

      const me = await api.me();

      if (!helpers.isAdmin(me)) {
        throw new Error("Ce compte n'a pas les droits administrateur.");
      }

      adminState.isLoggedIn = true;
      adminState.me = me;
      adminState.adminUsername = helpers.getDisplayName(me);
      adminState.adminEmail = helpers.getDisplayEmail(me);

      api.saveSession({
        token,
        username: adminState.adminUsername,
        email: adminState.adminEmail,
      });

      await uiModule.showDashboard();
      return true;
    } catch (error) {
      console.error('Erreur login admin :', error);
      uiModule.showInlineLoginError(error.message || 'Connexion impossible.');
      return false;
    }
  },

  logout(showLogin = true) {
    adminState.isLoggedIn = false;
    adminState.adminUsername = '';
    adminState.adminEmail = '';
    adminState.token = '';
    adminState.me = null;
    adminState.professionalsPending = [];
    adminState.bookings = [];
    adminState.auditLogs = [];
    api.clearSession();
    if (showLogin) uiModule.showLogin();
  },
};

const kpiModule = {
  async load() {
    try {
      const [prosRes, bookingsRes, auditRes] = await Promise.all([
        api.getPendingProfessionals(),
        api.getBookings(),
        api.getAuditLogs(),
      ]);

      adminState.professionalsPending = helpers.normalizeCollection(prosRes);
      adminState.bookings = helpers.normalizeCollection(bookingsRes);
      adminState.auditLogs = helpers.normalizeCollection(auditRes);
    } catch (error) {
      console.error('Erreur chargement KPI admin :', error);
      uiModule.toast(error.message || 'Impossible de charger les données admin.', 'error');
    }
  },

  render() {
    const pendingPros = adminState.professionalsPending.length;
    const bookings = adminState.bookings.length;
    const auditLogs = adminState.auditLogs.length;

    const bookingStatuses = adminState.bookings.reduce((acc, booking) => {
      const key = String(booking?.status || 'unknown').toLowerCase();
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const completedBookings =
      bookingStatuses.completed ||
      bookingStatuses.done ||
      bookingStatuses.confirmed ||
      0;

    const pendingBookings =
      bookingStatuses.pending ||
      bookingStatuses.created ||
      0;

    const uniqueClients = new Set(
      adminState.bookings
        .map((booking) =>
          booking?.clientId ||
          booking?.client?.id ||
          booking?.userId ||
          booking?.user?.id ||
          null
        )
        .filter(Boolean)
    ).size;

    const setText = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    };

    setText('kpiUsersOnline', String(pendingPros));
    setText('kpiProsOnline', String(bookings));
    setText('kpiUsersTotal', uniqueClients.toLocaleString('fr-FR'));
    setText('kpiProsTotal', auditLogs.toLocaleString('fr-FR'));
    setText('kpiOrders', bookings.toLocaleString('fr-FR'));
    setText('kpiRevenue', String(completedBookings));
    setText('kpiCA', String(pendingBookings));

    this._setTrend('kpiOrdersTrend', {
      up: true,
      trend: 'Bookings',
    });
    this._setTrend('kpiRevenueTrend', {
      up: true,
      trend: 'Terminées',
    });
    this._setTrend('kpiCATrend', {
      up: false,
      trend: 'En attente',
    });

    const periodLabels = {
      day: 'Vue admin',
      week: 'Vue admin',
      month: 'Vue admin',
    };

    document.querySelectorAll('.kpi-period-label').forEach((el) => {
      el.textContent = periodLabels[adminState.kpiPeriod] || 'Vue admin';
    });
  },

  _setTrend(id, data) {
    const el = document.getElementById(id);
    if (!el) return;

    el.className = `kpi-trend ${data.up ? 'up' : 'down'}`;
    el.innerHTML = `${data.up
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="18 15 12 9 6 15"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>'
    } ${data.trend}`;
  },

  async setPeriod(period) {
    adminState.kpiPeriod = period;
    document.querySelectorAll('.kpi-tab-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.period === period);
    });
    await this.load();
    this.render();
  },
};

const certModule = {
  async init() {
    try {
      const data = await api.getPendingProfessionals();
      adminState.professionalsPending = helpers.normalizeCollection(data);
    } catch (error) {
      console.error('Erreur chargement professionnels en attente :', error);
      uiModule.toast(error.message || 'Impossible de charger les professionnels.', 'error');
    }
    this.renderList();
  },

  renderList() {
    const list = document.getElementById('certList');
    if (!list) return;

    const search = adminState.certSearch.toLowerCase();
    const filter = adminState.certFilter;

    const items = adminState.professionalsPending.filter((item) => {
      const name = helpers.getProName(item).toLowerCase();
      const specialty = helpers.getProSpecialty(item).toLowerCase();
      const city = helpers.getProCity(item).toLowerCase();

      const status = item?.status
        ? String(item.status).toLowerCase()
        : 'pending';

      const matchesFilter = filter === 'all' || status === filter || (filter === 'pending' && !item?.status);
      const matchesSearch =
        !search ||
        name.includes(search) ||
        specialty.includes(search) ||
        city.includes(search);

      return matchesFilter && matchesSearch;
    });

    if (items.length === 0) {
      list.innerHTML = '<div class="cert-empty">Aucun professionnel en attente trouvé.</div>';
      return;
    }

    list.innerHTML = items
      .map((item, index) => {
        const id = item?.id ?? item?.professionalId ?? item?.userId;
        const name = helpers.getProName(item);
        const specialty = helpers.getProSpecialty(item);
        const city = helpers.getProCity(item);
        const date = helpers.formatDate(item?.createdAt || item?.submittedAt || item?.updatedAt);
        const status = String(item?.status || 'pending').toLowerCase();

        return `
          <div class="cert-card" style="animation-delay:${index * 0.04}s" data-id="${id}">
            <div class="cert-avatar">${helpers.initials(name)}</div>
            <div class="cert-info">
              <div class="cert-name">${name}</div>
              <div class="cert-meta">${specialty} · ${city}</div>
            </div>
            <div class="cert-date">${date}</div>
            <span class="cert-status ${status}">${this._statusLabel(status)}</span>
            <div class="cert-actions">
              <button class="btn-action see" onclick="certModule.openDetail('${id}')">Voir</button>
              <button class="btn-action approve" onclick="certModule.approve('${id}')">Valider</button>
              <button class="btn-action refuse" onclick="certModule.refuse('${id}')">Masquer</button>
            </div>
          </div>
        `;
      })
      .join('');
  },

  _statusLabel(status) {
    return (
      {
        pending: 'En attente',
        approved: 'Validé',
        verified: 'Vérifié',
        refused: 'Refusé',
        hidden: 'Masqué',
      }[status] || 'En attente'
    );
  },

  _findById(id) {
    return adminState.professionalsPending.find((item) => String(item?.id ?? item?.professionalId ?? item?.userId) === String(id));
  },

  async approve(id) {
    try {
      await api.verifyProfessional(id);
      adminState.professionalsPending = adminState.professionalsPending.filter(
        (item) => String(item?.id ?? item?.professionalId ?? item?.userId) !== String(id)
      );
      this.renderList();
      await kpiModule.load();
      kpiModule.render();
      uiModule.toast('Professionnel validé avec succès.', 'success');
      this.closeModal();
    } catch (error) {
      console.error('Erreur validation professionnel :', error);
      uiModule.toast(error.message || 'Impossible de valider ce professionnel.', 'error');
    }
  },

  async refuse(id) {
    try {
      await api.hideProfessional(id);
      adminState.professionalsPending = adminState.professionalsPending.filter(
        (item) => String(item?.id ?? item?.professionalId ?? item?.userId) !== String(id)
      );
      this.renderList();
      await kpiModule.load();
      kpiModule.render();
      uiModule.toast('Professionnel masqué avec succès.', 'success');
      this.closeModal();
    } catch (error) {
      console.error('Erreur masquage professionnel :', error);
      uiModule.toast(error.message || 'Impossible de masquer ce professionnel.', 'error');
    }
  },

  openDetail(id) {
    const item = this._findById(id);
    if (!item) return;

    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    const overlay = document.getElementById('modalOverlay');

    if (!modalTitle || !modalBody || !overlay) return;

    const name = helpers.getProName(item);
    const specialty = helpers.getProSpecialty(item);
    const city = helpers.getProCity(item);
    const date = helpers.formatDate(item?.createdAt || item?.submittedAt || item?.updatedAt);
    const email = item?.email || item?.user?.email || 'Non renseigné';
    const phone = item?.phone || item?.user?.phone || 'Non renseigné';
    const role = item?.role || item?.user?.role || 'professional';
    const status = String(item?.status || 'pending').toLowerCase();

    modalTitle.textContent = name;
    modalBody.innerHTML = `
      <div class="modal-detail-row"><span class="modal-detail-label">Spécialité</span><span class="modal-detail-value">${specialty}</span></div>
      <div class="modal-detail-row"><span class="modal-detail-label">Ville</span><span class="modal-detail-value">${city}</span></div>
      <div class="modal-detail-row"><span class="modal-detail-label">Email</span><span class="modal-detail-value">${email}</span></div>
      <div class="modal-detail-row"><span class="modal-detail-label">Téléphone</span><span class="modal-detail-value">${phone}</span></div>
      <div class="modal-detail-row"><span class="modal-detail-label">Rôle</span><span class="modal-detail-value">${role}</span></div>
      <div class="modal-detail-row"><span class="modal-detail-label">Demande le</span><span class="modal-detail-value">${date}</span></div>
      <div class="modal-detail-row"><span class="modal-detail-label">Statut</span><span class="modal-detail-value"><span class="cert-status ${status}">${this._statusLabel(status)}</span></span></div>
    `;

    overlay.classList.remove('hidden');
  },

  closeModal() {
    const overlay = document.getElementById('modalOverlay');
    if (overlay) overlay.classList.add('hidden');
  },

  setFilter(filter) {
    adminState.certFilter = filter;
    document.querySelectorAll('.filter-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.filter === filter);
    });
    this.renderList();
  },

  setSearch(value) {
    adminState.certSearch = value;
    this.renderList();
  },
};

const bankModule = {
  render() {
    const ibanEl = document.getElementById('bankIBAN');
    const holderEl = document.getElementById('bankHolder');
    const lastUpdateEl = document.getElementById('bankLastUpdate');
    const statusEl = document.getElementById('bankStatus');
    const btnEl = document.getElementById('btnBankConnect');

    if (ibanEl) ibanEl.textContent = 'Non disponible';
    if (holderEl) holderEl.textContent = 'Aucun endpoint banking exposé côté backend';
    if (lastUpdateEl) lastUpdateEl.textContent = 'Le backend actuel ne fournit pas de module bancaire admin.';
    if (statusEl) {
      statusEl.className = 'bank-status-badge disconnected';
      statusEl.innerHTML = '<span class="bank-status-dot"></span> Non exposé';
    }
    if (btnEl) btnEl.textContent = 'Module non disponible';
  },

  toggleConnect() {
    uiModule.toast("Le backend actuel ne propose pas encore de route admin banking.", 'error');
  },

  copyIBAN() {
    uiModule.toast("Aucun IBAN disponible via l'API actuelle.", 'error');
  },
};

const securityModule = {
  changePassword() {
    const msgEl = document.getElementById('pwMsg');
    if (!msgEl) return false;

    msgEl.className = 'settings-msg error';
    msgEl.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> Le backend actuel ne propose pas encore de route admin pour changer le mot de passe.';
    msgEl.classList.remove('hidden');
    return false;
  },
};

const uiModule = {
  showLogin() {
    document.getElementById('loginScreen')?.classList.remove('hidden');
    document.getElementById('dashboard')?.classList.add('hidden');
  },

  async showDashboard() {
    document.getElementById('loginScreen')?.classList.add('hidden');
    document.getElementById('dashboard')?.classList.remove('hidden');

    const topbarAdminName = document.getElementById('topbarAdminName');
    if (topbarAdminName) {
      topbarAdminName.textContent = adminState.adminUsername || adminState.adminEmail || 'Administrateur';
    }

    this.navigateTo('kpi');

    await kpiModule.load();
    kpiModule.render();
    await certModule.init();
    bankModule.render();
  },

  navigateTo(section) {
    adminState.currentSection = section;

    document.querySelectorAll('.admin-section').forEach((el) => {
      el.classList.toggle('active', el.id === `section-${section}`);
    });

    document.querySelectorAll('.sidenav-item, .mobile-nav-item').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.section === section);
    });
  },

  showInlineLoginError(message) {
    const err = document.getElementById('loginError');
    if (!err) return;
    err.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      ${message}
    `;
    err.classList.remove('hidden');
  },

  hideInlineLoginError() {
    const err = document.getElementById('loginError');
    if (err) err.classList.add('hidden');
  },

  toast(message, type = 'success') {
    const el = document.getElementById('toast');
    if (!el) return;

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

document.addEventListener('DOMContentLoaded', async () => {
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      uiModule.hideInlineLoginError();

      const email = document.getElementById('loginUsername')?.value.trim() || '';
      const password = document.getElementById('loginPassword')?.value || '';

      const ok = await authModule.login(email, password);

      if (!ok) {
        const passwordEl = document.getElementById('loginPassword');
        if (passwordEl) passwordEl.value = '';
      }
    });
  }

  document.getElementById('toggleLoginPw')?.addEventListener('click', () => {
    const inp = document.getElementById('loginPassword');
    const icon = document.getElementById('eyeIconLogin');
    if (!inp || !icon) return;

    if (inp.type === 'password') {
      inp.type = 'text';
      icon.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';
    } else {
      inp.type = 'password';
      icon.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
    }
  });

  document.querySelectorAll('[data-section]').forEach((btn) => {
    btn.addEventListener('click', () => uiModule.navigateTo(btn.dataset.section));
  });

  document.getElementById('btnLogout')?.addEventListener('click', () => authModule.logout());

  document.querySelectorAll('.kpi-tab-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await kpiModule.setPeriod(btn.dataset.period);
    });
  });

  document.getElementById('certSearch')?.addEventListener('input', (e) => {
    certModule.setSearch(e.target.value);
  });

  document.querySelectorAll('.filter-btn').forEach((btn) => {
    btn.addEventListener('click', () => certModule.setFilter(btn.dataset.filter));
  });

  document.getElementById('modalClose')?.addEventListener('click', () => certModule.closeModal());

  document.getElementById('modalOverlay')?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('modalOverlay')) certModule.closeModal();
  });

  document.getElementById('btnBankConnect')?.addEventListener('click', () => bankModule.toggleConnect());
  document.getElementById('btnCopyIBAN')?.addEventListener('click', () => bankModule.copyIBAN());

  document.getElementById('pwForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    securityModule.changePassword();
  });

  document.querySelectorAll('.toggle-pw-settings').forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.target;
      const inp = document.getElementById(targetId);
      if (!inp) return;
      inp.type = inp.type === 'password' ? 'text' : 'password';
    });
  });

  await authModule.init();
});

window.certModule = certModule;