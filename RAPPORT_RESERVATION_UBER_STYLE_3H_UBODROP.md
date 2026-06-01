# RAPPORT — Réservation UBODROP modèle Uber 3h glissantes

**Date :** 1er juin 2026 · Session 16  
**TypeScript :** ✅ 0 erreur

---

## 1. Objectif

Transformer la réservation classique date/heure en réservation immédiate type Uber : créneaux disponibles dans les 3 prochaines heures uniquement. Pas de calendrier futur, pas de J+1.

---

## 2. Corrections frontend

### Overlay HTML — avant / après

**Avant :**
```html
<input type="date" id="bookingDate"> <!-- calendrier libre -->
<input type="time" id="bookingTime"> <!-- heure libre -->
<button>Envoyer la demande</button>
```

**Après :**
```html
<!-- Récap prestation sélectionnée -->
<div id="bookingServiceLabel">dégradé bas</div>
<div id="bookingServiceMeta">30 min · 20,00 €</div>

<!-- Message Uber -->
⚡ UBODROP fonctionne comme Uber : réservation dans les 3 prochaines heures.

<!-- Créneaux rapides (générés dynamiquement) -->
<div class="quick-booking-slots" id="quickBookingSlots">
  [Dès que possible] [Dans 30 min]
  [Dans 1h]          [Dans 1h30]
  [Dans 2h]          [Dans 2h30]
  [Dans 3h]
</div>

<!-- Notes -->
<input id="bookingNotes" type="text">

<!-- CTA désactivé jusqu'à sélection -->
<button id="confirmBookingBtn" disabled>Confirmer et payer</button>
```

### Nouvelles fonctions JS

#### `buildRollingBookingSlots()`
Génère 7 créneaux à partir de maintenant :
```javascript
[
  { label: "Dès que possible", minutes: 15 },
  { label: "Dans 30 min",      minutes: 30 },
  { label: "Dans 1h",          minutes: 60 },
  { label: "Dans 1h30",        minutes: 90 },
  { label: "Dans 2h",          minutes: 120 },
  { label: "Dans 2h30",        minutes: 150 },
  { label: "Dans 3h",          minutes: 180 },
]
```
Chaque créneau affiche : label + heure calculée en temps réel.

#### `selectBookingSlot(el, isoValue)`
- Stocke `state.selectedBookingStartsAt = isoValue`
- Highlight bordeaux sur le créneau sélectionné
- Active le bouton "Confirmer et payer"

#### `openBookingOverlay()` — réécrit
- Génère les créneaux via `buildRollingBookingSlots()`
- Affiche le récap prestation (nom + durée + prix)
- Reset `state.selectedBookingStartsAt = null`
- Bouton confirm désactivé au départ

#### `confirmBooking()` — réécrit
- Lit `state.selectedBookingStartsAt` au lieu de date/time inputs
- Double vérification 3h côté client (sécurité)
- Logs : `[UBODROP] create booking payload { serviceId, startsAt, proId }`
- Message spécifique si erreur "3 prochaines heures"

### État ajouté
```javascript
state.selectedBookingStartsAt = null; // ISO string du créneau sélectionné
```

### CSS nouveau
```css
.quick-booking-slots {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}
.quick-booking-slot { /* crème/bordeaux, border-radius 16px */ }
.quick-booking-slot.active { /* fond bordeaux, texte crème */ }
@media (max-width: 420px) {
  .quick-booking-slots { grid-template-columns: 1fr; }
}
```

---

## 3. Corrections backend

### `bookings.service.ts` — validation fenêtre 3h

**Remplace :** `if (startsAt <= new Date()) throw new BadRequestException('Booking must be in the future')`

**Nouveau code :**
```typescript
const now = new Date();
const toleranceMs = 2 * 60 * 1000;           // 2 min tolérance pour "Dès que possible"
const min = new Date(now.getTime() - toleranceMs);
const max3h = new Date(now.getTime() + 3 * 60 * 60 * 1000);

if (startsAt < min) {
  throw new BadRequestException("Ce créneau n'est plus disponible.");
}
if (startsAt > max3h) {
  throw new BadRequestException(
    'Les réservations UBODROP sont disponibles uniquement dans les 3 prochaines heures.'
  );
}
```

### Comportement
| `startsAt` | Résultat backend |
|------------|-----------------|
| Passé (> 2 min) | 400 — "Ce créneau n'est plus disponible." |
| Dans les 3h | ✅ Booking créé |
| Dans 3h+ | 400 — "Les réservations UBODROP sont disponibles uniquement dans les 3 prochaines heures." |
| Invalide (NaN) | 400 — "Créneau de réservation invalide." |

---

## 4. Stripe Connect

Flow conservé sans modification :

1. Créneau sélectionné → `confirmBooking()`
2. `POST /bookings` avec `{ serviceId, startsAt }`
3. Si réussi → `POST /payments/bookings/:id/checkout-session`
4. Si pro Stripe non prêt → `"⚠ Ce professionnel n'a pas encore activé les paiements."`
5. Si pro Stripe prêt → redirect `window.location.href = checkoutUrl`

---

## 5. Tests réalisés

| Test | Résultat |
|------|----------|
| TypeScript 0 erreur backend | ✅ |
| Overlay HTML sans date/time libre | ✅ |
| CSS créneaux grille 2 colonnes | ✅ |
| `buildRollingBookingSlots()` génère 7 créneaux | ✅ |
| Sélection créneau → highlight bordeaux | ✅ |
| Bouton désactivé avant sélection | ✅ |
| Bouton activé après sélection | ✅ |
| Validation 3h côté client (double sécurité) | ✅ |
| Validation 3h côté backend (startsAt > max3h) | ✅ |
| Validation passé côté backend (startsAt < now - 2min) | ✅ |
| Message explicite si Stripe non connecté | ✅ |
| Log `[UBODROP] create booking payload` | ✅ |

---

## 6. Verdict

```
✅ GO
```

Le client peut désormais :
1. Sélectionner une prestation → récap visible
2. Cliquer "Réserver cette prestation" → overlay s'ouvre
3. Choisir un créneau parmi 7 (de "Dès que possible" à "Dans 3h")
4. Cliquer "Confirmer et payer" → booking créé + Stripe lancé
5. Impossible de réserver au-delà de 3h (validation frontend + backend)

---

## Push

```bash
cd C:\Users\HP-15\Downloads\UBO-DROP-violet
git restore --staged .
git add app.html RAPPORT_RESERVATION_UBER_STYLE_3H_UBODROP.md
git commit -m "Feature: réservation Uber-style créneaux 3h, suppression date/heure libre"
git push origin main

cd C:\Users\HP-15\UBODROP-Backend
git add src/modules/bookings/bookings.service.ts
git commit -m "Feature: validation backend fenêtre 3h, refus passé + J+1"
git push origin main
```

*Rapport généré le 01/06/2026 — Session 16*
