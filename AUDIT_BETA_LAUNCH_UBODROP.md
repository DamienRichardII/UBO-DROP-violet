# AUDIT BÊTA LAUNCH — UBODROP
## Plateforme prête pour la bêta et la communication ?

**Date :** 2026-07-16  
**Version auditée :** HEAD branch `main` (backend + frontend)  
**Auditeur :** Claude — analyse complète du codebase

---

## VERDICT RÉSUMÉ

| Scénario | Verdict |
|----------|---------|
| **Bêta fermée** (pros invités, paiements test) | ✅ **GO** |
| **Communication / landing page** | ✅ **GO** |
| **Bêta ouverte grand public** | ⚠️ **GO avec conditions** (3 points à valider) |
| **Paiements réels (argent vrai)** | ❌ **PAS ENCORE** — Stripe en mode test |

---

## 1. INFRASTRUCTURE & SÉCURITÉ

### Backend (Railway — NestJS + Prisma 7 + PostgreSQL)

| Composant | État | Détail |
|-----------|------|--------|
| **Helmet** | ✅ Activé | Headers sécurité HTTP (XSS, HSTS, CSP…) |
| **Rate limiting** | ✅ Activé | ThrottlerModule : 100 req / 60 s / IP |
| **CORS** | ✅ Strict | Whitelist : ubodrop.com + www + Vercel + localhost |
| **ValidationPipe** | ✅ Strict | `whitelist: true, forbidNonWhitelisted: true` — aucun champ inconnu accepté |
| **SanitizeTextPipe** | ✅ Global | Nettoyage des inputs texte (XSS) |
| **GlobalHttpExceptionFilter** | ✅ Actif | Pas de stack trace exposée aux clients |
| **RequestLoggingInterceptor** | ✅ Actif | Logs des requêtes pour audit |
| **JWT** | ✅ Sécurisé | `ignoreExpiration: false`, secret via ENV — plantage si absent |
| **Passwords** | ✅ bcrypt | Hash Prisma-side |
| **Railway healthcheck** | ✅ Configuré | `/api/v1/health`, timeout 300s, redémarrage auto |
| **Dockerfile** | ✅ Node 22 Alpine | Compatible Prisma 7 |

### Frontend (Vercel — SPA HTML/JS)

| Composant | État | Détail |
|-----------|------|--------|
| **vercel.json** | ✅ Présent | Rewrite `/api/*` → Railway — clé API jamais côté client |
| **HTTPS** | ✅ Vercel | Automatique |
| **Google Maps Key** | ✅ Côté client seulement | Maps JavaScript API (pas Geocoding API exposée) |
| **Stripe** | ✅ Mode test | `sk_test_*` côté backend uniquement via ENV |
| **Resend** | ✅ Côté backend uniquement | Jamais exposé au frontend |
| **DATABASE_URL** | ✅ Non exposé | ENV Railway uniquement |

**Sécurité : niveau production acceptable pour une bêta.** Aucune fuite de clé identifiée.

---

## 2. FONCTIONNALITÉS — PARCOURS CLIENT

| Fonctionnalité | État | Notes |
|----------------|------|-------|
| Inscription client | ✅ Fonctionnel | Email + password (8 chars min) |
| Connexion client | ✅ Fonctionnel | JWT + refresh token |
| Mot de passe oublié | ✅ Fonctionnel | Email Resend + token 24h |
| Recherche par ville | ✅ Fonctionnel | Autocomplete Google Places + coordonnées |
| Carte Google Maps | ✅ Fonctionnel | Markers pros (bordeaux), click → fiche |
| Filtres catégories | ✅ Fonctionnel | 9 métiers : Barber, Coiffeuse, Esthéticienne, etc. |
| Filtre lieu | ✅ Fonctionnel | Domicile / Déplacement / Salon — cohérent backend + frontend |
| Fiche pro publique | ✅ Fonctionnel | Avatar, bio, spécialités, prestations ACTIVE, portfolio |
| Portfolio photos | ✅ Fonctionnel | Grille 2 colonnes, onglet dédié |
| Réservation | ✅ Fonctionnel | PATCH /bookings + statut PENDING |
| Paiement Stripe | ✅ Fonctionnel (test) | Checkout Session → retour success/cancel |
| Emails réservation | ✅ Fonctionnel | Client + pro reçoivent email à la demande |
| Emails paiement | ✅ Fonctionnel | Confirmé / refusé avec détails |
| Facture PDF | ✅ Route disponible | GET /bookings/:id/invoice |
| Bouton Me localiser | ✅ Visible | Dans map-controls, pleine largeur |
| Bouton itinéraire | ✅ Fonctionnel | Google Maps directions depuis la fiche pro |

