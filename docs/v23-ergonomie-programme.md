# ATYOM V23 — Programme : interface simplifiée pour les utilisateurs novices

## Objectif
Remettre le parcours utilisateur au premier plan en gardant **l'intégralité des fonctionnalités** du programme GX NØVA. La barre initiale mélangeait la navigation, les vues, le coaching, les exports historiques PNG, le rapprochement EA et les réglages Discord. Les cartes de match montraient tous les champs même pour la simple consultation.

## Nouvel accueil du programme
Un seul panneau principal :
1. **Période** : libellé de dates, compteurs À venir / Joués, flèches précédent/suivant, date de départ et bouton « Cette semaine ».
2. **Choix de vue** : **À préparer**, **Tous les matchs**, **Calendrier**.
3. **Actions** : **Enregistrer** (visible uniquement pour Admin/Staff), **Partager sur Discord**, **Outils**.

Les options ne sont pas supprimées :
- **Partager sur Discord** ouvre le composant de publications programmées et résultats déjà existant.
- **Outils** déplie le rapprochement EA, la préparation coaching, les boutons réduire/déplier toutes les journées et les **anciens exports PNG + texte** (jour/semaine) pour téléchargement.
- Les correspondances apprises EA sont désormais masquées sous un panneau dépliable en fin de page.
- Les vues Calendrier (déplacements), À préparer et Tous les matchs demeurent disponibles.
- La **période initiale** et le bouton « Cette semaine » proposent le lundi au dimanche, comme les exports Discord. La sélection manuelle d'une autre période de 7 jours est toujours possible.
- **Modifications non sauvegardées** : un indicateur avertit avant publication ; un avertissement de confirmation bloque la perte silencieuse si l'on change de période.
- La vue Calendrier refuse toujours une ouverture avec brouillon non enregistré.

## Cartes de rencontre
- Les matchs préexistants **à venir** s'affichent en lignes compactes : horaire, adversaire, logo éventuel, compétition et note facultative.
- Deux actions principales : **Préparer** (compositions/disponibilités) et **Modifier** (formulaire complet).
- En présence d'un résultat par forfait ou hors EA, le score et sa nature restent visibles dans la ligne compacte.
- **Modifier** affiche sans changer les champs existants : compétition / tournoi, heure, adversaire, logo, notes, préparation, score administratif/forfait, liaison EA, suppression.
- Les rencontres tout juste créées ouvrent directement leur formulaire pour être renseignées.
- Les matchs EA déjà joués conservent leur carte récapitulative et l'accès au Match Center.
- Les profils Viewer conservent la consultation sans modification.

## Publication Discord simplifiée
- Une fois « Partager sur Discord » ouvert : **Programme ou Résultats**, **Jour ou semaine**, **Date**, **Salon** ; puis **Aperçu PNG** ou **Publier / actualiser**.
- Un seul type d'export est affiché à la fois au lieu de deux blocs avec chacun leur paire de boutons.
- Les réglages webhooks, synchronisations automatiques et l'historique restent disponibles dans **Paramètres Discord et historique**, replié par défaut.
- Aucune modification des API, droits, règles de publication, noms d'auteur des messages, mentions, score ou gestion des rosters.
- Le premier envoi reste manuel ; les messages déjà publiés conservent la synchronisation automatique.

## Contrôles à réaliser dans un navigateur connecté
1. Admin/Staff GX NØVA : voir les 3 vues, changer de semaine, vérifier que lundi–dimanche correspond au programme attendu et que le calendrier fonctionne.
2. Ajouter un match et enregistrer. Le nouveau formulaire doit s'ouvrir ; ensuite la ligne doit pouvoir passer en présentation compacte. Cliquer Modifier et vérifier la persistance des champs.
3. Ouvrir un match et préparer sa composition. Vérifier que les disponibilités, scores administratifs, logos et notes sont inchangés.
4. Vérifier la confirmation lorsque des modifications non enregistrées risquent d'être abandonnées en changeant de période.
5. Ouvrir « Outils », lancer une recherche EA et essayer l'export PNG local. Vérifier les contrôles réduire/déplier.
6. Ouvrir « Partager sur Discord », prévisualiser les 4 formats, sélectionner un salon et vérifier les réglages avancés.
7. Vérifier le rôle Viewer : pas d'édition ni publication.
8. Vérifier l'interface sur mobile (champ de date, boutons et cartes).
9. Vérifier que les performances et le nombre de matchs historiques ne changent pas.

Aucune migration Supabase ni écriture de données de match n'est nécessaire. Un build Vercel réussi valide la compilation, pas tous les gestes d'une session authentifiée.
