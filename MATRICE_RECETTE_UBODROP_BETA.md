# MATRICE DE RECETTE UBODROP — BÊTA FERMÉE
**Version :** Sprint P0 (2026-07-18)  
**Testeur de référence :** Chef de projet Sofiane Miyouna  

---

## COMMENT UTILISER CETTE MATRICE

- Chaque scénario = un test manuel à exécuter dans l'ordre
- **Prérequis :** backend Railway déployé + frontend Vercel déployé (commit 442f6f7)
- Compte test client : créer une nouvelle adresse `testclient+DATE@gmail.com`
- Compte test pro : utiliser le compte pro de démonstration ou en créer un via `/register/pro`
- Carte Stripe test : `4242 4242 4242 4242` · exp `12/34` · CVC `123`

---

## MODULE 1 — INSCRIPTION & VÉRIFICATION EMAIL

### T-01 · Inscription client → email de vérification envoyé

| Étape | Action | Résultat attendu |
|-------|--------|-----------------|
| 1 | Ouvrir l'app → "Créer un compte" | Formulaire inscription client affiché |
| 2 | Remplir prénom, nom, email valide, mot de passe | — |
| 3 | Valider | Écran "✉️ Vérifie ton email" affiché |
| 4 | Vérifier la boîte mail | Email Resend reçu avec lien d'activation |
| **Pass** ✅ | Email reçu en < 30 s | — |

---

### T-02 · Clic lien email → activation et auto-login

| Étape | Action | Résultat attendu |
|-------|--------|-----------------|
| 1 | Cliquer le lien dans l'email | App ouvre sur `#verify-email=TOKEN` |
| 2 | Attendre (auto-trigger 400 ms) | Spinner → "✅ Email confirmé ! Connexion en cours…" |
| 3 | Attendre 1,5 s | Redirect vers écran principal client |
| **Pass** ✅ | Connecté automatiquement, sans saisir le mot de passe | — |

---

### T-03 · Renvoi d'email de vérification

| Étape | Action | Résultat attendu |
|-------|--------|-----------------|
| 1 | Être sur écran "Vérifie ton email" | Bouton "Renvoyer l'email" visible |
| 2 | Cliquer "Renvoyer l'email" | Bouton désactivé temporairement |
| 3 | Vérifier la boîte mail | Nouvel email reçu |
| **Pass** ✅ | Email reçu, bouton se réactive | — |

---

### T-04 · Compte non activé ne peut pas se connecter

| Étape | Action | Résultat attendu |
|-------|--------|-----------------|
| 1 | Créer un compte client mais NE PAS cliquer le lien | — |
| 2 | Retour connexion → email + mot de passe | — |
| 3 | Valider | Écran "Vérifie ton email" affiché (pas de dashboard) |
| **Pass** ✅ | Accès bloqué jusqu'à vérification | — |

---

## MODULE 2 — RÉINITIALISATION MOT DE PASSE

### T-05 · Reset password → reconnexion propre

| Étape | Action | Résultat attendu |
|-------|--------|-----------------|
| 1 | Écran login → "Mot de passe oublié" | Formulaire email affiché |
| 2 | Saisir l'email du compte → Envoyer | Email reset reçu |
| 3 | Cliquer le lien dans l'email | Écran "Nouveau mot de passe" |
| 4 | Saisir et confirmer le nouveau mot de passe | Notification "Mot de passe mis à jour !" |
| 5 | Se reconnecter avec le nouveau mot de passe | Connexion réussie, dashboard accessible |
| **Pass** ✅ | Pas de session fantôme, reconnexion immédiate | — |

---

### T-06 · Ancien mot de passe rejeté après reset

| Étape | Action | Résultat attendu |
|-------|--------|-----------------|
| 1 | Après T-05, tenter de se connecter avec l'ancien mdp | Erreur "Identifiants incorrects" |
| **Pass** ✅ | Ancien mdp invalide | — |

---

## MODULE 3 — RECHERCHE & RAYON

### T-07 · Sélection du rayon

| Étape | Action | Résultat attendu |
|-------|--------|-----------------|
| 1 | Accéder à l'écran de recherche | 8 boutons de rayon : 1, 3, 5, 10, 15, 20, 30, 50 km |
| 2 | Cliquer sur "1 km" | Bouton actif, résultats rechargés immédiatement |
| 3 | Cliquer sur "50 km" | Résultats rechargés (+ de pros) |
| **Pass** ✅ | 8 options, rechargement auto | — |

---

### T-08 · Rayon respecté dans les résultats

| Étape | Action | Résultat attendu |
|-------|--------|-----------------|
| 1 | Activer la localisation ("Me localiser") | Position détectée |
| 2 | Sélectionner rayon 1 km | Seuls les pros à ≤ 1 km affichés |
| 3 | Passer à 20 km | Plus de pros affichés |
| **Pass** ✅ | Résultats filtrés par distance réelle | — |

---

### T-09 · Résultats s'actualisent sans recharger la page

| Étape | Action | Résultat attendu |
|-------|--------|-----------------|
| 1 | Changer de catégorie métier | Résultats mis à jour instantanément |
| 2 | Changer de rayon | Résultats mis à jour instantanément |
| **Pass** ✅ | Pas de refresh page, UI réactive | — |

---

## MODULE 4 — RÉSERVATION

### T-10 · Réservation client → confirmation