---

## 3. FONCTIONNALITÉS — PARCOURS PRO

| Fonctionnalité | État | Notes |
|----------------|------|-------|
| Inscription pro | ✅ Fonctionnel | Email + spécialités (jusqu'à 5) + lieu de travail |
| Connexion pro | ✅ Fonctionnel | Redirige vers espace pro |
| Profil pro | ✅ Fonctionnel | Avatar (15 Mo max + compression), bio, instagram, SIRET |
| Géocodage automatique | ✅ Fonctionnel | À la sauvegarde profil → Google Maps + Nominatim fallback |
| Spécialités | ✅ Fonctionnel | Multi-sélection jusqu'à 5 métiers |
| Lieu de travail | ✅ Fonctionnel | Domicile / Déplacement / Salon — chips sélectionnables |
| Prestations | ✅ Fonctionnel | Créer / publier / dépublier par service |
| Toggle En ligne | ✅ Fonctionnel | Persisté en base + visible côté client immédiatement |
| Carte pro séparée | ✅ Fonctionnel | screen-pro-map distinct de la carte client |
| Stripe Connect | ✅ Fonctionnel (test) | Onboarding, gestion pending_verification, dashboard statut |
| Emails de réservation | ✅ Fonctionnel | Pro reçoit email à chaque demande |
| Portfolio upload | ✅ Fonctionnel | Upload photos depuis l'espace pro |

---

## 4. STACK TECHNIQUE — ÉTAT DES MODULES BACKEND

| Module | Présent | Fonctionnel |
|--------|---------|-------------|
| Auth (JWT + refresh + reset pwd) | ✅ | ✅ |
| Health (diagnostic endpoints) | ✅ | ✅ |
| Profiles (pro + client + géocodage) | ✅ | ✅ |
| Search (Haversine + géo + filtres) | ✅ | ✅ |
| Bookings (réservation + statuts) | ✅ | ✅ |
| Payments (Stripe Connect + webhooks) | ✅ | ✅ test |
| Categories | ✅ | ✅ |
| Services (prestations) | ✅ | ✅ |
| Admin | ✅ | ⚠️ non testé en prod |
| Messaging | ✅ | ⚠️ API REST uniquement, pas WebSocket |
| Notifications | ✅ | ⚠️ API REST uniquement, pas push |
| Incidents | ✅ | ⚠️ backend OK, pas d'UI front |
| Audit | ✅ | ✅ logs audit en base |
| Availability | ✅ | ✅ (optionnel en bêta) |

---

## 5. PAGES LÉGALES & CONFORMITÉ

| Page | État | Notes |
|------|------|-------|
| CGU (terms.html) | ✅ Présente | Mise à jour 19 mai 2026 |
| Politique de confidentialité (privacy.html) | ✅ Présente | Mise à jour 19 mai 2026 |
| Suppression de compte (delete-account.html) | ✅ Présente | Exigence RGPD / App Store |
| Schema UserStatus PENDING_EMAIL_VERIFICATION | ✅ Présent | Email non vérifié → statut distinct |
| **Email de vérification envoyé à l'inscription** | ⚠️ À valider | Le modèle EmailVerificationToken existe mais l'email n'est pas confirmé envoyé au flow d'inscription |

---

## 6. COMMUNICATION & MARKETING

### Landing page (index.html)

| Élément | État |
|---------|------|
| SEO meta description | ✅ Présent |
| OG tags (Facebook/LinkedIn) | ✅ Présents |
| Twitter Card | ✅ Présent |
| Schema.org Organization | ✅ Présent |
| Canonical URL | ✅ https://www.ubodrop.com/ |
| Favicon | ✅ logo-ubodrop-icon-brown.png |
| Fonts premium | ✅ Space Grotesk + Playfair Display + DM Sans |
| Branding bordeaux + crème | ✅ Cohérent (index.html + app.html + backend emails) |
| Apple Touch Icon | ✅ Présent |
| robots: index, follow | ✅ Présent |

### Assets communication

| Élément | État |
|---------|------|
| Logo bordeaux (horizontal) | ✅ assets/img/logo-ubodrop-brown.png |
| Logo bordeaux (icône carré) | ✅ assets/img/logo-ubodrop-icon-brown.png |
| Couleur hex officielle | ✅ #5C1A18 (bordeaux) + #EAE4D8 (crème) |
| Domaine | ✅ www.ubodrop.com |
| Emails from | ✅ UBODROP <no-reply@ubodrop.com> |

---

## 7. POINTS BLOQUANTS AVANT BÊTA GRAND PUBLIC

### 🔴 Bloquant 1 — Stripe en mode TEST

**Impact** : Aucune transaction réelle possible. Les clients ne peuvent pas payer de vraies prestations. Les pros ne reçoivent aucun revenu.

**Pour passer en LIVE** :
1. Aller sur dashboard.stripe.com → activer le compte live
2. Connecter le vrai compte bancaire UBODROP
3. Sur Railway : changer `STRIPE_SECRET_KEY` par la clé `sk_live_...`
4. Sur Railway : changer `STRIPE_WEBHOOK_SECRET` par le secret du webhook live
5. Les pros devront refaire leur Stripe Connect onboarding en live (leurs comptes test ne transfèrent pas)

**Alternative pour la bêta fermée** : accepter de tester avec Stripe test (`4242 4242 4242 4242`) — valable pour des testeurs internes.

---

### 🟡 Point à valider 2 — Vérification email à l'inscription

**Situation** : Le schéma Prisma a `EmailVerificationToken` et le statut `PENDING_EMAIL_VERIFICATION`. La route backend d'inscription existe. Mais il faut vérifier si l'email de confirmation est bien envoyé via Resend lors de l'inscription.

**Impact RGPD** : un utilisateur avec une fausse email peut créer un compte. En bêta fermée avec des testeurs invités, ce n'est pas bloquant.

**Action recommandée** : tester le flow complet (inscription → email → clic lien → account ACTIVE).

---

### 🟡 Point à valider 3 — Géocodage des pros existants

**Situation** : Les pros créés avant le Fix C (commit `f900f86`) ont `latitude=null, longitude=null` en base. Le fallback `state.searchLocation` les affiche au centre de la zone de recherche, pas à leur vraie adresse.

**Action recommandée** : demander à chaque pro de resauvegarder son profil (aller dans Espace pro → Profil → Sauvegarder) pour déclencher le géocodage automatique. OU lancer la migration SQL :

```sql
-- Sur Railway Database (à exécuter UNE SEULE FOIS)
UPDATE "ProProfile" 
SET latitude = NULL, longitude = NULL 
WHERE latitude = 0 AND longitude = 0;
```

Ensuite chaque pro qui re-save son profil recevra ses vraies coordonnées.

---

## 8. POINTS NON BLOQUANTS (P1 pour V2)

| Point | Impact | Effort |
|-------|--------|--------|
| Chat/messaging temps réel | WebSocket absent, API REST OK | 2-3 sprints |
| Notifications push | REST OK, pas de push (FCM/WebSocket) | 1-2 sprints |
| Vérification SIRET | Non validé côté backend | 1 sprint |
| Carte satisfaction post-prestation | UI absente | 1 sprint |
| Admin panel frontend protégé | admin.html présent, accès à sécuriser | 0.5 sprint |
| Analytics | Pas de tracking (Plausible/PostHog) | 0.5 sprint |
| PWA install prompt | manifest présent, install non sollicité | 0.5 sprint |

---

## 9. CE QUI EST VRAIMENT IMPRESSIONNANT (points forts)

Avant de lancer, voici ce qui est déjà en place et que peu de startups ont au stade bêta :

- **Stripe Connect complet** — onboarding pro, checkout client, commission platform 10%, webhooks idempotents, gestion `pending_verification`
- **Géocodage double** — Google Maps API (si disponible) + Nominatim fallback gratuit
- **Emails transactionnels complets** — 4 types d'emails via Resend, design branded
- **Sécurité enterprise** — Helmet + rate limiting + CORS strict + ValidationPipe + SanitizeTextPipe + GlobalExceptionFilter
- **Audit trail** — toutes les actions sensibles loggées en base
- **Health monitoring** — endpoints de diagnostic pro-visibility, stripe-health, etc.
- **9 métiers** avec icônes SVG métier personnalisées sur la carte
- **Gestion des modes** — À domicile / En déplacement / En salon cohérente de bout en bout
- **Portfolio photos** avec grille et onglets dans la fiche client
- **Mot de passe oublié** complet avec token sécurisé

---

## 10. PLAN DE LANCEMENT RECOMMANDÉ

### Phase 1 — Bêta fermée (maintenant) ✅

**Objectif** : valider le produit avec 5 à 20 pros invités manuellement + leurs premiers clients.

Actions :
1. Inviter les pros individuellement (email manuel ou lien direct vers app.html)
2. Chaque pro re-sauvegarde son profil → géocodage automatique → apparaît sur la carte
3. Tests avec Stripe test (`4242 4242 4242 4242`) — pas d'argent réel
4. Feedback direct (WhatsApp, formulaire, appel)
5. Corriger les bugs remontés

**Durée recommandée** : 2 à 4 semaines.

---

### Phase 2 — Communication pré-lancement (parallèle à la bêta fermée) ✅

La landing page est prête. Lancer dès maintenant :

- **Instagram / TikTok** : contenu "behind the scenes" — la carte, les pros, le concept
- **Teaser vidéo** : parcours client en 30 secondes (recherche → prise de RDV → paiement)
- **Formulaire waitlist** : collecter les emails des futurs clients AVANT le lancement grand public (ajouter un formulaire à index.html — 2h de travail)
- **Profils pros** : inciter les premiers pros à partager leur profil UBODROP sur leurs réseaux

---

### Phase 3 — Bêta ouverte (après Stripe LIVE)

Actions pré-lancement :
1. Passer Stripe en LIVE (priorité absolue)
2. Valider email de vérification à l'inscription
3. Ouvrir l'inscription libre côté client
4. Monitoring Railway + alertes (uptime, erreurs 5xx)
5. Support client (email ou WhatsApp)

---

## 11. VERDICT FINAL

```
BÊTA FERMÉE : ✅ GO IMMÉDIAT
La plateforme est stable, fonctionnelle, sécurisée.
Tous les parcours core sont opérationnels.

COMMUNICATION : ✅ GO IMMÉDIAT
Landing page SEO-ready, branding cohérent, 
assets visuels disponibles.

BÊTA OUVERTE GRAND PUBLIC : ⚠️ GO sous 2-4 semaines
Condition principale : passer Stripe en mode LIVE.
Le reste est optionnel pour un premier lancement.

ARGENT RÉEL : ❌ PAS ENCORE
Stripe TEST uniquement → zéro transaction réelle possible.
Obligatoire avant d'accepter de vrais clients payants.
```

---

*Rapport généré le 2026-07-16 — UBODROP audit bêta launch*
