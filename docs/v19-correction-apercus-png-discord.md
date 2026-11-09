# ATYOM V19 — correction des aperçus Discord PNG

## Incident
Sur la production ATYOM V18, des demandes d'aperçu `/api/discord/preview` renvoyaient HTTP 500 avec l'erreur minifiée « u2 is not iterable ».
L'erreur a été reproduite en préproduction en exécutant les données réelles de GX NØVA dans un **test de génération statique pendant next build** ; un jeu de données synthétiques sans logos fonctionnait.

## Diagnostic reproduit
- Programme réel sans logos adverses : **PASS**.
- Programme réel avec logos adverses PNG : **PASS**.
- Programme réel avec logos adverses JPG : **PASS**.
- Programme réel avec logos adverses WebP : **FAIL u2 is not iterable**.
- Quatre vues sur données réelles après correction : **PASS** (programme semaine/jour, résultats semaine/jour), chaque PNG ayant une signature PNG et une taille supérieure à 1000 octets.
- Le dispositif temporaire de test, qui ne publiait jamais de données client dans son image de sortie, a été supprimé du dépôt avant livraison.

## Correctifs
1. Ne pas transmettre les logos WebP au moteur `next/og` : afficher l'emblème texte de l'adversaire à la place, sans modifier le logo enregistré.
2. Les logos PNG/JPG de taille autorisée restent utilisés.
3. Si un autre logo valide en apparence empêche la génération, réessayer le même visuel en affichant les emblèmes textuels, afin que tout l'aperçu ne soit plus bloqué.
4. Journaliser l'erreur complète côté serveur pour accélérer le diagnostic si un nouveau format pose problème.
5. Les boutons **Aperçu PNG** utilisent un lien direct dans un nouvel onglet (plutôt que `window.open`), plus fiable avec les bloqueurs de fenêtres.

## Périmètre et confidentialité
- Aucun changement de base ni migration nécessaire.
- Aucun match ou résultat historique n'est modifié.
- Aucune publication Discord n'est déclenchée pendant la correction.
- Aucun token webhook n'est lu dans le code d'aperçu, et les accès restent protégés par la session et le périmètre roster.
- Les logos WebP **restent disponibles dans ATYOM** et les programmes ; seule l'affiche PNG Discord utilise un remplacement textuel tant qu'une conversion WebP fiable n'est pas ajoutée.

## Vérification utilisateur
Dans **Programme > Affiches Discord synchronisées**, sélectionner Jour ou Semaine, puis Programme ou Résultats et cliquer **Aperçu PNG**. Les quatre formats doivent ouvrir une image dans un nouvel onglet.
Le test automatisé en préproduction a validé les 4 PNG avec des données réelles ; l'essai dans une session naviguante connectée reste recommandé.
