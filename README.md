# 🇨🇴 Pulla Colombia — Mundial 2026

Aplicación web para organizar la pulla (quiniela) de los partidos de Colombia en el Mundial 2026.

## Estructura de archivos

```
colombia-mundial/
├── index.html          ← Página principal
├── css/
│   └── styles.css      ← Todos los estilos
├── js/
│   └── app.js          ← Toda la lógica
└── README.md
```

## Funciones

- ⚽ Configurar el rival de Colombia
- 💰 Definir cuota por persona (en COP)
- 🏆 Ver el pozo acumulado en tiempo real
- 👥 Inscribir participantes con su marcador pronosticado
- ✏️ Editar / eliminar participantes antes del cierre
- 🔴 Cerrar inscripciones (bloquea toda edición)
- 📸 Exportar imagen PNG con la tabla de participantes y el pozo

## Cómo usar

Abre `index.html` directamente en el navegador, o despliega en cualquier servidor estático.

## Despliegue

### Opción 1 — GitHub Pages (gratis)
1. Sube la carpeta a un repositorio GitHub
2. Ve a **Settings → Pages → Branch: main / root**
3. GitHub te da una URL pública automáticamente

### Opción 2 — Netlify (gratis, drag & drop)
1. Ve a [netlify.com/drop](https://app.netlify.com/drop)
2. Arrastra la carpeta `colombia-mundial`
3. ¡Listo! Netlify genera una URL pública al instante

### Opción 3 — Vercel (gratis)
1. Instala Vercel CLI: `npm i -g vercel`
2. Ejecuta `vercel` dentro de la carpeta del proyecto
3. Sigue los pasos del asistente

### Opción 4 — Servidor local
```bash
# Con Python
python -m http.server 8080

# Con Node.js (npx)
npx serve .
```
Luego abre `http://localhost:8080`

## Notas
- La exportación de imagen usa [html2canvas](https://html2canvas.hertzen.com/) cargado automáticamente desde CDN cuando se necesita.
- No requiere backend ni base de datos. Todo funciona en el navegador.
- 100% offline-compatible (excepto fuentes de Google Fonts y html2canvas si no hay internet).
