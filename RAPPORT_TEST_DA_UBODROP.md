# UBODROP — Rapport Test DA · Nouvelle Identité Visuelle
**Date :** 28 mai 2026 · Session 15  
**Auteur :** Claude (Cowork) pour Damien Miyouna  
**Statut :** VERSION TEST — Ne pas diffuser  

---

## Objectif

Tester la nouvelle identité visuelle UBODROP sur deux supports distincts :
1. **Site vitrine** (`ubodrop-site-da-test.html`) — page d'accueil publique
2. **Application mobile** (`ubodrop-app-da-test.html`) — interface client interactif

Ces fichiers sont autonomes, sans dépendance backend, et ne touchent pas aux versions de production.

---

## Système de Design Extrait de PJ1

### Palette
| Token | Valeur | Usage |
|-------|--------|-------|
| `--cream` | `#EAE4D8` | Fond principal, textes sur bordeaux |
| `--cream-dark` | `#DDD6C8` | Fond secondaire, séparateurs |
| `--bordeaux` | `#5C1A18` | Couleur primaire, CTA, titres |
| `--bordeaux-mid` | `#7A2420` | Hover, accents |
| `--bordeaux-light` | `#9B3B37` | Liens, tags secondaires |
| `--white` | `#FFFFFF` | Cartes, inputs |

### Typographie
- **Space Grotesk** (Google Fonts) — tous les textes UI
  - 700 pour les titres, wordmark, boutons
  - 600 pour les labels, nav
  - 400 pour le corps
- **Space Mono** — badges techniques, version test, timestamps

### Logo
Deux carrés aux coins arrondis qui se chevauchent, tracés en outline (stroke uniquement, pas de fill). Symbolise la connexion client ↔ professionnel. Implémenté en SVG inline :
```svg
<rect x="10" y="10" width="38" height="38" rx="9" stroke="[color]" stroke-width="3.5" fill="none"/>
<rect x="24" y="24" width="38" height="38" rx="9" stroke="[color]" stroke-width="3.5" fill="none"/>
```

---

## Fichier 1 — Site Vitrine

**Fichier :** `ubodrop-site-da-test.html`

### Sections
1. **Navigation** — sticky, fond cream, logo SVG + wordmark, liens, bouton CTA bordeaux
2. **Hero** — fond cream, titre en bordeaux, sous-titre muted, grille de cartes pro (bordeaux + cream)
3. **Stats strip** — fond bordeaux plein, 4 chiffres clés (pros, clients, réservations, note)
4. **Comment ça marche** — 3 étapes, étape centrale en bordeaux
5. **Métiers** — 9 catégories sur fond bordeaux, icônes en cream
6. **Cards Pro** — 4 cartes professionnelles avec tags et prix
7. **Split CTA** — deux colonnes (dark bordeaux / cream) pour client vs pro
8. **Témoignages** — 3 cartes, centrale en bordeaux
9. **Footer** — fond bordeaux complet, liens, tagline

### Points de design notables
- Radius `32px` sur les boutons principaux (pill)
- Ombre `rgba(92,26,24,0.10)` sur les cartes pour cohérence avec la couleur primaire
- Hover effects : `translateY(-2px)` sur les cartes, légère opacité sur les boutons

---

## Fichier 2 — Application Mobile

**Fichier :** `ubodrop-app-da-test.html`

### Écrans disponibles (6)
Navigables via les boutons du sélecteur ou les interactions dans l'app :

| Écran | Identifiant | Description |
|-------|-------------|-------------|
| Splash | `splash` | Logo animé + loader, fond bordeaux, avance automatiquement vers Login après 2,8s |
| Connexion | `login` | Onglets Connexion/Inscription, sélection rôle (Client/Pro), formulaire |
| Accueil | `home` | Header bordeaux avec recherche, catégories scroll, cards pros, liste "Près de vous" |
| Fiche Pro | `pro` | Hero bordeaux, stats row, bio, liste des prestations, portfolio, bouton réserver |
| Réservation | `booking` | Récap prestation, mini calendrier interactif, créneaux horaires, total + paiement |
| Mon compte | `profile` | Profil utilisateur, menu navigation, déconnexion |

### Composants clés
- **Phone frame** — cadre 390×844 (iPhone 14 Pro), border-radius 48px, fond `#1A0A09` pour l'effet biseau
- **Status bar** — adaptatif : fond bordeaux sur les écrans bordeaux, fond cream sur les autres
- **Bottom navigation** — 4 onglets (Accueil, Recherche, Réservations, Profil), masqué sur Splash et Login
- **Toast** — notification flottante, apparaît sur confirmation de réservation
- **Calendrier** — CSS grid 7 colonnes, états : past / today / avail / selected
- **Créneaux** — grille 3 colonnes, états : disponible / sélectionné / indisponible
- **Animations** — pulse sur le logo splash, loader dots, transitions CSS 0.22s

### Interactions implémentées
- Splash → Login auto après 2,8s
- Connexion → Accueil (bouton Se connecter)
- Sélection de catégories (mise en évidence active)
- Clic sur pro card → Fiche pro
- Clic sur prestation → Réservation
- Sélection date dans calendrier
- Sélection créneau horaire
- Confirmation réservation → toast + retour Accueil
- Retour (bouton ‹) sur Fiche pro et Réservation

---

## Ce qui n'a PAS changé

Ces fichiers test sont **entièrement séparés** de la production :
- `app.html` — application production (non modifiée)
- `index.html` — site vitrine production (non modifié)
- Backend Railway — non modifié

---

## Prochaines étapes possibles

1. **Validation DA** — Le chef de projet donne un avis sur les couleurs, le logo, les cartes
2. **Ajustements** — Modifications de palette, espacement, typographie selon retours
3. **Intégration production** — Si DA validée, intégration progressive dans `app.html` et `index.html`
4. **Mode pro** — Créer les écrans côté professionnel (tableau de bord, gestion prestations)

---

*Rapport généré le 28/05/2026 — Session 15*