| Étape | Action | Résultat attendu |
|-------|--------|-----------------|
| 1 | Chercher un pro → cliquer sur sa fiche | Profil pro affiché |
| 2 | Sélectionner une prestation | Bouton "Réserver" actif |
| 3 | Valider | Stripe Checkout ou confirmation directe |
| 4 | Payer avec 4242 4242 4242 4242 | Paiement accepté |
| 5 | Vérifier tableau de bord client | Réservation en statut PENDING |
| **Pass** ✅ | Réservation créée, email de confirmation reçu | — |

---

### T-11 · Pro accepte une réservation

| Étape | Action | Résultat attendu |
|-------|--------|-----------------|
| 1 | Connexion compte pro | Dashboard pro → onglet RDV |
| 2 | Réservation PENDING visible avec boutons ✔ ✖ | — |
| 3 | Cliquer "✔ Accepter" | Toast "Réservation acceptée !" |
| 4 | Vérifier la carte | Statut → CONFIRMED, boutons disparaissent |
| 5 | Vérifier boîte mail du client | Email "Votre réservation est confirmée" reçu |
| **Pass** ✅ | Acceptation + email client | — |

---

### T-12 · Pro refuse une réservation avec motif

| Étape | Action | Résultat attendu |
|-------|--------|-----------------|
| 1 | Réservation PENDING → "✖ Refuser" | Prompt "Motif du refus (optionnel)" |
| 2 | Saisir un motif → OK | Toast "Réservation refusée" |
| 3 | Vérifier boîte mail du client | Email avec motif reçu |
| **Pass** ✅ | Refus + email client avec motif | — |

---

### T-13 · Pro refuse sans motif

| Étape | Action | Résultat attendu |
|-------|--------|-----------------|
| 1 | Refuser → laisser le champ motif vide → OK | Toast "Réservation refusée" |
| 2 | Vérifier email client | Email reçu sans motif ("Aucun motif fourni") |
| **Pass** ✅ | — | — |

---

### T-14 · Annulation prompt → aucune action

| Étape | Action | Résultat attendu |
|-------|--------|-----------------|
| 1 | Cliquer "✖ Refuser" → Annuler dans le prompt | Rien ne se passe |
| **Pass** ✅ | Réservation inchangée | — |

---

## MODULE 5 — NAVIGATION PRO

### T-15 · Retour depuis compte pro → tableau de bord (pas carte client)

| Étape | Action | Résultat attendu |
|-------|--------|-----------------|
| 1 | Connexion pro → aller sur "Mon compte" | Écran account affiché |
| 2 | Cliquer la flèche ‹ | Retour sur `screen-pro-dashboard` |
| **Pass** ✅ | Pas de carte client affichée | — |

---

### T-16 · Retour depuis compte client → carte client

| Étape | Action | Résultat attendu |
|-------|--------|-----------------|
| 1 | Connexion client → "Mon compte" | Écran account affiché |
| 2 | Cliquer la flèche ‹ | Retour sur `screen-search` (carte) |
| **Pass** ✅ | — | — |

---

## MODULE 6 — RÉGRESSION (NE PAS CASSER)

### T-17 · Carte client et icônes métiers

| Étape | Action | Résultat attendu |
|-------|--------|-----------------|
| 1 | Ouvrir l'app en mode invité | Carte Mapbox affichée |
| 2 | Vérifier les icônes métiers | Toutes les catégories affichées |
| **Pass** ✅ | Aucune régression visuelle | — |

---

### T-18 · Espace pro complet

| Étape | Action | Résultat attendu |
|-------|--------|-----------------|
| 1 | Connexion pro → Dashboard | Onglets : Agenda, Prestations, Profil, Revenus |
| 2 | Modifier une prestation | Sauvegarde OK |
| 3 | Stripe Connect → "Connecter mon compte" | Redirect Stripe (si non connecté) |
| **Pass** ✅ | Aucune régression | — |

---

## TABLEAU DE BORD — RÉCAPITULATIF TESTS

| Test | Module | Statut sprint P0 | À tester |
|------|--------|-----------------|---------|
| T-01 | Email vérification | ✅ Corrigé | Oui |
| T-02 | Auto-login post-vérif | ✅ Corrigé | Oui |
| T-03 | Renvoi email | ✅ Corrigé | Oui |
| T-04 | Compte non vérifié bloqué | ✅ Corrigé (client) | Oui |
| T-05 | Reset mot de passe | ✅ Corrigé | Oui |
| T-06 | Ancien mdp invalide | ✅ Corrigé | Oui |
| T-07 | 8 options de rayon | ✅ Corrigé | Oui |
| T-08 | Rayon respecté | ✅ Corrigé | Oui |
| T-09 | Résultats actualisés | ✅ Corrigé | Oui |
| T-10 | Réservation paiement | ⚠️ Non modifié (contrainte Stripe) | Oui — test complet |
| T-11 | Pro accepte | ✅ Corrigé | Oui |
| T-12 | Pro refuse + motif | ✅ Corrigé | Oui |
| T-13 | Pro refuse sans motif | ✅ Corrigé | Oui |
| T-14 | Annulation prompt | ✅ Corrigé | Oui |
| T-15 | Retour pro → dashboard | ✅ Corrigé | Oui |
| T-16 | Retour client → carte | ✅ Corrigé | Oui |
| T-17 | Régression carte/icônes | Non modifié | Oui |
| T-18 | Régression espace pro | Non modifié | Oui |

---

*Matrice UBODROP bêta — Sprint P0 — 2026-07-18*
