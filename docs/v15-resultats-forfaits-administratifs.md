# ATYOM V15 — Résultats manuels et matchs gagnés / perdus par forfait

## Utilisation
Dans **GX NØVA > Programme > Toute la semaine**, ouvrir un match déjà enregistré, puis **Score administratif / forfait > Saisir un score**. Pour les nouveaux rosters ATYOM, le même bouton est sur chaque match du programme.

Deux natures :
- **Forfait** : victoire ou défaite attribuée administrativement, score non nul, par exemple **3–0** si la compétition attribue effectivement ce score (ceci n'est pas une règle automatique).
- **Résultat validé hors EA** : une rencontre dont le résultat est connu, mais absent de l'import EA, nul autorisé.
- Correction et retrait possibles ; un score saisi est réutilisé et modifie les statistiques à la prochaine actualisation.
- Le score et sa source restent visibles dans les programmes, fiches roster et les dix derniers résultats ATYOM.

## Impact sur les statistiques
- Programme GX NØVA : nombre de matchs joués, V/N/D, BP/BC et exclusion du volet « à préparer ».
- Cockpit GX NØVA : forme des cinq et dix derniers matchs, avec les scores manuels (séparément des performances joueurs et du détail de matchs EA).
- Vue globale ATYOM : résultats récents, forme et bilans des 30 derniers jours, BP/BC, taux de victoire par roster et consolidé.
- Fiches des nouveaux rosters : résultats récents et bilan V/N/D des 50 derniers matchs affichés.
- Les compteurs d'activités individuelles (buts joueurs, notes, passes, tacles…) restent exclusivement basés sur les matchs EA réellement joués.
- Les classements et statistiques détaillés de championnat externes ne sont pas modifiés automatiquement par un score administratif ; les données par saison/compétition basées uniquement sur EA ne sont pas recalculées par ce système.

## Isolation et cohérence
- Table `public.atyom_manual_results`, PK `(roster_id,event_id)`, résultat V/N/D calculé depuis le score, RLS active sans policy client.
- API `/api/results/manual` en écriture : demande un utilisateur Admin/Staff actif et autorisé sur le roster, valide l'existence de l'événement en base, refuse les scores à une date future et les forfaits nuls.
- Les événements GX NØVA déjà liés à EA refusent une saisie manuelle.
- Le rapprochement automatique EA ignore les scores administratifs et une confirmation manuelle de liaison EA sur un tel événement est refusée jusqu'au retrait du score.
- Les résultats administratifs de rosters supplémentaires sont liés à leur événement source avec suppression en cascade.
- Pour GX NØVA, les calculs de la vue globale ignorent les résultats orphelins dont le match a disparu du programme.
- Aucun match fictif n'est injecté dans les tables `matches` ou `match_players`.

## Recette à réaliser sur sessions de test
1. Admin/Staff : sur un match déjà sauvegardé, saisir un forfait 3–0 **seulement si c'est le score officiel** ; vérifier l'apparition du badge, les V/N/D et le bilan ATYOM.
2. Corriger le score à 0–3, vérifier la transformation de victoire en défaite et les changements de BP/BC ; puis retirer le résultat et contrôler le retour à l'état à venir.
3. Vérifier que Viewer peut lire mais ne peut pas écrire ; un membre d'un autre roster doit recevoir 403.
4. Tenter un forfait 0–0, un résultat avant la date du match, un ID de roster étranger et un score sur un match lié à EA ; vérifier les refus.
5. Scanner la semaine EA après avoir enregistré un forfait et vérifier qu'il n'est ni lié ni comptabilisé deux fois.
6. Vérifier que les performances de joueurs restent inchangées.
7. Vérifier qu'un résultat manuel d'un roster n'apparaît pas dans un autre roster.
8. Après test, vérifier que l'historique GX NØVA reste intact. Le build Vercel seul ne constitue pas un test de session authentifiée.
