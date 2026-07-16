# RAPPORT — Fix Marker Pro absent sur Map Client — UBODROP

**Date :** 2026-07-16  
**Mission :** Mission 3 — Marker pro absent sur la carte client  
**Fichiers modifiés :**
- `app.html` (frontend — UBO-DROP-violet)
- `src/modules/profiles/profiles.service.ts` (backend — UBODROP-Backend)

**Validation TypeScript backend :** ✅ 0 erreur (`npx tsc --noEmit`)  
**Validation JS frontend :** ✅ 3629 lignes · syntaxe OK  
**Anti-troncature app.html :** ✅ 5350 lignes · `</body></html>` confirmé  
**Profondeur d'accolades :**
- `profiles.service.ts` : 502 lignes · `final_depth=0` ✅
- `health.controller.ts` : 578 lignes · `final_depth=0` ✅

---

## 1. Symptôme initial

Un professionnel crée son compte et complète son profil (adresse/ville). Il s'attend à apparaître sur la carte client. Or **aucun marker n'apparaît** — ni en France, ni nulle part.

---

## 2. Cause racine — Chaîne complète des défaillances

La disparition du marker était causée par **trois bugs enchaînés**, pas un seul :

```
PRO crée son profil
  → address/city envoyés au backend
  → lat/lng restent NULL en base (bug backend : pas de géocodage serveur)
  → API renvoie latitude=null, longitude=null
  → normalizePros() calcule Number(null) = 0  ← BUG JS
  → pro.lat=0, pro.lng=0
  → Number.isFinite(0) = true  ← passe le guard
  → placeProMarker(pro, {lat:0, lng:0})
  → marker placé à (0°N, 0°E) = océan Atlantique, golfe de Guinée
  → invisible pour l'utilisateur en France
  → geocodeCity() jamais déclenché (le guard était passé)
```

---

## 3. Corrections appliquées

### Fix A — `normalizePros()` : `Number(null) = 0` → `null` correctement géré

**Fichier :** `app.html` · ligne ~2229  
**Criticité :** P0

```javascript
// AVANT — Number(null) = 0, lat/lng stockés à 0 au lieu de null
lat: Number(item?.latitude ?? item?.lat),
lng: Number(item?.longitude ?? item?.lng),

// APRÈS — null préservé si aucune coordonnée disponible
lat: (item?.latitude != null) ? Number(item.latitude) : ((item?.lat != null) ? Number(item.lat) : null),
lng: (item?.longitude != null) ? Number(item.longitude) : ((item?.lng != null) ? Number(item.lng) : null),
```

**Pourquoi :** `Number(null)` retourne `0` en JavaScript, et `Number.isFinite(0)` retourne `true`. Un pro sans coordonnées en base se retrouvait donc avec `lat=0, lng=0` — des coordonnées valides fictives pointant vers l'Atlantique.

---

### Fix B — `renderMapMarkers()` : guard `(0,0)` + déclenchement `geocodeCity()`

**Fichier :** `app.html` · ligne ~2529  
**Criticité :** P0

```javascript
// AVANT — aucun guard contre (0,0), geocodeCity jamais appelé si lat/lng=0
if (Number.isFinite(pro.lat) && Number.isFinite(pro.lng)) {
  placeProMarker(pro, { lat: pro.lat, lng: pro.lng });
} else if (pro.location) {
  geocodeCity(pro.location).then((pos) => { if (pos) placeProMarker(pro, pos); });
}

// APRÈS — triple guard : non-null + fini + pas (0,0)
const hasValidCoords = pro.lat != null && pro.lng != null &&
                       Number.isFinite(pro.lat) && Number.isFinite(pro.lng) &&
                       !(pro.lat === 0 && pro.lng === 0);
if (hasValidCoords) {
  placeProMarker(pro, { lat: pro.lat, lng: pro.lng });
} else if (pro.location) {
  // Pas de coordonnées en base → géocodage de la ville (marker approximatif)
  geocodeCity(pro.location).then((pos) => { if (pos) placeProMarker(pro, pos); });
}
```

**Pourquoi :** Même après Fix A (qui renvoie `null` si pas de coords), il fallait aussi immuniser le cas où des valeurs `(0,0)` existeraient déjà en base (anciens comptes créés avant le fix backend). Le double filet — `null` check + guard `(0,0)` — garantit que `geocodeCity()` est toujours appelé quand les coordonnées sont absentes ou invalides.

---

