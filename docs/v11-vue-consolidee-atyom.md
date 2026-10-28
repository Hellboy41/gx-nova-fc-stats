# Vue consolidée ATYOM

- Accès exclusivement à un membre actif avec `access_scope = structure`, vérifié côté serveur par `requireActiveStaff({requireStructure:true})`.
- API lecture seule `GET /api/organisation/overview`. Aucun paramètre d'ID EA fourni par le client.
- Derniers dix résultats, forme des cinq derniers, bilan V/N/D et buts sur les trente derniers jours par roster.
- Huit prochains événements, et nombre total d'événements à sept jours, depuis `weekly_programs`.
- Nombre de comptes actifs sans exposer leur identité.
- Une équipe pilote, GX NØVA EA 1663; aucun roster fictif. Le code est structuré par roster pour l'extension future après isolation.
- Limite : trente jours plafonnés à 1000 matchs par roster, avec avertissement dans l'interface si atteinte.
- Aucune migration ou écriture de données.

Recette : tester l'API avec membre structure, membre rosters (403), non connecté (401) et viewer structure;
comparer les données sur 30 jours à Supabase; valider les prochains événements et les états vides.
