# ATYOM V25 — Contrôle de préparation avant partage

## Objectif
Rendre la préparation d'une semaine plus facile après la V24 (modèles de soirées) sans ajouter de menu. Le panneau de contrôle reste compact et facultatif, dans les pages de Programme existantes. Le diagnostic aide le staff ; il n'interdit pas l'utilisation de Discord et ne remplace pas les actions d'enregistrement.

## Modifications
1. Nouveau panneau **Contrôle avant partage** sous les modèles de soirée dans le programme GX NØVA historique et les programmes des autres rosters.
2. Contrôles **bloquants pour la complétude affichée** : adversaire absent / « À définir » / « À confirmer », date ou horaire incorrect, compétition non renseignée ou générique, doublon sur une même date et heure. Ce sont des **avertissements d'interface**, pas un verrou de publication.
3. Coaching GX NØVA : nombre de matchs avec disponibilité non saisie et/ou onze incomplet. Cette partie est explicitement facultative pour le partage Discord.
4. Les matchs joués ou dotés d'un score manuel sont exclus des contrôles de préparation.
5. Bouton **Corriger** : GX NØVA déplie le jour, bascule en vue Tous les matchs, ouvre l'éditeur et fait défiler vers la fiche. Nouveau roster : ouvre le champ de correction de l'adversaire, fonction déjà disponible en V24. Le rôle Viewer conserve la consultation sans écriture.
6. Pour les nouveaux rosters, un sélecteur de semaine permet de contrôler un calendrier préparé à l'avance, sans filtrer ou effacer les rencontres existantes.
7. Les modifications non enregistrées GX NØVA continuent d'afficher l'alerte prévue en V23.
8. Pas de nouvelle page, pas de nouvelle table, pas d'écriture de données ni de modification de l'API Discord.

## Limites
- Le résultat « prêts » décrit la complétude de la fiche (horaire, compétition, adversaire), **pas** une garantie de disponibilité des joueurs ou d'une publication Discord réussie.
- Disponibilités et composition du roster historique sont facultatives ; seules ses données de plan sont consultées.
- La V25 ne publie pas automatiquement le programme et ne modifie aucun score.

## Scénarios de recette navigateur connecté
1. Créer sur une semaine future un programme avec modèle V24 dont deux adversaires sont vides : vérifier les deux alertes et les raccourcis vers la fiche à corriger.
2. Compléter un adversaire, constater le compteur mis à jour avant et après Enregistrer. Vérifier l'alerte « modifications non enregistrées ».
3. Créer volontairement deux rencontres à la même heure sur le même jour du programme historique : elles sont signalées toutes les deux, sans suppression automatique.
4. Vérifier un match dont les disponibilités ou le onze ne sont pas renseignés : rappel coaching affiché mais prêt à partager si les données essentielles sont là.
5. Enregistrer un résultat EA ou manuel et vérifier que le match n'est plus compté comme à préparer.
6. Sur un roster autonome, appliquer le modèle V24, sélectionner sa semaine et cliquer Corriger sur « À définir ». Vérifier la correction et la mise à jour du compteur.
7. Viewer : voir les éléments à corriger, sans bouton d'enregistrement ni possibilité de modification.
8. Vérifier l'interface mobile, les contrôles repliables, le calendrier et les quatre exports Discord.
9. Contrôler que les comptes de matchs et la préparation existante n'ont pas changé hors interface.

Compilation sur Vercel et tests de parcours en session connectée sont deux validations distinctes.