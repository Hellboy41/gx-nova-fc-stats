# Déploiement d'une copie de la plateforme FC Esport pour un club

La V9 suit une stratégie **une installation par club** : une base de code partagée,
mais **un projet Vercel distinct ET une base Supabase distincte** pour chaque client.
Cela évite, dans un premier temps, de créer des permissions multi-locataires complexes.

## Ce qui est prêt dans la V9 de test

- `/personnalisation` : saisie du nom de la structure, du club, de l'édition,
  de l'ID EA, couleurs et logo ; prévisualisation immédiate ; extraction indicative
  de deux couleurs à partir du logo ; export JSON et copie des variables Vercel.
- Le formulaire est une **simulation** : aucune modification de l'instance active,
  aucun upload serveur, aucune sauvegarde en base. L'image importée doit être
  copiée manuellement dans `public/branding/` sur la future copie.
- `NEXT_PUBLIC_ESPORT_*` : texte/logo/couleurs de base par déploiement ;
  le nom du club s'affiche sur l'accueil et dans le titre du navigateur.
  Toutes les affiches, images et chaînes historiques n'ont PAS encore été
  passées en marque blanche.
- `ESPORT_EA_CLUB_ID` est lu **sur le serveur** pour les requêtes EA,
  la synchronisation et les modules des statistiques, programme, débriefs.
  Si une valeur différente de `1663` est définie, `ESPORT_INSTANCE_MODE=isolated`
  est nécessaire. Ne jamais déduire ce paramètre d'une saisie non authentifiée.
- Le club GX NØVA `1663` reste la valeur par défaut si la variable serveur est absente.

## Configuration d'une installation (pour le moment, intervention technique)

1. Préparer une **nouvelle base Supabase** (schéma complet, migrations, tables,
   indexes, RLS appropriée, stockage, comptes d'administration initiaux).
   Attention : les seules migrations versionnées du dépôt ne constituent pas
   encore un script complet de création initiale. Il faut compléter l'export
   reproductible du schéma avant d'automatiser les installations commerciales.
2. Préparer un **projet Vercel séparé** connecté à la même branche stable
   (GitHub). Ne PAS utiliser les identifiants ni la base Supabase de GX NØVA.
3. Dans les variables du projet Vercel, ajouter :
   - `NEXT_PUBLIC_SUPABASE_URL` : URL de la NOUVELLE base.
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` : clé publique de la NOUVELLE base.
   - `SUPABASE_SECRET_KEY` : clé serveur de la NOUVELLE base, **jamais exposée au navigateur**.
   - `ESPORT_EA_CLUB_ID` : identifiant EA de l'équipe.
   - `ESPORT_INSTANCE_MODE=isolated` pour un club autre que `1663`.
   - `NEXT_PUBLIC_ESPORT_STRUCTURE_NAME`, `NEXT_PUBLIC_ESPORT_CLUB_NAME`,
     `NEXT_PUBLIC_ESPORT_GAME_EDITION`, `NEXT_PUBLIC_ESPORT_EA_CLUB_ID`,
     `NEXT_PUBLIC_ESPORT_CLUB_LOGO`,
     `NEXT_PUBLIC_ESPORT_PRIMARY_COLOR`, `NEXT_PUBLIC_ESPORT_SECONDARY_COLOR`.
4. Copier le logo sous le chemin annoncé dans `NEXT_PUBLIC_ESPORT_CLUB_LOGO`
   (chemin public de l'application), puis déployer.
5. Configurer une **identité d'administration et les staff_profiles du client**
   séparément, sans recopier les sessions ou utilisateurs GX NØVA.
6. Faire une synchronisation EA manuelle et vérifier la conformité des résultats
   (club EA, effectifs, matchs, classements). Ne pas activer une synchronisation
   programmée avant d'avoir testé l'installation et le stockage.
7. Vérifier la séparation des données avec un compte de chaque club :
   APIs, images, documents, autorisations, liens signés et exports.
8. Lier le domaine personnalisé du client et valider les droits et accès.
   Pour une commercialisation, prévoir également sauvegardes, monitoring,
   support, maintien à jour des installations et conditions de service.

## Politique de l'ID EA

- L'ID EA choisi dans le formulaire **prépare une configuration** ; il ne
  déclenche jamais une importation sur GX NØVA.
- On ne doit PAS modifier l'ID EA sur une base Supabase contenant déjà
  l'historique d'une autre équipe : créer une nouvelle instance/base,
  ou passer par une migration explicite et vérifiée des données.
- L'ID EA est un attribut d'import des statistiques, pas un mécanisme
  d'authentification ni de permission.
- Les variables publiques servent exclusivement à l'identité et à l'affichage.
  La synchronisation lit `ESPORT_EA_CLUB_ID` sur le serveur.

## Limites à traiter avant de vendre à d'autres clubs

- Audit final des chaînes de marque GX NØVA dans les PDF/PNG, rapports et
  pages secondaires : elles n'ont pas toutes été rendues configurables.
- Export/installation initiale complète du schéma Supabase + RLS.
- Recette sur une véritable seconde base vierge avec un ID EA différent.
- Tests d'isolation, de permissions et de restauration de sauvegardes.
- Tests d'import d'images et vidéos sur l'instance cliente.
- Automatisation de l'installation ou procédure d'administration reproductible.

La V9 est un **prototype technique de duplication et de personnalisation**,
et non un outil permettant encore aux clubs de s'inscrire et d'être installés
automatiquement.
