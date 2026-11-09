# ATYOM V21 — Identité de chaque club dans les exports Discord

## Demande
Supprimer les références « ATYOM » des **exports envoyés à Discord**, en conservant ATYOM comme nom du site de gestion. Chaque publication porte l'identité du **roster émetteur**.

## Changements
- **Auteur du nouveau message** : le champ Discord `username` est défini au moment de l'envoi POST avec le nom du roster concerné (`GX NØVA` pour le roster historique), à la place d'ATYOM.
- **Texte envoyé avec le PNG** : `**GX NØVA · Programme de la semaine** · Visuel officiel du club` ou la variante résultats/jour, avec nom du roster réellement sélectionné.
- **Description de la pièce jointe** : `Visuel officiel GX NØVA` (ou nom de l'autre roster).
- **Nom du fichier PNG** : `gx-nova-programme-week-2026-11-09.png` (et déclinaisons `day`, `results`), sans préfixe ATYOM. Même convention pour le nom proposé lors de l'ouverture de l'aperçu.
- **Affiches programme et résultats, jour et semaine** : remplacer les mentions ATYOM dans les pieds de page, cases vides et textes de débordement par le nom du club ou une mention neutre.
- Les fichiers et tables internes du projet peuvent continuer d'utiliser ATYOM comme identifiant technique.
- Aucun changement de charte graphique, scores, logos ou programmes ; conservation des automatisations et des contrôles d'accès.

## Limite de l'API Discord
Le nom d'auteur d'un message est attribué à sa **création**. La modification d'un message existant (PATCH) permet d'en changer le contenu et l'image, **pas de renommer rétroactivement son auteur**. Les nouvelles publications utiliseront le nom du club. Les messages publiés auparavant sous ATYOM conserveront leur ancien nom d'auteur, même si leur texte et leur image sont actualisés. Pour corriger l'auteur de ces anciens messages, il faut recréer une nouvelle publication depuis le webhook.

Pour éviter tout spam et préserver les identifiants de message, cette modification ne republie ni ne supprime automatiquement les messages existants.

## Validation
- Vérifier que tous les textes visibles des quatre exports contiennent uniquement l'identité du club.
- Vérifier que les fichiers téléchargés portent le slug du club.
- Test recommandé : première publication dans un salon Discord de test pour vérifier le nom d'auteur, puis mise à jour du programme pour valider que le même message est édité.
- Le nom du webhook dans les **paramètres Discord du salon** peut être indépendant du nom affiché au-dessus des messages ; c'est le `username` d'exécution qui personnalise l'auteur des nouveaux messages.

Aucune publication Discord n'est déclenchée lors du déploiement.
