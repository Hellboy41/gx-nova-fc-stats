# ATYOM — Création autonome de rosters (première version)

## Administration
Les administrateurs à périmètre Structure ouvrent /organisation et utilisent « Créer un nouveau roster ».
Ils saisissent le nom, l’identifiant club EA numérique, l’édition FC et les couleurs. L’identifiant doit être unique ; 1663 reste réservé au roster historique GX NØVA.
Le formulaire appelle POST /api/rosters (session admin + contrôle d’origine). La base conserve l’identité de chaque roster dans public.atyom_rosters, sans modifier l’identifiant serveur fixe du roster historique.

Après création, un roster est accessible via /rosters/[id] : GET de ses matchs en cache et POST de synchronisation EA.
La synchronisation récupère au maximum 50 matchs EA lors d'un appel et enregistre leurs scores dans public.atyom_roster_results, isolés par roster_id.
Elle ne remplace pas les règles métier avancées GX NØVA (durée du match, reclassification, corrections des égalités ou suivi des joueurs).
L’identifiant EA ne peut pas être modifié après création pour éviter le mélange d’historiques. Aucun effacement des matchs n’est proposé.

## Accès
- Admin/Structure : création, gestion et vue globale ATYOM.
- Staff/Viewer/Structure : tous les rosters autorisés, sans création.
- Staff/Viewer/Rosters sélectionnés : uniquement les rosters cochés dans Paramètres > Périmètres d'accès.
- API /api/rosters permet une liste limitée aux équipes autorisées.
- API /api/rosters/[id]/results revérifie le profil ET le roster actif en base avant lecture.
- Viewer : consultation seulement ; POST synchronisation interdit.
- La vue consolidée ATYOM agrège les matchs existants de GX NØVA (public.matches) et les matchs synchronisés des nouveaux rosters (public.atyom_roster_results). Les programmes des nouveaux rosters ne sont pas encore disponibles.
- RLS active sans policy d’accès direct pour les tables des rosters ; seules les API serveur après vérification sont autorisées.

## Identité
L'en-tête du site, les métadonnées HTML et la connexion affichent ATYOM. GX NØVA reste affiché comme le roster historique. Le domaine existant et le projet Vercel restent inchangés pour ne pas rompre les liens.
La personnalisation du logo des nouveaux rosters et la parité avec les outils avancés (programme, compositions, suivi des joueurs, rapports) restent des étapes futures.

## Recette indispensable
Tester avec un vrai compte Admin structure : création d'un roster test, erreur de doublon ID EA, récupération des résultats, ajout au périmètre d'un Viewer et contrôle lecture seule, suppression du périmètre et réponse 403, aperçu global. Vérifier l’état de la base et l’absence de tout mélange avec GX NØVA.
Cette implémentation est compatible avec le pilote et ne doit pas être présentée comme une isolation multi-structure/multi-tenant complète.
