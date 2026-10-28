> **Orientation produit actualisée — V9 :** nous privilégions désormais une **copie autonome par club** (projet Vercel + base Supabase distincts) plutôt qu'un SaaS multi-structures dès la première commercialisation. Cette documentation reste une perspective technique pour une éventuelle version ultérieure. Voir [Déploiement par club](deploiement-par-club.md).

# V9 — Du club pilote à une plateforme esport multi-structures

## Ce que la V9 met réellement en place

- Une navigation à **5 entrées de premier niveau** : Accueil, Rosters, Compétitions, Performance, Administration.
- Une sous-navigation contextuelle par rubrique, sur ordinateur et mobile ; les modules existants ne sont pas supprimés.
- Un contrat TypeScript `Organisation`, `EsportRoster`, `WorkspaceContext`, avec les identifiants et l'identité de la structure pilote.
- Un endpoint authentifié `GET /api/workspace` retournant **uniquement** le workspace historique autorisé par l'authentification actuelle.
- L'écran `/organisation` présente la hiérarchie structure → roster et indique clairement que la création/le changement de roster restent inactifs.
- **Aucune migration SQL, aucune nouvelle structure ouverte, aucun changement de scope des API et aucune écriture de données.**

## Limite de sécurité actuelle (à corriger avant de vendre)

Les API historiques utilisent souvent le `club_id` EA constant `1663`, avec `createAdminClient()` (service role), et les comptes sont dans `staff_profiles` sans rattachement à une structure.

**Ce système n'est PAS multi-tenant à ce stade.** Il serait dangereux de seulement ajouter une liste déroulante de rosters et de remplacer `1663` par un paramètre transmis par le navigateur : un utilisateur pourrait voir ou modifier les données d'un autre club (IDOR).

## Modèle cible, proposé pour une migration ultérieure

- `organisations` : `id uuid`, `name`, `slug`, `owner_user_id uuid`, `logo_path`, `primary_color`, `secondary_color`, `created_at`.
- `organisation_memberships` : `organisation_id`, `user_id`, `role` (`owner`, `admin`, `staff`, `viewer`), `is_active`, `invited_at`, `joined_at`.
- `rosters` : `id uuid`, `organisation_id uuid`, `name`, `game` (`ea-fc` initialement), `game_edition`, `ea_club_id text`, `status`, `created_at`.
- `roster_memberships` : `roster_id`, `user_id`, `role`, `is_active`; par défaut, pas d'accès à un roster sans autorisation explicite, sauf pour owner/admin organisation.
- Tables métier (`matches`, `match_players`, `seasons`, `competitions`, `lineups`, `weekly_programs`, `programme_event_plans`, `evening_debriefs`, `debrief_player_overrides`, etc.) : ajouter `roster_id uuid` obligatoire après le backfill historique.
- Identifiant EA `ea_club_id` conservé comme attribut **externe**, jamais comme identifiant d'autorisation.

## Migration sans perte de données (ordre nécessaire)

1. **Inventaire** de toutes les tables/Storage/API et de leurs références de `club_id` ; sauvegarde et plan de retour arrière.
2. Créer les tables organisation/membership/rosters en migration additive **avec RLS activée immédiatement** sur chaque nouvelle table exposée. Un `TO authenticated` sans contrôle d'appartenance n'est pas une protection. N'utiliser ni `user_metadata` ni un `roster_id` client comme preuve d'autorisation.
3. Créer la structure pilote Team GX et le roster GX NØVA en utilisant **les identifiants techniques existants** et rattacher les seuls membres réellement autorisés après revue.
4. Ajouter `roster_id` nullable, puis backfill `club_id='1663'` et effectuer des contrôles de comptage (matchs, joueurs, événements, débriefs, pièces jointes).
5. Mettre toutes les API en **résolution serveur** du roster après session Auth + membership. Pour chaque lecture/écriture : vérifier `organisation_id`, `roster_id`, `user_id`, rôle et statut actif. Les opérations avec service role doivent refaire ces vérifications AVANT la requête.
6. Tester par deux comptes/deux structures distinctes : aucun objet du club A ne doit être visible, éditable, téléchargeable ni exportable par B. Vérifier également les URL signées de Storage et la portée des exports.
7. Mettre les colonnes `roster_id` à `NOT NULL` lorsque la transition est complète, indexer les jointures et activer RLS sur toutes les données métier exposées. Déployer progressivement.
8. Ensuite seulement : activer création de structures, invitation, onboarding, sélecteur de rosters, logos personnalisés, abonnement et facturation commerciale.

## Expérience produit cible

1. Création de compte.
2. Création de la structure (nom, logo, couleurs).
3. Création du premier roster (`EA FC`, nom, identifiant club EA).
4. Invitation des responsables et staff.
5. Accès au tableau de bord du roster sélectionné avec les 5 rubriques communes.

## État après V9

La V9 livre une navigation plus simple et un contrat de workspace, **pas** une plateforme multi-client opérationnelle.
La fonctionnalité multi-structures doit rester désactivée jusqu'à la migration de sécurité complète.
