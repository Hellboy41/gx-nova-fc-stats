# GX NOVA — Sécurisation du rôle Viewer

## Règle appliquée

Le rôle `viewer` reste en lecture seule.

### Autorisé
- consulter l'accueil
- consulter l'effectif et les fiches joueurs
- consulter la composition actuelle
- consulter le Match Center
- consulter le Programme et les compositions programmées
- consulter Statistiques, Analyses, Rapport de soirée et Centre Saison
- utiliser les filtres de consultation
- se déconnecter

### Interdit
- synchroniser EA
- enregistrer/modifier la composition de référence
- affecter une saison ou une compétition à un match
- modifier le Programme
- saisir disponibilités, composition, banc ou notes
- copier une composition sur une journée
- importer un logo adverse
- lancer/valider/supprimer les liaisons EA du Programme
- gérer les comptes staff
- utiliser les exports intégrés Discord / PNG / copie Discord

## Défense côté serveur

`lib/supabase/proxy.ts` bloque désormais, pour un Viewer, toute requête API :
- POST
- PUT
- PATCH
- DELETE

Exception : `/api/logout`.

Cela protège aussi une route d'écriture qui aurait oublié son contrôle local.

## Défense côté interface

Les boutons/champs d'édition et les exports sont masqués ou désactivés pour les Viewers dans :
- Dashboard / Composition
- Programme
- Match Center
- Rapport de soirée
- Centre Saison

## Test conseillé

1. Se connecter avec un compte Viewer.
2. Vérifier l'absence du bouton `Synchroniser EA`.
3. Ouvrir Composition : les sélecteurs doivent être désactivés et aucun bouton Enregistrer ne doit être disponible.
4. Ouvrir Programme : aucune saisie, aucun bouton Enregistrer, aucun export.
5. Ouvrir Match Center : classement saison/compétition en lecture seule et aucun export Discord.
6. Ouvrir Rapport de soirée et Centre Saison : aucun bouton de copie/export.
7. Vérifier qu'un compte Staff conserve ces fonctions.
8. Vérifier qu'un Admin conserve également la gestion des utilisateurs.

Aucun SQL n'est nécessaire.
