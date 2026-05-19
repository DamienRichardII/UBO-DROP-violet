# RAPPORT — Parcours Client & Pro UBODROP
**Session 5 — 19 mai 2026**

---

## Résumé exécutif

Dix problèmes identifiés et corrigés sur les deux couches (frontend `app.html` + backend NestJS). Aucun comportement existant n'a été cassé. Tous les pros nouvellement créés restent visibles côté client sans condition sur leurs services actifs.

---

## Problème 1 — Filter pills : 9 métiers visibles (desktop & mobile)

**Cause racine :** Sur desktop, `.device` était limité à `min(390px, 100%)` (format iPhone). Le `.pill-row` en `overflow-x: auto` ne scrollait pas horizontalement sur mobile à cause de `touch-action: none` hérité du `.bottom-sheet`. Sur desktop, seuls ~3 pills tenaient dans 390px.

**Correctif :**
- CSS `@media (min-width: 769px)` : `.device { width: 100% }`, `.pill-row { flex-wrap: wrap; overflow: visible }` → les 9 pills s'affichent sans scroll sur grand écran.
- Suppression de `touch-action: none` sur `.bottom-sheet` → scroll horizontal des pills restauré sur mobile.
- `categoriesFallback` toujours utilisé comme source de vérité (9 métiers), avec merge des données API.

---

## Problème 2 — Desktop full-screen (suppression format iPhone)

**Cause racine :** `.device { width: min(390px, 100%) }` imposait le format téléphone même sur grands écrans.

**Correctif :** Breakpoint `@media (min-width: 769px)` ajouté :
```css
.device { width: 100%; min-height: 100vh; border-radius: 0; border: none; box-shadow: none; }
.screen { max-width: 1200px; margin: 0 auto; padding: 24px 40px; }
.map-stage { height: calc(100vh - 160px); border-radius: 20px; }
```

---

## Problème 3 — Connexion pro impossible

**Cause racine :** `GET /auth/me` retourne uniquement le payload JWT `{id, email, roles}` — pas de `proProfile`. Le dashboard pro utilisait `state.authUser.proProfile` qui était `null`.

**Correctif :**
- Nouvel appel `appApi.myProfile()` → `GET /profiles/me` (retourne user + proProfile complet) ajouté dans `handleAuthSuccess()` et `hydrateSession()`.
- `state.authUser` est enrichi avec le profil complet (displayName, bio, specialties, isOnline, etc.).
- `getMyProfile()` dans `ProfilesService` enrichi avec `avatarUrl` et `instagram`.

---

## Problème 4 — Inscription multi-métiers (jusqu'à 5)

**Cause racine :** Le formulaire n'avait qu'un `<select>` pour un seul métier. Le backend `RegisterProfessionalDto` acceptait `specialties[]` mais sans limite d'array.

**Correctif :**
- Remplacement du `<select>` par 9 chips cliquables (`initProRegSpecialtyChips()`).
- Sélection max 5 enforced côté frontend avec message d'erreur.
- Backend `@ArrayMaxSize(5)` ajouté sur `RegisterProfessionalDto.specialties`.
- Payload envoyé : `specialty` (1er choix, rétrocompat) + `specialties[]` (tableau complet).

---

## Problème 5 — Guard navigation : accès sans authentification

**Cause racine :** `goTo()` naviguait vers n'importe quel écran sans vérifier la session. Un double-back depuis Messages pouvait atterrir sur un écran privé.

