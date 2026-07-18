# RAPPORT — SEO & logo / favicon UBODROP

_Date : 2026-06-01 — Frontend (index.html + fichiers racine)_

## 1. Constat

- **Logos / favicon : déjà à jour.** `index.html` et `app.html` référencent déjà les
  icônes **bordeaux** (`/assets/img/logo-ubodrop-icon-brown.png`,
  `logo-ubodrop-brown.png`). Aucun `favicon.ico` ni logo violet résiduel trouvé.
  → Le « logo violet sur Google » est du **cache Google obsolète**, pas un mauvais fichier.
- **SEO : plusieurs manques** qui expliquent « ubodrop » mal indexé / « udrop » proposé :
  - `<title>` = « UBO DROP » (faible, avec espace).
  - **`og:url` pointait vers `https://ubo-drop-violet.vercel.app/`** (mauvais domaine !).
  - Pas de `canonical`, pas de `robots`, pas de `sitemap.xml`, pas de `robots.txt`,
    pas de manifest, pas de données structurées.

## 2. Corrections appliquées (`index.html`)

- `<title>` → « UBODROP — Réserver un professionnel beauté près de chez toi ».
- `<meta name="description">` → version claire orientée métiers.
- Ajout `<meta name="robots" content="index, follow">`, `keywords`,
  `<link rel="canonical" href="https://www.ubodrop.com/">`,
  `<link rel="manifest" href="/site.webmanifest">`, `<meta name="theme-color" #5C1A18>`.
- **`og:url` corrigé** vers `https://www.ubodrop.com/` (au lieu du domaine Vercel).
- `og:title` / `twitter:title` harmonisés sur « UBODROP — … » ; ajout `og:site_name`
  et `og:locale=fr_FR`.
- Ajout d'un **JSON-LD `Organization`** (nom UBODROP, url, logo) pour aider Google à
  rattacher la marque au site.

## 3. Fichiers racine créés

- `robots.txt` — autorise tout + référence le sitemap.
- `sitemap.xml` — `/` et `/app.html` (domaine `www.ubodrop.com`).
- `site.webmanifest` — nom UBODROP, icônes bordeaux, thème `#5C1A18`.

(Servis statiquement par Vercel ; `vercel.json` ne réécrit que `/api`, donc OK.)

## 4. Tests / vérifs

- `index.html` : round-trip md5 OK, fin de fichier `</body></html>`, **non tronqué**.
- `site.webmanifest` : JSON valide. `sitemap.xml` : XML valide.
- Plus aucune référence au domaine Vercel dans `index.html`.

## 5. Important — délais & actions hors code

- L'**indexation Google prend plusieurs jours/semaines** : aucun résultat immédiat
  garanti, même avec un SEO parfait.
- Pour accélérer (de ton côté) :
  1. Déployer (Vercel), vérifier que `https://www.ubodrop.com/` est bien le domaine
     principal (redirection depuis le `.vercel.app`).
  2. **Google Search Console** : ajouter la propriété `www.ubodrop.com`, soumettre
     `sitemap.xml`, demander l'indexation de la page d'accueil.
  3. Forcer le rafraîchissement du favicon (cache navigateur/Google peut être long).

## 6. Verdict

**GO** côté code SEO/logo : titres/meta/canonical/og corrigés, robots+sitemap+manifest
créés, données structurées ajoutées, logos déjà bordeaux. Le positionnement Google
dépend ensuite du déploiement + Search Console + délai d'indexation.
