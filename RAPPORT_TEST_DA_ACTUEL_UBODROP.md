# RAPPORT TEST DA ACTUEL UBODROP

**Date :** 28 mai 2026 · Session 15  
**Auteur :** Claude (Cowork)  
**Statut :** VERSION TEST — Ne pas diffuser

---

## 1. Objectif

Créer deux versions test basées sur le **site actuel** et **l'application actuelle**, avec la nouvelle direction artistique issue de la PJ1 (palette crème / bordeaux, nouveau logo).

Ces fichiers permettent au chef de projet de comparer directement :
- l'identité visuelle actuelle (violet/mauve)
- la nouvelle identité visuelle (crème/bordeaux)
- sur les pages et écrans réels, sans maquette indépendante

---

## 2. Fichiers supprimés

| Fichier | Raison |
|---------|--------|
| `ubodrop-site-da-test.html` | Maquette indépendante, pas basée sur l'existant |
| `ubodrop-app-da-test.html` | Mockup statique 6 écrans, pas basé sur l'existant |
| `RAPPORT_TEST_DA_UBODROP.md` | Rapport associé aux anciens fichiers |

> Ces 3 fichiers sont **supprimés du repo git** (`git rm --cached`).  
> Ils seront retirés de Vercel au prochain push.

---

## 3. Fichiers créés

| Fichier | Source | Description |
|---------|--------|-------------|
| `ubodrop-site-current-da-test.html` | `index.html` | Site vitrine actuel + nouvelle DA |
| `ubodrop-app-current-da-test.html` | `app.html` | Application actuelle + nouvelle DA |
| `RAPPORT_TEST_DA_ACTUEL_UBODROP.md` | — | Ce rapport |

**Méthode :** copie exacte des fichiers de production + injection d'un bloc CSS override avant `</head>`. Aucune structure HTML, aucune logique JS, aucun appel API n'a été modifié.

---

## 4. Ce qui a été conservé

### Site (ubodrop-site-current-da-test.html)
- Structure HTML identique à `index.html`
- Header, hero (bandes images), bannière déroulante
- Section "UBO DROP c'est quoi ?" avec mockups téléphone
- Carousel de services (Barber, Coiffeuse, Manucure, Henné…)
- Section "Comment ça marche ?" (3 étapes)
- Section "Avantages" (3 cartes)
- CTA final + footer
- Tous les liens, ancres et animations JS (scroll observer)

### Application (ubodrop-app-current-da-test.html)
- Tous les écrans réels : home, login, register client, register pro, search, detail pro, compte client, compte pro, messages, réservations
- Toutes les fonctions JS : `loadPros()`, `openPro()`, `handleSaveService()`, `handleServiceStatusChange()`, `handleDeleteService()`, `openPro()`, navigation, etc.
- Tous les appels API (`appApi.*` → backend Railway)
- Navigation bottom nav réelle (4 onglets)
- Tous les formulaires (connexion, inscription, services)
- Stripe Connect flow
- Chat / messagerie
- Gestion des prestations côté pro
- État global `state.*`

---

## 5. Ce qui a été modifié

### Palette de couleurs

| Variable / Usage | Avant (violet) | Après (bordeaux/crème) |
|------------------|----------------|------------------------|
| Primaire | `#6C3FA0` / `#5a228b` | `#5C1A18` |
| Secondaire | `#A855F7` / `#7f38bc` | `#7A2420` |
| Accentué | `#B48ED0` / `#bc88ee` | `#9B3B37` |
| Fond doux | `#EDE4F3` / `#f1e6fc` | `#EAE4D8` |
| Fond pâle | `#F3ECF8` / `#faf6f8` | `#F3EEE6` |
| Footer | `#1A1A2E` | `#3A0F0C` |
| Glow | `rgba(168,85,247,.3)` | `rgba(92,26,24,.22)` |
| Glossy gradient | violet deep→neon | bordeaux mid→dark |

### Logo

Remplacé dans les deux fichiers test :
- **Icône :** deux carrés aux coins arrondis superposés en décalage diagonal (fidèle à PJ1), en SVG inline
- **Wordmark :** UBODROP en Space Grotesk 700, bordeaux sur fond clair / crème sur fond bordeaux
- L'image de production `assets/img/ubo-drop-logo.png` n'est pas modifiée

### Typographie

Police Space Grotesk injectée en complément (Google Fonts).

### Éléments visuels
- Fonds : crème chaud au lieu de violet pâle
- Boutons CTA : bordeaux au lieu de violet
- Ombres : teintées bordeaux au lieu de violet
- Bannière test rouge bordeaux foncé en haut de chaque page

---

## 6. Liens après push + déploiement

**Site test :**
```
https://www.ubodrop.com/ubodrop-site-current-da-test.html
```

**Application test :**
```
https://www.ubodrop.com/ubodrop-app-current-da-test.html
```

---

## 7. Important

- La production actuelle (`index.html`, `app.html`) reste **inchangée**
- Ces versions sont uniquement des tests visuels
- L'application test est **fonctionnelle** : toutes les API, toutes les fonctions JS, tous les écrans sont réels
- Un bandeau rouge foncé en haut de chaque fichier identifie clairement la version test

---

## 8. Pour deployer (commandes Damien)

```bash
cd C:\Users\HP-15\Downloads\UBO-DROP-violet

git add ubodrop-site-current-da-test.html ubodrop-app-current-da-test.html RAPPORT_TEST_DA_ACTUEL_UBODROP.md
git commit -m "DA test: rebrand cream/bordeaux sur site et app actuels (PJ1)"
git push origin main
```

*Rapport généré le 28/05/2026 — Session 15*
