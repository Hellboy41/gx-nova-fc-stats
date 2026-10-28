# ATYOM — droits d'accès structure / rosters

La fonction est indépendante des rôles (Admin, Staff, Viewer).

- `structure` : utilisateur autorisé à tous les rosters de la structure et à l'espace organisation.
- `rosters` : utilisateur autorisé uniquement aux IDs de rosters explicitement attribués.
- Les comptes Admin doivent toujours conserver le périmètre structure.
- Le panneau « Périmètres d'accès » est intégré aux Paramètres (Admin uniquement).
- Un nouveau membre Staff ou Viewer autorisé par le formulaire historique reçoit par défaut l'accès à GX NØVA uniquement.
- La vérification a lieu côté serveur sur chaque API sensible via `requireActiveStaff`, sans faire confiance à un roster ID déclaré par le client.
- Les six profils existants sont conservés avec accès structure lors de la migration non destructive.
- La politique RLS `staff_profiles_select_own` reste en place. Aucune autorisation admin n'est exposée au navigateur.

## Limite de la phase pilote
La plateforme ne possède qu'un roster réellement connecté : `gx-nova-legacy` / GX NØVA / EA 1663.
Il est **interdit** d'ajouter de nouveaux rosters à la liste des droits avant de disposer d'un stockage isolé, de contrôles des données par roster et d'une sélection sûre côté serveur. La mise en place d'une table de rosters isolés sera une évolution ultérieure.

## Recette
1. Admin : accès aux Paramètres et au panneau, périmètre global non modifiable.
2. Staff : passer « Toute la structure » à « Rosters sélectionnés » → GX NØVA → Enregistrer.
3. Staff : recharger, contrôler le périmètre dans « Mon compte » et la persistance des droits.
4. Viewer : autoriser GX NØVA ; GET autorisés, POST /api/lineup interdit.
5. Compte désactivé : accès refusé (API 403).
6. Roster supprimé dans le tableau de droits : aucun accès rendu possible par un simple paramètre URL.
7. Test direct : API de stockage /api/history, /api/lineup, /api/players, /api/matches et /api/match/:id après déconnexion (401).
8. Vérifier les données EA (94 matchs, quatre saisons au point de départ).
9. Vérifier qu'un nouveau roster n'est pas suggéré avant activation du multi-roster serveur.

**Attention** : les tests de session authentifiée et de refus effectif doivent être effectués avec des comptes dédiés, sans modifier les droits des utilisateurs réels.
