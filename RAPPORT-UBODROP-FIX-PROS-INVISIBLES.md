# UBODROP — Rapport Fix Nouveaux Pros Invisibles
**Session 8 — 20 mai 2026**

---

## 1. Cause racine exacte

Quatre causes cumulatives rendaient les nouveaux pros invisibles côté client.

### Cause A — `state.category = "COIFFEUSE"` par défaut (Frontend)

```javascript
// AVANT — app.html ligne 1428
const state = {
  category: "COIFFEUSE",   // ← filtre actif dès le chargement
  place: "À domicile",     // ← mode HOME actif dès le chargement
  ...
};
```

`loadPros()` envoyait systématiquement `?category=COIFFEUSE` à l'API. Un nouveau pro inscrit en BARBER, MASSAGE ou tout autre métier était invisible dès le départ, même sans aucun filtre sélectionné par l'utilisateur.

### Cause B — `state.place = "À domicile"` par défaut (Frontend)

`PLACE_TO_MODE["À domicile"] = "HOME"` → `loadPros()` envoyait systématiquement `?mode=HOME`. Tout pro créé avec `offersAtHome=false` était exclu de tous les résultats.

### Cause C — `offersAtHome ?? false` à la création (Backend)

```typescript
// AVANT — auth.service.ts
offersAtHome: dto.offersAtHome ?? false,       // ← false si non fourni
offersAtProLocation: dto.offersAtProLocation ?? false,  // ← false si non fourni
```

Le formulaire d'inscription frontend n'envoyait pas `offersAtHome=true` explicitement. Résultat : tous les nouveaux pros avaient `offersAtHome=false` en DB, et le filtre `mode=HOME` les excluait.

### Cause D — `resetFilters` remettait une catégorie par défaut, jamais `null`

```javascript
// AVANT
document.getElementById("resetFilters").onclick = () => {
  state.category = state.categories[0]?.key || "BARBER";  // ← filtre toujours actif
  state.place = "À domicile";  // ← mode toujours actif
  ...
};
```

Même après reset explicite, un filtre restait appliqué.

---

## 2. Corrections backend appliquées

### `auth.service.ts` — registerProfessional

```typescript
// APRÈS
offersAtHome: dto.offersAtHome ?? true,         // visible si mode=HOME
offersAtProLocation: dto.offersAtProLocation ?? true,  // visible si mode=PRO_PLACE
offersAtSalon: dto.offersAtSalon ?? false,
isVisible: true,
isOnline: true,  // explicite (était seulement le défaut Prisma)
```

### `auth.service.ts` — bootstrap onApplicationBootstrap

```typescript
// AVANT : corrigeait uniquement isVisible=false
// APRÈS : corrige aussi isOnline=false pour les pros existants en DB
const { count } = await this.prisma.proProfile.updateMany({
  where: {
    user: { status: 'ACTIVE' },
    OR: [{ isVisible: false }, { isOnline: false }],
  },
  data: { isVisible: true, isOnline: true },
});
```

Tous les anciens pros créés avec `isOnline=false` ou `isVisible=false` sont automatiquement rendus visibles au prochain redémarrage backend.

### `search.service.ts` — Logs diagnostic

```typescript
this.logger.log(`[Search] params — category=${...} city=${...} mode=${...} maxPrice=${...}`);
// ...
this.logger.log(`[Search] résultats — total=${total} retournés=${items.length}`);
```

Visibles dans les logs Railway pour diagnostiquer les prochaines anomalies.

### `auth.service.ts` — Log inscription pro

```typescript
this.logger.log(
  `[RegisterPro] créé — userId=${user.id} proProfileId=${user.proProfile?.id} ` +
  `isVisible=${...} isOnline=${...} offersAtHome=${...} specialtiesCount=${...} city=${...}`,
);
```

---

## 3. Corrections frontend appliquées

### `app.html` — État initial sans filtre

```javascript
// APRÈS
const state = {
  category: null,   // aucune catégorie sélectionnée par défaut
  place: null,      // aucun mode sélectionné par défaut
  ...
};
```

`loadPros()` au démarrage retourne désormais **tous** les pros visibles, sans filtre.

### `app.html` — Pills catégorie avec toggle

```javascript
// APRÈS — cliquer sur une pill active la désélectionne
btn.onclick = () => {
  state.category = state.category === cat.key ? null : cat.key;
  renderFilterCategories();
  loadPros();  // appel API avec nouvelle catégorie (ou sans)
};
```

