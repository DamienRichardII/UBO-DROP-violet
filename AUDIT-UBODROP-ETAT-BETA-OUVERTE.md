# AUDIT UBODROP — ÉTAT BÊTA OUVERTE
**Date :** 28 mai 2026  
**Version auditée :** commit `ee3f228` (backend) / commit `c6688a4` (frontend)  
**Auditeur :** Claude (session 12)  
**Périmètre :** Frontend complet (app.html 3826 lignes), Backend NestJS complet (tous modules), Production Railway live

---

## VERDICT GLOBAL

```
╔══════════════════════════════════════════════════════╗
║                                                      ║
║   🟡  GO — BÊTA PRIVÉE (cercle fermé, ~20 testeurs)  ║
║                                                      ║
║   🔴  NO-GO — BÊTA OUVERTE (grand public)            ║
║                                                      ║
╚══════════════════════════════════════════════════════╝
```

**Le verdict est basé sur les tests effectués et le code source lu — pas sur les intentions.**

Le socle technique est solide (auth, profils, recherche, maps) mais le **parcours de réservation est actuellement impossible** pour n'importe quel utilisateur réel, en raison de deux blocages structurels dans la logique métier. Ces blocages sont corrigibles en 1 à 2 jours.

---

## RÉSUMÉ EXÉCUTIF

| Zone | État |
|------|------|
| Infrastructure Railway | ✅ Live, temps de réponse correct |
| Proxy Vercel → Railway | ✅ Fonctionnel |
| Authentification (register/login/JWT) | ✅ Opérationnel |
| Mot de passe oublié / reset | ⚠️ Implémenté, email bloqué sans RESEND_API_KEY |
| Recherche et affichage des pros | ✅ 17 pros visibles |
| Fiche pro publique | ✅ Fonctionnel |
| Dashboard pro (profil, avatar, portfolio) | ✅ Fonctionnel |
| Réservation client | 🔴 Impossible (voir P0-1 et P0-2) |
| Affichage des réservations | ⚠️ Champ date incorrect |
| Toggle En ligne / Hors ligne | ⚠️ Cosmétique uniquement, non persisté |
| Sécurité (IBAN, passwords, tokens) | ✅ Correcte |

---

## BLOCANTS P0 — Empêchent la bêta ouverte

### P0-1 · Réservation impossible — Services en statut DRAFT

**Fichiers :** `services.service.ts` ligne 38, `bookings.service.ts` ligne 184

Quand un professionnel crée une prestation depuis son dashboard, elle est enregistrée avec `status: ServiceStatus.DRAFT` par défaut. La logique de réservation côté backend vérifie explicitement :

```typescript
if (service.status !== 'ACTIVE') {
  throw new BadRequestException('Service is not active');
}
```

Côté frontend (`app.html` ligne 2393), si le pro n'a aucun service ACTIVE, le bouton "Réserver" est désactivé et affiché "Profil en cours de configuration" :

```javascript
} else if (!hasServices) {
  ctaEl.textContent = "Profil en cours de configuration";
  ctaEl.disabled = true;
}
```

**Impact :** 100% des réservations échouent pour tous les pros actuels (aucun service ACTIVE en dehors du seed).

**Correction requise :** Ajouter un bouton "Publier" / "Activer" dans le tab Prestations du dashboard pro, qui envoie `PATCH /services/:id` avec `{ status: "ACTIVE" }`. La route backend existe déjà (`update()` dans `services.service.ts`).

---

### P0-2 · Réservation impossible — Absence de règles de disponibilité

**Fichier :** `bookings.service.ts` lignes 87-132

Même si un service est ACTIVE, le booking vérifie qu'il existe une `AvailabilityRule` correspondant exactement au créneau choisi :

```typescript
const matchingRule = await tx.availabilityRule.findFirst({
  where: { proProfileId, weekday, isActive: true,
    startTime: { lte: startTime },
    endTime: { gte: endTime }
  },
});
if (!matchingRule) {
  throw new BadRequestException('Selected slot is outside professional availability');
}
```

Aucun professionnel n'a de règles de disponibilité configurées. Aucun UI n'existe dans le dashboard pro pour les définir.

**Impact :** Même si P0-1 est corrigé, la réservation échoue systématiquement.