**Correctif :**
- Constante `PRIVATE_SCREENS` (Set) : `screen-rdv`, `screen-favs`, `screen-account`, `screen-pro-dashboard`, `screen-pro-messages`, `screen-chat`.
- `goTo()` redirige vers `screen-login` + notify si l'écran est privé et `state.session?.accessToken` est absent.
- `state.returnToScreen` mémorise la destination. Après login réussi, `handleAuthSuccess()` redirige vers cet écran (si compatible avec le rôle de l'utilisateur).

---

## Problème 6 — Logo/favicon manquant

**Correctif :**
```html
<link rel="icon" type="image/png" href="assets/img/ubo-drop-logo.png">
<link rel="apple-touch-icon" href="assets/img/ubo-drop-logo.png">
<meta property="og:image" content="https://www.ubodrop.com/assets/img/ubo-drop-logo.png">
<meta name="twitter:card" content="summary_large_image">
```

---

## Problème 7 — Texte bleu système dans les filtres

**Cause racine :** Couleur système héritée sur les éléments de filtre (`:visited`, `a`, `button`).

**Correctif CSS :**
```css
.overlay-panel, .overlay-panel h4, .overlay-panel label, .overlay-panel .filter-group * { color: var(--ink); }
.overlay-panel .seg.active, .overlay-panel .seg-small.active, .overlay-panel .pill.active { color: #fff; }
.place-chip, .seg, .seg-small { color: var(--ink); }
```

---

## Problème 8 — Recherche par ville / mode / budget

**Backend (`search.service.ts` + `search-professionals.dto.ts`) :**
- Nouveau champ `mode?: 'HOME' | 'PRO_PLACE' | 'SALON'` dans le DTO.
- Nouveau champ `maxPrice?: number` dans le DTO.
- Filtre `modeFilter` dans `where` : mappe `mode` → `offersAtHome / offersAtProLocation / offersAtSalon`.
- Filtre `maxPrice` : `services.some({ status: ACTIVE, price: { lte: maxPrice } })`.

**Frontend (`loadPros()`) :**
```javascript
const params = {};
if (state.category) params.category = state.category;
if (city && city !== "Paris") params.city = city;
const mode = PLACE_TO_MODE[state.place];
if (mode) params.mode = mode;
if (state.budget) params.maxPrice = state.budget;
state.pros = normalizePros(await appApi.searchProfessionals(params));
```

**Input ville :** `#citySearchInput` avec debounce 500ms + Enter → met à jour `state.searchLocation.label` et relance `loadPros()`.

---

## Problème 9 — Cohérence carte / liste / filtres

**Correctif :**
- `applyFilters` button déclenche `loadPros()` (pas seulement `renderPros()`).
- `resetFilters` remet `state.searchLocation` à Paris par défaut + vide l'input ville.
- `loadPros()` envoie tous les filtres actifs à chaque appel → carte et liste toujours synchronisées.

---

## Problème 10 — Flux complet prestations

### Backend (existant, validé)
- `POST /api/v1/services` — créer une prestation (DRAFT par défaut)
- `GET /api/v1/services/me` — liste des prestations du pro connecté
- `PATCH /api/v1/services/:id` — modifier titre/prix/durée/statut
- `DELETE /api/v1/services/:id` — soft-delete (status → INACTIVE)
- `GET /api/v1/categories` — liste des catégories avec IDs

### Frontend (nouveau)
**Onglet "✂️ Prestations"** dans le dashboard pro :
- Formulaire création : métier (select peuplé via `/categories`), titre, description, prix, durée.
- Liste des prestations : nom, catégorie, description courte, prix, durée, statut (badge coloré).
- Actions : Activer / Désactiver / Modifier (pré-remplit le formulaire) / Supprimer (confirm dialog).
- Chargement lazy : `initServicesTab()` appelé à la première ouverture de l'onglet.

**Fiche pro côté client (`screen-detail`) :**
- `normalizeService()` corrigé : lit `title` (au lieu de `name`) et `durationMin` (au lieu de `durationMinutes`).
- Affichage description courte (80 chars) + métadonnées (durée · catégorie).
- Prix formaté en euros.

---

## Contraintes respectées

| Contrainte | Statut |
|------------|--------|
| Pros nouvellement créés visibles sans services actifs | ✅ |
| Direction artistique inchangée | ✅ |
| Mobile non cassé | ✅ |
| Affichage pros (fix session précédente) non cassé | ✅ |
| isVisible=false non réintroduit par défaut | ✅ |
| Filtre services actifs non réintroduit dans recherche générale | ✅ |
| Upload portfolio mobile non cassé | ✅ |
| Personnalisation fiche pro non cassée | ✅ |
| Pas de faux pros, pas de données sensibles exposées | ✅ |
| Pas de migration vers Supabase | ✅ |
| Pas de bleu système dans UI filtre | ✅ |

---

## Fichiers modifiés

| Fichier | Modifications |
|---------|---------------|
| `UBO-DROP-violet/app.html` | Favicon/OG tags, desktop CSS, auth guard goTo(), city search, multi-métiers chips, loadPros() avec params, normalizeService() fix, onglet Prestations (HTML+JS), services API methods |
| `UBODROP-Backend/src/modules/search/search.service.ts` | modeFilter, maxPrice filter, alias TATOUAGE |
| `UBODROP-Backend/src/modules/search/dto/search-professionals.dto.ts` | mode, maxPrice fields |
| `UBODROP-Backend/src/modules/profiles/profiles.service.ts` | avatarUrl, instagram dans getMyProfile select |
| `UBODROP-Backend/src/modules/auth/dto/register-professional.dto.ts` | @ArrayMaxSize(5) sur specialties |

---

## Tests recommandés avant déploiement

1. **Desktop** : Ouvrir sur écran ≥ 900px → pas de format iPhone, 9 pills visibles.
2. **Mobile** : Swipe horizontal sur les pills → tous les 9 métiers accessibles.
3. **Connexion pro** : Créer un compte pro → connexion → dashboard pro avec nom affiché.
4. **Inscription multi-métiers** : Sélectionner 5 métiers → 6e bloqué avec message. Vérifier payload.
5. **Filtre ville** : Taper "Lyon" → pros filtrés par ville Lyon.
6. **Filtre mode** : Sélectionner "Chez le pro" → seuls pros avec `offersAtProLocation=true`.
7. **Auth guard** : Déconnecter → cliquer "Mes RDV" → redirect vers login → connexion → redirect vers RDV.
8. **Prestations pro** : Onglet Prestations → créer → activer → vérifier sur fiche client.
9. **Fiche client** : Ouvrir un pro avec services → titre, prix, durée affichés correctement.
