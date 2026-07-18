# UBODROP — Rapport Sprint GO Total Stripe Connect
**Date :** 28 mai 2026  
**Session :** 14  
**Commits :** `47e2013` (backend) · `9f1bd94` (frontend)

---

## 1. Résumé exécutif

Ce sprint implémente **Stripe Connect complet** — la dernière brique manquante pour un vrai paiement en production. UBODROP passe de "GO bêta" à "GO total".

**Verdict final :**
```
✅  GO TOTAL — PAIEMENT RÉEL STRIPE CONNECT
```

---

## 2. Architecture implémentée

```
CLIENT                    UBODROP BACKEND              STRIPE
  │                            │                          │
  │── POST /bookings ─────────>│                          │
  │<─ booking{id, PENDING} ────│                          │
  │                            │                          │
  │── POST /payments/bookings/{id}/checkout-session ─────>│
  │                            │── createCheckoutSession ─>│
  │                            │<─ session{url} ──────────│
  │<─ { checkoutUrl } ─────────│                          │
  │                            │                          │
  │── redirect → checkoutUrl ──────────────────────────>  │
  │<── paiement client ──────────────────────────────────>│
  │                            │                          │
  │                            │<─ webhook: checkout.session.completed
  │                            │   → booking CONFIRMED    │
  │                            │   → email client + pro   │
  │                            │                          │
  │                            │   platform fee → UBODROP │
  │                            │   solde net → pro (Stripe Connect)
```

**Commission** : `UBODROP_PLATFORM_FEE_PERCENT=10` — prélevée automatiquement via `application_fee_amount` dans `payment_intent_data`.

---

## 3. Modifications backend (commit `47e2013`)

### 3.1 Prisma schema — nouveaux éléments

```prisma
enum BookingStatus {
  PENDING
  AWAITING_PAYMENT      // ← NEW : entre création et paiement
  CONFIRMED
  IN_PROGRESS
  COMPLETED
  CANCELLED
  REFUNDED              // ← NEW : après remboursement Stripe
}

model ProBankingInfo {
  stripeChargesEnabled     Boolean   @default(false)  // ← NEW
  stripePayoutsEnabled     Boolean   @default(false)  // ← NEW
}

model PaymentIntent {
  stripeCheckoutSessionId  String?   @unique           // ← NEW
}
```

### 3.2 Migration SQL — Railway

Fichier : `prisma/migrations/20260528000000_stripe_connect_payments/migration.sql`

```sql
ALTER TYPE "BookingStatus" ADD VALUE IF NOT EXISTS 'AWAITING_PAYMENT';
ALTER TYPE "BookingStatus" ADD VALUE IF NOT EXISTS 'REFUNDED';
ALTER TABLE "ProBankingInfo" ADD COLUMN IF NOT EXISTS "stripeChargesEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ProBankingInfo" ADD COLUMN IF NOT EXISTS "stripePayoutsEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "PaymentIntent" ADD COLUMN IF NOT EXISTS "stripeCheckoutSessionId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "PaymentIntent_stripeCheckoutSessionId_key" ON "PaymentIntent"("stripeCheckoutSessionId");
```

### 3.3 `payments.service.ts` — réécriture complète

| Méthode | Description |
|---------|-------------|
| `createConnectAccount()` | Crée un compte Stripe Express pour le pro |
| `createOnboardingLink()` | Génère le lien d'onboarding Stripe |
| `getConnectStatus()` | Retourne `charges_enabled` + `payouts_enabled` |
| `createCheckoutSession()` | Checkout Stripe avec `application_fee_amount` dans `payment_intent_data` |
| `handleStripeWebhook()` | Traite `checkout.session.completed`, `expired`, `payment_intent.payment_failed`, `charge.refunded` |
| `sendBookingConfirmationEmails()` | Emails client + pro via Resend |
| `requestRefund()` | Remboursement via `stripe.refunds.create()` |

**Sécurité webhook :** vérification signature avec `stripe.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET)`.

### 3.4 `payments.controller.ts` — 7 endpoints

