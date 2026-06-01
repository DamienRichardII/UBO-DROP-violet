# RAPPORT — Fix prestations visibles côté client en production

**Date :** 1er juin 2026 · Session 16  
**TypeScript :** ✅ 0 erreur

---

## 1. Causes racines identifiées (3 causes combinées)

### Cause A — JWT expiré à 15 min (CRITIQUE)
Le token JWT était signé avec `expiresIn: '15m'`. Si le pro se connecte, configure son profil, crée une prestation et clique "Publier" plus de 15 minutes après la connexion :
- L'appel `PATCH /services/:id` retourne 401
- La session est effacée + redirection vers login en 120ms
- La prestation reste en DRAFT sans que le pro comprenne pourquoi
- **Le pro pense avoir publié mais ne l'a pas fait**

**Fix appliqué :** JWT passé à `'2h'` dans `auth.service.ts` (4 occurrences : login, registerClient, registerProfessional, loginWithGoogle)

### Cause B — `ServiceStatus` non importé dans profiles.service.ts
`profiles.service.ts` utilisait le string literal `'ACTIVE'` au lieu de l'enum `ServiceStatus.ACTIVE`. Bien que Prisma l'accepte (les enums sont des strings en TypeScript), l'import manquant pouvait théoriquement causer des inconsistances avec certaines versions de Prisma.

**Fix appliqué :** Import `ServiceStatus` ajouté, enum utilisé correctement.

### Cause C — Price Prisma Decimal mal géré (potentiel)
Prisma retourne les champs `Decimal` comme des strings JSON (`"20.00"`). La fonction `normalizeService` n'était pas robuste pour tous les cas (string/number/null).

**Fix appliqué :** `normalizeService` entièrement renforcé avec `parseFloat` explicite et fallback.

---

## 2. Corrections backend

### auth.service.ts
```typescript
// AVANT
expiresIn: '15m'  // ← JWT expire après 15 minutes

// APRÈS
expiresIn: '2h'   // ← JWT valide 2 heures pour la bêta
```

### profiles.service.ts
```typescript
// AVANT
import { CategoryName } from '@prisma/client';
services: { where: { status: 'ACTIVE' }, ...

// APRÈS
import { CategoryName, ServiceStatus } from '@prisma/client';
services: {
  where: { status: ServiceStatus.ACTIVE },
  orderBy: [{ createdAt: 'desc' }],
  select: { id: true, title: true, description: true, price: true,
            durationMin: true, status: true, updatedAt: true, ... }
```

Logs enrichis :
```
[PublicProfile] id={id} isVisible=true isOnline=true servicesActive=1 names=[dégradé bas]
```

### Endpoint de diagnostic ajouté (sans auth)
```
GET /api/v1/profiles/pro/public/:id/services
```
Retourne tous les services (ACTIVE + DRAFT) avec leur statut pour diagnostiquer en production.

---

## 3. Corrections frontend

### normalizeService — robustesse price Decimal
```javascript
// AVANT (fragile)
price: euro(service?.priceAmount ?? service?.price),

// APRÈS (robuste pour string/number/Decimal)
const rawPrice = service?.priceAmount ?? service?.price ?? service?.priceCents;
const n = typeof rawPrice === 'string' ? parseFloat(rawPrice) : Number(rawPrice);
priceNum = isNaN(n) ? 0 : n;
price: priceNum > 0 ? priceNum.toLocaleString('fr-FR', { style:'currency', currency:'EUR' }) : '...'
```

### handleServiceStatusChange — vérification session avant Publier
```javascript
// AVANT (silencieux si token expiré)
await appApi.updateService(serviceId, { status: newStatus });

// APRÈS (vérification explicite)
if (!appApi.getToken()) {
  notify("⚠ Session expirée — reconnecte-toi d'abord puis réessaie.", "error");
  goTo("screen-login");
  return;
}
```

### openPro — logging complet de la réponse API
Chaque ouverture de fiche pro log maintenant dans la console :
```
[UBODROP] → GET public profile {id}
[UBODROP] ← raw public profile { servicesCount: 1, servicesRaw: [...] }
[UBODROP] ← normalized services 1 [{ name: "...", price: "20,00 €" }]
```

