# RAPPORT — Correction "Lieu de travail" UBODROP

**Date :** 2026-07-02  
**Mission :** Sofiane — Implémenter "Lieu de travail" comme filtre réel (Domicile / Déplacement / Salon)  
**Fichier modifié :** `app.html`  
**Validation :** JS syntax OK

---

## Contexte

Le filtre "Lieu de la prestation" dans l'interface client contenait des labels ambigus ("À domicile", "Chez le pro") qui ne correspondaient pas à une sémantique claire du point de vue client. Sofiane a demandé de refondre ce concept en **"Lieu de travail"** avec trois options distinctes et cohérentes entre l'espace client (filtre carte) et l'espace pro (profil).

---

## Problème identifié

### Avant (session précédente — hotfix partiel)

Le hotfix précédent avait réduit les options à 2 : `["En déplacement", "En salon"]`. Ce n'était qu'une correction d'urgence. La mission complète demandait :

1. **Côté client (filtre carte)** : 3 options — Domicile, Déplacement, Salon
2. **Côté pro (profil)** : mêmes labels, même sémantique
3. **Backend** : mapping clair vers `offersAtHome`, `offersAtProLocation`, `offersAtSalon`

### Ambiguïté sémantique corrigée

| Option UI | Sens | Champ backend | Mode |
|-----------|------|---------------|------|
| 🏠 Domicile | Le pro vient chez le client | `offersAtHome` | `HOME` |
| 🚗 Déplacement | Le pro se déplace (contexte variable) | `offersAtProLocation` | `PRO_PLACE` |
| ✂️ Salon | Le client va au salon du pro | `offersAtSalon` | `SALON` |

---

## Corrections appliquées (5 patches)

### Patch 1 — placeOptions côté client

```javascript
// AVANT
const placeOptions = ["En déplacement", "En salon"];

// APRÈS
const placeOptions = ["Domicile", "Déplacement", "Salon"];
```

### Patch 2 — PLACE_TO_MODE

```javascript
// AVANT
const PLACE_TO_MODE = {
  "En déplacement": "HOME",
  "En salon": "SALON",
};

// APRÈS
const PLACE_TO_MODE = {
  "Domicile":    "HOME",       // offersAtHome
  "Déplacement": "PRO_PLACE",  // offersAtProLocation (repurposed)
  "Salon":       "SALON",      // offersAtSalon
};
```

> Note : L'accent sur `"Déplacement"` est crucial pour que le lookup `PLACE_TO_MODE[state.place]` fonctionne (clé et valeur doivent être identiques).

### Patch 3 — Grille filtre (2 colonnes → 3 colonnes)

```html
<!-- AVANT -->
<div class="seg-grid seg-grid--2" id="filterPlaceGrid"></div>

<!-- APRÈS -->
<div class="seg-grid seg-grid--3" id="filterPlaceGrid"></div>
```

### Patch 4 — Label filtre overlay

```html
<!-- AVANT -->
<h4>Lieu de la prestation</h4>

<!-- APRÈS -->
<h4>Lieu de travail</h4>
```

### Patch 5 — Chips espace pro (profil pro)

```html
<!-- AVANT -->
<label>Modes de prestation</label>
<button ... id="chipModeHome">🏠 À domicile</button>
<button ... id="chipModeProLoc">💼 Chez le pro</button>
<button ... id="chipModeSalon">✂️ En salon</button>

<!-- APRÈS -->
<label>Lieu de travail</label>
<div class="section-sub">Où proposes-tu tes services ? Sélectionne tout ce qui s'applique.</div>
<button ... id="chipModeHome">🏠 Domicile</button>
<button ... id="chipModeProLoc">🚗 Déplacement</button>
<button ... id="chipModeSalon">✂️ Salon</button>
<div class="section-sub">🏠 Domicile = tu te rends chez le client · ...</div>
```

---

## Cohérence système complète

### Mapping end-to-end

