# RAPPORT — Hotfix navigation app.html

**Date :** 1er juin 2026  
**JS syntax :** ✅ OK (node --check)  
**Urgence :** Production

---

## 1. Problème

L'application chargeait l'écran d'accueil avec les 4 boutons visibles mais les boutons ne permettaient pas d'accéder aux parcours. L'app restait bloquée sur l'écran home.

---

## 2. Cause racine

**3 causes combinées :**

### A — Code JS tronqué (principal)
Des éditions successives avaient introduit :
- **48 octets nuls (`\x00`)** à la fin du fichier corrompant le JS
- **1 accolade `{` non fermée** (816 open, 815 close) provoquant `SyntaxError: Unexpected end of input`

Lorsque le navigateur rencontre une SyntaxError dans un `<script>`, **tout le JS du bloc s'arrête** — y compris `initApp()` et `bindGo()` qui settent les handlers des boutons.

### B — Navigation dépendante de `bindGo()` uniquement
Les boutons home n'avaient PAS d'attribut `onclick` inline — ils dépendaient exclusivement de `bindGo()` qui assignait les handlers dynamiquement au chargement. Si `bindGo()` ne s'exécutait pas (JS cassé), les boutons étaient inertes.

### C — Absence de fallback
Aucun mécanisme de secours pour brancher la navigation si l'init JS échouait partiellement.

---

## 3. Correction appliquée

### Fix 1 — `onclick` direct sur les boutons home
```html
<button data-go="screen-search" onclick="goTo('screen-search')">Trouver un pro</button>
<button data-go="screen-register-pro" onclick="goTo('screen-register-pro')">Devenir pro</button>
<button data-go="screen-register-client" onclick="goTo('screen-register-client')">Créer un compte</button>
<button data-go="screen-login" onclick="goTo('screen-login')">Se connecter</button>
```
→ Fonctionnent même si `bindGo()` ne s'exécute pas.

### Fix 2 — Fallback `ensureHomeNavigation()` en fin de script
IIFE qui rebinde TOUS les `[data-go]` buttons avec une navigation robuste :
```javascript
(function ensureHomeNavigation() {
  function safeGoTo(screenId) {
    try {
      if (typeof goTo === 'function') goTo(screenId);
      else { /* fallback manuel */ }
    } catch(e) { /* fallback manuel */ }
  }
  document.querySelectorAll('[data-go]').forEach(btn => {
    if (!btn.onclick) btn.addEventListener('click', () => safeGoTo(btn.getAttribute('data-go')));
  });
})();
```

### Fix 3 — Nettoyage JS
- Suppression des 48 octets nuls `\x00`
- Ajout du `}` manquant à la bonne position
- JS syntax validé avec `node --check` ✅

---

## 4. Tests

| Test | Résultat |
|------|----------|
| JS syntax `node --check` | ✅ OK |
| 0 octets nuls dans le fichier | ✅ |
| Boutons ont `onclick` direct | ✅ |
| Fallback `ensureHomeNavigation` | ✅ |
| Trouver un pro → screen-search | ✅ code |
| Devenir pro → screen-register-pro | ✅ code |
| Créer un compte → screen-register-client | ✅ code |
| Se connecter → screen-login | ✅ code |

---

## 5. Verdict

```
✅ GO production
```

**Push :**
```bash
cd C:\Users\HP-15\Downloads\UBO-DROP-violet

git restore --staged .
git add app.html RAPPORT_HOTFIX_APP_NAVIGATION.md

git commit -m "Hotfix: navigation home buttons, SyntaxError JS corrigé, fallback bindGo"
git pull --rebase origin main
git push origin main
```

*Rapport généré le 01/06/2026*
