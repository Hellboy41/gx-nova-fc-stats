# ATYOM V17 — Publications Discord automatiques avec images programme et résultats

## Fonctionnement
La plateforme publie **deux affiches PNG indépendantes** : programme et résultats de la semaine.
La première publication est manuelle. Chaque version suivante modifie le **même message Discord** via `PATCH /webhooks/{id}/{token}/messages/{message_id}` en remplaçant l'ancienne pièce jointe PNG.
Les anciennes images ne sont donc pas modifiées en place : elles sont remplacées. Les messages ne sont pas repostés à chaque changement.

Le système repose uniquement sur les API Discord Webhooks et les fonctions Vercel existantes ; aucun bot Discord connecté en permanence n'est nécessaire. Attention aux limites d'utilisation et aux règles de tarification de l'hébergement Vercel.

## Comment utiliser
1. Dans un salon Discord, ouvrir **Paramètres du salon → Intégrations → Webhooks**, créer un webhook et copier son URL.
2. Dans **ATYOM → GX NØVA → Programme** ou sur la fiche d'un nouveau roster, utiliser **Affiches Discord synchronisées**.
3. Un **Admin ATYOM** associe le salon en saisissant un label et l'URL de webhook. Le serveur vérifie qu'il s'agit de Discord, puis stocke l'URL **chiffrée AES-256-GCM** ; le token est supprimé de l'interface. Ne jamais transmettre l'URL par Discord ou dans une capture d'écran.
4. Choisir la semaine (lundi–dimanche) et le salon, afficher l'aperçu PNG, puis cliquer **Publier / actualiser le programme** ou **Publier / actualiser les résultats**.
5. Après la première publication, si les deux cases de synchronisation automatique sont activées, l'image est remplacée à chaque changement enregistré correspondant.
6. Un Staff autorisé peut publier ou actualiser les affiches d'un roster, un Viewer ne peut que consulter les paramètres et aperçus. Les Admin ATYOM gèrent les webhooks.
7. Un Admin peut associer jusqu'à cinq salons par roster et désactiver la synchronisation automatique par type.

## Sources et événements synchronisés
- Programmation de GX NØVA : sauvegarde de la semaine, reports, liaisons de matchs EA, saisies/annulations de forfaits.
- Programmation des nouveaux rosters : création/suppression des événements, reports, saisies/annulations de forfaits.
- Résultats GX NØVA : import EA manuel et cron, bilan des matchs enregistrés, résultats manuels distincts.
- Résultats des nouveaux rosters : import EA depuis la fiche et résultats administratifs.
- Pas de faux résultats joueurs ; la mention **FORFAIT** distingue les résultats administratifs.
- Les visuels reflètent les données enregistrées ; les modifications non encore sauvegardées sur la page GX NØVA ne sont pas publiables.

## Protection des messages et des données
- Les webhooks sont stockés dans `public.atyom_discord_channels` avec token chiffré, clé stockée uniquement dans Vercel `ATYOM_DISCORD_WEBHOOK_KEY`.
- Les identifiants de messages par type, semaine et salon sont stockés dans `public.atyom_discord_publications`, afin de modifier le message original.
- RLS activée sur les deux tables, aucune policy exposant les données directement aux clients.
- Les API `/api/discord/channels`, `/api/discord/publish` et `/api/discord/preview` contrôlent toujours le compte et le périmètre roster côté serveur.
- Les images et les réponses de l'API sont privées, sans cache partagé.
- Les mentions Discord sont désactivées lors de la publication pour éviter les notifications de masse.
- Si Discord refuse une mise à jour, le message reste tel quel et un état d'erreur est enregistré. L'Admin/Staff peut utiliser **Publier / actualiser** pour réessayer.
- Une synchronisation automatique ne crée **pas** de publication pour une nouvelle semaine tant que l'utilisateur n'a pas manuellement choisi de publier cette semaine.
- Supprimer une configuration ATYOM ne supprime pas rétroactivement les messages Discord déjà publiés.
- Les messages/images publiés avant cette version par un utilisateur ou un autre bot ne peuvent pas être modifiés par le webhook ATYOM.

## Limites
- Les publications Discord ne sont pas créées tant qu'aucun webhook n'est configuré et tant que personne n'a choisi une première publication.
- Les modifications sont déclenchées après la réussite de l'enregistrement sur ATYOM, par des travaux différés Next.js ; elles peuvent prendre quelques secondes. Les quotas/rate limits Discord et les pannes réseau peuvent provoquer un échec temporaire. Le bouton manuel permet de relancer.
- Un écran de résultats en PNG reprend les matchs connus sur la semaine. Aucune garantie de dédoublonnage automatique entre un résultat administrativement saisi et un import EA non relié sur les nouveaux rosters ; retirer le score manuel dans le cas de correction.
- Les affiches de semaines passées sont recalculées en fonction des changements ayant la même semaine, sous réserve de publication existante et de synchronisation active.
- Sur l'affiche, 13 rencontres maximum sont affichées lisiblement ; le nombre d'entrées supplémentaires figure en pied.
- Une mise à jour graphique ne met pas à jour les captures d'écran faites précédemment. Seule la publication ATYOM originale, sous contrôle de son webhook, est remplacée.

## Recette avant validation complète
1. Créer un webhook dans un salon de test, l'associer depuis ATYOM et vérifier que le token est invisible dans les réponses du navigateur.
2. Prévisualiser un programme PNG et des résultats PNG avec un compte Staff autorisé.
3. Publier une semaine ; vérifier un message programme et un message résultats, chacun avec une image et des IDs distincts en base.
4. Modifier un horaire / adversaire, puis vérifier que le **même message ID** est édité et que l'image a été remplacée (pas de nouveau message).
5. Saisir un forfait ou importer un match EA ; vérifier le changement du message résultats, son score, et la mention FORFAIT.
6. Désactiver une synchronisation automatique : vérifier l'absence de modification tant que l'utilisateur n'actualise pas manuellement.
7. Tester Viewer (lecture sans publication), membre hors roster (403) et compte non connecté (401).
8. Supprimer le message original dans Discord, puis cliquer Actualiser : le système doit recréer une nouvelle publication uniquement sur action explicite / synchronisation de publication existante.
9. Vérifier le rendu d'image, les logos/couleurs, le nombre de matchs sur semaines avec changements de mois.
10. Aucune migration destructive ou écriture aux matchs historiques GX NØVA.
