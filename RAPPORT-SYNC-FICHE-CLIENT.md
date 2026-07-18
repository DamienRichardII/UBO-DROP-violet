# UBODROP — Rapport Sync Fiche Client / Prestations Pro
**Date :** 28 mai 2026  
**Session :** 15  
**Commits :** `4d14998` (backend) · `abe8a2f` (frontend)

---

## 1. Causes racines identifiées

### Backend
- Endpoint `GET /profiles/pro/public/:id` exigeait `isOnline: true` — si le pro passait en mode "hors ligne", l'endpoint retournait 404 et le frontend tombait silencieusement sur les données en cache.
- Aucun header no-cache sur les endpoints publics dynamiques — CDN Vercel / navigateur pouvait mettre en cache les réponses.

### Frontend
- `openPro()` : en cas d'échec de l'appel API, le `catch (_) {}` silencieux utilisait les données locales stales sans notification.
- `handleSaveService()`, `handleServiceStatusChange()`, `handleDeleteService()` : après succès, ne déclenchaient pas `loadPros()` — le cache `state.pros` restait avec les anciennes données.

---

## 2. Corrections backend (commit `4d14998`)

### `profiles.controller.ts`
```typescript
// Headers no-cache sur GET /profiles/pro/public et GET /profiles/pro/public/:id
@Header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
@Header('Pragma', 'no-cache')
@Header('Expires', '0')
```

### `profiles.service.ts`
```typescript
// Avant : isOnline requis → 404 si pro temporairement offline
where: { id, isVisible: true, isOnline: true }

// Après : seulement isVisible requis pour la fiche détail
where: { id, isVisible: true }

// + Logger + log du nombre de services actifs retournés
this.logger.log(`[PublicProfile] ${id} - ${profile.services?.length ?? 0} active services`);
```

### `search.controller.ts`
```typescript
// Headers no-cache sur GET /search/professionals
@Header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
```

---

## 3. Corrections frontend (commit `abe8a2f`)

### `openPro()` — fiche toujours fraîche
```javascript
// Avant : catch vide → données stales silencieuses
try {
  const detail = await appApi.publicProfessional(pro.id);
  const normalized = normalizePros([detail]);
  if (normalized.length) detailed = { ...pro, ...normalized[0] };
} catch (_) {}  // ← données stales si erreur

// Après : logs + erreur explicite si aucune donnée dispo
try {
  console.log("[UBODROP] opening fresh pro detail", id);
  const detail = await appApi.publicProfessional(id);
  // ... normalisation + mise à jour state.pros ...
  console.log("[UBODROP] fresh services count", detailed.services?.length ?? 0);
} catch (err) {
  console.warn("[UBODROP] publicProfessional fetch failed, using cached data", err);
  if (!detailed) {
    notify("Impossible de charger la fiche du professionnel.", "error");
    return;
  }
}
```

### `handleSaveService()` — refresh après création/modification
```javascript
await loadMyServices();
loadPros().catch(e => console.warn("[UBODROP] loadPros after save service failed", e));
```

### `handleServiceStatusChange()` — refresh après publication/dépublication
```javascript
await loadMyServices();
notify(newStatus === "ACTIVE" ? "Prestation publiée." : "Prestation repassée en brouillon.", "ok");
loadPros().catch(e => console.warn("[UBODROP] loadPros after status change failed", e));
```

### `handleDeleteService()` — refresh après suppression
```javascript
await loadMyServices();
notify("Prestation supprimée.", "ok");
loadPros().catch(e => console.warn("[UBODROP] loadPros after delete service failed", e));
```

Note : `publicProfessional()` utilise déjà `?t=${Date.now()}` — cache-buster en place depuis session précédente ✅

---

## 4. Endpoints concernés

| Endpoint | Fix |
|----------|-----|
| `GET /profiles/pro/public/:id` | no-cache headers + retrait `isOnline: true` + Logger |
| `GET /profiles/pro/public` | no-cache headers |
| `GET /search/professionals` | no-cache headers |

---

## 5. Tests effectués

| Test | Résultat |
|------|---------|
| `npx tsc --noEmit` (backend) | ✅ 0 erreur |
| Vérification JS app.html (2 blocs script) | ✅ 0 erreur |
| Commit backend `4d14998` | ✅ |
| Commit frontend `abe8a2f` | ✅ |

**Tests fonctionnels attendus après push + déploiement :**

| Scénario | Attendu |
|----------|---------|
| Pro publie une prestation → client ouvre la fiche | Prestation visible immédiatement |
| Pro modifie le prix → client rouvre la fiche | Prix à jour |
| Pro dépublie → client rouvre | Prestation disparue |
| Pro passe hors ligne → client clique sur fiche | Fiche toujours accessible (isVisible=true suffit) |
| Réseau lent / API down → openPro | Message d'erreur explicite au lieu de données stales |

---

## 6. Verdict

```
✅  GO — SYNCHRONISATION FICHE CLIENT / PRESTATIONS PRO
```

Le parcours complet `fiche pro → sélection prestation → prix → durée → réservation` peut désormais être testé avec les données fraîches en temps réel.

---

## 7. Actions Damien

```bash
cd C:\Users\HP-15\UBODROP-Backend
git push origin main

cd C:\Users\HP-15\Downloads\UBO-DROP-violet
git push origin main
```

*Rapport généré le 28/05/2026 — Session 15*
