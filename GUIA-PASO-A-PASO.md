# Guía para publicar tu Control de Ventas — sin costo

No necesitas saber programar para seguir esto. Son 3 partes: la base de datos (Supabase), el código en GitHub, y la publicación (Vercel).

---

## PARTE 1 — Crear la base de datos (Supabase)

1. Ve a **https://supabase.com** y crea una cuenta gratis (con tu correo o Google).
2. Clic en **"New Project"**.
   - Nombre: `control-ventas` (o el que quieras)
   - Contraseña de base de datos: genera una y **guárdala** en un lugar seguro (no la vas a necesitar después, pero por si acaso).
   - Región: elige la más cercana (ej. South America / São Paulo).
   - Clic en **"Create new project"** y espera 1-2 minutos mientras se crea.
3. En el menú izquierdo, entra a **"SQL Editor"**.
4. Abre el archivo `supabase-schema.sql` que te entregué, copia **todo** su contenido, pégalo en el editor y da clic en **"Run"**.
   - Esto crea las tablas `metas` y `ventas`, y las reglas de seguridad para que cada persona solo vea sus propios datos.
5. En el menú izquierdo, entra a **"Settings" → "API"**.
   - Copia el valor de **"Project URL"** (algo como `https://xxxxx.supabase.co`)
   - Copia el valor de **"anon public"** (una llave larga)
   - Guarda estos dos valores, los necesitas en la Parte 3.
6. Activa que se puedan registrar por correo:
   - Ve a **"Authentication" → "Providers"** y confirma que **"Email"** está activado (viene activado por defecto).
   - Ve a **"Authentication" → "URL Configuration"** y dejaremos el "Site URL" pendiente hasta que tengas el link de Vercel (Parte 3, paso final).

---

## PARTE 2 — Subir el código a GitHub

1. Ve a **https://github.com** y crea una cuenta gratis si no tienes.
2. Clic en el botón **"+"** arriba a la derecha → **"New repository"**.
   - Nombre: `control-ventas`
   - Déjalo **Público** o **Privado**, cualquiera funciona.
   - No marques ninguna opción adicional (README, .gitignore, licencia) — déjalo vacío.
   - Clic en **"Create repository"**.
3. En la página del repositorio recién creado, busca el link **"uploading an existing file"**.
4. Arrastra **todos los archivos y carpetas** que te entregué (excepto `node_modules` si llegaras a tener esa carpeta — no debería existir) dentro de esa zona de carga.
5. Escribe un mensaje como "Primera versión" y clic en **"Commit changes"**.

---

## PARTE 3 — Publicar la aplicación (Vercel)

1. Ve a **https://vercel.com** y crea una cuenta gratis usando **"Continue with GitHub"** (así quedan conectados automáticamente).
2. Clic en **"Add New..." → "Project"**.
3. Busca tu repositorio `control-ventas` en la lista y clic en **"Import"**.
4. En la sección **"Environment Variables"** (antes de darle a Deploy), agrega dos variables:
   - Name: `VITE_SUPABASE_URL` → Value: (el Project URL que copiaste en la Parte 1)
   - Name: `VITE_SUPABASE_ANON_KEY` → Value: (la llave anon public que copiaste)
5. Clic en **"Deploy"** y espera 1-2 minutos.
6. Cuando termine, Vercel te da un link tipo `https://control-ventas-xxxx.vercel.app` — **ese es el link que le compartes a tus compañeros**.
7. Último paso importante: vuelve a Supabase → **"Authentication" → "URL Configuration"** → pon ese link de Vercel en **"Site URL"** y también agrégalo en **"Redirect URLs"**. Esto es necesario para que el link mágico de acceso funcione correctamente.

---

## Cómo lo usan tus compañeros

1. Abren el link de Vercel.
2. Escriben su correo y dan clic en "Enviar link de acceso".
3. Revisan su correo (a veces llega a spam la primera vez) y abren el link — quedan adentro.
4. Cada quien ve y carga **solo sus propias ventas y metas**, nunca las de los demás.

## Si algo falla

- **El link mágico no llega**: revisa spam, y confirma que "Email" esté activo en Supabase → Authentication → Providers.
- **Pantalla en blanco después de publicar**: casi siempre son las variables de entorno mal copiadas — revísalas en Vercel → tu proyecto → Settings → Environment Variables.
- **"Invalid Redirect URL"**: falta el paso 7 de la Parte 3 (poner el link de Vercel en Supabase).

Cuando lo tengas montado, dime y revisamos juntos que todo cuadre.
