# ATYOM V18 — Affiches Discord jour/semaine, programme et résultats

## Quatre exports sur la même interface
Depuis **Programme > Affiches Discord synchronisées** (GX NØVA ou autre roster) :
- **Programme de la semaine** : paysage 1600 × 900, journées en colonnes, horaires, compétitions, adversaires et logos disponibles.
- **Programme du jour** : affiche verticale 1080 × 1350 pour une journée sélectionnée.
- **Résultats de la semaine** : paysage 1600 × 900, scores, forfaits et bilan collectif V/N/D.
- **Résultats du jour** : affiche verticale 1080 × 1350, tous les résultats connus de la journée, score et mention forfait.

Chaque utilisateur autorisé peut choisir **Jour / Semaine**, la date et le salon. L'aperçu PNG ne nécessite aucun webhook.
Un utilisateur Admin ou Staff autorisé publie sur Discord, Viewer ne publie pas.
Les webhooks restent administrés par l'Admin ATYOM.

## Nouvel habillage graphique
- Identité esport foncée, ambiance de stade, néons bleus, accents jaunes et couleurs du roster.
- Grand en-tête avec le nom et le logo d'équipe enregistré.
- 4 colonnes par semaines, horaires très lisibles, badges de compétitions, adversaire + logo lorsqu'un logo sûr est disponible.
- Les logos privés des rosters sont chargés côté serveur par Supabase Storage et incorporés directement au PNG. Les liens d'images adverses sont limités à des hôtes contrôlés et la taille des fichiers est bornée.
- Si le logo adverse est absent/inaccessible, un emblème avec les initiales de l'adversaire apparaît : aucun faux logo officiel.
- Pour éviter de rendre les affiches illisibles, les colonnes affichent un maximum de matchs selon le nombre de journées ; la quantité restante est indiquée. Le programme complet demeure accessible sur ATYOM.

## Stockage et conservation des anciens messages
Migration additive et compatible :
`atyom_discord_publications.period` = `day | week`;
`atyom_discord_publications.date_key` = jour exact ou lundi de la semaine;
`week_start` = lundi correspondant, pour les index et la sélection.
Clé primaire `(channel_id,kind,period,date_key)`.
Les publications hebdomadaires existantes sont migrées avec période `week` et date égale à `week_start`. Leurs identifiants de messages Discord restent conservés.

Le message quotidien du lundi ne remplace **pas** le message de la semaine. Chaque combinaison dispose d'un ID distinct :
**roster + salon + programme/résultats + jour/semaine + date**.

Après un changement sur ATYOM, le serveur calcule les semaines et les dates concernées, puis remplace uniquement les images des messages ayant déjà été publiés manuellement et dont la synchronisation automatique est activée.
Exemple : une rencontre est reportée du mercredi au jeudi ; les affiches des deux journées concernées et celle de la semaine sont mises à jour si leurs publications existent.
Le premier envoi de chaque période est toujours manuel, afin d'éviter du spam sur les salons.

## Données et cohérence
- Programme quotidien : rencontre planifiée à la date de la journée.
- Résultats quotidiens : matchs EA (date Europe/Paris) et résultats administratifs valides à la même date.
- Le bilan de la journée est recalculé indépendamment de celui de la semaine.
- Forfaits reconnaissables, sans performances joueurs inventées.
- Matchs GX NØVA et autres rosters cloisonnés, webhook privé chiffré.
- Aucun match/score existant supprimé ou réécrit lors de la migration.
- RLS activée pour la table de publication, aucune permission d'accès direct des clients.

## Recette avant activation avec webhook réel
1. Prévisualiser les 4 visuels depuis ATYOM avec une date de matchs et vérifier le rendu 16:9/portrait.
2. Vérifier les logos disponibles, le texte, les compétitions, les jours contenant 4 rencontres et les journées vides.
3. Associer un webhook à un salon de test, publier les quatre formats et relever les quatre ID de messages différents.
4. Reporter un match : vérifier que les deux journées et la semaine sont actualisées en éditant les anciens messages.
5. Saisir une victoire par forfait : vérifier la mise à jour du résultat du jour et de la semaine.
6. Importer les résultats EA : les affiches de résultats déjà publiées doivent se mettre à jour, sans nouveau message.
7. Désactiver les mises à jour automatiques, puis vérifier qu'un clic manuel peut quand même actualiser.
8. Vérifier Viewer et utilisateurs sans accès au roster : pas de publication possible.
9. Supprimer l'un des messages Discord et forcer une actualisation manuelle pour le recréer ; les autres sont conservés.
10. Contrôler les décalages de dates entre deux semaines et les transitions de mois.

**Important :** la compilation Vercel ne constitue pas une validation d'un rendu PNG sur données réelles ni d'un envoi Discord. Les tests d'intégration réels nécessitent un compte autorisé et un webhook de test. Aucun webhook n'est inventé ni configuré automatiquement.
