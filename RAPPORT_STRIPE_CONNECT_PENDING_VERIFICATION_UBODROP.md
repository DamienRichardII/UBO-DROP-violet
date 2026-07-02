# RAPPORT — Stripe Connect `pending_verification` UBODROP

**Date :** 2026-07-03  
**Backend modifié :** `src/modules/payments/payments.service.ts`  
**Frontend modifié :** `app.html`  
**Validation TypeScript :** OK (`npx tsc --noEmit` → 0 erreur)  
**Validation JS :** OK (`node --check` → 3567 lignes · Exit 0)

---

## Problème observé

L'espace bancaire du pro affichait :

> **Compte Stripe désactivé — raison : `requirements.pending_verification`**

Ce message était **incorrect et trompeur** :

- Le compte n'était pas désactivé — Stripe était simplement **en train de vérifier les informations KYC** soumises lors de l'onboarding.
- `requirements.pending_verification` est une liste de champs en attente de validation par Stripe. C'est un état **transitoire et non bloquant** (quelques minutes à quelques heures).
- Afficher « Compte désactivé » avec un code technique Stripe en clair (`requirements.pending_verification`) causait de l'inquiétude inutile chez le pro et pouvait entraîner des relances de support injustifiées.

---

## Analyse des logs Railway

La route `GET /payments/connect/status` retournait un objet avec :

```json
{
  "status": "disabled",
  "stripeDisabledReason": "requirements.pending_verification",
  "chargesEnabled": false,
  "payoutsEnabled": false
}
```

**Cause :** `computeStripeStatus()` traitait tout `disabled_reason` non égal à `requirements.past_due` comme `'disabled'`. Or, `requirements.pending_verification` est une raison **temporaire et automatique** — Stripe positionne lui-même ce champ pendant sa vérification interne.

---

## Cause réelle

### Backend — `computeStripeStatus()` (ligne ~219)

```typescript
// AVANT — pending_verification incorrectement traité comme blocage définitif
if (disabledReason && disabledReason !== 'requirements.past_due') {
  return 'disabled';   // ← trop large : incluait pending_verification
}
```

Stripe documente `requirements.pending_verification` comme état non-actionnable côté pro : il faut simplement attendre. Le regrouper avec les vraies désactivations (`rejected.fraud`, `under_review`, etc.) était une erreur de classification.

### Frontend — `loadStripeConnectStatus()`

La fonction affichait le panel `"disabled"` dès que `status === 'disabled'`, et rendait le `disabledReason` brut visible dans l'UI, sans traduction humaine.

---

## Correction backend

### Patch 1 — `computeStripeStatus()` : raisons non bloquantes

```typescript
// APRÈS
const nonBlockingReasons = [
  'requirements.past_due',           // récupérable via re-onboarding
  'requirements.pending_verification',  // ← AJOUTÉ : transitoire, pas un blocage
];
if (disabledReason && !nonBlockingReasons.includes(disabledReason)) {
  return 'disabled';
}

// ...
const pendingVerification = account.requirements?.pending_verification ?? [];

if (pendingVerification.length > 0 || disabledReason === 'requirements.pending_verification') {
  return 'pending';   // ← état correct : vérification en cours
}
```

**Impact :** un compte avec `disabled_reason = 'requirements.pending_verification'` retourne désormais `status: 'pending'` au lieu de `status: 'disabled'`.

### Patch 2 — `getConnectStatus()` : exposition du champ `pendingVerification`

```typescript
return {
  status,
  // ... autres champs ...
  currentlyDue:        account.requirements?.currently_due        ?? [],
  pastDue:             account.requirements?.past_due              ?? [],
  eventuallyDue:       account.requirements?.eventually_due       ?? [],
  pendingVerification: account.requirements?.pending_verification ?? [],  // ← AJOUTÉ
};
```

Le frontend peut ainsi détecter `pendingVerification.length > 0` indépendamment du `stripeDisabledReason`.

### Patch 3 — `createCheckoutSession()` : message client humain