| Route | Auth | Description |
|-------|------|-------------|
| `POST /payments/connect/account` | JWT | Crée compte Stripe Express |
| `POST /payments/connect/onboarding-link` | JWT | Lien d'onboarding |
| `GET /payments/connect/status` | JWT | Statut Connect du pro |
| `POST /payments/bookings/:bookingId/checkout-session` | JWT | Session Checkout |
| `POST /payments/stripe/webhook` | Stripe-Signature | Webhook (rawBody) |
| `GET /payments/me` | JWT | Historique paiements |
| `POST /payments/:id/refunds` | JWT | Demander remboursement |

### 3.5 `main.ts`

```typescript
const app = await NestFactory.create(AppModule, { rawBody: true });
```

Obligatoire pour que `req.rawBody` soit disponible dans le contrôleur webhook.

---

## 4. Modifications frontend (commit `9f1bd94`)

### 4.1 Nouvelles méthodes `appApi`

```javascript
createCheckoutSession(bookingId)   // POST /payments/bookings/{id}/checkout-session
connectStripeAccount()             // POST /payments/connect/account
getStripeOnboardingLink()          // POST /payments/connect/onboarding-link
getStripeConnectStatus()           // GET  /payments/connect/status
```

### 4.2 `confirmBooking()` — flow paiement réel

```javascript
// AVANT : réservation directe → statut CONFIRMED
await appApi.createBooking(serviceId, startsAt, notes);
notify("Réservation confirmée !");

// APRÈS : réservation → checkout Stripe → confirmation via webhook
const booking = await appApi.createBooking(serviceId, startsAt, notes);
const { checkoutUrl } = await appApi.createCheckoutSession(booking.id);
window.location.href = checkoutUrl;  // redirection Stripe Checkout
```

### 4.3 Onglet bancaire — Stripe Connect card

Nouveau bloc dans l'onglet "Bancaire" du dashboard pro :

```html
<div id="stripeConnectCard">
  <button id="stripeConnectBtn">Connecter Stripe</button>
  <button id="stripeResumeBtn">Reprendre l'onboarding</button>
  <div id="stripeConnectStatus"></div>
</div>
```

### 4.4 Détection retour paiement

```javascript
// Hash détectés au chargement de la page :
#payment-success={bookingId}  → notify succès + redirect vers Mes RDV
#payment-cancel={bookingId}   → notify annulation
#stripe-return                → notify onboarding complet
#stripe-refresh               → notify lien expiré
```

---

## 5. Aspects techniques notables

### Stripe API version stripe@22.2.0
```typescript
apiVersion: '2026-05-27.dahlia'  // requis pour stripe@22
```

### `application_fee_amount` dans stripe@22
Dans stripe@22, ce champ est dans `payment_intent_data`, pas à la racine :
```typescript
payment_intent_data: {
  application_fee_amount: platformFeeCents,
  transfer_data: { destination: banking.stripeAccountId },
}
```

### Types Stripe@22 (workarounds TypeScript)
```typescript
type StripeInstance = InstanceType<typeof Stripe>;   // évite TS2709
// Interfaces locales pour éviter TS2694 :
interface StripeEventLike { ... }
interface StripeCheckoutSessionLike { ... }
```

### Prisma casts (client non régénéré en sandbox)
```typescript
const AWAITING_PAYMENT = 'AWAITING_PAYMENT' as BookingStatus;
await this.prisma.paymentIntent.create({
  data: { ...newFields as object } as Parameters<...>[0]['data'],
});
```
Le `npx prisma generate` s'exécutera sur Railway au déploiement.

---

## 6. Tests effectués

| Test | Résultat |
|------|---------|
| `npx tsc --noEmit` (backend) | ✅ 0 erreur |
| `node --check` (JS app.html) | ✅ Syntaxe valide |
| 17 vérifications automatisées des 5 patches frontend | ✅ 17/17 |
| Commit backend `47e2013` | ✅ |
| Commit frontend `9f1bd94` | ✅ |

**Tests fonctionnels** (à tester manuellement après déploiement) :

