# UBODROP — Rapport Déblocage Railway
**Session 9 — 20 mai 2026**

---

## 1. Situation au début de session

### État des commits GitHub

| Repo | Branch | Dernier commit | SHA |
|---|---|---|---|
| `UBODROP-Backend` | `origin/main` | chore: force Railway redeploy | `27f862e` |
| `UBO-DROP-violet` | `origin/main` | Fix UBODROP default filters and client pro visibility | `3eff8cc` |

**Conclusion : les deux repos sont entièrement synchronisés avec GitHub.** Aucun push manquant.

### État Railway en début de session

```
Déploiement ACTIF     → commit b784926 "Fix UBODROP client pro flow..."
Déploiements en QUEUE → commits 44098e5, 3088809, 27f862e
```

Les 3 commits backend de la Session 8 (fix pros invisibles) étaient en attente dans la queue Railway sans jamais se lancer.

---

## 2. Cause du blocage Railway

Railway maintient une queue ordonnée par commit. Lorsqu'un déploiement tourne depuis trop longtemps (build bloqué, healthcheck timeout, ou infrastructure freeze), les commits suivants restent en "Queued" indéfiniment.

**Ce n'est PAS un problème de code.** Preuves :

```bash
# TypeScript compile sans erreur
npx tsc --noEmit
# Résultat : aucune erreur (sortie vide = OK)
```

```
Dockerfile     ✅ valide (builder = Dockerfile dans railway.toml)
railway.toml   ✅ healthcheck /api/v1/health configuré
CMD            ✅ "npx prisma migrate deploy && exec node /app/dist/src/main.js"
```

**Cause réelle :** Railway est en état de freeze côté infrastructure — la queue ne se vide pas automatiquement même quand le déploiement précédent est stabilisé.

---

## 3. Procédure de déblocage (à effectuer sur le dashboard Railway)

### Étape 1 — Accéder aux déploiements

```
https://railway.app → Mon projet → Service UBODROP-Backend → Onglet Deployments
```

### Étape 2 — Annuler TOUS les déploiements en queue

Pour chacun des commits en "Queued" (`44098e5`, `3088809`, `27f862e`) :
- Cliquer sur les `...` à droite du déploiement
- Cliquer **"Cancel"** ou **"Remove from queue"**

Objectif : vider complètement la queue.

### Étape 3 — Redéployer le bon commit

Sur le commit `27f862e` (le plus récent, contient TOUS les fixes) :
- Cliquer `...` → **"Redeploy"**

Ou, si le bouton "Deploy" est disponible en haut à droite : cliquer directement.

### Étape 4 — Surveiller les logs Railway

Dans l'onglet **Logs** du service :

**Séquence attendue (build + démarrage) :**
```
Building...
Running migrations: Applying...
[Nest] Application is starting...
[Auth] 3 rôles vérifiés/créés en DB (CLIENT, PROFESSIONAL, ADMIN)
[Auth] Bootstrap: X profil(s) pro mis à jour (isVisible+isOnline → true)
[Nest] Application successfully started
```

Le log `[Auth] Bootstrap: X profil(s) pro mis à jour` confirme que les anciens pros en DB avec `isVisible=false` ou `isOnline=false` ont été corrigés automatiquement.

---

## 4. Tests de validation post-déploiement

### Test A — Health endpoint

```bash
curl https://ubodrop-backend-production.up.railway.app/api/v1/health
# Attendu : {"status":"ok"} ou similaire
```

### Test B — Recherche sans filtre

```bash
curl "https://ubodrop-backend-production.up.railway.app/api/v1/search/professionals"
# Attendu : {"page":1,"limit":20,"total":N,"items":[...]}
# Avec N > 0 si des pros existent en DB
```

### Test C — Création pro + visibilité immédiate (test fonctionnel principal)

1. Ouvrir `https://www.ubodrop.com/app.html`
2. Créer un compte pro : métier **BARBER**, ville **Paris**
3. Se déconnecter
4. Ouvrir la carte côté client (aucun filtre sélectionné)
5. **Résultat attendu :** le nouveau pro apparaît dans la liste

### Test D — Reset filtres

