# V10 — Sauvegarde de la charte graphique ATYOM / GX NØVA

## Objectif
Répondre au manque du bouton « Valider » dans l'ancien configurateur. Les noms,
logos et couleurs de **la structure ATYOM** et du **roster GX NØVA** peuvent être
prévisualisés puis **enregistrés** indépendamment.

## Utilisation
1. Ouvrir `/personnalisation`, avec un **compte administrateur**.
2. Choisir **Structure ATYOM** ou **Roster FC27**.
3. Modifier le nom et les couleurs ; importer un logo PNG/JPG/WebP (5 Mo max).
   Les deux couleurs suggérées depuis l'image sont approximatives et modifiables.
4. Cliquer **Enregistrer les modifications** et attendre la confirmation.
5. Actualiser : la sauvegarde doit être conservée.
6. Vérifier le logo du roster dans l'accueil, le menu, le Programme, le Match
   Center, l'Intelligence sportive et la préparation des matchs.
   La structure utilise sa propre vignette dans la navigation.
7. Vérifier que le Viewer/Staff peut voir, mais **ne peut pas enregistrer**.
8. Vérifier les exports : certains anciens modèles et affiches contiennent
   encore des textes/couleurs GX NØVA codés en dur.

## Architecture et isolation des tests
- **Pas de migration SQL** : un bucket Supabase Storage privé
  `esport-branding-private` est créé au premier enregistrement.
- Un fichier JSON par scope `{club_id}/{env}/{scope}/settings.json` contient
  le nom, les couleurs, le chemin du logo et la date de modification.
- Les logos sont stockés dans `assets/<UUID>.<extension>` avec liens signés
  et accès API après authentification.
- Seul le rôle `admin` actif peut écrire, contrôle d'origine en POST.
- **Preview et Production n'utilisent pas les mêmes clés Storage** :
  `production` pour le site officiel, `preview-<branche>` sur la preview.
  Les changements réalisés en test ne modifient pas la charte de production.
- Le script de configuration EA et les historiques restent inchangés.
  L'ID EA est affiché en lecture seule, sa modification exige un déploiement
  indépendant et une base Supabase dédiée.

## Limites et précautions
- L'URL `https://atyom-esport.ablepearl8.chatgpt.site/admin` ne peut pas
  être lue par le contexte de développement actuel : **logo officiel ATYOM
  et hexadécimaux exacts non récupérés**. Les valeurs par défaut sont conservées
  jusqu'à réception d'un fichier logo ou d'une capture de la charte.
- Les couleurs sélectionnées sont utilisées dans le configurateur et quelques
  éléments d'identité de l'app. L'ensemble des rapports PDF/PNG, visuels,
  textes et surfaces Tailwind n'est pas encore totalement white-label.
- Les liens signés de logos expirent ; le Provider les recharge au prochain
  chargement de page.
- Le build Vercel ne constitue pas une recette de stockage : une sauvegarde
  réelle doit être testée depuis une session admin sur la preview, puis la
  page doit être rechargée pour vérifier la persistance.

## Évolutions
- Rendre tous les exports, les images, les bannières et la palette des cartes
  adaptatifs au roster.
- Importer le véritable logo ATYOM et sa palette dès qu'ils sont fournis.
- Préparer un kit de duplication vérifié pour de nouveaux clients.
