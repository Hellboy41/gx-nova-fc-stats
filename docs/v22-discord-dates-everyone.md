# ATYOM V22 — Dates et @everyone en fin de publication Discord

## Format des messages
La même structure s'applique aux quatre types de publications pour chaque roster. Le titre et l'auteur du message utilisent uniquement le nom du club émetteur. La mention est **à la dernière ligne**.

### Programme semaine
```text
**GX NØVA · Programme de la semaine**
Du 09/11/2026 au 15/11/2026

@everyone
```

### Programme jour
```text
**GX NØVA · Programme du jour**
Lundi 09/11/2026

@everyone
```

### Résultats semaine
```text
**GX NØVA · Résultats de la semaine**
Du 09/11/2026 au 15/11/2026

@everyone
```

### Résultats jour
```text
**GX NØVA · Résultats du jour**
Lundi 09/11/2026

@everyone
```

Les dates sont calculées à partir de la période réellement publiée, en calendrier français (UTC pour les dates civiles), du lundi au dimanche pour les semaines.

## Notifications Discord
- Lors d'une **nouvelle publication manuelle** par un utilisateur autorisé, la requête Webhook POST utilise `allowed_mentions.parse=["everyone"]` pour permettre de notifier `@everyone`.
- Discord peut ignorer la mention si les autorisations du salon/webhook ne permettent pas la mention `@everyone`.
- Lors de la **mise à jour d'un message existant** (PATCH), `allowed_mentions.parse=[]` : le texte conserve `@everyone` en dernière ligne, mais l'actualisation automatique ne renvoie pas de notification globale.
- Si une tâche automatique recrée un message supprimé (POST de récupération), le paramètre de notification reste désactivé.
- L'auteur des anciennes publications ne peut pas être renommé rétroactivement, même si leur texte et leur image sont mis à jour. Les nouvelles publications gardent l'auteur du roster.

## Préservation
- L'ancien suffixe « Visuel officiel du club » disparaît du texte Discord et les descriptions des pièces jointes sont simplifiées.
- Aucune nouvelle table, aucune migration, aucun changement du PNG ni des scores.
- Les clés d'identification des messages publiés sont conservées (salon/roster/type/jour ou semaine).
- Aucune publication réelle déclenchée durant le développement.

## Tests
Vérifier les quatre dates et le format dans les publications. Sur un salon de test, contrôler qu'une **nouvelle** publication peut mentionner tout le monde si le webhook est autorisé, et qu'une mise à jour du même message ne répète pas la notification.
