# ATYOM V20 — Logos officiels et scores réels sur les exports Discord

## Objet
Conserver le graphisme des quatre affiches approuvées par l'utilisateur :
programme semaine (16:9), programme jour (vertical), résultats semaine (16:9), résultats jour (vertical).
Les exports restent entièrement alimentés par les données du roster et par les matchs réellement présents dans ATYOM.

## Correction des logos
- Les images des paramètres du roster GX NØVA sont chargées **depuis son fichier de personnalisation** dans Supabase Storage privé.
- L'ancienne limite de sortie de 750 Ko empêchait le rendu du vrai logo GX NØVA (PNG enregistré de ~1 Mo). Le moteur V20 normalise les images via **sharp** en PNG compact (sans modifier le fichier original) avant le passage à `next/og`.
- Plusieurs logos adverses VPG Suisse enregistrés dans **Programme > Logo adverse** sont au format WebP. En V19, ces sources étaient refusées pour contourner une incompatibilité Satori. En V20, les WebP téléchargés depuis le bucket public `opponent-logos` sont convertis en PNG, permettant l'utilisation du **logo réellement affecté à l'adversaire dans le programme**, et pas un logo arbitraire.
- Les logos PNG et JPEG restent pris en charge ; les images téléchargées ont une taille d'entrée maximum et une limite sur le nombre de pixels décodés.
- Le téléchargement des logos adverses est restreint à Supabase Storage public `opponent-logos` ou aux deux domaines de médias Discord explicitement autorisés. Les redirections ne sont pas suivies.
- Si une image reste invalide ou corrompue, la génération continue avec les initiales de l'adversaire. Les affiches ne bloquent pas.
- Les nouveaux rosters gardent leur propre logo et leurs propres couleurs.

## Suppression des scores fictifs
- Certains événements marqués `upcoming` contiennent `goalsFor:0` et `goalsAgainst:0` comme valeurs par défaut. Ces valeurs **ne sont plus affichées dans les exports du programme**.
- Un score est désormais affiché dans le programme uniquement s'il provient :
  - d'un résultat administratif / forfait **réellement enregistré**, ou
  - d'un événement EA **finalisé, lié à un match, avec résultat V/N/D enregistré**.
- Un authentique match joué terminé **0–0** reste donc affichable s'il est officiellement validé.
- Dans les exports **Résultats**, seules les données de matchs EA réellement enregistrés et les forfaits/résultats administratifs validés sont affichées. Aucun score n'est inventé et les bilans V/N/D ne changent pas artificiellement.
- Les dates, compétitions, horaires, badges et disposition de l'affiche restent inchangés.

## Synchronisation Discord conservée
- Les quatre types de publication conservent leur ID propre `salon + roster + programme/résultats + jour/semaine + date`.
- Une mise à jour de programme, un report, un forfait ou un import EA actualise le **même message** précédemment publié, sans créer un nouveau message.
- La première publication d'une période reste manuelle et requiert un webhook associé par l'Admin.
- Si l'Admin modifie le logo ou les couleurs du roster, les affiches déjà publiées de la semaine courante sont également actualisées si la synchronisation automatique correspondante est activée.
- Aucun webhook ni publication Discord n'est déclenché pendant le développement.

## Vérifications effectuées
Test de build temporaire sur données réelles (route de diagnostic retirée **avant** fusion) :
- Logo PNG GX NØVA issu du stockage de production (>1 Mo) → conversion PNG réussie.
- Logo adverse VPG Suisse stocké en WebP → conversion PNG réussie.
- 16 matchs à venir du programme du 9 au 15 novembre 2026 → aucun score fictif.
- Génération des quatre visuels PNG : programme semaine / jour et résultats semaine / jour → signatures PNG vérifiées, fichiers non vides.
- Les fichiers historiques de matchs et les lignes de programmes n'ont pas été modifiés.

À vérifier également en session utilisateur : rendu visuel dans les quatre aperçus et, pour un salon Discord de test, remplacement d'une publication existante après un changement enregistré.
