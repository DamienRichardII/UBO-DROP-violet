# RAPPORT — Correction réelle feedback Sofiane (preuves production)

_Date : 2026-06-02 — Audit avec preuves, pas déclaratif._

## 0. Constat central (honnête)

Mes « ✅ corrigé » précédents portaient sur le **code corrigé en local** (vérifié
`node --check` / `jsdom` / `tsc`), **pas** sur une validation en production. Or :

- **je n'ai aucun accès à la production** (ni Railway, ni Vercel, ni Stripe, ni Resend,
  ni la base) ; je ne peux **ni déployer, ni positionner les variables, ni envoyer un
  vrai email, ni cliquer en prod**.
- Les preuves ci-dessous viennent d'appels **réels** aux API publiques de ta prod.

## 1. Problèmes encore présents après test production — POURQUOI

| Symptôme | Cause prouvée |
|---|---|
| Stripe 500 | **Backend pas redéployé** (l'ancien code tourne) + config Stripe |
| Email non reçu | **Backend pas redéployé** + config/domaine Resend |
| Icônes map absentes | **Aucun pro n'a de coordonnées** (lat/lng = null en base) |

### Preuves brutes

- `GET /api/v1/health` → `{"status":"ok",...,"timestamp":"2026-05-28T14:14:05Z"}`
  → le build déployé date du **28 mai**, avant mes correctifs.
- `GET /api/v1/health/integrations` → **404 / vide** → mon endpoint de diagnostic
  (ajouté cette session) **n'est pas déployé** → donc mes correctifs backend
  (Stripe, emails) **ne sont pas en production**.
- `GET /api/v1/search/professionals` → **17 pros, tous `latitude:null, longitude:null`**
  (ex. `DameBarber`, city « Aulnay sous bois », lat/lng null).
- `GET https://ubodrop.com/app.html` → contient déjà « Dès que possible / Planifier une
  date » → le **frontend** (réservation planifiée) **est déployé**.

## 2. Cause racine Stripe Connect 500

L'ancien code en prod (build 28/05) appelle Stripe **sans try/catch** et avec
`new Stripe('sk_test_placeholder')` si `STRIPE_SECRET_KEY` manque → erreur Stripe
remontée en **500 opaque**. Causes probables côté config : `STRIPE_SECRET_KEY`
absent/incohérent, ou **Stripe Connect (Express) non activé** sur le compte plateforme.

## 3. Correction Stripe Connect (code, local, prête à déployer)

`src/modules/payments/payments.service.ts` :
- garde `stripeConfigured` → message clair si clé absente (au lieu d'un 500 opaque) ;
- `try/catch` sur `accounts.create` et `accountLinks.create` ;
- logs : `[StripeConnect] onboarding requested pro=… account=…`,
  `[StripeConnect] onboarding failed — type=… message=…` (aucune clé loguée).

## 4. Preuve Stripe Connect production

**Non prouvable par moi** tant que ce n'est pas déployé. `tsc --noEmit` : aucune
erreur dans `src/`. Preuve réelle attendue **après ton déploiement** :
1. `GET /api/v1/health/integrations` → `stripe.secretKeyPresent: true` ;
2. clic « Connecter mon compte Stripe » → redirection Stripe (plus de 500) ;
3. sinon, le log Railway `[StripeConnect] onboarding failed …` donnera la cause exacte.

## 5. Cause racine emails non reçus

Deux raisons cumulées :
1. **Backend pas redéployé** → l'ancien `sendTransactionalEmail` ne lisait pas le
   champ `error` renvoyé par `resend.emails.send()` (Resend **ne lève pas** d'exception
   sur domaine non vérifié) → échec silencieux, log faussement « Email envoyé ».
2. **Config Resend** : `RESEND_API_KEY` et surtout `RESEND_FROM_EMAIL` avec un
   **domaine vérifié** (le code lit `RESEND_FROM_EMAIL`, pas `FROM_EMAIL`).

## 6. Correction emails (code, local, prête à déployer)

`src/modules/auth/auth.service.ts` : `sendTransactionalEmail` lit `{ data, error }`,
logue l'échec réel et renvoie un booléen ; `forgotPassword` logue
`[ForgotPassword] Email NON envoyé (config Resend ?)` si échec.
`src/modules/health/health.controller.ts` : ajout `GET /health/integrations` +
**`POST /health/email/test { "to": "..." }`** (envoie un vrai email test et renvoie
`{ ok, from, error }` → dit immédiatement si le domaine est vérifié).

## 7. Preuve email reçu

**Non prouvable par moi** (pas d'accès Resend ni boîte mail). Preuve réelle attendue
**après déploiement** : `POST /api/v1/health/email/test {"to":"ton@email"}` →
`{ "ok": true, ... }` + email reçu ; sinon le champ `error` (ex. « domain not
verified ») donne la cause exacte.

## 8. Cause racine icônes map absentes — PROUVÉE

`GET /api/v1/search/professionals` : **les 17 pros ont `latitude:null, longitude:null`**.
Le rendu des markers (mon code et l'ancien) ignore tout pro sans coordonnées finies
→ **0 marker possible**, quelle que soit la qualité du code icône. Ce n'est pas un bug
de code icône : c'est l'**absence de coordonnées en base**.

## 9. Correction icônes map (code, local, vérifié)

`app.html` — `renderMapMarkers` : ajout d'un **fallback géocodage ville**. Si un pro
n'a pas de lat/lng mais a une ville (`pro.location`), on géocode la ville via
`google.maps.Geocoder` (avec cache) et on place le marker métier à cette position.
Pros avec coordonnées réelles : comportement inchangé.

## 10. Preuve icône map visible + clic fiche

Vérifié **en local (jsdom)** avec les données réelles de prod (DameBarber, Barber,
ville « Aulnay sous bois », lat/lng null) :
- 1 marker créé via géocodage ville, position { 48.94, 2.49 }, **icône SVG Barber** ;
- clic sur le marker → écran `screen-detail` (fiche prestataire) ; 0 erreur console.

**Condition production** : nécessite (a) redéploiement du frontend avec ce correctif,
et (b) que **Google Maps se charge réellement** en prod (clé `GOOGLE_MAPS_API_KEY`
valide et autorisée pour le domaine `ubodrop.com`). Sans carte Google chargée, aucun
marker ne peut s'afficher (le fond statique `ref-carte.jpeg` n'accepte pas de markers).

## 11. Tests non-régression

- `app.html` : `node --check` OK, fin de fichier `</body></html>`, pas d'octet nul,
  **non tronqué** (4626 lignes). Init OK, 9 catégories, réservation ASAP+planifiée,
  compte pro (ne déconnecte plus) — vérifiés jsdom en session précédente.
- Backend : aucune erreur `tsc` dans `src/`. (Une erreur `tsc` sur
  `node_modules/.prisma/client/index.d.ts` est un artefact de lecture tronquée du
  montage sandbox — résolu par `npx prisma generate` sur ta machine, déjà dans ta
  procédure de validation.)

## 12. Verdict

**NO-GO** sur les 3 tests critiques tant que :

1. le **backend n'est pas redéployé** sur Railway (commit + push) **avec** les variables
   (`RESEND_API_KEY`, `RESEND_FROM_EMAIL` domaine vérifié, `STRIPE_SECRET_KEY`,
   `STRIPE_WEBHOOK_SECRET`, `FRONTEND_URL`) et **Stripe Connect activé** ;
2. le **frontend n'est pas redéployé** avec le fallback géocodage ;
3. **Google Maps ne se charge pas** réellement en prod (clé/domaine).

Je ne peux pas produire les preuves « email reçu » / « Stripe redirige » / « icône
visible » moi-même : elles exigent un déploiement + une configuration + un test en
prod hors de ma portée. Une fois déployé/configuré, les vérifs exactes (avec les URLs
ci-dessus) confirmeront chaque point — ou pointeront la cause précise via les logs.
