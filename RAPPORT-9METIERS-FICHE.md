# UBODROP — Rapport Fix Production : 9 métiers + Personnalisation fiche pro

**Date :** 19 mai 2026  
**Scope :** 9 métiers visibles dans les filter pills · Personnalisation fiche pro  
**Verdict :** ✅ GO — les deux objectifs sont corrigés

---

## 1. OBJECTIF 1 — 9 métiers dans les filter pills

### Cause racine : `touch-action: none` sur `.bottom-sheet`

```css
/* Avant — bloquait toute interaction tactile sur les enfants */
.bottom-sheet {
  touch-action: none;  /* ← bloquait le scroll horizontal du pill-row */
}
```

Le CSS `touch-action: none` sur le conteneur `.bottom-sheet` empêchait le navigateur de gérer nativement le défilement horizontal (`pan-x`) à l'intérieur du `.pill-row`. Sur mobile, seuls les 2–3 pills tenant dans la largeur visible (~355 px) étaient accessibles — notamment "Barber" et "Micro-pigmentation" (très large) remplissaient déjà la vue.

Les 9 pills étaient bien rendus dans le DOM (la logique JS `renderFilterCategories()` itère tout `state.categories`), mais ils étaient inatteignables par swipe sur mobile.

### Correction appliquée (`app.html`)

| Zone | Avant | Après |
|------|-------|-------|
| `.bottom-sheet` | `touch-action: none` | supprimé — le drag JS n'utilise que la poignée et l'en-tête |
| `.sheet-handle, .sheet-header` | aucune règle touch | `touch-action: none` ajouté — zones exclusives de drag |
| `.pill-row` | pas de `touch-action` explicite | `touch-action: pan-x` ajouté — scroll horizontal natif garanti |

```css
/* Après */
.bottom-sheet { /* plus de touch-action */ }
.sheet-handle, .sheet-header { touch-action: none; }
.pill-row { touch-action: pan-x; }
```

**Pourquoi c'est safe :** le gestionnaire de drag du sheet est attaché uniquement sur `#sheetHandle` et `.sheet-header` (via `addEventListener("touchstart", start)`). Retirer `touch-action: none` du sheet entier ne casse pas le drag — il continue de fonctionner sur la poignée. Le `sheet-body` gagne en retour son scroll vertical natif.

---

## 2. OBJECTIF 2 — Personnalisation fiche pro

### 2a. Champs manquants dans `ProProfile`

`ProProfile` n'avait pas de champs `avatarUrl` ni `instagram` en base.

### Corrections backend

#### `prisma/schema.prisma`

```prisma
model ProProfile {
  ...
  avatarUrl   String?   // ← ajouté
  instagram   String?   // ← ajouté
  ...
}
```

#### `prisma/migrations/20260519000000_pro_avatar_instagram/migration.sql`

```sql
ALTER TABLE "ProProfile" ADD COLUMN "avatarUrl" TEXT;
ALTER TABLE "ProProfile" ADD COLUMN "instagram" TEXT;
```

#### `src/modules/profiles/dto/update-pro-profile.dto.ts`

```typescript
@IsOptional() @IsString() @MaxLength(500)
avatarUrl?: string;

@IsOptional() @IsString() @MaxLength(80)
instagram?: string;
```

`profiles.service.ts` n'a **pas** besoin d'être modifié : `updateProProfile()` utilise le spread `...profileData` qui inclut automatiquement tous les champs du DTO.

### 2b. Corrections frontend (`app.html`)

#### Onglet "Profil" — nouveaux champs HTML

Ajout dans `#tab-profil` :
- `#proSpecialtyChips` — chips cliquables pour sélectionner les métiers (9 items depuis `categoriesFallback`)
- `#proEditAvatarUrl` — input URL pour la photo de profil
- `#proEditInstagram` — input texte pour le handle Instagram
- `#saveProProfileStatus` — zone de feedback inline (succès/erreur)

#### Fonctions JS ajoutées

| Fonction | Rôle |
|----------|------|
| `renderProSpecialtyChips(activeKeys)` | Affiche les 9 chips métier, colore ceux déjà actifs |
| `getSelectedSpecialties()` | Lit les chips sélectionnés → renvoie `string[]` ou `undefined` |

#### `handleSaveProProfile()` — améliorations

