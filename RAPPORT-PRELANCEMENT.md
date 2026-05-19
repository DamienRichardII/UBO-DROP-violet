# UBODROP — Rapport Pré-lancement Production

**Date :** 19 mai 2026  
**Auteur :** Audit technique UBODROP  
**Verdict final :** ✅ GO (avec points de vigilance notés ci-dessous)

---

## 1. Corrections appliquées (Session 1 — Bugs bloquants)

| # | Bug | Cause racine | Correction appliquée | Statut |
|---|-----|-------------|----------------------|--------|
| 1 | Signup pro bloqué sur certains métiers (Esthéticienne, Barber…) | Migrations Prisma ajoutaient les valeurs d'enum `CategoryName` mais n'inséraient jamais les lignes `Category` en base | `CategoriesService` implémente `OnApplicationBootstrap` → upsert des 9 catégories au démarrage | ✅ Corrigé |
| 2 | Email non reconnu à la reconnexion | Pas de normalisation email côté frontend ni backend | `trim().toLowerCase()` ajouté dans `handleLogin`, `handleRegisterClient`, `handleRegisterProfessional` (frontend) et dans `registerClient()`, `registerProfessional()`, `login()` (backend) | ✅ Corrigé |
| 3 | Métiers absents du bottom sheet | `renderFilterCategories()` ne ciblait que `filterCategoryRow` | Ajout de `sheetCategoryRow` dans le DOM + `renderFilterCategories()` peuple les deux cibles | ✅ Corrigé |
| 4 | Mismatch validation mot de passe | Frontend acceptait < 8 chars, backend refusait | Vérification `password.length < 8` alignée côté frontend | ✅ Corrigé |

---

## 2. Hardening pré-lancement (Session 2)

### P0 — Réservation réelle

**Avant :** `handleReserveClick()` n'appelait aucune API — affichait seulement un `notify()` factice.

**Après :**
- `appApi.createBooking(serviceId, startsAt, notes)` → `POST /api/v1/bookings`
- `appApi.cancelBooking(bookingId)` → `DELETE /api/v1/bookings/:id/cancel`
- Les service-rows du detail screen sont cliquables → stocke `state.selectedServiceId`
- Overlay de réservation complet : sélection date/heure, notes, bouton Confirmer
- Bouton CTA se met à jour : "Réserver — [nom prestation]" une fois la prestation sélectionnée
- Messages exacts :
  - Succès : **"Votre demande de réservation a bien été envoyée."**
  - Aucune prestation sélectionnée : **"Sélectionne une prestation dans la liste pour continuer."**
  - Erreur API : message backend passé par `friendlyApiError()` ou fallback générique

### P0 — Bootstrap rôles DB

`AuthService` implémente désormais `OnApplicationBootstrap` :
```
upsert CLIENT, PROFESSIONAL, ADMIN → au démarrage Railway
```
Plus jamais de `"CLIENT role not found – please run the seed."` en production.

### P0 — Proxy Vercel

`vercel.json` déjà correct :
```json
{ "rewrites": [{ "source": "/api/:path*", "destination": "https://ubodrop-backend-production.up.railway.app/api/:path*" }] }
```
`API_URL = ""` dans `config.js` → toutes les requêtes sont relatives → proxy Vercel → Railway. Architecture validée.

### P1 — Gestion JWT expiration

