# ATYOM V16 — Calendrier mensuel et report de rencontres

## Utilisation
- **GX NØVA → Programme** : sélectionner l’onglet **Calendrier**, à côté de « À préparer » et « Toute la semaine ».
- **Nouveaux rosters → fiche roster → Programme** : basculer entre **Liste** et **Calendrier**.
- La vue couvre le mois sélectionné et les journées adjacentes sur six semaines complètes.
- Les badges indiquent **À jouer**, **Résultat EA**, **Forfait**, **Hors EA**. Les scores validés sont visibles.
- Pour reporter un match à un autre jour ou horaire :
  - sur ordinateur, glisser la carte sur le jour cible, puis confirmer le nouvel horaire ;
  - sur ordinateur ou mobile, cliquer **Décaler**, choisir date et horaire, **Confirmer le report**.
- Avec un rôle Viewer, le calendrier est consultable mais aucune édition n’est possible.
- En cliquant le numéro du jour dans le calendrier GX NØVA, on ouvre la liste des 7 jours à partir de cette date.

## Comportement du report
- L'ID d’événement est conservé : adversaire, compétition, notes, logo adverse, disponibilités et composition restent rattachés au match.
- Sur GX NØVA, le programme est stocké en `weekly_programs` par semaine calendaire (début dimanche). Le serveur déplace l’événement entre dates et semaines ; il déplace aussi `programme_event_plans.event_date` et `week_start` si une préparation existe.
- Sur les autres rosters, la route met à jour `atyom_roster_events.event_date` et `event_time` en conservant l'ID, l’adversaire et les autres informations.
- Un changement dans un autre mois reste possible : la vue s'actualise et les exports futurs utilisent les nouveaux horaires.
- **Protégé** : on ne peut pas déplacer directement un match déjà relié à EA ou une rencontre avec score officiel manuel/forfait. Pour déplacer un forfait, retirer d’abord le score administratif après vérification de la décision de la ligue.
- Les conflits de créneau et les changements concurrents sont refusés.
- L'opération ne déplace pas les performances EA et ne change pas les statistiques d’un résultat déjà finalisé.
- Les annonces Discord et les affiches PNG précédemment exportées ne se modifient pas toutes seules ; régénérer les exports après un report.

## Limites et risque maîtrisé
- GX NØVA : les reports entre deux semaines distinctes utilisent plusieurs écritures Supabase serveur successives, avec restauration des états initiaux en cas d’échec détecté, **et non une transaction PostgreSQL entièrement atomique**. En cas d'erreur réseau pendant une écriture, recharger le programme et vérifier les deux semaines avant de réessayer.
- La vue calendrier lit des données enregistrées. Sur GX NØVA, sauvegarder les changements locaux de la liste avant de basculer vers le calendrier.
- Les nouveaux rosters sont encore limités aux données du programme existant ; aucun envoi automatique de notifications/Discord n'est déclenché.
- Aucune migration SQL nécessaire ; utilise les structures existantes.
- Déploiement Vercel ne vaut pas test de session utilisateur.

## Recette à effectuer
1. Admin/Staff GX NØVA : créer un match test (sans score et sans lien EA), enregistrer la semaine, préparer une compo et des disponibilités, le déplacer sur le même jour à une autre heure puis sur une autre semaine. Vérifier que le plan est intact.
2. Vérifier que l'adversaire, les logos, la compétition et les notes sont conservés et que le programme reste ordonné chronologiquement après actualisation.
3. Déplacer un match d'un mois à l'autre et le retrouver via les flèches de navigation. Tester le glisser-déposer desktop et le bouton Décaler mobile.
4. Tenter de déplacer un match lié à EA, un forfait validé, et vers un horaire déjà occupé : refus attendu.
5. Avec Viewer, aucune possibilité de déplacer un match. Tester l'interdiction d'accès à un roster non autorisé sur les deux API.
6. Nouveau roster : test du report sur sa liste et son calendrier sans modification du programme GX NØVA.
7. Contrôler le rendu de la vue sur mobile (défilement horizontal) et l’export Discord régénéré.
8. Contrôler les historiques de matchs et les statistiques de la structure : aucun résultat ne doit changer.

## Fichiers
- `app/api/programme/calendar/route.ts` : affichage sécurisé 42 jours
- `app/api/programme/calendar/move/route.ts` : report protégé
- `components/programme/ProgrammeCalendar.tsx` : grille calendrier et formulaire de report
- `app/programme/page.tsx` et `components/rosters/RosterProgramme.tsx` : intégrations
