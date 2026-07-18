# CHECKLIST DÉPLOIEMENT UBODROP — SPRINT P0
**Date :** 2026-07-18  
**Branches :** `main` (frontend Vercel + backend Railway)

---

## AVANT DE DÉPLOYER

- [ ] Vérifier que `DEPLOY_P0_SPRINT.ps1` est disponible dans `C:\Users\HP-15\Downloads\UBO-DROP-violet\`
- [ ] Fermer les applications qui pourraient tenir des fichiers git ouverts (VS Code, etc.)
- [ ] Avoir accès aux dashboards Railway et Vercel dans un navigateur

---

## ÉTAPE 1 — DÉPLOIEMENT BACKEND (Railway)

Ouvrir PowerShell et exécuter :

```powershell
.\DEPLOY_P0_SPRINT.ps1
```

Ou manuellement :

```powershell
# 1. Supprimer le lock stale (si présent)
cd C:\Users\HP-15\UBODROP-Backend
Remove-Item -Force ".git\index.lock" -ErrorAction SilentlyContinue

# 2. Stager les 4 fichiers modifiés
git add `
  src/modules/auth/auth.service.ts `
  src/modules/auth/auth.controller.ts `
  src/modules/bookings/bookings.service.ts `
  src/modules/bookings/bookings.controller.ts

# 3. Vérifier (doit lister exactement ces 4 fichiers)
git diff --cached --name-only

# 4. Committer
git commit -m "P0 sprint : verif email (EmailVerificationToken), reset pwd fix, PATCH bookings/:id/accept+reject"

# 5. Pusher
git push origin main
```

**Vérification Railway :**
- [ ] Dashboard Railway → onglet Deployments → Build en cours
- [ ] Build réussi (≈ 2-3 min, pas d'erreur TypeScript)
- [ ] Test health : `GET https://ubodrop-backend-production.up.railway.app/health` → `{"status":"ok"}`
- [ ] Test nouvelles routes (curl ou Postman) :
  - `POST /auth/verify-email` avec `{"token":"test"}` → doit retourner 400/401, pas 404
  - `PATCH /bookings/any-id/accept` → doit retourner 401 (non authentifié), pas 404

---

## ÉTAPE 2 — DÉPLOIEMENT FRONTEND (Vercel)

```powershell
cd C:\Users\HP-15\Downloads\UBO-DROP-violet
git push origin main
```

⚠️ Le commit `442f6f7` (P0 sprint) existe déjà localement — le push suffira.

**Vérification Vercel :**
- [ ] Dashboard Vercel → Deployments → Build en cours
- [ ] Build réussi (≈ 1 min)
- [ ] Ouvrir l'app en prod → carte Mapbox affichée → pas d'erreur console
- [ ] Vérifier que `screen-verify-email` existe bien : taper `#verify-email=test` en URL → écran affiché

---

## ÉTAPE 3 — SMOKE TESTS POST-DÉPLOIEMENT

Exécuter ces 5 tests rapides avant la session de recette complète :

### S-01 — Inscription client (2 min)
- [ ] Créer un compte client avec une vraie adresse email
- [ ] Écran "Vérifie ton email" apparaît
- [ ] Email de confirmation reçu en < 30 s

### S-02 — Activation email (2 min)
- [ ] Cliquer le lien dans l'email
- [ ] "✅ Email confirmé ! Connexion en cours…" affiché
- [ ] Auto-login → dashboard client

### S-03 — Rayon (1 min)
- [ ] Écran recherche → vérifier 8 boutons de rayon
- [ ] Cliquer "1 km" → résultats changent immédiatement

### S-04 — Dashboard pro (2 min)
- [ ] Connexion compte pro
- [ ] Onglet RDV → vérifier que les boutons ✔/✖ apparaissent sur les réservations PENDING
- [ ] Flèche ‹ depuis "Mon compte" → retour sur dashboard pro

### S-05 — Résistance régression (1 min)
- [ ] Carte Mapbox visible
- [ ] Icônes métiers présentes
- [ ] Espace pro : onglets fonctionnels

---

## EN CAS DE PROBLÈME

### Build backend échoue (TypeScript error)
```bash
# Reproduire localement
cd C:\Users\HP-15\UBODROP-Backend
npx tsc --noEmit
```
Corriger l'erreur, committer un fix, re-pusher.

### Route 404 après déploiement
Railway n'a pas fini le redéploiement. Attendre 2-3 min et retester.

### Email non reçu
- Vérifier les logs Resend (dashboard resend.com)
- Vérifier la variable d'environnement `RESEND_API_KEY` dans Railway

### Erreur "Stripe" au paiement
Ne pas modifier la logique Stripe. Consulter les logs Railway + dashboard Stripe.

### Lock file `.git/index.lock` bloque le commit backend
```powershell
# Windows PowerShell
Remove-Item -Force "C:\Users\HP-15\UBODROP-Backend\.git\index.lock"
```

---

## VARIABLES D'ENVIRONNEMENT À VÉRIFIER (Railway)

| Variable | Présente ? | Ne jamais logger |
|----------|-----------|-----------------|
| `DATABASE_URL` | [ ] | ✓ |
| `JWT_SECRET` | [ ] | ✓ |
| `RESEND_API_KEY` | [ ] | ✓ |
| `STRIPE_SECRET_KEY` | [ ] | ✓ |
| `STRIPE_WEBHOOK_SECRET` | [ ] | ✓ |
| `FRONTEND_URL` | [ ] | — |

---

## POST-DÉPLOIEMENT — PROCHAINES ÉTAPES (V2)

Ces bugs sont hors scope du sprint P0 mais à planifier :

1. **Bug #1 Localisation automatique** — déclencher `centerOnUser()` au premier chargement avec consentement explicite
2. **Bug #2 Paiement** — reproduire avec Sofiane + inspecter logs Railway/Stripe pour isoler
3. **Bug #4 Pros ACTIVE immédiatement** — passer `registerProfessional` à `PENDING_EMAIL_VERIFICATION` (même logique que clients)
4. **Bug #6 Règle 3 lieux** — ajouter contrainte business dans `syncModeChips()`
5. **Bug #7 Parcours réservation** — date picker + time picker avant confirmation
6. **Bug #8 Portfolio** — `btn.disabled=true` pendant upload + vérif taille max
7. **Bug #10 Photo profil** — investiguer l'URL Cloudinary/S3 non rafraîchie dans l'UI

---

*Checklist UBODROP — Sprint P0 — 2026-07-18*
