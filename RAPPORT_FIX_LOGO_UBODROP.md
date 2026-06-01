# RAPPORT — Correction Logos UBODROP

**Date :** 1er juin 2026 · Session 16  
**Auteur :** Claude (Cowork)  
**Statut :** ✅ Prêt pour push

---

## 1. Cause du problème

**Cause racine : `assets/brand/` jamais commité dans git → jamais déployé sur Vercel.**

Lors de la session précédente, les logos ont été copiés dans `assets/brand/` via le shell, mais le `git add assets/brand/` a échoué (index git corrompu). L'HTML pointait vers `assets/brand/logo-ubodrop-brown.png` — chemin absent du repo, donc absent sur Vercel → logo cassé.

**Deux problèmes liés :**
1. `assets/brand/` non commité — 0 fichier logo dans ce dossier sur Vercel
2. Les fichiers originaux `assets/LOGO UBODROP BROWN@300x.png` (avec espaces) n'ont jamais été ajoutés à git non plus

**Ce qui existe réellement dans git (HEAD) :**
```
assets/img/ubo-drop-logo.png   ← ancien logo violet
assets/logo-ubodrop.jpeg       ← ancien logo jpeg
assets/img/ (photos services)
```

---

## 2. Assets utilisés

| Fichier | Chemin source | Chemin cible (prod) |
|---------|--------------|---------------------|
| Logo principal brown | `assets/brand/logo-ubodrop-brown.png` | `assets/img/logo-ubodrop-brown.png` |
| Logo blanc | `assets/brand/logo-ubodrop-white.png` | `assets/img/logo-ubodrop-white.png` |
| Icône brown (favicon) | `assets/brand/logo-ubodrop-icon-brown.png` | `assets/img/logo-ubodrop-icon-brown.png` |
| Icône white | `assets/brand/logo-ubodrop-icon-white.png` | `assets/img/logo-ubodrop-icon-white.png` |

Format : PNG 1078×222 RGBA (logo), PNG 2.8–3.3 Ko (icône)

**Stratégie :** copie des logos dans `assets/img/` (dossier déjà tracké par git) → zéro problème de commit, chemin propre, pas d'espaces.

---

## 3. Fichiers modifiés

| Fichier | Refs corrigées |
|---------|---------------|
| `index.html` | 6 |
| `app.html` | 11 |
| `ubodrop-site-current-da-test.html` | 1 |
| `ubodrop-app-current-da-test.html` | 7 |

**Nouveaux assets ajoutés sur disque (à commiter) :**
```
assets/img/logo-ubodrop-brown.png       ← 12 Ko, 1078×222
assets/img/logo-ubodrop-white.png       ← 12 Ko, 1078×221
assets/img/logo-ubodrop-icon-brown.png  ← 2.8 Ko
assets/img/logo-ubodrop-icon-white.png  ← 3.3 Ko
```

---

## 4. Corrections appliquées

### Logo site (index.html)
- Header : `src="assets/img/logo-ubodrop-brown.png"` `height:36px`
- Footer : `src="assets/img/logo-ubodrop-white.png"` `height:28px`
- Favicon : `href="/assets/img/logo-ubodrop-icon-brown.png"`
- OG image : `https://www.ubodrop.com/assets/img/logo-ubodrop-brown.png`

### Logo app (app.html)
- Écran accueil (home-logo) : `src="assets/img/logo-ubodrop-brown.png"`
- Écran login : idem
- Écran register client : idem
- Écran register pro : idem
- Écran mot de passe oublié : idem
- Écran reset password : idem
- Écran messages/chat : idem (width:80px)
- Favicon + OG image : idem

### CSS logo app
- `.home-logo` : `width: clamp(220px, 58vw, 320px); height:auto; max-width:80%;`
- `.auth-logo` : `width:auto; max-width:200px; height:44px; object-fit:contain;`

---

## 5. Tests réalisés

| Test | Résultat |
|------|----------|
| Aucun chemin `brand/` résiduel dans les 4 fichiers HTML | ✅ |
| Logo brown dans header index.html (ligne 616) | ✅ |
| Logo white dans footer index.html (ligne 902) | ✅ |
| Logo brown dans écran home app.html (ligne 865) | ✅ |
| Logo brown dans 7 écrans auth app.html | ✅ |
| Assets copiés dans assets/img/ (4 fichiers) | ✅ |
| Format PNG valide (file command) | ✅ |
| Structure HTML intacte | ✅ |
| JS / API inchangés | ✅ |

---

## 6. Commandes push (IMPORTANT — ordre à respecter)

L'index git est dans un état avec des suppressions staged (artefact de sessions précédentes). Suivre cet ordre exact :

```bash
cd C:\Users\HP-15\Downloads\UBO-DROP-violet

:: Étape 1 — Nettoyer l'index git (désindexer les faux "deleted")
git restore --staged .

:: Étape 2 — Ajouter uniquement les fichiers corrigés
git add index.html app.html
git add RAPPORT_FIX_LOGO_UBODROP.md RAPPORT_CORRECTION_LOGO_HERO_APP.md
git add ubodrop-site-current-da-test.html ubodrop-app-current-da-test.html
git add assets\img\logo-ubodrop-brown.png
git add assets\img\logo-ubodrop-white.png
git add assets\img\logo-ubodrop-icon-brown.png
git add assets\img\logo-ubodrop-icon-white.png

:: Étape 3 — Vérifier le statut
git status

:: Étape 4 — Commit
git commit -m "Fix: logos UBODROP dans assets/img, chemins corriges production"

:: Étape 5 — Push
git pull --rebase origin main
git push origin main
```

---

## 7. Vérification après déploiement

```
https://www.ubodrop.com/?v=logo-fix          ← forcer cache refresh
https://www.ubodrop.com/app.html?v=logo-fix
```

Ou CTRL+F5 sur chaque page.

---

## 8. Verdict

```
✅ FIX APPLIQUÉ — EN ATTENTE DE PUSH
```

Les logos sont corrects dans les fichiers HTML.  
Les assets sont dans `assets/img/`.  
Le push + déploiement Vercel résoudra l'affichage en production.
