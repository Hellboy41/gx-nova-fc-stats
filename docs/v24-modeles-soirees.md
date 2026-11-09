# ATYOM V24 — Modèles de soirées réutilisables

## Objectif
Créer une fois les horaires et compétitions habituels d'un roster, puis réutiliser ce modèle chaque semaine pour compléter uniquement les adversaires. La fonctionnalité est additive par rapport à la V23 (interface simplifiée).

## Ce qui est ajouté
- Nouveau panneau **Modèles de soirée**, replié par défaut, dans le programme historique GX NØVA et dans le programme de chaque nouveau roster.
- Création d'un modèle depuis une semaine existante, ou de zéro en choisissant les jours (lundi à dimanche), heures, compétitions et types de rencontres. Les adversaires, logos, scores, liens EA et compositions ne sont pas enregistrés dans un modèle.
- Bibliothèque persistante sur Supabase, isolée par **roster** (20 modèles au maximum par roster ; 42 créneaux au maximum par modèle).
- Application à une période de sept jours, avec prévisualisation et champs adversaires facultatifs. Les matchs existants à ces jours/heures sont ignorés, jamais remplacés.
- Roster historique : les rencontres sont placées en **brouillon** dans le programme et l'utilisateur doit cliquer sur **Enregistrer**. La prévention des pertes de modifications de la V23 demeure.
- Roster autonome : les rencontres sont créées via une requête groupée ; les adversaires encore inconnus reçoivent le libellé « À définir » et peuvent être modifiés ensuite. Les scores manuels existants empêchent la modification de l'adversaire.
- Respect du rôle **Viewer** en lecture seule, et des droits Admin/Staff limités aux rosters autorisés.

## Données et sécurité
Migration : `supabase/migrations/20261109_atyom_evening_templates_v24.sql`. Table : `public.programme_evening_templates`.
- `roster_id` obligatoire, `name`, `slots` (JSON), auteur et horodatages.
- Unicité insensible à la casse du nom par roster.
- RLS activé ; aucun accès direct de `anon` et `authenticated` à la table. Toutes les requêtes passent par le serveur après contrôle Supabase Auth + profil staff + accès au roster.
- La migration ne modifie aucune rencontre et aucun résultat existant.
- API modèles : `GET` / `POST` / `DELETE /api/programme/templates`. Application en lot aux rosters autonomes : `POST /api/programme/templates/apply`.

## Scénarios de recette en session connectée
1. Admin GX NØVA : ouvrir Programme > Modèles de soirée, créer un modèle « Soirée VPG » avec les horaires lundi 21:20 et 21:40.
2. Choisir une autre semaine, sélectionner ce modèle, renseigner un adversaire et laisser l'autre vide ; appliquer. Vérifier les 2 brouillons, l'avertissement non sauvegardé puis Enregistrer.
3. Dans la même semaine, réappliquer le modèle : 0 création et 2 créneaux ignorés. Ne jamais effacer un match existant ni un score.
4. Vérifier le panneau Modifier sur un match créé, la sélection correcte de compétition, puis l'export Discord (adversaire non renseigné : « Adversaire à confirmer »).
5. Admin/Staff d'un nouveau roster : créer un modèle sans rencontre préalable en ajoutant des créneaux manuellement. L'appliquer à une autre semaine ; vérifier « À définir », modifier l'adversaire et vérifier le programme.
6. Vérifier la séparation entre deux rosters : un modèle d'un roster ne doit pas être visible ou modifiable depuis l'autre roster.
7. Viewer : consultation du modèle autorisée ; création, suppression, application et modification des adversaires interdites.
8. Vérifier l'interface mobile, les dates françaises et les fuseaux horaires.
9. Vérifier les 4 exports Discord, le calendrier, les compositions et le rapprochement EA de la V23.

## Limites de vérification
Le build Vercel valide la compilation. Les parcours avec compte connecté, les permissions effectives et l'affichage mobile doivent être validés en navigateur avant une promotion en production.
