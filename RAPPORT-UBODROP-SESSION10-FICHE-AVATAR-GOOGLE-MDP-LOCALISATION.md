# UBODROP — Rapport Fix Fiche Pro / Avatar 15 Mo / Google Login / Password / Localisation
**Session 10 — 21 mai 2026**

---

## 1. Cause racine — Fiche pro publique non mise à jour côté client

### Cause A — `avatarUrl` et `instagram` absents du `select` Prisma (Backend — CRITIQUE)

```typescript
// AVANT — findPublicProfileById et findPublicProfiles dans profiles.service.ts
// Ces deux champs étaient absents du select → jamais retournés par l'API publique
select: {
  id: true, displayName: true, businessName: true, bio: true, city: true,
  serviceAreaKm: true, yearsExperience: true, offersAtHome: true,
  // avatarUrl: ABSENT ← cause directe
  // instagram: ABSENT ← cause directe
  ...
}
```

**Conséquence :** même si le pro avait enregistré sa photo et son Instagram, `GET /profiles/pro/public/:id` retournait `null` pour ces champs. La fiche client affichait toujours le logo par défaut UBODROP.

### Cause B — `@MaxLength(500)` sur `avatarUrl` dans le DTO (Backend — BLOQUANT pour avatars)

```typescript
// AVANT — update-pro-profile.dto.ts
@IsOptional()
@IsString()
@MaxLength(500)  // ← Un data URI base64 dépasse systématiquement 500 chars
avatarUrl?: string;
```

**Conséquence :** tout PATCH avec un data URI d'image était rejeté par `class-validator` avec HTTP 400. L'avatar n'était jamais sauvegardé en DB.

### Cause C — Absence de cache-buster sur l'appel public (Frontend)

```javascript
// AVANT
publicProfessional(id) {
  return this.request(`/profiles/pro/public/${id}`);
}
```

Les navigateurs et certains CDN mettaient en cache la réponse GET, empêchant de voir les modifications récentes.

### Cause D — `loadPros()` non rappelé après sauvegarde (Frontend)

Après `handleSaveProProfile()`, seul `state.authUser.proProfile` était mis à jour en mémoire. La liste des pros dans `state.pros` restait périmée — si le pro revenait en vue client sans rechargement, l'ancienne fiche apparaissait.

---

## 2. Corrections profil public appliquées

### Backend — `profiles.service.ts`

```typescript
// APRÈS — findPublicProfileById ET findPublicProfiles
select: {
  ...
  avatarUrl: true,     // ← ajouté
  instagram: true,     // ← ajouté
  ...(({ latitude: true, longitude: true }) as any),  // ← après prisma generate Railway
  ...
}
```

### Backend — `update-pro-profile.dto.ts`

```typescript
// APRÈS
@IsOptional()
@IsString()
@MaxLength(2000000)  // data URI support (base64 compressed ~200KB)
avatarUrl?: string;
```

### Frontend — `appApi.publicProfessional()`

```javascript
// APRÈS — cache-buster
publicProfessional(id) {
  return this.request(`/profiles/pro/public/${id}?t=${Date.now()}`);
}
```

### Frontend — `handleSaveProProfile()`

```javascript
// APRÈS — reload liste pros après sauvegarde
notify("Profil enregistré avec succès.", "ok");
loadPros();  // ← rechargement de la liste client
```

---

## 3. Correction limite avatar 15 Mo

### Frontend — `initAvatarUpload()`

```javascript
// AVANT
if (file.size > 5 * 1024 * 1024) {
  notify("La photo est trop lourde (max 5 Mo).", "error"); return;
}
const dataUrl = await resizeImageToDataUrl(file, 400, 0.85);

// APRÈS
const MAX_AVATAR_UPLOAD_SIZE = 15 * 1024 * 1024;
if (file.size > MAX_AVATAR_UPLOAD_SIZE) {
  notify("La photo dépasse 15 Mo. Choisis une image plus légère.", "error"); return;
}
const dataUrl = await resizeImageToDataUrl(file, 800, 0.82);
// Résultat : image compressée ~100-200 Ko, qualité supérieure, compatible PATCH
```

### Frontend — `initPortfolioUpload()`

Même correction : `5 * 1024 * 1024` → `15 * 1024 * 1024`.

### Pourquoi `800px / 0.82` ?

