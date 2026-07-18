# RAPPORT — Hotfix régression app.html carte / pros

_Date : 2026-06-01 — Analyse QA frontend (test local + analyse statique/dynamique)_

## 0. Résumé exécutif

**Bug réel trouvé et corrigé dans `app.html`.** La fonction `renderBookings()`
n'avait **pas son accolade de fermeture `}`**. Résultat : toutes les fonctions
déclarées ensuite (`renderFavorites`, `hydrateSession`, `loadCategories`, `loadPros`,
`loadBookings`, …) **et surtout l'IIFE `initApp()`** se sont retrouvées « avalées »
à l'intérieur de `renderBookings`. Comme `renderBookings` n'est jamais appelée au
démarrage, **`initApp()` ne s'exécutait jamais** → pas de catégories, pas de pros,
pas de carte Google. La page restait sur l'image de repli `assets/ref-carte.jpeg`.

Le `}  // fermeture bloc JS` ajouté précédemment (commit `c96c055`) ne faisait que
**refermer `renderBookings` tout en bas du script** : ça rendait le fichier
*syntaxiquement valide* (`node --check` OK) mais **sémantiquement cassé**.

**⚠️ Ce bug est aussi présent sur `origin/main` / en production** (le fichier local
était byte-identique à `origin/main`). Le correctif doit donc être déployé.

## 1. Problème observé

Écran « Trouver un professionnel » (testé en local) : carte = image statique,
aucune catégorie, aucun pro, bottom sheet « Pros disponibles » vide.

## 2. Cause racine exacte

Méthode : analyse statique (AST `acorn`) + reproduction runtime (jsdom).

- L'AST des instructions de **premier niveau** sautait directement de
  `renderBookings` (ligne 2661) à l'IIFE finale (ligne ~4394) : **tout le bloc
  intermédiaire était imbriqué dans `renderBookings`**.
- Vérification runtime (jsdom) **avant** correctif :
  `typeof loadCategories === "undefined"` (non global), `#placeRow` et `#navGrid`
  vides → **`initApp()` n'a jamais tourné**.
- Origine précise : ligne 2697 `}).join("");` termine la logique de `renderBookings`,
  mais l'accolade `}` fermant la fonction manquait — la ligne 2699 enchaînait
  directement sur `function renderFavorites()`.

C'est la conséquence de l'épisode « SyntaxError / accolade manquante » des commits
`c96c055` puis `fe76403` : la vraie accolade manquante était **celle de
`renderBookings`**, mais elle a été « compensée » en fin de fichier au lieu d'être
remise au bon endroit.

Symptômes expliqués :
- **Catégories absentes** : `loadCategories()`/`renderFilterCategories()` jamais
  appelées (init non lancée).
- **Pros absents** : `loadPros()`/`renderPros()` jamais appelées.
- **Carte statique** : `initGoogleMap()` jamais appelée → le fond CSS de repli
  `assets/ref-carte.jpeg` restait affiché (ni vraie carte, ni message de repli).

## 3. Correction appliquée

Modification **chirurgicale, 2 lignes** dans `app.html` (solde d'accolades inchangé) :

1. Ligne 2698 : ajout du `}` fermant correctement `renderBookings()`.
2. Ligne 4391 : suppression du `}  // fermeture bloc JS` devenu en trop.

`git diff` (vs dernière version committée) :

```diff
2697a2698
>   }
4391,4392d4391
< }  // fermeture bloc JS
< 
```

Aucune autre ligne modifiée. Aucune fonctionnalité retirée (réservation 3h, DA,
statuts FR, fiche prestataire, espace pro restent intacts).

## 4. Fichier modifié

- `app.html` (uniquement les 2 accolades ci-dessus).

## 5. Tests locaux (vérifiés)

- `node --check` du JS inline : **OK** (aucune erreur de syntaxe).
- AST `acorn` après correctif : **toutes** les fonctions sont de nouveau au premier
  niveau (`renderFavorites`, `hydrateSession`, `loadCategories`, `loadPros`,
  `loadBookings`, `renderAccount`, …) et l'IIFE `initApp` est top-level.
- Runtime jsdom après correctif :
  - `#placeRow` = 3 chips (init lancée ✓),
  - `#sheetCategoryRow` = **9 catégories** ✓, `#filterCategoryRow` = 9 ✓,
  - `renderPros()` exécutée (liste rendue ✓),
  - `initGoogleMap()` exécutée (script Maps injecté ✓).
- Intégrité : pas d'octet nul, fin de fichier correcte (`</body></html>`),
  balises `<script>` équilibrées, code non tronqué.

> Note carte : en navigateur réel, `initGoogleMap()` affichera la vraie carte si la
> clé Google Maps est autorisée pour `localhost`/`ubodrop.com`. Sinon le repli propre
> « Carte Google Maps non configurée » s'affiche — **plus jamais** l'image statique.

## 6. Déploiement — à faire par toi (le sandbox ne peut pas écrire dans .git)

L'index Git local est par ailleurs **détruit** (`git ls-files` = 0 fichier ;
2 480 fichiers en suppression en attente) avec un `.git/index.lock` périmé que
l'environnement ne peut pas supprimer. **Ne pas committer `app.html` seul tel quel :
`git commit` emporterait les 2 479 suppressions en attente.** Procédure sûre Windows :

```bat
cd /d "C:\Users\HP-15\Downloads\UBO-DROP-violet"

:: 1) Lever le verrou périmé
if exist .git\index.lock del .git\index.lock

:: 2) Réparer l'index (NE TOUCHE PAS aux fichiers du disque)
git reset

:: 3) Vérifier que SEUL app.html est modifié
git diff --stat app.html

:: 4) Committer UNIQUEMENT le correctif
git add app.html
git commit -m "Hotfix: fix renderBookings missing brace -> initApp now runs (map/cats/pros)"

:: 5) Pousser
git pull --rebase origin main
git push origin main
```

Après déploiement Vercel, tester `https://ubodrop.com/app.html?v=hotfix-map-pros`.

## 7. Garde-fou anti-régression

Voir `CHECKLIST_ANTI_REGRESSION_APP_UBODROP.md`. Points clés ajoutés :
- `node --check` **ne suffit pas** — vérifier aussi que les fonctions clés sont
  globales et que `initApp` tourne (catégories + pros + carte au chargement).
- Sécurité Git : `git ls-files | wc -l` jamais 0 ; jamais de `commit` quand
  `git status` montre des suppressions de masse.

## 8. Verdict

Côté **code `app.html` : GO** — bug corrigé et validé en local (catégories, pros,
init carte rétablis). **Reste à faire** : réparer l'index Git (`git reset`), committer
le correctif et pousser pour corriger aussi la **production** (qui porte le même bug).
Vérifier en plus que la clé Google Maps est autorisée sur le domaine.