```typescript
// AVANT
throw new BadRequestException(
  "Le compte Stripe de ce professionnel est désactivé. Le paiement est temporairement indisponible.",
);

// APRÈS
const isPendingVerification = disabledReason === 'requirements.pending_verification';
throw new BadRequestException(
  isPendingVerification
    ? "Ce professionnel n'a pas encore finalisé l'activation des paiements. La réservation avec paiement sera disponible dès que son compte Stripe sera vérifié."
    : "Le compte Stripe de ce professionnel est désactivé. Le paiement est temporairement indisponible.",
);
```

---

## Correction frontend

### Patch 4 — Panel HTML `stripe-state-pending` amélioré

```html
<div id="stripe-state-pending" class="stripe-state-panel" style="display:none;">
  <div style="background:rgba(80,80,200,.1); color:#2a2a8a; ...">
    🕐 Compte Stripe en cours de vérification
  </div>
  <p>Stripe vérifie actuellement vos informations. Vous pourrez recevoir des paiements
     dès que la vérification sera terminée.</p>
  <p style="color:#888;">Cette vérification peut prendre quelques minutes à quelques heures.</p>
  <div style="display:flex;gap:8px;flex-wrap:wrap;">
    <button class="secondary-btn" id="stripeRefreshStatusPendingBtn">↻ Actualiser le statut</button>
    <button class="secondary-btn" id="stripeResumeBtn">Continuer la vérification Stripe</button>
  </div>
</div>
```

Le panel existait mais affichait un message générique. Il montre maintenant un message rassurant et contextualisé.

### Patch 5 — `loadStripeConnectStatus()` réécrit

```javascript
const STRIPE_REASON_LABELS = {
  'requirements.pending_verification':
    'Stripe vérifie actuellement vos informations. Aucune action requise pour le moment.',
  'requirements.past_due':
    'Des informations sont manquantes sur votre compte Stripe. Cliquez pour compléter.',
  'listed':
    'Votre compte est en attente de validation par Stripe.',
  'under_review':
    'Votre compte est en cours de révision par Stripe.',
  'other':
    'Votre compte nécessite une vérification. Contactez le support Stripe.',
  'rejected.fraud':
    'Votre compte a été refusé (suspicion de fraude). Contactez le support Stripe.',
  'rejected.terms_of_service':
    "Votre compte a été refusé (conditions d'utilisation). Contactez le support Stripe.",
  'rejected.listed':
    'Votre compte a été refusé. Contactez le support Stripe.',
  'rejected.other':
    'Votre compte a été refusé. Contactez le support Stripe.',
};

async function loadStripeConnectStatus() {
  if (!appApi.getToken() || state.userMode !== 'pro') return;
  showStripePanel('loading');
  try {
    const raw = await appApi.getStripeConnectStatus();
    const s = raw?.data ?? raw;
    const status = s?.status ?? (s?.connected ? 'connected' : 'not_connected');
    const disabledReason = s?.stripeDisabledReason ?? null;

    const isPendingVerification =
      disabledReason === 'requirements.pending_verification' ||
      (s?.pendingVerification && s.pendingVerification.length > 0);

    const isPastDue =
      disabledReason === 'requirements.past_due' ||
      (s?.pastDue && s.pastDue.length > 0 && status === 'disabled');

    if (isPendingVerification) {
      showStripePanel('pending');                    // ← affiche le bon panel
    } else if (isPastDue) {
      showStripePanel('past_due');
    } else {
      showStripePanel(status);
    }

    if (status === 'disabled' && disabledReason && !isPastDue && !isPendingVerification) {
      const msgEl = document.getElementById('stripeDisabledMsg');
      if (msgEl) {
        msgEl.textContent = STRIPE_REASON_LABELS[disabledReason]
          || 'Votre compte Stripe nécessite une attention. Contactez le support Stripe ou UBODROP.';
      }
    }
  } catch (err) {
    showStripePanel('not_connected');
    console.warn('[Stripe] loadStripeConnectStatus error', err);
  }
}
```

### Patch 6 — Bouton `stripeRefreshStatusPendingBtn` câblé

```javascript
document.getElementById("stripeRefreshStatusPendingBtn")?.addEventListener("click", async () => {
  const btn = document.getElementById("stripeRefreshStatusPendingBtn");
  if (btn) { btn.disabled = true; btn.textContent = "Actualisation…"; }
  await loadStripeConnectStatus();
  if (btn) { btn.disabled = false; btn.textContent = "↻ Actualiser le statut"; }
});
```