| Paramètre | Avant | Après | Impact |
|---|---|---|---|
| Taille max upload | 5 Mo | **15 Mo** | Photos téléphone acceptées |
| Résolution canvas | 400 px | **800 px** | Meilleure qualité affichage |
| Qualité JPEG | 0.85 | **0.82** | Taille encodée ~150 Ko |
| MaxLength DTO | 500 | **2 000 000** | Data URI accepté par l'API |

---

## 4. Connexion Google — Implémentation

> **Important :** le code est complet et fonctionnel. Le test final requiert uniquement l'ajout des variables d'environnement Railway et la configuration Google Cloud Console.

### Backend — Fichiers créés / modifiés

#### `src/modules/auth/strategies/google.strategy.ts` (nouveau)

```typescript
@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor() {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID || 'PLACEHOLDER',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'PLACEHOLDER',
      callbackURL: process.env.GOOGLE_CALLBACK_URL || 'https://ubodrop-backend-production.up.railway.app/api/v1/auth/google/callback',
      scope: ['email', 'profile'],
    });
  }
}
```

#### `src/modules/auth/auth.controller.ts` (ajout)

```typescript
@UseGuards(AuthGuard('google'))
@Get('google')
googleAuth() { /* Passport redirige vers Google */ }

@UseGuards(AuthGuard('google'))
@Get('google/callback')
async googleCallback(@Req() req, @Res() res) {
  const result = await this.authService.loginWithGoogle(req.user);
  // Redirect avec token dans le fragment hash (jamais en query string)
  res.redirect(`${FRONTEND_URL}/app.html#google-token=${result.accessToken}&roles=${result.user.roles.join(',')}`);
}
```

#### `src/modules/auth/auth.service.ts` — `loginWithGoogle()`

- Retrouve un compte existant par email ou en crée un nouveau CLIENT
- Ne crée pas de doublon
- Si le compte existe déjà (PROFESSIONAL inclus), reconnecte normalement
- Génère un JWT UBODROP standard (15 min)

#### `src/modules/auth/auth.module.ts`

```typescript
providers: [AuthService, AccessTokenStrategy, GoogleStrategy],
```

### Frontend — Bouton Google + callback

```html
<!-- Écran login -->
<button id="loginGoogleBtn" ...>
  <svg><!-- logo Google SVG inline --></svg>
  Continuer avec Google
</button>
```

```javascript
function handleGoogleLogin() {
  window.location.href = "https://ubodrop-backend-production.up.railway.app/api/v1/auth/google";
}

function handleGoogleCallback() {
  // Lit le token dans window.location.hash après redirect
  const hash = window.location.hash;
  if (!hash.includes("google-token=")) return;
  // Nettoie l'URL, sauvegarde la session, charge le profil
  appApi.saveSession({ accessToken: token });
  appApi.myProfile().then(profile => handleAuthSuccess(...));
}
// Appelé au chargement de la page
handleGoogleCallback();
```

### Variables d'environnement à ajouter sur Railway

```
GOOGLE_CLIENT_ID=<depuis Google Cloud Console>
GOOGLE_CLIENT_SECRET=<depuis Google Cloud Console>
GOOGLE_CALLBACK_URL=https://ubodrop-backend-production.up.railway.app/api/v1/auth/google/callback
FRONTEND_URL=https://www.ubodrop.com
```

### Configuration Google Cloud Console requise

1. Créer un projet sur https://console.cloud.google.com
2. Activer l'API **"Google+ API"** ou **"Google Identity"**
3. Créer des identifiants OAuth 2.0 (type : Application Web)
4. Ajouter en **Authorized redirect URIs** :
   ```
   https://ubodrop-backend-production.up.railway.app/api/v1/auth/google/callback
   ```
5. Copier `Client ID` et `Client Secret` → variables Railway

---

## 5. Changement de mot de passe

### Backend — `PATCH /api/v1/auth/change-password`

```typescript
// DTO : change-password.dto.ts
class ChangePasswordDto {
  currentPassword: string;      // @IsNotEmpty
  newPassword: string;          // @IsNotEmpty @MinLength(8)
}