- Lit `avatarUrl`, `instagram`, `specialties` depuis les nouveaux contrôles
- Désactive le bouton pendant l'envoi (feedback "Enregistrement…")
- Affiche un message inline `#saveProProfileStatus` vert/rouge selon résultat
- Met à jour `state.authUser.proProfile` avec la réponse backend (y compris les nouveaux champs)
- Met à jour l'avatar dans le header pro si `updated.avatarUrl` est renseigné

#### Pré-remplissage `renderProDashboard()`

```javascript
set("proEditAvatarUrl", proProfile.avatarUrl);
set("proEditInstagram", proProfile.instagram);
const activeSpecialties = (proProfile.specialties || []).map(s => s?.category?.name || s);
renderProSpecialtyChips(activeSpecialties);
```

---

## 3. Fichiers modifiés

### Frontend — `UBO-DROP-violet/`

| Fichier | Modification |
|---------|-------------|
| `app.html` | CSS : `touch-action` ciblé sur handle/header + `pan-x` sur `.pill-row` |
| `app.html` | HTML onglet Profil : chips métiers + champs avatarUrl, instagram, feedback |
| `app.html` | JS : `renderProSpecialtyChips()`, `getSelectedSpecialties()`, `handleSaveProProfile()` étendu |

### Backend — `UBODROP-Backend/`

| Fichier | Modification |
|---------|-------------|
| `prisma/schema.prisma` | `avatarUrl String?` + `instagram String?` dans `ProProfile` |
| `prisma/migrations/20260519000000_pro_avatar_instagram/migration.sql` | `ALTER TABLE "ProProfile" ADD COLUMN` |
| `src/modules/profiles/dto/update-pro-profile.dto.ts` | `avatarUrl?` + `instagram?` |

---

## 4. Endpoint utilisé

| Méthode | Route | Champs acceptés (V2) |
|---------|-------|---------------------|
| `PATCH` | `/api/v1/profiles/pro/me` | + `avatarUrl`, `instagram`, `specialties[]` |

---

## 5. Déploiement requis

```bash
# Backend — Railway
# La migration s'applique automatiquement au démarrage via prisma migrate deploy
git add prisma/schema.prisma \
        prisma/migrations/20260519000000_pro_avatar_instagram/ \
        src/modules/profiles/dto/update-pro-profile.dto.ts
git commit -m "feat: pro profile — avatarUrl + instagram fields"
git push

# Vérifier dans les logs Railway au démarrage :
# prisma migrate deploy → "Applied migration 20260519000000_pro_avatar_instagram"

# Frontend — Vercel
git add app.html
git commit -m "fix: 9 métiers scrollables + personnalisation fiche pro"
git push
```

---

## 6. Tests à effectuer après déploiement

### OBJECTIF 1 — 9 métiers

| # | Test | Résultat attendu |
|---|------|-----------------|
| 1 | Ouvrir www.ubodrop.com sur mobile | Bottom sheet affiche tous les pills métiers |
| 2 | Swipe horizontal sur les pills | Défilement fluide, accès aux 9 métiers |
| 3 | Tap sur "Barber" | Filtre actif (pill violet), pros Barber affichés |
| 4 | Tap sur "Tatoueur" | Filtre actif, pros tatoueurs affichés |
| 5 | Swipe vertical pour agrandir le sheet | Fonctionne toujours (drag via poignée non cassé) |

### OBJECTIF 2 — Fiche pro

| # | Test | Résultat attendu |
|---|------|-----------------|
| 6 | Espace pro > onglet Profil | 9 chips métiers affichés |
| 7 | Cliquer sur un chip métier | Chip devient violet/actif |
| 8 | Remplir instagram "@monpseudo" + Enregistrer | PATCH 200, champ persisté |
| 9 | Remplir avatarUrl + Enregistrer | Avatar mis à jour dans header pro |
| 10 | Enregistrement sans token | Message "Connecte-toi pour sauvegarder." |
| 11 | Bouton pendant envoi | Désactivé avec texte "Enregistrement…" |
| 12 | Rechargement page | Champs pré-remplis avec les valeurs sauvegardées |

---

## 7. Règle absolue respectée

> ⚠️ Aucune condition réintroduite qui masquerait les professionnels nouvellement créés.
> 
> Les correctifs de Session 3 restent intacts :
> - `isVisible: true` à l'inscription — ✅ inchangé
> - Bootstrap `onApplicationBootstrap` — ✅ inchangé  
> - Recherche sans `services.some()` obligatoire — ✅ inchangé
> - Fallback specialties dans les filtres catégorie — ✅ inchangé
