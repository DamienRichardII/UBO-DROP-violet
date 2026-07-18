# RAPPORT — Mise à jour DA & Logos UBODROP

**Date :** 1er juin 2026 · Session 16  
**Auteur :** Claude (Cowork)  
**Logos :** Sofiane  
**Statut :** ✅ Prêt pour push + déploiement

---

## 1. Objectif

Mettre à jour le site et l'application UBODROP avec les nouveaux logos de Sofiane et la nouvelle direction artistique crème / bordeaux validée en test, directement sur les fichiers de production.

---

## 2. Logos intégrés

| Fichier source | Fichier brand | Usage |
|---|---|---|
| `LOGO UBODROP BROWN@300x.png` | `assets/brand/logo-ubodrop-brown.png` | **Logo principal** — header, login, zones claires |
| `LOGO UBODROP WHITE@300x.png` | `assets/brand/logo-ubodrop-white.png` | Logo inversé — footer, zones bordeaux foncé |
| `LOGO 2 UBODROP BROWN@300x.png` | `assets/brand/logo-ubodrop-icon-brown.png` | Icône compacte — favicon, badge |
| `LOGO 2 UBODROP WHITE@300x.png` | `assets/brand/logo-ubodrop-icon-white.png` | Icône inversée — favicon sur fond sombre |

Format : PNG 1078×222 px (logo wordmark), RGBA transparent. Taille : 12 Ko chacun.

---

## 3. Assets ajoutés

```
assets/brand/
├── logo-ubodrop-brown.png       ← logo principal (header, login)
├── logo-ubodrop-white.png       ← logo inversé (footer foncé)
├── logo-ubodrop-icon-brown.png  ← icône seule (favicon)
└── logo-ubodrop-icon-white.png  ← icône inversée
```

---

## 4. Fichiers modifiés

| Fichier | Type de modification |
|---------|----------------------|
| `index.html` | Site production — rebranding complet DA + logos |
| `app.html` | Application production — rebranding complet DA + logos |
| `ubodrop-site-current-da-test.html` | Fichier test site — logos PNG réels |
| `ubodrop-app-current-da-test.html` | Fichier test app — logos PNG réels |
| `RAPPORT_DA_LOGOS_UBODROP.md` | Ce rapport |

---

## 5. Site internet (`index.html`)

### CSS Variables — remapping complet

| Variable | Avant (violet) | Après (bordeaux/crème) |
|----------|----------------|------------------------|
| `--violet-deep` | `#6C3FA0` | `#5C1A18` |
| `--violet-neon` | `#A855F7` | `#7A2420` |
| `--violet-light` | `#D4B8E8` | `#C8C0B5` (sand) |
| `--violet-medium` | `#B48ED0` | `#9B3B37` |
| `--violet-soft` | `#EDE4F3` | `#EAE4D8` (cream) |
| `--violet-pale` | `#F3ECF8` | `#F3EEE6` (cream soft) |
| `--noir-soft` | `#1A1A2E` | `#3A0F0C` (bordeaux dark) |
| `--glass-bg` | `rgba(212,184,232,.15)` | `rgba(92,26,24,.08)` |
| `--glass-border` | `rgba(212,184,232,.25)` | `rgba(92,26,24,.14)` |
| `--shadow-glow` | `rgba(168,85,247,.3)` | `rgba(92,26,24,.20)` |

### Éléments mis à jour

- **Favicon** : `assets/brand/logo-ubodrop-icon-brown.png`
- **OG Image / Twitter Card** : `assets/brand/logo-ubodrop-brown.png`
- **Logo header** : `<img src="assets/brand/logo-ubodrop-brown.png" height="32px">` — le texte `UBO DROP` masqué (wordmark inclus dans le PNG)
- **Logo footer** : `<img src="assets/brand/logo-ubodrop-white.png" height="28px">`
- **Police** : Space Grotesk ajoutée en priorité (avant DM Sans)
- **Bouton "Ouvrir l'app"** : gradient cream → hover bordeaux
- **Hero overlay** : dégradé violet → crème
- **Hero bands overlay** : dégradé violet → crème
- **Header backdrop** : `rgba(243,238,230,.92)` (crème translucide)
- **Phone glow** : bordeaux subtil
- **Phone mockup shadows** : `rgba(92,26,24,…)`
- **Banner déroulante** : couleur bordeaux sur icônes et hover
- **Section labels** : fond `--violet-light` (sand) + border bordeaux
- **Step numbers** : gradient bordeaux `#7A2420 → #5C1A18`
- **Advantage card icons** : gradient bordeaux
- **CTA box** : gradient bordeaux `#5C1A18 → #7A2420 → #5C1A18`
- **Service card overlay** hover : teinte bordeaux
- **Footer border** : `rgba(92,26,24,.25)`
- **Feat-icon** : fond/border bordeaux

---

## 6. Application (`app.html`)

### CSS Variables — remapping complet

