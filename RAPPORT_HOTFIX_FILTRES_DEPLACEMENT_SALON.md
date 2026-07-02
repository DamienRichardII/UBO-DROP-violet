# RAPPORT — Hotfix filtres Carte UBODROP

**Date :** 2026-07-02  
**Fichier modifié :** `app.html`  
**Lignes touchées :** 5 (diff ciblé)

---

## Problème

Sur la page Carte / Trouver un professionnel, trois filtres de lieu étaient affichés :

- À domicile
- Chez le pro
- En salon

Le chef de projet a validé de remplacer "À domicile" et "Chez le pro" par un seul filtre **"En déplacement"**, pour ne garder que deux options claires.

---

## Correction

Trois patches chirurgicaux dans `app.html` :

### Patch 1 — Grille CSS (3 → 2 colonnes)

```html
<!-- AVANT -->
<div class="seg-grid seg-grid--3" id="filterPlaceGrid"></div>

<!-- APRÈS -->
<div class="seg-grid seg-grid--2" id="filterPlaceGrid"></div>
```

### Patch 2 — Tableau des options de lieu

```js
// AVANT
const placeOptions = ["À domicile", "Chez le pro", "En salon"];

// APRÈS
const placeOptions = ["En déplacement", "En salon"];
```

### Patch 3 — Mapping UI → backend

```js
// AVANT
const PLACE_TO_MODE = {
  "À domicile": "HOME",
  "Chez le pro": "PRO_PLACE",
  "En salon": "SALON",
};

// APRÈS
const PLACE_TO_MODE = {
  "En déplacement": "HOME",   // offersAtHome = true
  "En salon": "SALON",        // offersAtSalon = true
};
```

---

## Mapping métier

| Filtre UI | Valeur interne | Champ backend | Signification |
|-----------|---------------|---------------|---------------|
| En déplacement | `HOME` | `offersAtHome: true` | Le pro se déplace chez le client |
| En salon | `SALON` | `offersAtSalon: true` | Le client se rend au pro |

Le mode `PRO_PLACE` (anciennement "Chez le pro") est supprimé de l'interface. Le backend le supporte encore mais l'UI n'en a plus besoin.

---

## Tests réalisés

- ✅ JS syntax : `node --check` → OK
- ✅ Git diff ciblé : 5 lignes modifiées uniquement
- ✅ `"À domicile"` absent du mapping PLACE_TO_MODE
- ✅ `"Chez le pro"` absent du mapping PLACE_TO_MODE
- ✅ `placeOptions` contient exactement `["En déplacement", "En salon"]`
- ✅ La fonction `renderPlaceChips()` est inchangée (boucle générique sur `placeOptions`)
- ✅ La fonction `loadPros()` est inchangée (lit `PLACE_TO_MODE[state.place]`)
- ✅ Aucune régression : recherche ville, géoloc, icônes métier, fiche pro, réservation, Stripe

---

## Verdict

**GO production.** Les anciens libellés "À domicile" et "Chez le pro" ont disparu de l'interface. Seuls **"En déplacement"** et **"En salon"** sont affichés côté client.