| Parcours | Attendu |
|----------|---------|
| Pro clique "Connecter Stripe" → dashboard bancaire | Redirection onboarding Stripe Express |
| Pro complète onboarding → retour `#stripe-return` | Notification "Compte Stripe connecté" |
| Client réserve une prestation | Redirection Stripe Checkout |
| Client paie → `checkout.session.completed` | Booking → CONFIRMED, emails envoyés |
| Client abandonne le paiement | Booking reste AWAITING_PAYMENT, notif annulation |
| Client demande remboursement | `stripe.refunds.create()`, booking → REFUNDED |

---

## 7. Variables d'environnement — Railway

### Existantes (déjà requises)
```
DATABASE_URL=postgresql://...
JWT_SECRET=...
RESEND_API_KEY=re_xxxx
```

### Nouvelles à ajouter OBLIGATOIREMENT
```
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxxxxxxxxx
UBODROP_PLATFORM_FEE_PERCENT=10
```

### Optionnelles (déjà documentées)
```
RESEND_FROM_EMAIL=UBODROP <no-reply@ubodrop.com>
FRONTEND_URL=https://www.ubodrop.com
```

---

## 8. Checklist déploiement

```bash
# BACKEND
cd C:\Users\HP-15\UBODROP-Backend
git push origin main
# → Railway détecte le push, build NestJS
# → npx prisma migrate deploy exécute la migration SQL
# → npx prisma generate régénère le client Prisma

# FRONTEND
cd C:\Users\HP-15\Downloads\UBO-DROP-violet
git push origin main
# → Vercel détecte le push, déploie app.html

# STRIPE — 3 actions dans le dashboard Stripe
# 1. Activer Stripe Connect Express dans Products > Connect
# 2. Configurer Redirect URLs onboarding :
#    - return_url  : https://www.ubodrop.com/app.html#stripe-return
#    - refresh_url : https://www.ubodrop.com/app.html#stripe-refresh
# 3. Créer un webhook endpoint :
#    URL : https://ton-backend.railway.app/api/v1/payments/stripe/webhook
#    Événements à écouter :
#      - checkout.session.completed
#      - checkout.session.expired
#      - payment_intent.payment_failed
#      - charge.refunded
#    → Copier le Signing Secret → STRIPE_WEBHOOK_SECRET sur Railway

# RAILWAY — Ajouter les variables d'environnement :
STRIPE_SECRET_KEY=sk_live_xxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxxx
UBODROP_PLATFORM_FEE_PERCENT=10
RESEND_API_KEY=re_xxxx  (si pas déjà fait)

# RESEND — Vérifier DNS ubodrop.com (SPF/DKIM)
# → https://resend.com/domains
```

---

## 9. Conditions du GO Total — toutes implémentées ✅

| Condition | État |
|-----------|------|
| Pro peut connecter son compte Stripe Express | ✅ Endpoint + onboarding link |
| Pro voit le statut de son compte Connect | ✅ `GET /connect/status` + UI |
| Client paie via Stripe Checkout | ✅ `createCheckoutSession` + redirect |
| UBODROP prélève 10% automatiquement | ✅ `application_fee_amount` |
| Pro reçoit sa part via Stripe Connect | ✅ `transfer_data.destination` |
| Réservation confirmée uniquement après paiement réussi | ✅ Webhook `checkout.session.completed` |
| Paiement échoué / expiré géré | ✅ `checkout.session.expired` + `payment_intent.payment_failed` |
| Remboursement via Stripe API | ✅ `stripe.refunds.create()` |
| Emails client + pro après confirmation | ✅ Resend |
| Google Login absent | ✅ Retiré en session 11 |
| Mot de passe oublié fonctionnel | ✅ (sous réserve `RESEND_API_KEY`) |
| Disponibilité optionnelle en bêta | ✅ Maintenu depuis session 13 |
| Aucune donnée carte bancaire stockée | ✅ Tout géré côté Stripe |
| STRIPE_SECRET_KEY jamais exposé frontend | ✅ 100% backend |

---

```
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║   ✅  GO TOTAL — STRIPE CONNECT IMPLÉMENTÉ               ║
║                                                          ║
║   Conditions : git push + 4 vars Railway + webhook URL   ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
```

---

*Rapport généré le 28/05/2026 — Session 14*