**Correction requise (deux options) :**
- Option A (rapide, bêta) : Rendre `validateAvailability` optionnelle — si aucune règle n'existe pour le pro, laisser passer. Remplacer l'erreur par un simple `return` si `!matchingRule`.
- Option B (correcte) : Implémenter un UI de configuration des plages horaires dans le dashboard pro.

---

### P0-3 · Commits session 11 non poussés (RESEND + retrait Google)

**Impact :** En production sur Railway, le code déployé est toujours l'ancienne version. Le bouton Google est toujours présent sur le site live. Le mot de passe oublié n'est pas encore déployé.

**Action requise :** `git push origin main` depuis `UBODROP-Backend` ET depuis `UBO-DROP-violet`.

---

## BLOQUANTS P1 — Dégradent significativement l'expérience

### P1-1 · Toggle "En ligne / Hors ligne" non persisté

**Fichier :** `app.html` ligne 3204

```javascript
function toggleProOnlineStatus() {
  state.proOnline = !state.proOnline;
  renderProDashboard();  // ← re-render seulement
  // ← appApi.updateAvailability() ABSENT
}
```

`appApi.updateAvailability(isOnline)` est défini (ligne 1718) mais n'est jamais appelé depuis le toggle. Le statut "En ligne / Hors ligne" est purement cosmétique et se perd au rechargement.

**Correction :** Ajouter `await appApi.updateAvailability(state.proOnline)` dans `toggleProOnlineStatus()`.

---

### P1-2 · Affichage des réservations — champ date incorrect

**Fichier :** `app.html` ligne 2452

```javascript
${booking?.scheduledAt ? new Date(booking.scheduledAt).toLocaleString("fr-FR") : "Date à confirmer"}
```

Le backend (`bookings.service.ts`) retourne `startsAt`, pas `scheduledAt`. Toutes les réservations affichent "Date à confirmer".

**Correction :** Remplacer `booking.scheduledAt` par `booking.startsAt` (et `booking.startsAt || booking.scheduledAt` pour la compatibilité dans `renderProDashboard`).

---

### P1-3 · Filtre "Budget" retourne systématiquement 0 résultats

**Fichier :** `search.service.ts`

Le filtre `maxPrice` requiert des services ACTIVE : `services.some({ status: ACTIVE, price: lte })`. Aucun pro (sauf seed) n'ayant de service ACTIVE, le filtre budget retourne toujours 0 résultats. Lié au P0-1.

**Note :** Ce P1 se résout automatiquement quand les pros activent leurs services (P0-1).

---

### P1-4 · RESEND_API_KEY non configurée sur Railway

Le flow "mot de passe oublié" est implémenté et sécurisé, mais l'email ne sera envoyé qu'une fois `RESEND_API_KEY` ajoutée dans les variables d'environnement Railway. L'erreur est silencieuse (le backend retourne le message générique sans bloquer).

**Action requise :**
- Railway → Variables : `RESEND_API_KEY=re_xxxx`
- (Optionnel) `RESEND_FROM_EMAIL=UBODROP <no-reply@ubodrop.com>`
- Vérifier le domaine `ubodrop.com` dans le dashboard Resend (DNS MX/SPF/DKIM)

---

### P1-5 · JWT expire en 15 min — aucun refresh token

**Fichier :** `auth.service.ts` ligne 125

```typescript
expiresIn: '15m',
```

Après 15 minutes, le frontend détecte le 401 et redirige vers le login (géré proprement). Mais un bêta-testeur qui reste inactif 15 min est déconnecté sans avertissement jusqu'au prochain appel API.

Le frontend gère l'expiration correctement (ligne 1581-1584 de app.html) mais sans refresh token automatique.

**Pour la bêta :** Acceptable si les testeurs sont briefés. Pour la prod, implémenter un refresh token.

---

### P1-6 · `renderBookings()` lit `booking.professional` (inexistant)

**Fichier :** `app.html` ligne 2452

```javascript
booking?.professional?.displayName || booking?.professional?.name || "Prestataire"
```

Le backend retourne `booking.proProfile.displayName`, pas `booking.professional.displayName`. Le nom du pro affiche toujours "Prestataire".

**Correction :** Remplacer `booking?.professional?.displayName` par `booking?.proProfile?.displayName`.

---

## POINTS JAUNES P2 — Mineurs / Cosmétiques

### P2-1 · Méthode `loginWithGoogle` orpheline dans auth.service.ts