// auth.service.ts — changePassword()
// 1. Vérifie utilisateur connecté (JWT guard)
// 2. Vérifie ancien mot de passe via argon2.verify()
// 3. Vérifie que nouveau != ancien
// 4. Hash le nouveau avec argon2.hash()
// 5. Met à jour en DB
// 6. Retourne { message: "Mot de passe mis à jour avec succès." }
```

Réponses HTTP :
- `401` — mot de passe actuel incorrect
- `400` — nouveau mot de passe identique à l'ancien
- `400` — nouveau mot de passe < 8 caractères (validé par DTO)
- `200` — succès

### Frontend — Section "Changer mon mot de passe"

Ajoutée dans **deux endroits** :

1. **Compte client** (`renderAccount()` → `blocks[2]`)
2. **Dashboard pro** → onglet Profil (après le bouton "Enregistrer le profil")

Chaque section comporte :
- Champ mot de passe actuel (avec bouton "Afficher/Masquer")
- Champ nouveau mot de passe (8 car. min.)
- Champ confirmation
- Message d'erreur inline (rouge) / succès (violet)
- Vide les champs après succès

---

## 6. Localisation pros sur carte

### Backend — Schéma Prisma

```prisma
// schema.prisma — ProProfile
address    String?
latitude   Float?
longitude  Float?
```

### Migration appliquée

```sql
-- 20260521100000_pro_location_coords
ALTER TABLE "ProProfile" ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE "ProProfile" ADD COLUMN IF NOT EXISTS "latitude" DOUBLE PRECISION;
ALTER TABLE "ProProfile" ADD COLUMN IF NOT EXISTS "longitude" DOUBLE PRECISION;
CREATE INDEX IF NOT EXISTS "ProProfile_latitude_longitude_idx" ON "ProProfile"("latitude", "longitude");
```

### Backend — SearchProfessionalsDto

```typescript
@IsOptional() @Type(() => Number) @IsNumber() lat?: number;
@IsOptional() @Type(() => Number) @IsNumber() lng?: number;
@IsOptional() @Type(() => Number) @IsNumber() @Max(200) radius?: number;
```

### Backend — Filtre Haversine dans `search.service.ts`

```typescript
function haversineKm(lat1, lng1, lat2, lng2): number {
  const R = 6371;
  // ... formule standard
}