---

## 4. Test endpoint diagnostic public

### ÉTAPE 1 — Récupérer l'ID du pro
Dans l'app, connexion pro → inspecter la console → chercher `[UBODROP] → GET public profile {id}`.

### ÉTAPE 2 — Tester l'endpoint diagnostic
Ouvrir dans le navigateur (sans auth) :
```
https://www.ubodrop.com/api/v1/profiles/pro/public/{PROFILE_ID}/services
```

Résultat attendu :
```json
{
  "proProfile": { "id": "...", "displayName": "...", "isVisible": true, "isOnline": true },
  "totalServices": 1,
  "activeServices": 1,
  "draftServices": 0,
  "services": [
    {
      "id": "...",
      "title": "dégradé bas",
      "status": "ACTIVE",
      "price": "20.00",
      "durationMin": 30,
      "category": "BARBER",
      "updatedAt": "2026-06-01T..."
    }
  ]
}
```

**Si `activeServices: 0` → le problème est backend/DB (statut DRAFT = Publier n'a pas fonctionné).**  
**Si `activeServices: 1` mais la fiche client n'affiche rien → le problème est frontend/normalisation.**

### ÉTAPE 3 — Test endpoint public profil complet
```
https://www.ubodrop.com/api/v1/profiles/pro/public/{PROFILE_ID}
```
Vérifier que `"services"` contient bien la prestation publiée.

---

## 5. Protocole de test après push

### Test A — Pro (après reconnexion)
1. **Se déconnecter et se reconnecter** (pour avoir un token frais 2h)
2. Aller dans Prestations
3. Si la prestation est en "Brouillon — invisible côté client" → cliquer 📢 **Publier**
4. Vérifier que le toast "✅ Prestation publiée — visible côté client maintenant." apparaît
5. Vérifier que le statut passe à "Publié — visible côté client" (vert)

### Test B — Endpoint diagnostic
```
https://www.ubodrop.com/api/v1/profiles/pro/public/{ID}/services
```
→ Doit retourner `activeServices: 1`

### Test C — Client
1. Ouvrir `https://ubodrop.com/app.html`
2. Rechercher le pro
3. Ouvrir la fiche
4. **Vérifier la console navigateur** : chercher `[UBODROP] ← raw public profile`
5. Le champ `servicesCount` doit être ≥ 1
6. La prestation doit apparaître avec le prix et la durée

---

## 6. Verdict

```
✅ GO après push + test de reconnexion
```

**Le fix JWT (15min → 2h) est très probablement la cause principale.**  
Le pro devait se reconnecter et republier pour que ça fonctionne, sans s'en rendre compte.

Après push et redéploiement Railway + Vercel :
- Un pro connecté depuis moins de 2h peut publier sans problème
- Les logs console permettront de confirmer que les services remontent bien de l'API
- L'endpoint `/services` permet de diagnostiquer directement en cas de doute

---

## 7. Commandes push

### Backend
```bash
cd C:\Users\HP-15\UBODROP-Backend

git add src/modules/auth/auth.service.ts
git add src/modules/profiles/profiles.service.ts
git add src/modules/profiles/profiles.controller.ts
git add src/modules/services/services.service.ts

git commit -m "Fix: JWT 2h, ServiceStatus enum, diagnostic endpoint, logs enrichis"
git push origin main
```

### Frontend
```bash
cd C:\Users\HP-15\Downloads\UBO-DROP-violet

git restore --staged .
git add app.html RAPPORT_FIX_PRESTATIONS_CLIENT_PROD.md

git commit -m "Fix: normalizeService robust price, session check avant Publier, logs openPro"
git push origin main
```

### Après déploiement — tester immédiatement
1. Attendre Railway redeploy (~2 min)
2. **Se reconnecter en pro** (nouveau token 2h)
3. Publier la prestation
4. Tester l'endpoint diagnostic `/services`
5. Vérifier côté client

*Rapport généré le 01/06/2026 — Session 16*