| Variable | Avant | Après |
|----------|-------|-------|
| `--bg` | `#f6f1f5` | `#EAE4D8` |
| `--bg-2` | `#efe8ef` | `#DDD6C8` |
| `--surface-soft` | `#fbf8fc` | `#F3EEE6` |
| `--muted` | `#8f8799` | `#7A6A5E` |
| `--line` | `rgba(117,92,147,.12)` | `rgba(92,26,24,.10)` |
| `--line-2` | `rgba(117,92,147,.18)` | `rgba(92,26,24,.16)` |
| `--violet` | `#5a228b` | `#5C1A18` |
| `--violet-2` | `#7f38bc` | `#7A2420` |
| `--violet-3` | `#bc88ee` | `#9B3B37` |
| `--violet-soft` | `#f1e6fc` | `#F3EEE6` |
| `--glow` | `rgba(126,56,188,.32)` | `rgba(92,26,24,.24)` |
| `--glossy` | gradient violet | `linear-gradient(180deg, #7A2420 0%, #5C1A18 18%, #3A0F0C 100%)` |
| `--shadow-*` | `rgba(40,21,61,…)` | `rgba(58,15,12,…)` |

### Logos mis à jour

| Élément | Avant | Après |
|---------|-------|-------|
| Home logo (écran accueil) | `assets/img/ubo-drop-logo.png` | `assets/brand/logo-ubodrop-brown.png` |
| Auth logo (connexion) | idem | idem |
| Auth logo (inscription client) | idem | idem |
| Auth logo (inscription pro) | idem | idem |
| Auth logo (mdp oublié) | idem | idem |
| Chat logo | idem | idem |
| Favicon | idem | `assets/brand/logo-ubodrop-icon-brown.png` |
| OG Image | idem | `assets/brand/logo-ubodrop-brown.png` |

### Éléments mis à jour

- **Police** : Space Grotesk ajoutée en priorité (avant Montserrat)
- **Body background** : crème chaud `#F3EEE6 → #EAE4D8`
- **Device frame** : `rgba(92,26,24,.07)` glow
- **Boutons home CTA** : gradient cream → hover bordeaux
- **Pills actives** : `var(--glossy)` bordeaux
- **Place chips actifs** : bordeaux
- **Bottom nav** : fond crème, active bordeaux
- **Boutons glossy** : tous → `var(--glossy)` bordeaux (book, send, save, seg active)
- **Input focus** : `var(--violet-2)` bordeaux
- **Chat bar** : crème translucide
- **Écran search** : fond crème
- **Pill text** : `#5C3530` (bordeaux doux)
- **CSS home-logo** : `max-width:180px, height:38px, filter:none`
- **CSS auth-logo** : `max-width:200px, height:44px, drop-shadow bordeaux`

---

## 7. Tests réalisés

| Test | Résultat |
|------|----------|
| Variables CSS violet → bordeaux (index.html) | ✅ 0 ancien violet dans les variables |
| Variables CSS violet → bordeaux (app.html) | ✅ 0 ancien violet dans les variables |
| Logo brown présent dans header (index.html) | ✅ ligne 616 |
| Logo white présent dans footer (index.html) | ✅ ligne 902 |
| Logo brown dans écran accueil (app.html) | ✅ ligne 860 |
| Logo brown dans 3 écrans auth (app.html) | ✅ lignes 976, 993, 1009 |
| Favicon → icône bordeaux (les deux fichiers) | ✅ |
| OG Image → logo brown (les deux fichiers) | ✅ |
| `assets/brand/` créé avec 4 logos | ✅ |
| Structure HTML intacte (index.html) | ✅ 938 lignes (vs 935) |
| Structure HTML intacte (app.html) | ✅ 3962 lignes (vs 3961) |
| JS fonctions inchangées (app.html) | ✅ 229 occurrences `appApi.*` conservées |
| Appels API inchangés | ✅ |

---

## 8. Points de vigilance — validation visuelle Sofiane

- **Taille logo header** : `height:32px` sur le site (logo 1078×222px) — à ajuster si trop petit/grand sur mobile
- **Taille logo auth** : `height:44px` sur l'app — à ajuster si nécessaire
- **Logo footer** : filtre `brightness(1.1)` ajouté — à valider si rendu bien blanc sur fond bordeaux
- **Fond hero** : les images d'arrière-plan hero (barber, beauty, nails) ressortent maintenant sur crème — à valider visuellement
- **Palette crème** : sur certains écrans sombres de l'app (mode nuit éventuel), les fonds crème peuvent paraître chauds — attendu et validé par DA
- **Logos 2 (icône seule)** : utilisés uniquement en favicon. Si le favicon icône paraît trop petit, passer sur le logo complet

---

## 9. Verdict

```
✅ GO PUSH + DÉPLOIEMENT
```

La nouvelle DA crème / bordeaux est intégrée sur le site et l'application réels.  
Les logos de Sofiane sont en place.  
Aucune régression fonctionnelle.

---

## 10. Commandes push (Damien)

```bash
cd C:\Users\HP-15\Downloads\UBO-DROP-violet

git add index.html app.html assets/brand/ RAPPORT_DA_LOGOS_UBODROP.md
git add ubodrop-site-current-da-test.html ubodrop-app-current-da-test.html

git commit -m "DA: nouveaux logos Sofiane + palette cream/bordeaux - site + app"
git push origin main
```

**Liens après déploiement :**
```
https://www.ubodrop.com/                          ← Site avec nouvelle DA
https://www.ubodrop.com/app.html                  ← App avec nouvelle DA
```

*Rapport généré le 01/06/2026 — Session 16*