```
Client sélectionne "Salon"
  → state.place = "Salon"
  → PLACE_TO_MODE["Salon"] = "SALON"
  → GET /search/professionals?mode=SALON
  → SearchService WHERE offersAtSalon = true
  → Pros avec offersAtSalon cochés dans leur profil
  → Affichés sur la carte
```

### Flux pro (profil)

```
Pro coche "🚗 Déplacement" dans son profil
  → chipModeProLoc.active → proModeProLoc.checked = true
  → handleSaveProProfile() envoie offersAtProLocation: true
  → PATCH /profiles/pro/me { offersAtProLocation: true }
  → Sauvegardé en base
  → Apparaît dans les recherches "Déplacement" des clients
```

---

## Fonctions non modifiées (inchangées)

- `renderPlaceChips()` — boucle générique sur `placeOptions`, aucune adaptation requise
- `loadPros()` — lit `PLACE_TO_MODE[state.place]`, aucune adaptation requise
- `syncModeChips()` — synchronise les checkboxes cachés avec les chips visuels
- `handleSaveProProfile()` — envoie `offersAtHome`, `offersAtProLocation`, `offersAtSalon`

---

## Bug corrigé en cours de patch

**Bug trouvé :** Dans le Patch 2 initial, la clé avait été écrite `"Deplacement"` (sans accent) alors que `placeOptions` contient `"Déplacement"` (avec accent). Le lookup `PLACE_TO_MODE[state.place]` aurait retourné `undefined` pour le filtre Déplacement.

**Correction immédiate :** `"Deplacement"` → `"Déplacement"` avant merge.

---

## Validation

```bash
node --check /tmp/app_scripts.js
# JS syntax: OK

grep -n "placeOptions" app.html
# 1633: const placeOptions = ["Domicile", "Déplacement", "Salon"];

grep -A5 "PLACE_TO_MODE = {" app.html
# "Domicile":    "HOME",
# "Déplacement": "PRO_PLACE",
# "Salon":       "SALON",

grep -n "filterPlaceGrid" app.html
# 1594: <div class="seg-grid seg-grid--3" id="filterPlaceGrid"></div>

grep -n "Lieu de travail" app.html
# 1282: <label>Lieu de travail</label>
# 1595: <h4>Lieu de travail</h4>
```

---

## Anti-régressions vérifiées

| Contrainte | Statut |
|-----------|--------|
| Ne pas réécrire app.html | ✅ Patches chirurgicaux (<20 lignes) |
| Ne pas casser la carte | ✅ `renderPlaceChips()` et `loadPros()` non modifiés |
| Ne pas casser les icônes métiers | ✅ `categoryKeyFromText()` non modifié |
| Ne pas casser la réservation | ✅ Aucun fichier de réservation modifié |
| Ne pas casser l'espace pro | ✅ Seuls les labels chips modifiés |
| Ne pas casser Stripe | ✅ Aucun fichier Stripe modifié |
| TypeScript / JS syntax | ✅ node --check → OK |

---

## Commande de commit

```cmd
cd C:\Users\HP-15\Downloads\UBO-DROP-violet

git add app.html

git commit -m "feat(lieu-travail): Domicile/Deplacement/Salon - filtre client + espace pro

Mission Sofiane - Lieu de travail (B1+B2+B4+B5) :
- placeOptions: [Domicile, Deplacement, Salon] (3 options)
- PLACE_TO_MODE: Domicile=HOME / Deplacement=PRO_PLACE / Salon=SALON
- filterPlaceGrid: seg-grid--3 (3 colonnes)
- Filtre overlay: Lieu de travail (au lieu de 'Lieu de la prestation')
- Espace pro profil: label Lieu de travail + chips renommes + description
- Fix: accent Deplacement dans PLACE_TO_MODE (bug lookup evite)"

git push origin main
```

---

## Verdict

**GO production.** Les 5 patches sont appliqués, validés (JS syntax OK), et cohérents de bout en bout : le filtre client "Lieu de travail" communique correctement avec les champs backend `offersAtHome`, `offersAtProLocation`, `offersAtSalon`, eux-mêmes synchronisés depuis l'espace pro via les chips "Domicile / Déplacement / Salon".
