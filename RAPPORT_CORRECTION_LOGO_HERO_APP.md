# RAPPORT — Correction logo hero app.html

**Date :** 1er juin 2026 · Session 16  
**Fichier :** `app.html`

## Correction appliquée

- **Suppression du doublon texte UBODROP** sous le logo : `<div class="brand-title home-brand-title">UBODROP</div>` retiré du hero (écran home).
- **Agrandissement du logo hero** : `.home-logo` passé de `height:38px / max-width:180px` à `width: clamp(220px, 58vw, 320px) / height:auto` — logo centré, responsive, impact visuel retrouvé.
- CSS `.home-logo` nettoyé (deux blocs conflictuels fusionnés en un seul).

## Avant / Après

```
AVANT :
  [IMG logo-ubodrop-brown.png]   ← logo 38px de haut
  UBODROP                         ← doublon texte noir 3rem

APRÈS :
  [IMG logo-ubodrop-brown.png]   ← logo clamp(220px→320px), premium
  (rien)
```

## Fichier modifié

- `app.html`

## Tests réalisés

- Texte doublon absent du HTML ✅
- Logo toujours présent (ligne 865) ✅
- CSS `.home-logo` propre et sans !important conflictuel ✅
- Boutons CTA (Trouver un pro / Devenir pro) intacts ✅
- Steps card intacte ✅
- Appels API inchangés ✅
- Desktop OK ✅
- Mobile OK (clamp responsive) ✅
- Aucun impact sur login / inscription / navigation ✅

## Verdict

```
✅ GO
```

## Commandes push

```bash
cd C:\Users\HP-15\Downloads\UBO-DROP-violet

git add app.html RAPPORT_CORRECTION_LOGO_HERO_APP.md
git commit -m "Fix: suppression doublon texte UBODROP hero + agrandissement logo"
git push origin main
```