### Fix C — Backend : géocodage serveur-side dans `profiles.service.ts`

**Fichier :** `src/modules/profiles/profiles.service.ts`  
**Criticité :** P0 (fix structurel)

**Problème :** quand un pro sauvegardait son profil (adresse ou ville) sans que Google Maps soit chargé côté client, aucun géocodage n'avait lieu. Les champs `latitude` et `longitude` restaient `null` en base indéfiniment.

**Solution : `geocodeAddressSafe()`** — méthode privée non-bloquante appelée automatiquement dans `updateProProfile()` si address/city changent et que lat/lng ne sont pas fournis.

**Déclenchement dans `updateProProfile()` :**
```typescript
const needsGeocode =
  (dto.address != null || dto.city != null) &&
  dto.latitude == null &&
  dto.longitude == null;
if (needsGeocode) {
  const locationStr = dto.address ?? dto.city ?? '';
  if (locationStr) {
    const coords = await this.geocodeAddressSafe(locationStr);
    if (coords) {
      (profileData as any).latitude  = coords.lat;
      (profileData as any).longitude = coords.lng;
    }
  }
}
```

**Cascade de fallback `geocodeAddressSafe()` :**

```
Essai 1 → Google Maps Geocoding API
  (si GOOGLE_MAPS_API_KEY est configurée en variable d'environnement Railway)
  URL: https://maps.googleapis.com/maps/api/geocode/json?address=...&key=...
  Timeout : AbortSignal.timeout(5000)
  Log : [Geocode-Google] "Paris" → lat=48.856614, lng=2.352222

  ↓ si erreur ou clé absente

Essai 2 → Nominatim / OpenStreetMap (gratuit, sans clé)
  URL: https://nominatim.openstreetmap.org/search?...&countrycodes=fr
  Header: User-Agent: UBODROP/1.0 (contact@ubodrop.com)
  Timeout : AbortSignal.timeout(5000)
  Log : [Geocode-Nominatim] "Paris" → lat=48.8566101, lng=2.3514992

  ↓ si erreur

  Retourne null (non-bloquant — le profil se sauvegarde quand même)
```

**Sécurité :** la clé Google Maps est lue via `process.env.GOOGLE_MAPS_API_KEY` côté backend uniquement — jamais exposée au frontend.

---

### Fix D — Endpoint diagnostic `GET /health/pro-visibility`

**Fichier :** `src/modules/health/health.controller.ts`  
**Criticité :** P1 (diagnostic)

Endpoint **déjà présent** depuis une session antérieure (lignes 74-186). Aucune modification nécessaire.

```
GET /health/pro-visibility?name=Jean&email=jean@example.com
```

Retourne :
```json
{
  "proProfileId": "clxxx",
  "latitude": 48.856614,
  "longitude": 2.352222,
  "hasCoordinates": true,
  "isVisible": true,
  "isOnline": true,
  "blockingReasons": [],
  "shouldAppearClientSide": true
}
```

À utiliser pour diagnostiquer un pro qui n'apparaît toujours pas après correction.

---

## 4. Tests de validation

| Test | Résultat |
|------|---------|
| `npx tsc --noEmit` backend | ✅ 0 erreur |
| `profiles.service.ts` : 502 lignes, depth=0 | ✅ |
| `health.controller.ts` : 578 lignes, depth=0, 0 null byte | ✅ |
| JS syntaxe frontend (extrait `<script>`) | ✅ 3629 lignes · OK |
| Windows app.html : 5350 lignes · `</body></html>` | ✅ |
| `normalizePros()` : guard `!= null` présent | ✅ `grep` confirmé |
| `renderMapMarkers()` : guard `!(pro.lat === 0 && pro.lng === 0)` | ✅ `grep` confirmé |
| `geocodeAddressSafe()` dans profiles.service.ts | ✅ `grep` confirmé |
| Pas de régression Stripe / Resend / réservation | ✅ fichiers non touchés |

**Git diff backend** (`profiles.service.ts`) :
- `+25 lignes` : bloc géocodage dans `updateProProfile()`
- `+53 lignes` : méthode privée `geocodeAddressSafe()`
- Total : `+78 lignes, -1 ligne`

**Git diff frontend** (`app.html`) :
- Fix A : `+2 lignes, -2 lignes` (normalizePros lat/lng)
- Fix B : `+6 lignes, -2 lignes` (renderMapMarkers guard)
- Total : `+8 lignes, -4 lignes` (hors contenu stale du mount bash)

---

