# RAPPORT — Emails, Factures & Écrans Paiement UBODROP
**Date :** 2026-07-01  
**Scope :** bookings.service.ts · payments.service.ts · bookings.controller.ts · app.html  
**Statut :** ✅ Implémenté et validé TypeScript

---

## 1. Vue d'ensemble — Matrice de couverture email

| Événement | Email Client | Email Pro | Avant | Après |
|---|---|---|---|---|
| Réservation créée (PENDING) | ✅ | ✅ | ❌ aucun | ✅ implémenté |
| Paiement confirmé (SUCCEEDED) | ✅ | ✅ | ✅ existait | ✅ conservé |
| Paiement refusé (FAILED) | ✅ | ✅ | ⚠️ client seulement | ✅ pro ajouté |
| Session Checkout expirée | ✅ | ❌ | ❌ aucun | ✅ client ajouté |
| Avis satisfaction soumis | ✅ | ✅ | ✅ existait | ✅ conservé |

---

## 2. Emails réservation demandée — `bookings.service.ts`

### 2.1 Méthode ajoutée : `sendBookingRequestEmails()`

Appelée dans `createBooking()` **après** la transaction (non bloquante via `.catch()`).

```typescript
// Hors transaction, non bloquant sur la création de la réservation
this.sendBookingRequestEmails(booking, user.email).catch((err) =>
  this.logger.error('[Bookings] Erreur envoi emails réservation', err),
);
```

**Données utilisées :**
- Prestation : `service.title`, `service.price`, `service.durationMin`
- Pro : `proProfile.displayName | businessName`, `proProfile.city`, `proProfile.user.email`
- Dates : formatées en `fr-FR` avec `toLocaleDateString` / `toLocaleTimeString`
- Prix : conversion `Decimal` → `Number()` / 100 pour l'affichage en euros

### 2.2 Email client

**Objet :** `Demande de réservation confirmée — {prestation} · UBODROP`

Contenu :
- Confirmation de réception de la demande
- Tableau récap : Prestation / Professionnel / Date / Horaire / Prix
- CTA : "Suivre ma réservation →"

### 2.3 Email pro

**Objet :** `Nouvelle réservation reçue — {prestation} · UBODROP`

Contenu :
- Alerte nouvelle réservation
- Tableau récap : Prestation / Date / Horaire / Montant
- CTA : "Voir mes réservations →"

---

## 3. Emails paiement — `payments.service.ts`

### 3.1 Paiement confirmé (déjà existant, conservé)

Méthode `sendBookingConfirmationEmails(bookingId)` appelée depuis `handleCheckoutCompleted()`.  
Envoie à **client + pro** avec date/heure de la prestation.

### 3.2 Paiement refusé — amélioré

Méthode `handlePaymentFailed()` enrichie :

**Avant :** email client uniquement, sans détails de la prestation  
**Après :** email client **et** email pro, avec nom de la prestation et du pro/client

- Email client objet : `Paiement refusé — UBODROP`
- Email pro objet : `Paiement client non abouti — UBODROP`
- Le pro est informé que le client a été notifié et peut réessayer

La requête Prisma est élargie pour inclure `service.title` et `proProfile.user.email`.

### 3.3 Session Checkout expirée — nouveau

Méthode `handleCheckoutExpired()` : email client ajouté après la transaction.

- Objet : `Lien de paiement expiré — UBODROP`
- Explique que la réservation reste en attente
- CTA : "Relancer le paiement →"

---

## 4. Endpoint Facture — `GET /bookings/:id/invoice`

### 4.1 Implémentation

**Controller :** `BookingsController` — `GET :id/invoice` → `getInvoice(user, id)`  
**Service :** `BookingsService.getInvoice()` — génération à la demande

**Accès :** JWT requis. Autorisé pour le **client** ou le **pro** concerné uniquement.

**Conditions :** Disponible uniquement si :
1. `booking.status` ∈ `{CONFIRMED, IN_PROGRESS, COMPLETED}`
2. Un `PaymentIntent` avec `status = SUCCEEDED` existe pour ce booking

**Format numéro de facture :** `INV-YYYYMMDD-XXXXXXXX`  
Exemple : `INV-20260701-CM8X9KPL`

### 4.2 Données retournées

```json
{
  "invoiceNumber": "INV-20260701-ABC12345",
  "issuedAt": "2026-07-01T14:30:00.000Z",
  "booking": {
    "id": "...",
    "status": "CONFIRMED",
    "startsAt": "...",
    "endsAt": "...",
    "prestationDate": "mardi 1 juillet 2026",
    "prestationTime": "14:30",
    "notes": null
  },
  "service": {
    "title": "Coupe + Brushing",
    "durationMin": 60,
    "price": 5000
  },
  "client": {
    "name": "Marie Dupont",
    "email": "marie@example.com"
  },
  "pro": {
    "name": "Sofiane Beauty",
    "businessName": "Studio Sofiane",
    "email": "sofiane@example.com",
    "city": "Paris"
  },
  "payment": {
    "id": "...",
    "amount": 5000,
    "amountFormatted": "50.00 €",
    "paidAt": "2026-07-01T13:45:00.000Z",
    "paidAtFormatted": "1 juillet 2026",
    "status": "SUCCEEDED",
    "reference": "pi_3O..."
  },
  "platform": {
    "name": "UBODROP",
    "email": "contact@ubodrop.com",
    "website": "https://www.ubodrop.com",
    "legalNote": "UBODROP est une plateforme de mise en relation. La TVA applicable est celle du professionnel."
  }
}
```

