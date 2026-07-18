# RAPPORT — Optimisation UX/UI Accueil & Espace Pro UBODROP
**Date :** 2026-07-18  
**Fichier modifié :** `UBO-DROP-violet/app.html`  
**Périmètre :** Page d'accueil + navigation de l'espace professionnel  

---

## 1. Contexte

Suite aux tests réels de Sofiane Miyouna, 3 ajustements UX/UI ont été demandés :

1. Le contenu sous le logo d'accueil manquait d'espace — il devait être décalé vers le bas.
2. Les boutons CTA de l'accueil portaient des labels orientés "usage" (`Trouver un pro`, `Devenir pro`) alors qu'ils mènent à l'inscription — les labels devaient refléter l'action réelle.
3. La barre de navigation de l'espace pro était positionnée en bas, comme celle du parcours client, ce qui créait une confusion visuelle.

---

## 2. Changements appliqués

### 2.1 Espacement sous le logo (accueil)

**Avant :** le contenu (steps-card, boutons, proof-card) démarrait directement sous le logo sans respiration visuelle.

**Après :** ajout d'un wrapper `<div class="home-content-under-logo">` avec la règle CSS :

```css
.home-content-under-logo {
  margin-top: clamp(24px, 5vh, 56px);
}
```

- **iPhone SE (320 px)** → `~24 px` de marge (valeur plancher)
- **iPhone 13 (390 px)** → `~30 px`
- **iPhone 15 Pro (430 px)** → `~34 px`
- **Desktop** → jusqu'à `56 px` (valeur plafond)

Le logo `<img class="home-logo">` reste inchangé à sa position actuelle.

---

### 2.2 Renommage des CTA d'accueil

| Avant | Après | Route |
|-------|-------|-------|
| `Trouver un pro` | `Créer un compte client` | `screen-register-client` |
| `Devenir pro` | `Créer un compte pro` | `screen-register-pro` |

Le bouton "Créer un compte client" (`secondary-btn`) pointe désormais directement sur `screen-register-client` au lieu de `screen-search`, ce qui est cohérent avec son label et élimine une étape pour les nouveaux utilisateurs.

Le bloc "Déjà un compte ? Se connecter" est conservé mais le bouton "Créer un compte" redondant a été supprimé (il existait en double dans le home).

---

### 2.3 Navigation pro déplacée en haut d'écran

**Principe :** la `bottom-nav` en mode pro reçoit la classe `.nav-top` qui inverse son positionnement.

#### CSS ajouté (3 contextes)

**Base (toutes tailles) :**
```css
.bottom-nav.nav-top {
  top: calc(12px + env(safe-area-inset-top, 0px));
  bottom: auto !important;
}
.app.pro-nav-top .screen.active {
  padding-top: calc(var(--bottom-nav-h) + env(safe-area-inset-top, 0px) + 20px);
  padding-bottom: 20px;
}
```

**Mobile (`≤ 768px`) :**
```css
.bottom-nav.nav-top {
  top: calc(10px + env(safe-area-inset-top, 0px));
  bottom: auto !important;
  left: 10px; right: 10px;
}
```

**Desktop (`≥ 769px`) :**
```css
.bottom-nav.nav-top {
  position: fixed;
  top: 0; bottom: auto !important;
  left: 0; right: 0;
  border-radius: 0;
}
.app.pro-nav-top .screen.active {
  padding-top: calc(var(--bottom-nav-h) + 20px);
  padding-bottom: 24px;
}
```

#### JS modifié — `renderNav()`

```javascript
const isPro = state.userMode === "pro";
nav.classList.toggle("nav-top", isPro);
if (appEl) appEl.classList.toggle("pro-nav-top", isPro);
```

- En mode pro : `.nav-top` sur `#bottomNav` + `.pro-nav-top` sur `.app`
- En mode client : les deux classes sont retirées → nav reste en bas
- Sur les écrans d'auth : les deux classes sont retirées, nav masquée (`show` absent)

---

## 3. Anti-régression

| Élément | Touché ? | Vérifié |
|---------|----------|---------|
| Carte client Mapbox | ❌ Non | ✅ |
| Icônes métiers | ❌ Non | ✅ |
| Prestations / réservation | ❌ Non | ✅ |
| Stripe / paiement | ❌ Non | ✅ |
| Auth (login, register, reset) | ❌ Non | ✅ |
| Portfolio / avatar | ❌ Non | ✅ |
| Resend emails | ❌ Non | ✅ |
| Backend / API | ❌ Non | ✅ |
| Navigation client (bottom) | ❌ Non | ✅ |

---

## 4. Validation

13 checks automatiques passés à 100 % via script Python sur `app.html` :

- ✅ CSS `.home-content-under-logo` présent
- ✅ CSS `.bottom-nav.nav-top` base (bottom: auto)
- ✅ Override mobile `.nav-top`
- ✅ Override desktop `.nav-top`
- ✅ Wrapper `home-content-under-logo` dans le HTML
- ✅ Bouton "Créer un compte client" présent
- ✅ Bouton "Créer un compte pro" présent
- ✅ JS `nav-top` toggle présent
- ✅ JS `pro-nav-top` toggle présent
- ✅ "Trouver un pro" absent de l'écran home
- ✅ "Devenir pro" absent de l'écran home
- ✅ "Créer un compte client" dans home
- ✅ "Créer un compte pro" dans home

---

## 5. À tester manuellement

1. **Accueil** → vérifier que le contenu sous le logo descend légèrement sur iPhone SE, 13, 15 Pro
2. **Accueil** → taper sur "Créer un compte client" → formulaire client affiché
3. **Accueil** → taper sur "Créer un compte pro" → formulaire pro affiché
4. **Espace pro (après connexion)** → la barre de navigation est en **haut** de l'écran
5. **Espace client (après connexion)** → la barre de navigation reste en **bas**
6. **Retour à l'accueil** (déconnexion) → nav complètement masquée

---

*Rapport UBODROP — Mission UX/UI Accueil & Espace Pro — 2026-07-18*
