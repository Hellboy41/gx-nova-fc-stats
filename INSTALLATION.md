# GX NOVA — Synchronisation EA fiabilisée

## Fichiers du pack

Copier les fichiers en conservant exactement les chemins :

- `app/page.tsx`
- `app/api/sync-matches/route.ts`
- `app/api/cron/sync-matches/route.ts`
- `lib/ea/sync-matches.ts`
- `lib/supabase/proxy.ts`
- `vercel.json`

Aucune migration SQL n'est nécessaire.

## Ce qui change

- Le bouton **Synchroniser EA** est disponible sur téléphone avec un libellé compact `Sync EA`.
- La synchronisation manuelle reste réservée aux rôles Admin / Staff.
- Les matchs disposant d'une durée EA inférieure à **5400 secondes (90 min de jeu EA)** sont exclus.
- Si un ancien match court est déjà enregistré, il est supprimé de `matches`; les lignes `match_players` associées sont supprimées automatiquement par la cascade SQL existante.
- Si un match de 90 minutes environ est renvoyé par EA en `3-0` ou `0-3` alors que l'agrégat EA indique une égalité, le score nul issu de l'agrégat est utilisé.
- Les matchs en prolongation sont conservés tels quels : la correction du faux 3-0 n'est appliquée que dans la fenêtre 90 à moins de 105 minutes.
- Si un match court supprimé était lié au Programme, son lien est nettoyé afin qu'il puisse être associé de nouveau à un vrai match.
- Une synchronisation automatique est planifiée chaque nuit à **02:30 UTC** via Vercel Cron.

## Test local

Dans `C:\Projets\fc27-stats` :

```powershell
npm run dev -- --webpack
```

Puis :

1. Ouvrir le dashboard sur ordinateur et sur téléphone.
2. Vérifier la présence du bouton `Sync EA` sur téléphone.
3. Cliquer une fois sur le bouton en étant connecté avec un rôle Admin ou Staff.
4. Vérifier le message affiché après la synchronisation.
5. Contrôler dans les statistiques que les matchs interrompus ne sont plus comptabilisés et que les nuls transformés par EA en 3-0/0-3 sont corrigés.

## CRON_SECRET — à faire avant le déploiement Vercel

Créer une variable d'environnement Vercel :

- Nom : `CRON_SECRET`
- Cible : `Production`
- Valeur : une longue chaîne aléatoire privée

Le secret ne doit surtout pas être ajouté dans GitHub ni dans `vercel.json`.

Le Cron Vercel appellera :

`/api/cron/sync-matches`

avec le secret dans l'en-tête `Authorization`.

## Déploiement

À faire seulement après validation locale :

```powershell
git add .
git commit -m "Fiabilisation synchronisation EA et cron nocturne"
git push
```

Après le déploiement, Vercel enregistrera automatiquement le Cron défini dans `vercel.json`.
