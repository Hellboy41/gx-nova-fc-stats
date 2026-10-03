PACK CONNEXION STAFF GX NOVA

Fichiers à copier dans C:\Projets\fc27-stats :

proxy.ts
src\lib\supabase\client.ts
src\lib\supabase\server.ts
src\lib\supabase\proxy.ts
src\app\login\page.tsx
src\app\api\me\route.ts

Dépendances :
npm install @supabase/supabase-js @supabase/ssr

Variables déjà attendues dans .env.local :
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...

Ne jamais exposer SUPABASE_SECRET_KEY côté navigateur.

Après copie des fichiers :
1. Créer le premier utilisateur dans Supabase > Authentication > Users.
2. Créer son entrée dans public.staff_profiles avec le rôle admin.
3. Redémarrer npm run dev.
4. Ouvrir http://localhost:3000
5. Se connecter.
6. Tester http://localhost:3000/api/me
