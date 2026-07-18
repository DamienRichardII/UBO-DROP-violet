# RAPPORT — Ajout planning réservation UBODROP

_Date : 2026-06-01 — Frontend (app.html) + Backend (NestJS), ciblé et vérifié_

## 1. Décision produit

Permettre la réservation à une **date précise**, en gardant le mode rapide existant.
Deux modes : « Dès que possible » (ASAP, ≤ 3h) et « Planifier une date » (SCHEDULED).

## 2. Correction frontend (`app.html`)

- **Overlay de réservation** : ajout d'un sélecteur 2 modes
  (`Dès que possible` / `Planifier une date`).
  - ASAP → créneaux rapides existants (inchangés).
  - SCHEDULED → champs `Date` + `Heure` (+ erreur inline).
- **État** : `state.bookingMode` (`"ASAP"` par défaut), `state.selectedBookingStartsAt`.
- **`setBookingMode(mode)`** : bascule l'affichage, réinitialise la sélection,
  désactive « Confirmer » tant qu'aucun créneau/date valide.
- **`validateScheduledBooking()`** : date min = aujourd'hui, max = +30 j ; heure
  obligatoire ; refus du passé ; messages clairs ; calcule `startsAt` (ISO).
- **`confirmBooking()`** : contrôle selon le mode (ASAP ≤ 3h, SCHEDULED ≤ 30 j,
  jamais dans le passé) puis envoie le payload.
- **Payload** (`appApi.createBooking`) : `{ serviceId, startsAt, notes?, bookingMode }`.
  `startsAt` reste la donnée principale (le backend déduit le pro depuis le service).
- CSS ciblé `.booking-mode-row` / `.booking-mode-btn` dans la DA bordeaux/crème.
  Aucune autre logique touchée (créneaux rapides, fiche pro, Stripe inchangés).

## 3. Correction backend (NestJS)

- `dto/create-booking.dto.ts` : ajout `bookingMode?: 'ASAP' | 'SCHEDULED'`
  (`@IsIn`, optionnel → fallback ASAP) et `scheduledAt?` (`@IsDateString`, fallback
  de compatibilité). `startsAt` reste la donnée principale.
- `bookings.service.ts` — validation selon le mode :
  - `ASAP` : `startsAt` entre maintenant (-2 min tolérance) et **+3h**.
  - `SCHEDULED` : `startsAt` futur et **≤ `BOOKING_SCHEDULE_MAX_DAYS` jours** (défaut 30).
  - Jamais de date passée, quel que soit le mode.
  - Règles de disponibilité (`AvailabilityRule`) et anti-conflit : **inchangées**
    (bêta : si aucune règle, réservation autorisée — log existant conservé).
- Variable optionnelle : `BOOKING_SCHEDULE_MAX_DAYS=30` (fallback 30 si absente).

## 4. Stripe Connect

Inchangé. Le flux reste : créer le booking → `createCheckoutSession` → redirection
Stripe. Le message « ce professionnel n'a pas activé les paiements » existant est
conservé côté frontend.

## 5. Tests réalisés

Frontend (jsdom + `node --check`) :
- `node --check` du JS inline : **OK**. Pas d'octet nul. Fin de fichier
  `</body></html>`. **Aucun code tronqué.**
- Mode SCHEDULED : champs date/heure affichés, créneaux rapides masqués, boutons
  togglés ; mode ASAP : créneaux rapides réaffichés.
- Date valide (+3 j) → « Confirmer » activé, aucune erreur.
- Date passée → refus + message ; date > 30 j → refus + message.
- Init de l'app intacte (9 catégories rendues), `handleForgotPassword` et toutes
  les fonctions globales présentes, 0 erreur console.

Backend :
- `npx tsc --noEmit --skipLibCheck` : **exit 0** (aucune erreur de type).

## 6. Incident maîtrisé pendant l'édition (transparence)

Le montage de fichiers a tronqué `app.html` en fin de fichier lors d'une écriture
(outil d'édition). Détecté par contrôle anti-tronquage (fin de fichier + `node --check`
sur extraction correcte). **Réparé** : fichier reconstruit depuis la base committée
+ ré-attachement de la fin authentique + ré-application vérifiée des modifs, puis
écriture par copie atomique et contrôle d'intégrité (md5 + `</html>` + syntaxe).

## 7. Non implémenté volontairement (hors périmètre sûr)

- Affichage du libellé « Réservation planifiée / rapide » côté espace pro :
  nécessiterait une **migration Prisma** (colonne `bookingMode` en base) — écartée
  pour la bêta afin de ne pas risquer le schéma. La réservation planifiée fonctionne
  sans cette colonne ; à ajouter dans un second temps si souhaité.

## 8. Verdict

**GO frontend + backend (code)** : le client peut réserver « dès que possible » ou
planifier une date précise (≤ 30 j), avec validation des deux côtés. **Reste à faire
par toi** : `git reset` (index), commit ciblé `app.html` (frontend) et le dépôt
backend séparément, `tsc`/`prisma generate` en local, puis déploiement
(Vercel + Railway). Ajouter `BOOKING_SCHEDULE_MAX_DAYS` sur Railway si tu veux une
autre limite que 30 jours.