**Note :** Le prix est en centimes d'euro dans `amount`, et formaté en `amountFormatted`.

---

## 5. Écrans paiement frontend — `app.html`

### 5.1 Trois overlays ajoutés

#### Paiement accepté — `#paymentSuccessOverlay`
- Icône ✅
- Titre : "Paiement confirmé !"
- Récap dynamique : prestation, pro, date/heure (from `state.bookings`)
- CTA : "Voir mes rendez-vous" → `screen-rdv`
- CTA secondaire : "Télécharger la facture" → `downloadInvoice()`

#### Paiement annulé — `#paymentCancelOverlay`
- Icône ⏸️
- Titre : "Paiement annulé"
- CTA : "Relancer le paiement" → `retryPayment()` (relance la checkout-session)
- CTA secondaire : "Retour à l'accueil"

#### Paiement refusé — `#paymentFailedOverlay`
- Icône ❌
- Titre : "Paiement refusé"
- Conseil : "Vérifie les informations de ta carte"
- CTA : "Réessayer le paiement" → `retryPayment()`
- CTA secondaire : "Retour à l'accueil"

### 5.2 Fonctions JS ajoutées

| Fonction | Description |
|---|---|
| `showPaymentOverlay(type, bookingId)` | Affiche l'overlay adapté (success/cancel/failed) |
| `closePaymentResult(type)` | Ferme l'overlay et navigue vers screen-rdv ou home |
| `retryPayment()` | Relance une nouvelle checkout-session Stripe |
| `downloadInvoice()` | Fetch `/api/v1/bookings/:id/invoice` → génère HTML imprimable |

### 5.3 `detectPaymentReturn()` — hashes gérés

| Hash | Avant | Après |
|---|---|---|
| `#payment-success={id}` | `notify()` + `goTo(screen-rdv)` | Overlay ✅ avec récap + bouton facture |
| `#payment-cancel={id}` | `notify()` erreur | Overlay ⏸️ avec retry |
| `#payment-failed={id}` | ❌ non géré | Overlay ❌ avec retry |

### 5.4 Facture imprimable (in-browser)

`downloadInvoice()` génère un HTML complet dans un nouvel onglet (`window.open`) avec `window.print()` auto-déclenché. Pas de librairie externe — pur HTML/CSS.

---

## 6. Sécurité & contraintes respectées

| Contrainte | Respecté |
|---|---|
| Clé Resend non exposée frontend | ✅ — emails envoyés côté serveur uniquement |
| STRIPE_SECRET_KEY jamais côté frontend | ✅ — checkout initié par JWT backend |
| Emails non bloquants sur la réservation | ✅ — `.catch()` sur `sendBookingRequestEmails` |
| Facture accessible client + pro uniquement | ✅ — guard JWT + vérification `clientUserId`/`proProfileId` |
| Pas de stockage PDF (pas de dépendance externe) | ✅ — génération à la demande en JSON + HTML client |
| Aucune donnée bancaire exposée | ✅ — reference Stripe masquée (ID uniquement) |
| TypeScript strict — zéro erreur | ✅ — validé `npx tsc --noEmit` |

---

## 7. Fichiers modifiés

| Fichier | Modifications |
|---|---|
| `src/modules/bookings/bookings.service.ts` | +`sendBookingRequestEmails()`, +`getInvoice()` · `createBooking()` enrichi |
| `src/modules/bookings/bookings.controller.ts` | +`GET :id/invoice` |
| `src/modules/payments/payments.service.ts` | `handlePaymentFailed()` enrichi (email pro), `handleCheckoutExpired()` (email client) |
| `app.html` | +3 overlays paiement, +4 fonctions JS, `detectPaymentReturn()` refactorisé |

---

## 8. Commandes de test

```bash
# Health check
curl -H "Authorization: Bearer <token>" https://<railway-url>/api/v1/payments/stripe/health

# Facture d'une réservation confirmée
curl -H "Authorization: Bearer <token>" https://<railway-url>/api/v1/bookings/<bookingId>/invoice

# Simuler retour paiement réussi (frontend)
# Ouvrir dans le navigateur :
# https://www.ubodrop.com/app.html#payment-success=<bookingId>
```

---

*Rapport généré automatiquement — Claude · UBODROP Backend Sprint*
