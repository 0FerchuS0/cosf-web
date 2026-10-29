# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- Vecinos de Ciudad del Este (CDE), Paraguay: familias y adultos que buscan una óptica de confianza cerca de casa; llegan por búsqueda local, WhatsApp o recomendación.
- Brasileños que cruzan desde Foz do Iguaçu y Brasil a comprar lentes en Paraguay; buscan en portugués y comparan marca, precio y plazo. El sitio hoy está solo en español.
- Mayores de 40 con presbicia que consultan por lentes multifocales/progresivos (el rubro con más consultas).
- Usuarios y candidatos a lentes de contacto, que llegan por el gabinete de contactología y el test de candidato.

Situación típica: alguien en el celular compara ópticas, quiere saber qué ofrece la óptica, qué marcas y qué rango de precio, y termina escribiendo por WhatsApp o yendo al local.

## Product Purpose

Sitio institucional y de captación de Centro Óptico Santa Fe (COSF), una óptica familiar en Ciudad del Este. Existe para que la gente encuentre la óptica, entienda qué hace (atención visual personalizada, lentes oftálmicos, multifocales, contactología) y llegue al local o a WhatsApp. El éxito se mide en consultas por WhatsApp, visitas al local, tests completados y tráfico calificado desde Google Ads y búsqueda orgánica (incluida la de asistentes de IA).

## Positioning

- Atención personalizada y honesta, antes y después de la compra.
- Medición digital de precisión (tablet de centrado y medidor nasopupilar digital) y multifocales digitales con campo de visión personalizado; línea Prime con diseño potenciado por IA (laboratorio Prime instalado en Paraguay), además de Kodak y Varilux Confort.
- Gabinete propio de contactología: prueba, adaptación y seguimiento.
- Atención 24 horas, de lunes a domingo, por WhatsApp y llamada (para agendar atención fuera del horario de oficina).

## Operating Context

- Local: Blas Garay 1149 c/ Avda. San José, Barrio San Isidro, Ciudad del Este. Horario del local: lunes a viernes 08:00–19:00 corrido; sábado y domingo cerrado. WhatsApp +595 973 851 449. Instagram @cosf_cde.
- Sitio estático (HTML/CSS/JS) en GitHub (0FerchuS0/cosf-web) con deploy automático en Netlify (centro-optico-santafe.netlify.app). Cada página es autocontenida con su propio `<style>`; el home usa `styles.css` y `main.js`.
- Publicidad en Google Ads (campaña local CDE) con grupos de anuncios para multifocales y lentes de contacto; analítica GA4 y Meta Pixel instalados.
- Español rioplatense/paraguayo con voseo ("Escribinos", "Consultá"); precios en guaraníes (Gs.).

## Capabilities and Constraints

- Páginas actuales: Inicio, Acerca de nosotros, Testimonios, Galería, Cómo llegar, Contáctenos, Contactología, Test visual, Test de lentes de contacto (/lentes-de-contacto/), Lentes multifocales (/lentes-multifocales/).
- Multifocales: rango de precio del par Gs. 500.000 a Gs. 3.800.000 según campo de visión, marca y tratamientos; la cotización exacta requiere pasar por la óptica (no se cotiza por WhatsApp). Plazo de fabricación y garantía de adaptación: pendientes de confirmar, no inventar.
- Solamax es una marca que COSF también vende (no tratarla como competencia).
- No hay carrito ni checkout; todo cierre ocurre en el local o por WhatsApp.
- Pendiente: contenido en portugués (pt-BR) y dominio propio (hoy netlify.app).

## Brand Commitments

- Nombre: Centro Óptico Santa Fe (COSF). Logo en `assets/logo.png` y `assets/logo_header.png`.
- Colores de marca ya en uso: azul #1B4F9C y rojo #C0392B; WhatsApp en verde.
- Voz: cercana, honesta y profesional; trato de vos.
- No incluir "ajustes y arreglos gratis" como promesa comercial (decisión del dueño).

## Evidence on Hand

- Fotos propias de armazones y lentes disponibles o por sacar para el catálogo (a cargar por el dueño); hoy existen fotos genéricas en `assets/galeria/` y `assets/contactologia/`.
- Testimonios de clientes con nombre en /testimonios y enlace a reseñas de Google Maps.
- Logos de Prime, Kodak y Varilux en `assets/brands/`.
- No hay precios por producto individual ni stock en el sitio; no inventarlos.

## Product Principles

1. Primero la persona: explicar con claridad y sin presión; el sitio orienta, la óptica decide con la medición.
2. Mostrar la capacidad real (medición digital, marcas, gabinete) con datos concretos en lugar de adjetivos.
3. Todo camino termina en una acción simple: WhatsApp o visita al local.
4. Pensado para celular primero y para búsqueda local, en español y, a futuro, en portugués.
5. Nunca afirmar lo que COSF no pueda sostener (precios, plazos, garantías sin confirmar).

## Accessibility & Inclusion

- Usuarios en celular y con presbicia: tipografía legible, contraste suficiente y áreas táctiles amplias.
- Contenido bilingüe (español y portugués) previsto para el público brasileño.