La méthode `loginWithGoogle()` existe dans `auth.service.ts` (lignes 340-408) mais n'est plus exposée par le controller (routes Google supprimées en session 11). C'est du code mort. Pas bloquant mais à supprimer pour nettoyer.

### P2-2 · Google Maps API Key exposée dans config.js

`AIzaSyCi2PRoLRAG7yV7-lUw2aA6lVknfhsXJB8` est en clair dans `assets/js/config.js`. La clé doit être restreinte dans la [Google Cloud Console](https://console.cloud.google.com) aux domaines autorisés (`ubodrop.com`, `www.ubodrop.com`) et aux APIs Maps JS / Geocoding uniquement.

### P2-3 · Fautes de frappe dans les messages JS (handleResetPassword)

Ligne 3008 et 3013 de app.html :
- "Le mot de passe doit contenir au moins 8 **caracteres**." (sans accent)
- "Mise **a** jour..." (sans accent)

Cosmétique, ne bloque pas le flux.

### P2-4 · Fallback catégorie forcé sur COIFFEUSE

`categoryKeyFromText()` retourne `"COIFFEUSE"` pour toute catégorie non reconnue. Un pro avec un métier mal orthographié sera classé "Coiffeuse" par défaut. À surveiller.

### P2-5 · Pas de CGU / Mentions légales / Politique de confidentialité

Absence de pages légales obligatoires avant tout lancement public (même bêta ouverte). À ajouter avant la bêta ouverte.

### P2-6 · Pas de mécanisme de report / signalement

Aucun bouton "Signaler ce profil" sur la fiche pro. Recommandé pour une bêta ouverte.

---

## CE QUI FONCTIONNE ✅

Cette section liste les fonctionnalités testées ou vérifiées par lecture de code qui fonctionnent correctement.

**Infrastructure**
- Railway backend live : `GET /api/v1/health` → `{"status":"ok"}` ✅
- Proxy Vercel : `API_URL=""` + vercel.json `/api/:path*` + globalPrefix `api/v1` → chaîne complète cohérente ✅
- CORS : autorise `ubodrop.com`, `www.ubodrop.com`, `localhost:3000`, `localhost:5173` ✅
- Helmet (headers sécurité HTTP) ✅
- ValidationPipe strict (`whitelist:true`, `forbidNonWhitelisted:true`) ✅

**Base de données**
- 17 professionnels en base, tous `isVisible:true`, `isOnline:true` ✅
- 9 catégories correctement seedées (BARBER, MICRO_PIGMENTATION, TATOUEUR, HENNE, ESTHETICIENNE, MAQUILLAGE, COIFFEUSE, MASSAGE, MANUCURE) ✅
- Bootstrap `onApplicationBootstrap()` : upsert des 3 rôles + patch des pros avec `isVisible/isOnline=false` ✅

**Authentification**
- Inscription client (argon2, emailVerifiedAt immédiat, JWT) ✅
- Inscription pro (isVisible=true, isOnline=true par défaut, multi-spécialités) ✅
- Login (argon2.verify, JWT 15min, roles) ✅
- Expiration de session gérée côté frontend (clearSession + redirect login) ✅
- Auth guard frontend sur tous les écrans privés (rdv, favs, account, pro-dashboard, messages, chat) ✅
- `GET /auth/me` sans token → 401 ✅

**Sécurité des données**
- `passwordHash` jamais exposé dans les endpoints publics ou `/profiles/me` ✅
- IBAN masqué dans `maskIban()` : `FR76 **** **** 1234` ✅
- Tokens de réinitialisation stockés uniquement en SHA-256 (jamais en clair) ✅
- Token plain envoyé uniquement dans l'email (lien hash) ✅

**Recherche**
- `GET /search/professionals` → 17 résultats, tous visibles ✅
- Filtre catégorie (ex: BARBER) → 5 résultats ✅
- Filtre mode (HOME/PRO_PLACE/SALON) ✅
- Haversine post-filter pour la géolocalisation ✅
- Pros sans services inclus dans la recherche (pas de service-filter bloquant) ✅

**Fiche pro et profil**
- `GET /profiles/pro/public/:id` → retourne avatarUrl, instagram, latitude, longitude ✅
- Fiche pro côté client : affichage nom, bio, distance, services ✅
- Dashboard pro : pré-remplissage du formulaire profil ✅
- Upload avatar (compression canvas, base64, PATCH) ✅
- Portfolio photos (upload, affichage grille, suppression) ✅
- Géocodage adresse → lat/lng via Google Maps API ✅

**Mot de passe oublié / reset (code vérifié)**
- Endpoint `POST /auth/forgot-password` → réponse générique (ne divulgue pas l'existence de l'email) ✅
- Token `crypto.randomBytes(32)`, hash SHA-256 en DB ✅
- Expiry 1h ✅
- `POST /auth/reset-password` : valide hash + expiry + usedAt ✅
- Frontend : détection `#reset-token=` dans l'URL hash, écran reset ✅
- Frontend : validation mot de passe (min 8 chars, confirmation) ✅

---

## TESTS DE PRODUCTION EFFECTUÉS

> Note : Les appels directs au backend Railway depuis le sandbox d'audit ont échoué (code 56 — restriction réseau du sandbox). Les tests suivants ont été réalisés via WebFetch sur les sessions précédentes (session 12 début) et les réponses sont documentées à titre de référence.

| Endpoint | Résultat connu |
|----------|---------------|
| `GET /api/v1/health` | `{"status":"ok"}` ✅ |
| `GET /api/v1/categories` | 9 catégories ✅ |
| `GET /api/v1/search/professionals` | 17 pros, tous `isVisible:true` ✅ |
| `GET /api/v1/search/professionals?category=BARBER` | 5 résultats ✅ |
| `GET /api/v1/profiles/pro/public/:id` | Retourne les champs requis, pas de données sensibles ✅ |
| `GET /api/v1/auth/me` (sans token) | 401 Unauthorized ✅ |
| `POST /api/v1/auth/forgot-password` | non vérifié en prod (commits non poussés) |
| `POST /api/v1/auth/reset-password` | non vérifié en prod |

---

## PLAN D'ACTION POUR ATTEINDRE GO BÊTA OUVERTE

**Priorité absolue — à faire avant tout lancement :**

| # | Action | Effort | Fichier |
|---|--------|--------|---------|
| 1 | `git push` frontend + backend (session 11) | 5 min | `git push origin main` |
| 2 | Ajouter `RESEND_API_KEY` sur Railway | 2 min | Railway → Variables |
| 3 | Ajouter bouton "Publier" dans UI prestations (DRAFT → ACTIVE) | 2h | `app.html` + route existante |
| 4 | Désactiver validation disponibilité si aucune règle (Option A) | 30 min | `bookings.service.ts` |
| 5 | Fixer `toggleProOnlineStatus` → appeler `appApi.updateAvailability()` | 10 min | `app.html` |
| 6 | Fixer `renderBookings` : `startsAt` au lieu de `scheduledAt` | 5 min | `app.html` |
| 7 | Fixer `renderBookings` : `proProfile.displayName` au lieu de `professional.displayName` | 5 min | `app.html` |

**Avant bêta ouverte au grand public :**

| # | Action | Effort |
|---|--------|--------|
| 8 | Restreindre Google Maps API Key (domaines + APIs) | 10 min |
| 9 | Rédiger CGU / Mentions légales / Politique de confidentialité | 1-2 jours |
| 10 | Implémenter refresh token (JWT longue durée ou RT) | 1 jour |
| 11 | Supprimer `loginWithGoogle()` orphelin de auth.service.ts | 5 min |
| 12 | Bouton "Signaler" sur fiche pro | 1h |

---

## ANNEXE — ARCHITECTURE TECHNIQUE VALIDÉE

```
[Navigateur / Mobile]
        │
        │ HTTPS
        ▼
[Vercel — www.ubodrop.com]
  app.html (SPA vanilla JS)
  assets/js/config.js (API_URL="")
  vercel.json : /api/* → Railway
        │
        │ HTTPS Proxy (/api/v1/...)
        ▼
[Railway — ubodrop-backend-production.up.railway.app]
  NestJS + globalPrefix("api/v1")
  Helmet + CORS + ValidationPipe
        │
        │ Prisma ORM
        ▼
[PostgreSQL Railway]
  17 proProfiles, 9 categories, 3 roles
  PasswordResetToken (SHA-256)
```

**Dépendances externes :**
- Resend.com (email reset mot de passe) — ⚠️ clé non configurée en prod
- Google Maps JS API (carte, géocodage) — ✅ fonctionnel, clé à restreindre
- Argon2 (hash passwords) — ✅
- JWT (auth) — ✅

---

*Rapport généré automatiquement le 28/05/2026 — Ne pas modifier le code source sans demande explicite.*