---

## Messages affichés au pro

| Situation Stripe | Panel affiché | Message |
|-----------------|--------------|---------|
| Pas de compte Stripe | `stripe-state-not-connected` | "Connectez votre compte Stripe pour recevoir des paiements" |
| `pending_verification` (en cours de vérif) | `stripe-state-pending` | "🕐 Compte Stripe en cours de vérification — Stripe vérifie vos informations…" |
| `past_due` / `currently_due` | `stripe-state-past-due` | "Des informations sont manquantes — Cliquez pour compléter" |
| `charges_enabled = true` | `stripe-state-connected` | "✅ Compte Stripe actif — vous pouvez recevoir des paiements" |
| `rejected.*` ou autre blocage réel | `stripe-state-disabled` | Libellé humain depuis `STRIPE_REASON_LABELS` |

---

## Impact sur le parcours client

| Cas | Comportement |
|-----|-------------|
| Pro en `pending_verification`, client essaie de payer | `createCheckoutSession()` lève une `BadRequestException` avec message : **"La réservation avec paiement sera disponible dès que son compte Stripe sera vérifié."** |
| Pro actif (`charges_enabled = true`) | Checkout Stripe créé normalement, paiement possible |
| Pro réellement désactivé (`rejected.*`) | `BadRequestException` : "Le compte Stripe de ce professionnel est désactivé." |

---

## Tests réalisés

| Test | Résultat |
|------|---------|
| `computeStripeStatus` avec `disabled_reason = 'requirements.pending_verification'` | Retourne `'pending'` ✅ |
| `computeStripeStatus` avec `disabled_reason = 'requirements.past_due'` | Retourne `'action_required'` si `currently_due` présents ✅ |
| `computeStripeStatus` avec `disabled_reason = 'rejected.fraud'` | Retourne `'disabled'` ✅ |
| `getConnectStatus` inclut `pendingVerification: []` dans la réponse | ✅ |
| Frontend : `isPendingVerification = true` → `showStripePanel('pending')` | ✅ |
| Frontend : `STRIPE_REASON_LABELS['requirements.pending_verification']` défini | ✅ |
| `npx tsc --noEmit` (backend) | OK — 0 erreur ✅ |
| `node --check` (JS extrait de app.html) | OK — 3567 lignes ✅ |

---

## Verdict

**GO production.**

- Un pro dont Stripe vérifie les informations voit désormais un message rassurant ("🕐 Compte Stripe en cours de vérification") avec un bouton "Actualiser" — et non plus "Compte désactivé : requirements.pending_verification".
- Un client qui essaie de réserver chez ce pro reçoit un message compréhensible ("disponible dès que son compte Stripe sera vérifié") au lieu d'un message technique.
- Les vraies désactivations Stripe (`rejected.*`, `under_review`) continuent d'afficher le panel `disabled` avec un libellé humain précis.

---

## Commandes de commit

### Backend

```cmd
cd C:\Users\HP-15\UBODROP-Backend
git add src/modules/payments/payments.service.ts
git commit -m "fix(stripe): pending_verification non bloquant + message client clair

- computeStripeStatus : pending_verification -> 'pending' (pas 'disabled')
- getConnectStatus : expose pendingVerification[] dans la réponse
- createCheckoutSession : message humain pour pending_verification
- nonBlockingReasons : past_due + pending_verification exclus de 'disabled'"
git push origin main
```

### Frontend

```cmd
cd C:\Users\HP-15\Downloads\UBO-DROP-violet
git add app.html RAPPORT_STRIPE_CONNECT_PENDING_VERIFICATION_UBODROP.md
git commit -m "fix(stripe-ux): pending_verification -> panel + message lisibles

- stripe-state-pending : message rassurant + bouton Actualiser
- loadStripeConnectStatus : STRIPE_REASON_LABELS + isPendingVerification
- stripeRefreshStatusPendingBtn : câblé + feedback visuel
- Plus aucun code Stripe brut affiché au pro"
git push origin main
```
