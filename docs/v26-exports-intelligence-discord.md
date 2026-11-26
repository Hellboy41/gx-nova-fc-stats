# ATYOM V26 — Exports PNG d'Intelligence sportive

## Objet
Ajouter dans la page **Intelligence sportive** de GX NØVA un volet repliable « Exports Discord ». Aucun nouveau menu global et aucune publication automatique.

## Parcours
1. Ouvrir Intelligence sportive, choisir la saison en haut de la page.
2. Ouvrir le panneau Exports Discord (reprend les filtres déjà visibles de l'onglet actif).
3. Choisir l'un des trois exports : **Forme des joueurs**, **Analyse par poste**, **Associations**.
4. Facultatif : filtrer une compétition liée aux matchs EA, une plage de dates, le poste, le joueur, les échantillons suffisants, ou le nombre minimal de matchs communs.
5. Conserver **Joueurs en sommeil exclus** (valeur par défaut), ou cocher explicitement leur inclusion pour un export historique.
6. Cliquer **Générer l'aperçu PNG**, puis **Télécharger** ou choisir un salon Discord connecté et cliquer **Publier dans Discord** (confirmation).
7. Le serveur recalcule les mêmes statistiques depuis les matchs EA et les corrections staff au moment de la génération et de l'envoi. En cas de changement des filtres, l'utilisateur doit régénérer l'aperçu.

## Règles métier des calculs
- Source exclusive : `matches`, `match_players` et corrections `applyStaffPerformanceCorrections`, puis `buildSportIntelligence` déjà utilisé sur la page.
- **Forme** : moyenne des 5 apparitions les plus récentes contre les 5 précédentes, minimum 3 notes valides dans chaque fenêtre et seuil indicatif de 0,35 point. Les joueurs en hausse et en baisse sont listés à partir des calculs réels ; aucune valeur fictive ajoutée.
- **Poste** : 4 grandes familles EA (gardiens, défense, milieu, attaque). Présentation des indicateurs réels du poste : arrêts, tacles, passes décisives ou buts par match ; note moyenne pondérée par le nombre d'apparitions en tant que titulaire de la ligne d'analyse ; apparitions cumulées. Il ne s'agit pas d'un classement tactique composite.
- **Associations** : joueurs présents sur les mêmes feuilles EA (sans affirmer une simultanéité sur le terrain), nombre de matchs communs, points par match (3V, 1N), % de victoire ; aucune « synergie » causale inventée. Minimum 8 matchs communs.
- Jusqu'à 250 matchs EA récents parmi ceux correspondant aux filtres, conformément au plafond actuel. Le visuel signale un historique tronqué.
- La plage de dates est appliquée aux matchs EA en dates UTC ; pour les rencontres du soir à l'heure française, cela reste le même jour civil. Les dates sont inclusives.
- L'association « compétition » dépend du champ `matches.competition_id` enregistré. Si ce champ est absent, un filtre par compétition peut produire un échantillon vide.
- Les filtres influent sur le recalcul complet de chaque moyenne, pas seulement sur les lignes affichées.

## Joueurs mis en sommeil
- Lecture de `club_player_status.is_active=false` via `getArchivedPlayerKeys`, déjà utilisée par Intelligence sportive.
- Par défaut : exclusion de ces joueurs de tous les résultats et duos ; aucun historique n'est supprimé.
- Option explicite d'inclusion historique ; avertissement visible et confirmation supplémentaire avant envoi à Discord.
- Le statut peut être modifié via l'administration ; la prochaine image reflète le statut courant. Aucun statut n'est modifié par les exports.

## Sécurité et Discord
- Les routes d'export sont contrôlées par `requireActiveStaff({rosterId:"gx-nova-legacy"})`.
- Aperçu/téléchargement : GET authentifié avec `Cache-Control: private, no-store`.
- Publication : POST avec contrôle d'origine, rôle Admin ou Staff (Viewer interdit), salon UUID validé et appartenant au roster GX NØVA, webhook déchiffré exclusivement côté serveur.
- Publication impossible en environnement Vercel preview ; la production est la seule cible autorisée. Publication **manuelle**, nouveau message à chaque clic, sans @everyone et sans mise à jour automatique.
- Aucune nouvelle table Supabase ni aucun nouveau secret requis ; réutilise les webhooks Discord déjà configurés.
- Ne jamais envoyer le webhook, token ou clé de chiffrement dans le navigateur.

## Tests en session connectée requis avant mise en production
1. Construire une image PNG Forme sur l'ensemble des saisons : vérifier 1600 × 900, présence de vrais noms et chiffres cohérents avec la page.
2. Changer de saison, de compétition ou de date : vérifier le recalcul et l'état vide.
3. Vérifier Analyse par poste (avec un poste précis, puis tous) et Associations (minimum de matchs communs).
4. Placer temporairement un joueur de test en sommeil via Administration, puis vérifier son absence dans le PNG et son retour avec l'option d'inclusion. Remettre son statut initial.
5. Vérifier les cas de date invalide, de données insuffisantes, et le plafond 250 matchs.
6. Vérifier les boutons Aperçu / Télécharger PNG sur ordinateur et sur mobile.
7. Viewer : consulter et télécharger, mais ne pas pouvoir publier.
8. Sur la prévisualisation Vercel, vérifier que POST Discord refuse toute publication.
9. Après accord explicite de mise en production, publier un visuel dans un salon Discord de test ; confirmer absence de mention, absence de doublon involontaire, et bon nom du club.
10. Vérifier que les exports Programme / Résultats et leur actualisation automatique existante ne sont pas affectés.

## Fichiers
- `lib/sport-intelligence/export.ts` : validation des filtres et calculs source.
- `lib/sport-intelligence/export-image.tsx` : 3 visuels 16:9 dynamiques.
- `app/api/sport-intelligence/export/route.ts` : GET PNG et POST Discord.
- `components/intelligence/IntelligenceExports.tsx` : UI repliable.
- `app/intelligence-sportive/page.tsx` : intégration, sans changer les analyses existantes.

## Limites de cette version
- Intelligence sportive concerne le roster historique GX NØVA : l'extension de ces calculs à chaque roster autonome nécessitera leurs performances EA et un périmètre de calcul séparé.
- Les exports ne modifient pas les statistiques enregistrées, ne changent pas les résultats EA, ne publient pas automatiquement, et ne réécrivent pas le dernier message Discord.