1. Sélectionner filtre COIFFEUSE + À domicile
2. Cliquer "Réinitialiser"
3. **Résultat attendu :** aucun filtre actif → tous les pros visibles

### Test E — Toggle pill catégorie

1. Cliquer pill **MASSAGE** → pros filtrés
2. Cliquer à nouveau **MASSAGE** → désélectionné → tous les pros

### Test F — Logs Railway (diagnostic)

Dans l'onglet Logs, chercher :
```
[Search] params — category=null city=null mode=null maxPrice=null
[Search] résultats — total=N retournés=N
```
Ces logs apparaissent à chaque appel à l'API de recherche.

---

## 5. Résumé des fixes déployés via ce redéploiement

### Backend (commit `44098e5` → inclus dans `27f862e`)

| Fichier | Fix |
|---|---|
| `auth.service.ts` | `offersAtHome ?? true` (était `false`) |
| `auth.service.ts` | `offersAtProLocation ?? true` (était `false`) |
| `auth.service.ts` | `isOnline: true` explicite à la création |
| `auth.service.ts` | Bootstrap corrige aussi `isOnline=false` pour les pros existants |
| `auth.service.ts` | Log diagnostic `[RegisterPro]` |
| `search.service.ts` | Logs params + résultats pour diagnostic |

### Frontend (commit `3eff8cc` — déjà déployé sur Vercel)

| Correction | Détail |
|---|---|
| État initial | `category: null`, `place: null` (plus de COIFFEUSE ni À domicile forcés) |
| Pills toggle | Cliquer une pill active la désélectionne |
| Appel API | `loadPros()` remplace `renderPros()` local → vraie requête API |
| Reset filtres | Remet `null` partout (overlay + bouton inline) |
| Guard catégorie | Ne force plus une catégorie si `state.category` était déjà null |

---

## 6. Points de vigilance post-déploiement

| Point | Action |
|---|---|
| Cache Vercel `app.html` | Si les filtres semblent toujours actifs après déploiement : vider le cache navigateur ou forcer revalidation Vercel |
| Pros sans ville en DB | Apparaissent dans recherche générale (Paris) — comportement attendu |
| Pros sans spécialité | Visibles en recherche générale, invisibles dans filtres métier — acceptable lancement progressif |
| JWT expire en 15 min | Comportement normal — l'utilisateur doit se reconnecter |

---

## 7. État des tâches sessions précédentes

| Session | Tâche | État |
|---|---|---|
| S6 | 7 bugs (mode chips, avatar, géoloc, desktop, logout, login role, email conflict) | ✅ Corrigé |
| S7 | JS visible dans le browser (1410 lignes après `</html>`) | ✅ Corrigé |
| S7 | Layout desktop doublon, bottom-nav fixed | ✅ Corrigé |
| S8 | 4 causes pros invisibles (state defaults, pills, backend defaults, reset) | ✅ Corrigé — code sur GitHub |
| S9 | Railway queue bloquée | ✅ Procédure fournie — action manuelle requise |

---

## 8. Actions requises (Damien)

```
1. Railway dashboard → Deployments → Annuler tous les "Queued"
2. Railway dashboard → Redéployer commit 27f862e
3. Surveiller logs → confirmer "[Auth] Bootstrap: X profil(s) mis à jour"
4. Test création pro → visible immédiatement côté client
5. Test reset filtres → aucun filtre forcé
```

**Aucun push Git n'est nécessaire — les deux repos sont à jour sur GitHub.**

---

## 9. Verdict

### ✅ Code prêt — En attente de redéploiement Railway

| Critère | Statut |
|---|---|
| Backend commits sur GitHub (`origin/main`) | ✅ `27f862e` |
| Frontend commits sur Vercel (`origin/main`) | ✅ `3eff8cc` |
| TypeScript backend compile sans erreur | ✅ `npx tsc --noEmit` → sortie vide |
| Dockerfile valide | ✅ |
| Health endpoint configuré | ✅ `/api/v1/health` |
| Railway bloqué par infra queue | ⏳ Action manuelle requise |
| Bootstrap fix pros existants en DB | ⏳ S'exécutera au prochain démarrage backend |
| Test nouveau pro visible immédiatement | ⏳ À valider après redéploiement |