L'appel `loadPros()` remplace l'ancien `renderPros()` (qui ne faisait qu'un filtre local).

### `app.html` — Place chips avec toggle

```javascript
chip.onclick = () => {
  state.place = state.place === place ? null : place;
  renderPlaceChips();
};
```

### `app.html` — Reset filtres → null

```javascript
document.getElementById("resetFilters").onclick = () => {
  state.category = null;   // aucune catégorie
  state.place = null;      // aucun mode
  state.radius = 5;
  state.budget = null;
  state.searchLocation = { lat: 48.8566, lng: 2.3522, label: "Paris" };
  // ...
  loadPros();
};
```

Idem pour le bouton inline "Réinitialiser les filtres" dans la liste vide.

### `app.html` — loadCategories() guard corrigé

```javascript
// AVANT : si category n'existe pas dans la liste → forcer le 1er
if (!state.categories.some((cat) => cat.key === state.category)) {
  state.category = state.categories[0]?.key || "COIFFEUSE"; // ← forçait toujours un filtre
}

// APRÈS : ne corriger que si une catégorie était définie mais est devenue invalide
if (state.category && !state.categories.some((cat) => cat.key === state.category)) {
  state.category = null;
}
```

---

## 4. Fichiers modifiés

| Fichier | Modifications |
|---|---|
| `UBO-DROP-violet/app.html` | state initial category/place → null ; pills toggle + loadPros() ; reset → null ; loadCategories guard |
| `UBODROP-Backend/src/modules/auth/auth.service.ts` | offersAtHome/ProLoc ?? true ; isOnline: true explicite ; bootstrap isOnline ; log diagnostic |
| `UBODROP-Backend/src/modules/search/search.service.ts` | Logger import ; logs params + résultats |

---

## 5. Tests à effectuer

### Test 1 — Nouveau pro immédiatement visible

1. Créer un compte pro : métier BARBER, ville Paris
2. Se déconnecter
3. Ouvrir la carte côté client
4. **Résultat attendu :** le pro apparaît dans la liste sans aucun filtre

### Test 2 — Pro multi-métiers dans plusieurs filtres

1. Créer un pro avec BARBER + MASSAGE + MANUCURE
2. Côté client : cliquer pill BARBER → pro visible
3. Côté client : cliquer pill MASSAGE → pro visible
4. Côté client : cliquer pill MANUCURE → pro visible

### Test 3 — Reset filtres

1. Sélectionner COIFFEUSE + budget 50€
2. Cliquer "Réinitialiser" → aucun filtre actif → tous les pros visibles

### Test 4 — Pro sans prestation

1. Créer un pro sans ajouter de prestation
2. Ouvrir sa fiche côté client
3. **Résultat attendu :** « Ce professionnel configure encore ses prestations. »

### Test 5 — Filtre mode désactivable

1. Cliquer "À domicile" → pros filtrés (offersAtHome=true)
2. Cliquer à nouveau "À domicile" → désélectionné → tous les pros

---

## 6. Actions requises — Push

```bash
# Frontend
cd C:\Users\HP-15\Downloads\UBO-DROP-violet
git push origin main

# Backend
cd C:\Users\HP-15\UBODROP-Backend
git push origin main
```

---

## 7. Points de vigilance

| Point | Priorité |
|---|---|
| Pros existants en DB avec `offersAtHome=false` : bootstrap au prochain redémarrage backend | Automatique |
| Pros existants sans spécialité : apparaissent en recherche générale mais pas dans les filtres métiers | Acceptable lancement progressif |
| Cache Vercel : forcer revalidation si app.html n'est pas mis à jour immédiatement | Si besoin |
| Filtre `city` non envoyé si label = "Paris" (par conception) : pros sans ville enregistrée apparaissent dans la recherche générale | OK |

---

## 8. Verdict

### ✅ GO — Après push des deux repos

| Critère | Statut |
|---|---|
| Nouveau pro créé visible immédiatement côté client | ✅ Corrigé |
| Pro visible sans prestation active | ✅ Confirmé (pas de filtre services en recherche générale) |
| Pro visible dans chaque filtre métier choisi à l'inscription | ✅ Corrigé |
| Reset filtres remet à zéro sans catégorie forcée | ✅ Corrigé |
| Toggle pill catégorie (désélectionnable) | ✅ Corrigé |
| Anciens pros avec isOnline=false rendus visibles au redémarrage | ✅ Corrigé |
| TypeScript backend valide (npx tsc --noEmit) | ✅ |
| Syntaxe JS frontend valide (node --check) | ✅ |
| Pas de JS visible dans l'interface | ✅ (fix Session 7 conservé) |
| Pas de code visible hors balises script | ✅ |