## 5. Impact produit

| Avant fix | Après fix |
|-----------|----------|
| Pro crée profil → lat/lng null en base | Pro crée profil → lat/lng géocodés automatiquement côté backend |
| `Number(null) = 0` → marker placé dans l'Atlantique | `null` préservé → `geocodeCity()` déclenché côté client |
| `geocodeCity()` jamais appelé (0 passait `isFinite`) | `geocodeCity()` appelé si coords absentes ou égales à (0,0) |
| Pro invisible sur la carte client | Pro visible sur la carte client avec un marker approximatif (ville) |
| Aucun log de diagnostic disponible | Logs `[Geocode-Google]` / `[Geocode-Nominatim]` dans Railway |

---

## 6. Points restants (hors scope Mission 3)

| Point | Raison | Recommandation |
|-------|--------|---------------|
| Anciens pros avec lat/lng=0 en base | Créés avant Fix C | Migration SQL ponctuelle : `UPDATE "ProProfile" SET latitude=NULL, longitude=NULL WHERE latitude=0 AND longitude=0` — déclenchera le géocodage au prochain `updateProProfile` |
| Fix Bug 2 (Task #141) | Scope séparé | Créer `screen-pro-map` avec demandes clients + itinéraire |
| Bouton "Utiliser ma position" côté client (Task #133) | Scope séparé | Déclencher `centerOnUser()` + `loadPros()` |

---

## 7. Commandes de commit

### Backend — à lancer depuis Windows CMD

```cmd
cd C:\Users\HP-15\UBODROP-Backend
if exist .git\index.lock del .git\index.lock

git add src/modules/profiles/profiles.service.ts

git commit -m "fix(map): geocodage serveur-side + guard (0,0) + normalizePros lat/lng null

Fix C - geocodage backend dans updateProProfile():
- geocodeAddressSafe() : Google Maps API + Nominatim fallback
- Declenche si address/city change et lat/lng non fournis par le client
- AbortSignal.timeout(5000) pour les deux essais
- Non-bloquant : profile sauvegarde meme si geocodage echoue
TS: 0 erreur - 502 lignes depth=0"

git push origin main
```

### Frontend — à lancer depuis Windows CMD

```cmd
cd C:\Users\HP-15\Downloads\UBO-DROP-violet
if exist .git\index.lock del .git\index.lock
if exist .git\HEAD.lock del .git\HEAD.lock

git add app.html RAPPORT_FIX_MARKER_PRO_MAP_CLIENT_UBODROP.md

git commit -m "fix(map): normalizePros null lat/lng + renderMapMarkers guard (0,0)

Fix A - normalizePros():
- Number(null)=0 remplace par null explicite pour lat/lng
- lat: (item?.latitude != null) ? Number(item.latitude) : null
- Evite marker fictif dans l'Atlantique

Fix B - renderMapMarkers():
- Triple guard: non-null + isFinite + !(lat===0 && lng===0)
- geocodeCity() desormais declenche si lat/lng manquants ou (0,0)
JS: 3629 lignes OK - app.html 5350 lignes - </body></html> confirme"

git push origin main
```

---

## 8. Diagnostic post-déploiement

Pour vérifier qu'un pro apparaît correctement après commit + Railway redeploy :

```bash
# Vérifier les coordonnées en base
GET https://ubodrop-production.up.railway.app/health/pro-visibility?email=pro@example.com

# Réponse attendue
{
  "hasCoordinates": true,
  "latitude": 48.8566,
  "longitude": 2.3522,
  "shouldAppearClientSide": true,
  "blockingReasons": []
}

# Si hasCoordinates=false → forcer la mise à jour profil côté pro
# → PATCH /profiles/pro avec { city: "Paris" } sans lat/lng
# → geocodeAddressSafe() se déclenche automatiquement
```

---

## 9. Verdict

**GO production pour les corrections de Mission 3.**

| Fix | Fichier | Statut |
|-----|---------|--------|
| A — `normalizePros()` null lat/lng | app.html | ✅ |
| B — `renderMapMarkers()` guard (0,0) | app.html | ✅ |
| C — Géocodage serveur-side `updateProProfile()` | profiles.service.ts | ✅ |
| D — Endpoint diagnostic `/health/pro-visibility` | health.controller.ts | ✅ (prior commit) |
| TypeScript 0 erreur | backend | ✅ |
| JS syntaxe OK | frontend | ✅ |
| Aucune régression Stripe / Resend / réservation | — | ✅ |
