# UBODROP Capacitor assets

Les fichiers binaires (icon/splash) ne sont pas versionnés dans cette PR.

Avant génération finale, ajouter manuellement :
- `ubodrop-mobile/resources/icon-source.png` (1024x1024 conseillé)
- `ubodrop-mobile/resources/splash-source.png` (2732x2732 conseillé, fond violet premium)

Puis exécuter:

```bash
npx @capacitor/assets generate --iconBackgroundColor '#5a228b' --splashBackgroundColor '#5a228b'
```
