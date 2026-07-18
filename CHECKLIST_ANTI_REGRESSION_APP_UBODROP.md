# CHECKLIST ANTI-RÉGRESSION — app.html UBODROP

À exécuter **avant chaque commit touchant `app.html`**. Aucun commit si un point échoue.

## A. Sécurité Git (NOUVEAU — cause de l'incident du 2026-06-01)

1. `git ls-files | wc -l` → **doit être grand (> 2000), jamais 0.**
   Si 0 → l'index est détruit : faire `git reset` (après `del .git\index.lock`) avant tout.
2. `git status --short` → **aucune suppression de masse (`D `)** inattendue.
   Si des centaines de `D ` apparaissent → NE PAS committer. `git reset` d'abord.
3. Vérifier l'absence de verrou périmé : `if exist .git\index.lock del .git\index.lock`.
4. Ne **jamais** faire `git add app.html` + `git commit` quand l'index est dans un état
   douteux : un `commit` emporte TOUT ce qui est en attente, pas seulement `app.html`.
5. `git diff app.html` → seules les lignes attendues ont changé.
6. Committer `app.html` de façon ciblée ; ne pas ajouter les fichiers test, anciens
   rapports, ni images WhatsApp.

## B. Intégrité du fichier (anti-code tronqué)

7. Le fichier se termine bien par `</body>` puis `</html>`.
8. Balises `<script>` / `</script>` équilibrées ; aucun bloc coupé.
9. Aucune accolade `{}`, parenthèse `()`, backtick `` ` `` ou balise fermante manquante.
10. Aucun octet nul : `grep -qP '\x00' app.html` ne doit rien trouver.
11. JS inline valide : extraire le `<script>` principal et `node --check`.
12. Aucun morceau de JavaScript brut visible dans l'interface.

## C. Parcours fonctionnel (test local sur http://localhost:5173/app.html)

13. **Accueil** : logo visible ; « Trouver un pro », « Devenir pro », « Créer un compte »,
    « Se connecter » fonctionnent.
14. **Carte client** (`screen-search`) accessible : input ville visible, catégories visibles.
15. `loadPros()` est appelé à l'arrivée sur la recherche ; `renderPros()` remplit `#proList`.
16. `renderFilterCategories()` remplit `#sheetCategoryRow` ; bouton « Voir tout » OK.
17. Le bottom sheet `#bottomSheet` n'est pas vide quand des pros existent (éviter de rester
    coincé en `sheet-state-1` si cela masque la liste sur desktop).
18. Clic sur un pro ouvre la fiche prestataire (photo, nom, prestations visibles).
19. Sélection prestation OK ; bouton réserver visible ; **overlay réservation 3h** fonctionne.
20. **Espace pro** : connexion pro, dashboard, prestations, profil, bancaire, déconnexion.
21. Console navigateur : **aucune erreur rouge** ; aucune fonction `undefined` au clic.
22. Test **desktop + mobile**.

## D. Ne jamais réintroduire

- Ancienne DA violette ; Google Login ; faux pros.
- Image carte statique **à la place** de la vraie logique carte/pros.
- JS brut visible ; fichiers test ; anciennes pages DA test.

## E. Configuration / déploiement (hors code app.html)

23. `assets/js/config.js` : `API_URL` pointe vers le vrai backend en prod (pas `""`).
24. Clé Google Maps valide et **autorisée sur le domaine `ubodrop.com`**.
25. Après push : confirmer le **redeploy Vercel** du dernier commit, puis tester
    `https://ubodrop.com/app.html?v=hotfix-map-pros`.

---

_Note : `app.html` est un fichier long (~4 440 lignes). Toute modification doit être
ciblée et vérifiée ; ne jamais réécrire ou remplacer une grande section sans contrôler
la fin du document et relancer `node --check`._
