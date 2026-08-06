# SONORA — Museo Digital de la Percepción Sonora

Sitio estático listo para publicar en Vercel.

## Publicación

1. Creá un proyecto nuevo en Vercel.
2. Subí el contenido de esta carpeta o conectalo a un repositorio.
3. Vercel detectará automáticamente `index.html` como página principal y la función de voz en `api/narrate.js`.
4. En **Settings → Environment Variables**, agregá `OPENAI_API_KEY` con una clave de OpenAI. Nunca la incluyas en los archivos del sitio.
5. Elegí el subdominio que prefieras, por ejemplo: `sonora-museo.vercel.app`, y volvé a desplegar.

No requiere instalar dependencias ni ejecutar una compilación. La narración IA sí requiere la variable `OPENAI_API_KEY` configurada en Vercel.

## Incluye

- Diseño editorial en negro, marfil y verde ácido.
- Colección de salas digitales con ilustraciones CSS.
- Experiencia sonora generativa, controlada por el visitante.
- Diseño adaptable para escritorio y móvil.
- Narrador IA bajo demanda, servido de forma segura desde Vercel.
- Modo oscuro predeterminado, guía de escucha minimizable y easter eggs interactivos.
