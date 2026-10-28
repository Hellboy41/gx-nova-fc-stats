# ATYOM V14 — Effectifs et compositions modernisés

## Ce qui change

- Les nouveaux rosters ATYOM peuvent enregistrer leurs joueurs (pseudo, numéro, poste, actif/inactif), modifier leur fiche et constituer un onze et un banc.
- Les dispositifs 4-3-3, 4-2-3-1, 3-5-2, 3-1-4-2 et 4-4-2 sont proposés, avec conversion prudente des affectations lors du changement.
- Le terrain graphique est modernisé : marquages, pelouse, cartes joueur, positions, notes éventuelles, couleur et logo du roster.
- Le **même composant de terrain** est utilisé dans l'éditeur historique GX NØVA et dans les nouveaux rosters. La sauvegarde historique est inchangée.
- Export PNG vertical prêt pour Discord, disponible dans l'éditeur historique et les nouveaux rosters.

## Isolation et sécurité
- Nouvelles tables `public.atyom_roster_players` et `public.atyom_roster_lineups`, RLS activée et sans policies client. Migration additive appliquée.
- Toute API `/api/rosters/[id]/players` et `/api/rosters/[id]/lineup` contrôle l'utilisateur actif, le rôle et l'identifiant du roster **avant** la lecture ou écriture service-role.
- Staff et Admin autorisés : écriture, Viewer : lecture seule.
- La sauvegarde des compositions valide les onze postes définis, bloque doublons titulaires/remplaçants, limite le banc à 12 et vérifie que **tous** les identifiants appartiennent à des joueurs actifs du roster sélectionné.
- Les joueurs désactivés restent en base pour préserver leur historique, mais ne sont plus proposés sur le terrain.
- Un roster ne peut pas piloter ou lire l'effectif d'un autre roster par l'API.
- Aucune modification de `public.players`, `public.lineups` (ou tables historiques), `public.matches` ou `public.seasons`.

## Recette demandée
1. Avec un nouvel ID EA de test, créer un roster, saisir 11 joueurs et 2 remplaçants ; recharger, vérifier les noms, numéros et postes.
2. Changer le dispositif 4-3-3 / 3-5-2, enregistrer, revenir ; les postes et affectations doivent rester cohérents.
3. Essayer d'assigner deux fois un joueur : contrôle UI et serveur.
4. Un utilisateur limité à un seul roster reçoit 403 sur les API d'un autre roster. Viewer reçoit 403 en écriture.
5. Désactiver un joueur et vérifier son retrait des sélections et son maintien dans l'effectif inactif.
6. Contrôler l'export PNG sur navigateur desktop/mobile et son rendu sur Discord.
7. Contrôler l'ancienne composition GX NØVA, l'export et la sauvegarde historique, ainsi que le total de 94 matchs et 4 saisons existants.
8. Mettre en garde : un build Vercel READY **ne remplace pas** un test E2E authentifié avec de vrais comptes de recette.

## À venir
Statistiques individuelles spécifiques des nouveaux rosters après choix et validation des métriques disponibles dans l'API EA. Les nouveaux outils n'imitent pas les données du roster GX NØVA.