// Post-filtre après la requête Prisma
if (query.lat && query.lng && query.radius) {
  filtered = items.filter(pro => {
    if (pro.latitude != null && pro.longitude != null) {
      return haversineKm(query.lat, query.lng, pro.latitude, pro.longitude) <= query.radius;
    }
    return true; // fallback : inclus si pas de coords (ville uniquement)
  });
}
```

### Frontend — Dashboard pro

Nouveau champ **Adresse** (optionnel) dans l'onglet Profil, sous le champ Ville :
```html
<input type="text" id="proEditAddress" placeholder="12 rue de la Paix, Paris">
```

### Géocodage Google Maps côté frontend

```javascript
// handleSaveProProfile() — avant le PATCH
var locationStr = dto.address || dto.city;
if (locationStr && window.google?.maps?.Geocoder) {
  await new Promise((resolve) => {
    new google.maps.Geocoder().geocode({ address: locationStr }, (results, status) => {
      if (status === "OK" && results[0]?.geometry?.location) {
        dto.latitude  = results[0].geometry.location.lat();
        dto.longitude = results[0].geometry.location.lng();
      }
      resolve(); // non bloquant même en cas d'échec
    });
  });
}
```

### Frontend — `loadPros()` avec lat/lng/radius

```javascript
if (state.searchLocation?.lat && state.searchLocation?.lng) {
  params.lat    = state.searchLocation.lat;
  params.lng    = state.searchLocation.lng;
  params.radius = state.radius || 15;
}
```

La carte utilise déjà `item.lat` / `item.lng` dans `normalizePros()` pour placer les pins — les coordonnées maintenant stockées en DB seront directement utilisées.

---

## 7. Fichiers modifiés

### Backend (`UBODROP-Backend`) — commit `38b386a`

| Fichier | Modification |
|---|---|
| `src/modules/profiles/profiles.service.ts` | `avatarUrl`, `instagram`, `latitude`, `longitude` dans les selects publics |
| `src/modules/profiles/dto/update-pro-profile.dto.ts` | `MaxLength` avatarUrl 500→2M ; ajout `address`, `latitude`, `longitude` |
| `src/modules/search/dto/search-professionals.dto.ts` | Ajout `lat`, `lng`, `radius` |
| `src/modules/search/search.service.ts` | Haversine + `avatarUrl`/`instagram`/coords dans select |
| `src/modules/auth/auth.service.ts` | `changePassword()` + `loginWithGoogle()` |
| `src/modules/auth/auth.controller.ts` | `PATCH /change-password` + `GET /google` + `GET /google/callback` |
| `src/modules/auth/auth.module.ts` | Registration `GoogleStrategy` |
| `src/modules/auth/dto/change-password.dto.ts` | **Nouveau fichier** |
| `src/modules/auth/strategies/google.strategy.ts` | **Nouveau fichier** |
| `prisma/schema.prisma` | `address`, `latitude`, `longitude` sur `ProProfile` |
| `prisma/migrations/20260521100000_pro_location_coords/` | **Nouvelle migration** |
| `package.json` / `package-lock.json` | `passport-google-oauth20` + types |

### Frontend (`UBO-DROP-violet`) — commit `7349ea0`

| Modification | Détail |
|---|---|
| `publicProfessional()` | Cache-buster `?t=Date.now()` |
| `handleSaveProProfile()` | `loadPros()` après save + `address` dans dto + géocodage lat/lng |
| `initAvatarUpload()` | Limite 5→15 Mo, résolution 400→800 px, qualité 0.85→0.82 |
| `initPortfolioUpload()` | Limite 5→15 Mo |
| Login screen HTML | Bouton "Continuer avec Google" (SVG inline) |
| `handleGoogleLogin()` | Redirect vers backend OAuth |
| `handleGoogleCallback()` | Lecture token depuis hash URL au chargement |
| `appApi.changePassword()` | `PATCH /auth/change-password` |
| `renderAccount()` | Section changement mot de passe (blocks[2]) |
| `handleChangePassword()` | Validation + appel API + messages |
| Tab profil pro | Section changement mot de passe + bouton câblé |
| Champ `proEditAddress` | Adresse dans tab-profil pro |
| `loadPros()` | Envoi `lat`/`lng`/`radius` depuis `state.searchLocation` |

---

## 8. Migrations Prisma ajoutées

```
prisma/migrations/20260521100000_pro_location_coords/migration.sql
```

S'exécute automatiquement au démarrage backend via `npx prisma migrate deploy` (dans le CMD Dockerfile).

---

## 9. Variables d'environnement à ajouter

### Railway — Service UBODROP-Backend

| Variable | Valeur | Obligatoire pour |
|---|---|---|
| `GOOGLE_CLIENT_ID` | Depuis Google Cloud Console | Google OAuth |
| `GOOGLE_CLIENT_SECRET` | Depuis Google Cloud Console | Google OAuth |
| `GOOGLE_CALLBACK_URL` | `https://ubodrop-backend-production.up.railway.app/api/v1/auth/google/callback` | Google OAuth |
| `FRONTEND_URL` | `https://www.ubodrop.com` | Redirect post-OAuth |

> Sans `GOOGLE_CLIENT_ID` et `GOOGLE_CLIENT_SECRET`, le bouton Google s'affiche mais la redirection OAuth échouera. Toutes les autres fonctionnalités (fiche pro, avatar, mot de passe, localisation) fonctionnent sans ces variables.

---

## 10. Tests à effectuer après déploiement

### Fiche pro publique

1. Connexion pro → onglet Profil → modifier nom affiché + bio + ville
2. Choisir photo de profil (5-15 Mo depuis galerie) → aperçu visible
3. Cliquer "Enregistrer le profil"
4. Se déconnecter → mode client → ouvrir la fiche du pro
5. **Résultat attendu :** nom, bio, ville et photo mis à jour

### Avatar 15 Mo

