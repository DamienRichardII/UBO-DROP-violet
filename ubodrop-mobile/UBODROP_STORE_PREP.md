# UBODROP Store Prep (Phase 1)

## Fichiers modifiés / créés
- `ubodrop-mobile/` (nouveau projet mobile Capacitor-ready)
- `ubodrop-mobile/public/app.html` (intégration de `app.html` existant)
- `ubodrop-mobile/public/assets/js/config.js` (config mobile centralisée)
- `ubodrop-mobile/public/assets/js/config.js` (API centralisée, HTTPS only)
- `privacy.html`, `terms.html`, `delete-account.html` (pages légales)

## Commandes utilisées
```bash
npm create vite@latest ubodrop-mobile -- --template vanilla
mkdir -p ubodrop-mobile/public ubodrop-mobile/src ubodrop-mobile/resources
cp app.html ubodrop-mobile/public/app.html
cp -r assets ubodrop-mobile/public/
```

## Note sur erreur rencontrée
- `npm create vite@latest ...` a échoué (HTTP 403 vers registry npm). Le squelette a été créé manuellement pour ne pas bloquer la préparation.

## Lancer Android
```bash
cd ubodrop-mobile
npm install
npm run build
npx cap sync
npx cap add android
npx cap open android
```

## Générer le build Android (AAB)
1. Ouvrir Android Studio via `npx cap open android`
2. Configurer la signature (keystore release)
3. Build > Generate Signed Bundle/APK > Android App Bundle
4. Sortie: `app-release.aab`

## Checklist Google Play (test fermé)
- [ ] Politique de confidentialité publiée et accessible
- [ ] Page suppression de compte accessible
- [ ] Icônes/splash générés proprement
- [ ] VersionCode / VersionName configurés
- [ ] Build release signé en AAB
- [ ] Test interne / fermé sans crash critique

## Checklist Apple Store
- [ ] Ajouter iOS: `npx cap add ios`
- [ ] Vérifier safe areas / clavier / navigation fluide
- [ ] Ajouter éléments natifs (splash, permissions explicites)
- [ ] Éviter impression de WebView brute (UX soignée)
- [ ] Préparer métadonnées App Store Connect

## Risques restants / actions manuelles
- Installer les dépendances npm dans un environnement autorisé réseau.
- Générer les assets natifs avec `@capacitor/assets`.
- Ajouter réellement les projets `android/` et `ios/` après `npm install`.
- Tester map/geolocation avec une clé Google Maps sécurisée côté backend/proxy si nécessaire.


## Limite PR (fichiers binaires)
- Les images (.jpg/.jpeg/.png/.webp) ne sont pas incluses dans cette PR pour éviter le blocage 'fichiers binaires non pris en charge'.
- Recopier manuellement les assets depuis le frontend existant vers `ubodrop-mobile/public/assets/` (notamment `img/`, CSS/JS annexes, logos).
- Ajouter manuellement `icon-source` et `splash-source` dans `ubodrop-mobile/resources/` avant la génération finale des icônes/splash.
