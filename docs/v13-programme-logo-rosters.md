# ATYOM — Logo et calendrier indépendants par roster (V13)

## Fonctionnalités

Pour un nouveau roster créé depuis la structure ATYOM, ouvrir `/rosters/[id]` :
- **Logo du roster** : dans « Paramètres du roster », un administrateur peut importer ou retirer une image PNG, JPEG ou WebP jusqu'à 5 Mo. Le logo apparaît sur la fiche, dans l'annuaire, sur les cartes de la structure et dans le suivi consolidé.
- **Programme** : un Admin ou Staff autorisé saisit date, heure française, compétition, adversaire et type de rencontre ; les matchs peuvent être supprimés, la liste copiée directement pour Discord.
- **Vue globale ATYOM** : remonte les prochaines rencontres des rosters supplémentaires et continue de lire les résultats isolés provenant des synchronisations EA.
- **Viewer** : lecture seule. Les utilisateurs n'ayant pas de droit sur le roster n'accèdent ni aux résultats ni au calendrier, même en appelant les API directement.

## Architecture et isolation

- Supabase : `public.atyom_rosters.logo_path`, `public.atyom_roster_events` avec RLS activée sans policy client. L'accès se fait via serveur uniquement après contrôle d'authentification et de périmètre.
- Logo : bucket privé `esport-branding-private`, chemins `atyom-rosters/<roster-id>/assets/<uuid>.<ext>`, URL signée d'une heure, validation des signatures de fichiers et limite de taille. Les fichiers anciens ne sont pas supprimés lors du remplacement pour éviter de casser les liens existants.
- Programme : clé étrangère `roster_id`, contrainte d'unicité date/horaire pour un roster, dates bornées. Aucune entrée des nouveaux rosters dans `public.weekly_programs`, réservée au pilote historique.
- GX NØVA conserve le logo, l'ID EA 1663, le programme, les compositions et les 94 matchs historiques ; aucun backfill ni migration destructive.
- Les nouveaux rosters n'utilisent pas encore l'ensemble des fonctions historiques (joueurs, compositions, calendrier à logos, débriefs, classements). L'import EA de leur fiche est manuel, 50 matchs maximum à chaque synchronisation.

## Vérifications en recette

1. Se connecter Admin périmètre Structure : créer un roster test avec un ID EA valide **différent de 1663**, puis importer son logo, enregistrer une rencontre, recharger et vérifier la persistance.
2. Vérifier que les calendriers du roster test et de GX NØVA restent indépendants. Vérifier aussi les prochains événements dans la vue globale ATYOM.
3. Autoriser un Staff sur le roster test, puis un Viewer : lecture autorisée, création/suppression du programme refusée pour Viewer.
4. Retirer le droit du roster à un utilisateur et contrôler 403 sur les routes `/api/rosters/[id]/events` et `/api/rosters/[id]/results`.
5. Vérifier l'import d'un PNG/JPEG/WebP correct, le refus d'un fichier non image, la limite 5 Mo et l'absence d'accès public au bucket.
6. Contrôler que le flux Discord est bien en plusieurs lignes.
7. **Ne pas prendre un test de compilation Vercel pour une recette de session réelle.** Une connexion utilisateur est nécessaire pour confirmer intégralement les droits de bout en bout.