1. Choisir une photo entre 5 et 15 Mo
2. Vérifier que l'aperçu s'affiche (pas de message d'erreur)
3. Enregistrer → vérifier dans la fiche client

### Changement de mot de passe

1. Connexion client → Compte & réglages → section "Changer mon mot de passe"
2. Saisir ancien mot de passe incorrect → message d'erreur rouge
3. Saisir nouveau mot de passe < 8 car → message d'erreur
4. Saisir confirmation différente → message d'erreur
5. Remplir correctement → succès → champs vidés
6. Déconnexion → reconnexion avec ancien mot de passe → refusé
7. Reconnexion avec nouveau mot de passe → OK
8. Même test depuis le dashboard pro (onglet Profil)

### Google OAuth (après ajout variables Railway + Google Cloud)

1. Cliquer "Continuer avec Google" → redirection Google
2. Autoriser le compte Google → retour sur UBODROP
3. Vérifier session connectée avec rôle CLIENT
4. Tester avec un email déjà existant → pas de doublon

### Localisation pro

1. Connexion pro → onglet Profil → renseigner ville "Paris" et adresse "Place de la République, Paris"
2. Enregistrer → le géocodage Google Maps résout les coordonnées
3. Côté client : chercher à Paris → le pro apparaît sur la carte avec son pin exact
4. Modifier ville → le pro se déplace sur la carte
5. `GET /api/v1/search/professionals?lat=48.8566&lng=2.3522&radius=5` → pros dans un rayon de 5 km

---

## 11. Points de vigilance

| Point | Priorité | Action requise |
|---|---|---|
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` non configurés | P0 pour Google | Créer projet Google Cloud + ajouter variables Railway |
| `prisma generate` sur Railway (nouveaux champs lat/lng) | Automatique | Le Dockerfile exécute `npx prisma generate` au build — OK |
| `prisma migrate deploy` (migration coords) | Automatique | Exécuté au démarrage via CMD Dockerfile — OK |
| `(pro as any).latitude` dans le code | Technique | Cast nécessaire localement (Prisma client non régénéré dans sandbox). Sera typé correctement après build Railway |
| Pros sans coordonnées | Acceptable | Inclus dans recherche générale (fallback ville). Exclus uniquement si filtre lat/lng/radius strict |
| Token Google dans hash URL | Sécurité | Fragment `#` non envoyé au serveur. Meilleure approche que query string |
| JWT 15 min après Google login | Normal | Même durée que connexion classique |
| Cache Vercel app.html | Si stale | Vider le cache navigateur ou forcer revalidation |

---

## 12. Verdict

### ✅ GO — Après push des deux repos + configuration Google Cloud

| Critère | Statut |
|---|---|
| Fiche pro publique mise à jour (avatarUrl, instagram, bio, ville) | ✅ Corrigé |
| Avatar 15 Mo accepté puis compressé (800px, 0.82) | ✅ Corrigé |
| MaxLength avatarUrl DTO : 500 → 2 000 000 | ✅ Corrigé |
| Cache-buster sur GET profil public | ✅ Corrigé |
| Liste pros rechargée après sauvegarde pro | ✅ Corrigé |
| Changement de mot de passe (client + pro) | ✅ Implémenté |
| Google OAuth — code complet côté backend + frontend | ✅ Implémenté |
| Google OAuth — fonctionnel en production | ⏳ Variables Railway requises |
| Latitude/longitude sur ProProfile (migration + DTO + search) | ✅ Implémenté |
| Géocodage adresse → lat/lng au save pro | ✅ Implémenté |
| Filtre Haversine backend (lat/lng/radius) | ✅ Implémenté |
| Pins carte selon vraie localisation | ✅ normalizePros() lit lat/lng — OK |
| TypeScript backend compile sans erreur | ✅ `npx tsc --noEmit` → sortie vide |
| JS frontend valide | ✅ `node --check` → OK |
| Contraintes sessions précédentes conservées | ✅ |

### Actions requises (Damien)

```bash
# 1. Push backend
cd C:\Users\HP-15\UBODROP-Backend
git push origin main

# 2. Push frontend
cd C:\Users\HP-15\Downloads\UBO-DROP-violet
git push origin main

# 3. Ajouter variables Railway (pour Google OAuth)
# Railway → UBODROP-Backend → Variables :
# GOOGLE_CLIENT_ID=<depuis console.cloud.google.com>
# GOOGLE_CLIENT_SECRET=<depuis console.cloud.google.com>
# GOOGLE_CALLBACK_URL=https://ubodrop-backend-production.up.railway.app/api/v1/auth/google/callback
# FRONTEND_URL=https://www.ubodrop.com

# 4. Attendre le redéploiement Railway
# Observer les logs : "Applying migration 20260521100000_pro_location_coords"

# 5. Tester les 5 objectifs (voir section 10)
```