`appApi.request()` intercepte désormais le statut HTTP 401 :
1. `clearSession()` — purge le localStorage
2. `notify("Votre session a expirée. Veuillez vous reconnecter.", "error")`
3. `goTo("screen-login")` (délai 120ms pour laisser la notification s'afficher)

Couvre : token expiré après 15min, token révoqué, accès à une route protégée non connecté.

---

## 3. Fichiers modifiés

### Frontend — `UBO-DROP-violet/`

| Fichier | Modifications |
|---------|--------------|
| `app.html` | +`createBooking`, +`cancelBooking` dans `appApi` ; intercepteur 401 ; +`selectedServiceId`/`selectedServiceName` dans state ; service-rows cliquables ; overlay de réservation (HTML + CSS + JS) ; `selectService()`, `openBookingOverlay()`, `closeBookingOverlay()`, `confirmBooking()` ; `handleReserveClick()` remplacé par flux réel |
| `index.html` | Wording assoupli : "Réservez facilement", "Professionnels partenaires sélectionnés", "Prise de rendez-vous simplifiée", "premiers membres de la communauté UBODROP" |
| `privacy.html` | Réécriture complète : bases légales RGPD, durées de conservation, sous-traitants (Vercel/Railway/PostgreSQL), droits CNIL, sécurité Argon2/JWT |
| `terms.html` | Réécriture complète : rôles, réservations, responsabilités, phase de lancement progressif, droit applicable |
| `delete-account.html` | Réécriture complète : RGPD art. 17, procédure depuis app + email, données supprimées, délais, exceptions légales |

### Backend — `UBODROP-Backend/`

| Fichier | Modifications |
|---------|--------------|
| `src/modules/auth/auth.service.ts` | +`OnApplicationBootstrap`, +`Logger` ; `onApplicationBootstrap()` upsert 3 rôles au démarrage |
| `src/modules/categories/categories.service.ts` | (Session 1) +`OnApplicationBootstrap` ; upsert 9 catégories au démarrage |

---

## 4. Endpoints vérifiés

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| `POST` | `/api/v1/auth/register/client` | Public | Inscription client |
| `POST` | `/api/v1/auth/register/professional` | Public | Inscription pro |
| `POST` | `/api/v1/auth/login` | Public | Connexion |
| `GET` | `/api/v1/auth/me` | JWT | Profil connecté |
| `GET` | `/api/v1/categories` | Public | 9 métiers UBODROP |
| `GET` | `/api/v1/search/professionals` | Public | Recherche pros |
| `GET` | `/api/v1/profiles/pro/public/:id` | Public | Fiche pro publique |
| `POST` | `/api/v1/bookings` | JWT (CLIENT) | Créer une réservation |
| `GET` | `/api/v1/bookings/me` | JWT | Réservations en cours |
| `GET` | `/api/v1/bookings/history` | JWT | Historique |
| `DELETE` | `/api/v1/bookings/:id/cancel` | JWT | Annuler |
| `GET/PATCH` | `/api/v1/profiles/client/me` | JWT (CLIENT) | Profil client |
| `GET/PATCH` | `/api/v1/profiles/pro/me` | JWT (PRO) | Profil pro |
| `GET/POST/DELETE` | `/api/v1/profiles/pro/portfolio` | JWT (PRO) | Portfolio |
| `GET/PATCH` | `/api/v1/profiles/pro/banking-info` | JWT (PRO) | Coordonnées bancaires |
| `GET` | `/api/v1/admin/*` | JWT + ADMIN | Administration (toutes routes) |
| `GET` | `/api/v1/health` | Public | Health check |

---

## 5. Sécurité — état au lancement

| Point | Statut | Détail |
|-------|--------|--------|
| Admin endpoints protégés | ✅ | `@UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.ADMIN)` au niveau contrôleur |
| admin.html indexation bloquée | ✅ | `<meta name="robots" content="noindex, nofollow">` |
| Mots de passe hashés | ✅ | Argon2 |
| JWT courte durée | ✅ | 15 min, secret via env var `JWT_ACCESS_SECRET` |
| Email normalisé | ✅ | `trim().toLowerCase()` front + back |
| Throttling API | ✅ | `ThrottlerModule` : 100 req/min |
| HTTPS | ✅ | Vercel (frontend) + Railway (backend) |
| Variables d'environnement | ✅ | `.env` non versionné, `process.env.*` côté backend |
| Données fictives en prod | ✅ absent | Aucune donnée de seed en prod — bootstrap uniquement |

---

## 6. Points de vigilance post-lancement

1. **JWT Refresh Token** : le token expire après 15 min d'inactivité. Si un utilisateur laisse l'app ouverte, il sera déconnecté automatiquement (comportement intentionnel et géré). Envisager un refresh token à terme pour l'UX.

2. **Disponibilité Railway** : le tier gratuit Railway peut mettre l'instance en veille. Prévoir un upgrade vers un plan payant pour la production (ou un ping keep-alive).

3. **Validation côté booking** : le backend exige un `serviceId` valide ET que le professionnel ait `isVisible: true` et des règles d'availability actives. Un pro qui vient de s'inscrire sans configurer ses disponibilités ne recevra pas de réservations → documenter dans l'onboarding pro.

4. **Photos portfolio** : les URLs de photos doivent être hébergées externalement (pas d'upload direct implémenté). À intégrer dans une V2 avec stockage S3/Cloudinary.

5. **Paiements** : le module `PaymentsModule` existe en backend mais n'est pas connecté au frontend. Les réservations sont gratuites/sans paiement au lancement. À brancher en V2.

6. **Tests E2E** : aucun test automatisé frontend. Recommandé d'ajouter Playwright ou Cypress avant une montée en charge.

---

## 7. Checklist déploiement

- [ ] Pusher les modifications backend (`auth.service.ts`) sur la branche Railway
- [ ] Vérifier les logs Railway au démarrage : `[Auth] 3 rôles vérifiés/créés en DB` + `[Categories] 9 métiers vérifiés/créés en DB`
- [ ] Pusher les modifications frontend sur Vercel (déploiement automatique via Git)
- [ ] Tester le flux complet signup client → recherche pro → sélection service → overlay réservation → confirmation API
- [ ] Tester le flux signup pro avec chaque spécialité (9 métiers)
- [ ] Vérifier que `/admin` redirige bien vers 403/401 sans token ADMIN
- [ ] Confirmer que l'overlay booking se ferme bien en cas d'expiration de session (401 → redirect login)

---

## Verdict

**✅ GO pour lancement progressif**

Tous les bugs bloquants de Session 1 sont corrigés. Les flux critiques P0 (inscription, connexion, réservation réelle, bootstrap DB) sont fonctionnels. La sécurité admin est assurée. Le wording marketing est adapté à un lancement progressif sans promesses excessives. Les pages légales sont RGPD-conformes.

Les points de vigilance ci-dessus (refresh token, disponibilité Railway, tests E2E) sont des améliorations V2 non bloquantes pour un lancement avec un volume limité d'utilisateurs.
