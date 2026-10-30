#!/usr/bin/env node
// Genera /catalogo/index.html y las fotos optimizadas a partir de una planilla (CSV) y una carpeta de fotos.
// Uso:  node herramientas/construir-catalogo.mjs [--datos "C:\COSF\fotos"] [--demo]
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITIO = 'https://centroopticosantafe.com';
const WHATSAPP = '595973851449';
const args = process.argv.slice(2);
const demo = args.includes('--demo');
const idx = args.indexOf('--datos');
const DATOS = path.resolve(idx >= 0 ? args[idx + 1] : 'C:\\COSF\\fotos');

const SALIDA_HTML = path.join(REPO, demo ? 'catalogo-demo' : 'catalogo');
const SALIDA_IMG = path.join(REPO, 'assets', demo ? 'catalogo-demo' : 'catalogo');
const URL_IMG = demo ? '/assets/catalogo-demo/' : '/assets/catalogo/';
const URL_PAGINA = demo ? '/catalogo-demo/' : '/catalogo/';

const CATEGORIAS = [
  { slug: 'armazones', nombre: 'Armazones', alias: ['armazon', 'armazones', 'anteojo', 'anteojos', 'marco', 'marcos'], intro: 'Armazones para mujer, hombre y niños. Te ayudamos a elegir el que mejor te queda según tu rostro y tu estilo.' },
  { slug: 'lentes-de-sol', nombre: 'Lentes de sol', alias: ['lentes de sol', 'lente de sol', 'sol', 'gafas de sol'], intro: 'Lentes de sol para todos los gustos.' },
  { slug: 'lentes-de-contacto', nombre: 'Lentes de contacto', alias: ['lentes de contacto', 'lente de contacto', 'contacto', 'contactologia'], intro: 'Lentes de contacto y productos para su uso. Para adaptarlos, pasá por nuestro gabinete de contactología.' },
  { slug: 'accesorios', nombre: 'Accesorios', alias: ['accesorio', 'accesorios', 'estuche', 'estuches', 'pano', 'panos', 'cordon', 'cordones'], intro: 'Estuches, paños y cordones.' },
];
const PARA = { mujer: 'Mujer', hombre: 'Hombre', ninos: 'Niños', unisex: 'Unisex', todos: 'Todos' };
const EXT_IMG = ['.jpg', '.jpeg', '.png', '.webp', '.avif', '.jfif'];

const sinAcentos = (s) => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const clave = (s) => sinAcentos(s).toLowerCase().trim();
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const avisos = [];
const errores = [];

// ---------- CSV ----------
function parseCSV(texto) {
  texto = texto.replace(/^\uFEFF/, '');
  const primera = texto.split(/\r?\n/)[0] || '';
  const sep = (primera.match(/;/g) || []).length > (primera.match(/,/g) || []).length ? ';' : ',';
  const filas = [];
  let fila = [], campo = '', comillas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (comillas) {
      if (c === '"' && texto[i + 1] === '"') { campo += '"'; i++; }
      else if (c === '"') comillas = false;
      else campo += c;
    } else if (c === '"') comillas = true;
    else if (c === sep) { fila.push(campo); campo = ''; }
    else if (c === '\n') { fila.push(campo); filas.push(fila); fila = []; campo = ''; }
    else if (c !== '\r') campo += c;
  }
  if (campo !== '' || fila.length) { fila.push(campo); filas.push(fila); }
  const [cab, ...resto] = filas.filter((f) => f.some((v) => v.trim() !== ''));
  const nombres = cab.map((h) => clave(h).replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''));
  return resto.map((f) => Object.fromEntries(nombres.map((n, i) => [n, (f[i] ?? '').trim()])));
}

// ---------- Productos ----------
function demoProductos() {
  const g = (r) => path.join(REPO, 'assets', r);
  return [
    { codigo: 'DEMO-ARM-1', estilo: 'Moderno, atemporal', categoria: 'Armazones', nombre_modelo: 'Modelo de ejemplo 1', marca: 'Marca ejemplo', para: 'Mujer', forma: 'Redondo', material: 'Acetato', color: 'Carey', medidas: '50-20-140', descripcion_corta: 'Descripción de ejemplo del armazón.', _frente: g('galeria/tendencias/armazon-1-diverso.jpg'), _costado: g('galeria/tendencias/armazon-2-amarillo.jpg'), destacado: 'si', estado: 'disponible' },
    { codigo: 'DEMO-ARM-2', estilo: 'Clásico ejecutivo', categoria: 'Armazones', nombre_modelo: 'Modelo de ejemplo 2', marca: 'Marca ejemplo', para: 'Hombre', forma: 'Rectangular', material: 'Acero inoxidable', color: 'Negro', medidas: '54-18-140', descripcion_corta: 'Descripción de ejemplo del armazón.', _frente: g('galeria/tendencias/armazon-3-minimalista.jpg'), _costado: g('galeria/tendencias/armazon-4-rectangular.jpg'), destacado: 'no', estado: 'disponible' },
    { codigo: 'DEMO-ARM-3', estilo: 'Elegante', categoria: 'Armazones', nombre_modelo: 'Modelo de ejemplo 3', marca: 'Marca ejemplo', para: 'Unisex', forma: 'Cuadrado', material: 'Metal', color: 'Dorado', medidas: '52-19-145', descripcion_corta: 'Descripción de ejemplo del armazón.', _frente: g('galeria/tendencias/armazon-5-chic.jpg'), _costado: g('galeria/tendencias/armazon-6-moderno.jpg'), destacado: 'no', estado: 'agotado' },
    { codigo: 'DEMO-ARM-4', estilo: 'Divertido', categoria: 'Armazones', nombre_modelo: 'Modelo de ejemplo 4', marca: 'Marca ejemplo', para: 'Niños', forma: 'Ovalado', material: 'Acetato flexible', color: 'Azul', medidas: '44-16-125', descripcion_corta: 'Descripción de ejemplo del armazón.', _frente: g('galeria/tendencias/armazon-7-elegante.jpg'), destacado: 'no', estado: 'disponible' },
    { codigo: 'DEMO-SOL-1', estilo: 'Deportivo', categoria: 'Lentes de sol', nombre_modelo: 'Lente de sol de ejemplo', marca: 'Marca ejemplo', para: 'Unisex', forma: 'Aviador', material: 'Metal', color: 'Plateado', medidas: '58-14-140', descripcion_corta: 'Descripción de ejemplo del lente de sol.', _frente: g('galeria/foto3-sol.jpg'), _costado: g('galeria/tendencias/armazon-8-variedad.jpg'), destacado: 'si', estado: 'disponible' },
    { codigo: 'DEMO-CON-1', categoria: 'Lentes de contacto', nombre_modelo: 'Lente de contacto de ejemplo', marca: 'Marca ejemplo', para: 'Todos', descripcion_corta: 'Descripción de ejemplo del producto.', _frente: g('contactologia/aplicacion-lente.jpg'), destacado: 'no', estado: 'disponible' },
    { codigo: 'DEMO-ACC-1', categoria: 'Accesorios', nombre_modelo: 'Estuche de ejemplo', marca: 'Marca ejemplo', para: 'Todos', color: 'Negro', descripcion_corta: 'Descripción de ejemplo del accesorio.', _frente: g('contactologia/lente-detalle.jpg'), destacado: 'no', estado: 'disponible' },
  ];
}

function crearPlantilla() {
  fs.mkdirSync(DATOS, { recursive: true });
  for (const c of CATEGORIAS) fs.mkdirSync(path.join(DATOS, c.slug), { recursive: true });
  const csv = path.join(DATOS, 'productos.csv');
  if (!fs.existsSync(csv)) {
    fs.writeFileSync(csv, '\uFEFFcodigo,categoria,nombre_modelo,marca,para,forma,material,estilo,color,medidas,descripcion_corta,foto_frente,foto_costado,destacado,estado\r\n', 'utf8');
  }
  console.log('\nSe preparó la carpeta de datos en: ' + DATOS);
  console.log('  - productos.csv  -> completá una fila por producto (podés abrirlo con Excel)');
  console.log('  - subcarpetas armazones, lentes-de-sol, lentes-de-contacto, accesorios -> guardá ahí las fotos');
  console.log('Cuando tengas productos, volvé a ejecutar esta herramienta.');
}

function indexarFotos() {
  const porNombre = new Map();
  const porBase = new Map();
  (function recorrer(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) recorrer(p);
      else if (EXT_IMG.includes(path.extname(e.name).toLowerCase())) {
        const n = e.name.toLowerCase();
        porNombre.set(n, p);
        const b = path.basename(n, path.extname(n));
        if (!porBase.has(b)) porBase.set(b, p);
      }
    }
  })(DATOS);
  return { porNombre, porBase };
}

function buscarFoto(idxFotos, valor, alternativas) {
  const candidatos = [valor, ...alternativas].filter(Boolean).map((v) => v.toLowerCase());
  for (const c of candidatos) {
    if (EXT_IMG.includes(path.extname(c)) && idxFotos.porNombre.has(c)) return idxFotos.porNombre.get(c);
    const b = path.basename(c, path.extname(c));
    if (idxFotos.porBase.has(b)) return idxFotos.porBase.get(b);
  }
  return null;
}

function categoriaDe(txt) {
  const k = clave(txt);
  return CATEGORIAS.find((c) => c.slug === k || clave(c.nombre) === k || c.alias.includes(k));
}
function paraDe(txt) {
  const k = clave(txt);
  if (!k) return 'todos';
  if (k.startsWith('muj') || k === 'dama' || k === 'femenino') return 'mujer';
  if (k.startsWith('hom') || k === 'caballero' || k === 'masculino') return 'hombre';
  if (k.startsWith('nin') || k.startsWith('chic') || k.startsWith('infant')) return 'ninos';
  if (k.startsWith('uni')) return 'unisex';
  return 'todos';
}
const esSi = (v) => ['si', 'sí', 's', '1', 'true', 'x', 'yes'].includes(clave(v));

// ---------- Imágenes ----------
function ffmpegDisponible() {
  try { execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' }); return true; } catch { return false; }
}
function convertir(src, dst, ancho, calidad) {
  if (fs.existsSync(dst) && fs.statSync(dst).mtimeMs >= fs.statSync(src).mtimeMs) return;
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', src, '-frames:v', '1', '-vf', `scale='min(${ancho},iw)':-2`, '-c:v', 'libwebp', '-quality', String(calidad), '-an', dst], { stdio: ['ignore', 'ignore', 'pipe'] });
}
function dimensiones(archivo) {
  const out = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', archivo]).toString().trim();
  const [w, h] = out.split(',').map(Number);
  return { w, h };
}
function procesarFoto(src, base, usadas) {
  const grande = base + '-960.webp';
  const chica = base + '-480.webp';
  convertir(src, path.join(SALIDA_IMG, grande), 960, 80);
  convertir(src, path.join(SALIDA_IMG, chica), 480, 78);
  usadas.add(grande); usadas.add(chica);
  const d = dimensiones(path.join(SALIDA_IMG, chica));
  const dg = dimensiones(path.join(SALIDA_IMG, grande));
  return { src: URL_IMG + grande, thumb: URL_IMG + chica, w: d.w, h: d.h, wg: dg.w };
}

// ---------- HTML ----------
function mensajeWA(p) {
  const marca = p.marca ? ` (${p.marca})` : '';
  const txt = p.estado === 'agotado'
    ? `Hola Centro Óptico Santa Fe, vi este modelo en el catálogo y quiero saber si hay disponibilidad: ${p.nombre}${marca}, código ${p.codigo}.`
    : `Hola Centro Óptico Santa Fe, me interesa este modelo del catálogo: ${p.nombre}${marca}, código ${p.codigo}.`;
  return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(txt)}`;
}

function medidasTxt(m) {
  const n = String(m || '').match(/\d+/g);
  return n && n.length >= 2 ? n.slice(0, 3).join(' · ') : '';
}

function tarjeta(p, i) {
  const f = p.fotos[0];
  const eager = i < 4;
  const meta = [p.para !== 'todos' ? PARA[p.para] : '', p.forma, p.color].filter(Boolean).join(' · ');
  const alt2 = p.fotos[1]
    ? `<img class="alt" src="${esc(p.fotos[1].thumb)}" alt="" width="${p.fotos[1].w}" height="${p.fotos[1].h}" loading="lazy" decoding="async" />`
    : '';
  const tag = p.estado === 'agotado' ? '<span class="pcard-tag agotado">Agotado</span>' : (p.destacado ? '<span class="pcard-tag destacado">Destacado</span>' : '');
  return `        <article class="pcard" id="${esc(p.id)}" data-id="${esc(p.id)}" data-cat="${p.cat.slug}" data-para="${p.para}">
          <a class="pcard-media" href="${esc(f.src)}" data-open="${esc(p.id)}" aria-label="Ver fotos de ${esc(p.nombre)}">
            <span class="pcard-num" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span>
            ${tag}
            <img src="${esc(f.thumb)}" srcset="${esc(f.thumb)} 480w, ${esc(f.src)} ${f.wg}w" sizes="(min-width: 1040px) 25vw, (min-width: 720px) 33vw, 50vw" alt="${esc(p.nombre)}${p.marca ? ' ' + esc(p.marca) : ''}" width="${f.w}" height="${f.h}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" />
            ${alt2}
          </a>
          <div class="pcard-body">
            ${p.marca ? `<span class="pcard-brand">${esc(p.marca)}</span>` : ''}
            <h3>${esc(p.nombre)}</h3>
            ${medidasTxt(p.medidas) ? `<p class="pcard-dim" title="Ancho de lente · puente · varilla (mm)"><span>${medidasTxt(p.medidas)}</span></p>` : ''}
            ${meta ? `<p class="pcard-meta">${esc(meta)}</p>` : ''}
            <div class="pcard-cta">
              <a class="btn-consultar" href="${esc(p.wa)}" target="_blank" rel="noopener" data-wa="${esc(p.id)}" aria-label="${p.estado === 'agotado' ? 'Consultar disponibilidad por WhatsApp' : 'Consultar por WhatsApp'}: ${esc(p.nombre)}"><i class="fab fa-whatsapp" aria-hidden="true"></i> ${p.estado === 'agotado' ? 'Disponibilidad' : '<span>Consultar<span class="mas"> por WhatsApp</span></span>'}</a>
            </div>
          </div>
        </article>`;
}

function pagina(productos, categoriasUsadas) {
  const total = productos.length;
  const paraUsados = ['mujer', 'hombre', 'ninos', 'unisex'].filter((k) => productos.some((p) => p.para === k));
  const titulo = 'Catálogo de armazones, lentes de sol y accesorios en Ciudad del Este | Centro Óptico Santa Fe';
  const descripcion = 'Mirá los armazones, lentes de sol, lentes de contacto y accesorios de Centro Óptico Santa Fe en Ciudad del Este. Elegí tu modelo y consultanos por WhatsApp.';
  const canonical = SITIO + '/catalogo/';
  const robots = demo || total === 0 ? '<meta name="robots" content="noindex, nofollow" />' : '';
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Catálogo | Centro Óptico Santa Fe',
    url: canonical,
    isPartOf: { '@id': SITIO + '/#negocio' },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: total,
      // Sin @type "Product": Google lo exige con precio, reseñas o calificación, y el catálogo no publica precios.
      itemListElement: productos.map((p, i) => ({
        '@type': 'ListItem', position: i + 1,
        name: p.marca && !p.nombre.toLowerCase().startsWith(p.marca.toLowerCase()) ? p.marca + ' ' + p.nombre : p.nombre,
        url: canonical + '#' + p.id,
        image: SITIO + p.fotos[0].src,
      })),
    },
  };
  const datos = {
    productos: productos.map((p) => ({
      id: p.id, cat: p.cat.slug, nombre: p.nombre, marca: p.marca, paraTexto: p.para === 'todos' ? '' : PARA[p.para], forma: p.forma, material: p.material, estilo: p.estilo, color: p.color, medidas: p.medidas, desc: p.desc, estado: p.estado, destacado: !!p.destacado, wa: p.wa,
      fotos: p.fotos.map((f, i) => ({ src: f.src, thumb: f.thumb, label: i === 0 ? 'Frente' : 'Costado' })),
    })),
  };
  const seguro = (o) => JSON.stringify(o).replace(/</g, '\\u003c');

  const secciones = categoriasUsadas.map((c) => {
    const items = productos.filter((p) => p.cat.slug === c.slug);
    let n = 0;
    return `      <section class="cat-section" id="${c.slug}" aria-labelledby="h-${c.slug}">
        <div class="container">
          <h2 id="h-${c.slug}">${c.nombre}</h2>
          <p class="cat-intro">${esc(c.intro)}</p>
          <div class="cat-grid">
${items.map((p) => tarjeta(p, n++)).join('\n')}
          </div>
        </div>
      </section>`;
  }).join('\n');

  const chips = [`<button type="button" class="chip" data-cat="todos" aria-pressed="true">Todo<span class="n">${total}</span></button>`]
    .concat(categoriasUsadas.map((c) => `<button type="button" class="chip" data-cat="${c.slug}" aria-pressed="false">${c.nombre}<span class="n">${productos.filter((p) => p.cat.slug === c.slug).length}</span></button>`)).join('\n          ');

  const conCaract = (p) => ['armazones', 'lentes-de-sol'].includes(p.cat.slug) && p.estado !== 'agotado' && (p.material || p.forma || p.estilo);
  const heroFoto = productos.find(conCaract);

  const cuerpo = total === 0
    ? `      <div class="container cat-empty">
        <h2>Estamos preparando el catálogo</h2>
        <p>Mientras tanto, escribinos por WhatsApp y te mostramos los modelos disponibles.</p>
        <a class="btn btn-whatsapp" href="https://wa.me/${WHATSAPP}?text=${encodeURIComponent('Hola Centro Óptico Santa Fe, quiero ver los modelos disponibles.')}" target="_blank" rel="noopener" onclick="fbq('track','Contact')"><i class="fab fa-whatsapp" aria-hidden="true"></i> Escribir por WhatsApp</a>
      </div>`
    : `${secciones}
      <div class="container" id="cat-sin-resultados" hidden><p class="cat-nota">No hay modelos con ese filtro. Probá con otra opción o escribinos por WhatsApp y te ayudamos a encontrar lo que buscás.</p></div>
      <div class="container"><p class="cat-nota">Los modelos y la disponibilidad pueden cambiar. Escribinos por WhatsApp y te confirmamos si el modelo que te gustó está en el local.</p></div>`;

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(titulo)}</title>
  <meta name="description" content="${esc(descripcion)}" />
  ${robots}
  <link rel="canonical" href="${canonical}" />
  <meta property="og:title" content="${esc(titulo)}" />
  <meta property="og:description" content="${esc(descripcion)}" />
  <meta property="og:type" content="website" />
  <meta property="og:locale" content="es_PY" />
  <meta property="og:url" content="${canonical}" />
  <meta property="og:site_name" content="Centro Óptico Santa Fe" />
  <meta property="og:image" content="${SITIO}/assets/og-image.jpg" />
  <meta name="twitter:card" content="summary" />
  <link rel="icon" href="/favicon.ico" sizes="any" />
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
  <script type="application/ld+json">${seguro(jsonLd)}</script>

  <script async src="https://www.googletagmanager.com/gtag/js?id=G-CF9F70N90P"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-CF9F70N90P');
  </script>

  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Poppins:wght@600;700;800&family=IBM+Plex+Mono:wght@500;600&display=swap" onload="this.onload=null;this.rel='stylesheet'" />
  <noscript><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Poppins:wght@600;700;800&family=IBM+Plex+Mono:wght@500;600&display=swap" rel="stylesheet" /></noscript>

  <link rel="stylesheet" href="/styles.css" />
  <link rel="stylesheet" href="/assets/catalogo.css" />
  <script>
  !function(f,b,e,v,n,t,s)
  {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
  n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];
  s.parentNode.insertBefore(t,s)}(window, document,'script',
  'https://connect.facebook.net/en_US/fbevents.js');
  fbq('init', '1525850512886959');
  fbq('track', 'PageView');
  </script>
  <noscript><img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=1525850512886959&ev=PageView&noscript=1" alt="" /></noscript>
  <script src="/assets/icons.js" defer></script>
  <script src="/assets/catalogo.js" defer></script>
</head>
<body class="cat-page">
${demo ? '  <div class="cat-aviso">VISTA DE EJEMPLO: estos productos no son reales y esta página no se publica.</div>\n' : ''}  <header class="header" id="header">
    <div class="container header-inner">
      <a href="/" class="logo-link" aria-label="Centro Óptico Santa Fe, inicio">
        <picture><source srcset="/assets/logo_header.webp" type="image/webp" /><img src="/assets/logo_header.png" alt="Centro Óptico Santa Fe" class="logo-img" width="915" height="200" /></picture>
      </a>
      <button class="nav-toggle" id="navToggle" aria-label="Abrir menú" aria-expanded="false" aria-controls="nav"><span></span><span></span><span></span></button>
      <nav class="nav" id="nav" aria-label="Principal">
        <ul class="nav-list">
          <li><a href="/#servicios" class="nav-link">Servicios</a></li>
          <li><a href="/catalogo/" class="nav-link" aria-current="page">Catálogo</a></li>
          <li><a href="/lentes-multifocales/" class="nav-link">Multifocales</a></li>
          <li><a href="/contactologia" class="nav-link">Contactología</a></li>
          <li><a href="/acerca-de-nosotros" class="nav-link">Nosotros</a></li>
          <li><a href="/contactenos/" class="nav-link">Contacto</a></li>
          <li><a href="/test-visual/" class="nav-link nav-link-test">Test visual</a></li>
        </ul>
      </nav>
    </div>
  </header>

  <main>
    <section class="cat-hero">
      <div class="container cat-hero-inner">
        <div class="cat-hero-txt">
          <h1>Nuestro catálogo.</h1>
          <p>Armazones, lentes de sol, lentes de contacto y accesorios. Elegí el modelo que te guste y consultanos por WhatsApp: te confirmamos si está en el local y te asesoramos.</p>
        </div>
        ${heroFoto ? `<div class="cat-feature"><div class="cat-stage" id="cat-stage"><img id="cat-stage-img" src="${esc(heroFoto.fotos[0].src)}" alt="${esc(heroFoto.nombre)}" width="${heroFoto.fotos[0].w}" height="${heroFoto.fotos[0].h}" fetchpriority="high" decoding="async" /></div><div class="cat-stage-ficha" id="cat-stage-ficha"></div></div>` : `        <svg class="cat-plano" viewBox="0 0 520 300" role="img" aria-label="Dibujo técnico de un armazón con sus tres medidas: ancho de lente, puente y varilla">
          <g class="trazo" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <path pathLength="1" d="M70 120c0-30 18-48 52-48h56c30 0 46 20 44 58-2 38-22 60-54 60h-46c-34 0-52-26-52-70z"/>
            <path pathLength="1" d="M342 120c0-30 18-48 52-48h56c30 0 46 20 44 58-2 38-22 60-54 60h-46c-34 0-52-26-52-70z" transform="translate(-88 0)"/>
            <path pathLength="1" d="M222 112c10-10 22-10 32 0"/>
            <path pathLength="1" d="M70 112H34M406 112h34"/>
          </g>
          <g class="cotas" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M70 216v14M222 216v14M70 224h152"/>
            <path d="M222 56v-14M254 56v-14M222 48h32"/>
            <path d="M34 112v128M28 240h12"/>
          </g>
          <g class="cifras" fill="currentColor" font-size="17" text-anchor="middle">
            <text x="146" y="252">54</text>
            <text x="238" y="30">18</text>
            <text x="14" y="176" transform="rotate(-90 14 176)">140</text>
          </g>
        </svg>`}
      </div>
    </section>
${total > 0 ? `    <div class="cat-tools">
      <div class="cat-tools-inner">
        <div class="cat-chips" role="group" aria-label="Filtrar por categoría">
          ${chips}
        </div>
      </div>
    </div>
    <div class="cat-filtros" id="cat-filtros"></div>
` : ''}${cuerpo}
  </main>

  <dialog class="pdialog" id="pdialog" aria-labelledby="pd-titulo">
    <button type="button" class="pd-close" id="pd-cerrar" aria-label="Cerrar"><svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M3 3l12 12M15 3L3 15" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" fill="none"/></svg></button>
    <div class="pd-grid">
      <div class="pd-photo">
        <div class="pd-photo-frame" id="pd-frame"><img id="pd-img" src="data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==" alt="" /></div>
        <div class="pd-thumbs" id="pd-thumbs" hidden></div>
      </div>
      <div class="pd-info">
        <span class="pd-brand" id="pd-marca"></span>
        <h2 id="pd-titulo"></h2>
        <p class="pd-desc" id="pd-desc"></p>
        <dl id="pd-ficha"></dl>
        <p class="pd-nota" id="pd-estado" hidden>Este modelo figura como agotado. Consultanos si volverá a estar disponible.</p>
        <div class="pd-actions">
          <a class="btn btn-whatsapp" id="pd-wa" href="#" target="_blank" rel="noopener" data-wa="dialogo"><i class="fab fa-whatsapp" aria-hidden="true"></i> Consultar por WhatsApp</a>
          <div class="pd-nav"><button type="button" id="pd-prev">← Anterior</button><button type="button" id="pd-next">Siguiente →</button></div>
        </div>
      </div>
    </div>
  </dialog>

  <script type="application/json" id="catalogo-datos">${seguro(datos)}</script>

  <footer class="footer">
    <div class="container footer-inner">
      <div class="footer-brand">
        <picture><source srcset="/assets/logo_header.webp" type="image/webp" /><img src="/assets/logo_header.png" alt="Centro Óptico Santa Fe" class="logo-img logo-img-footer" width="915" height="200" /></picture>
        <p class="footer-slogan">Ver bien, se siente aún mejor.</p>
        <div class="footer-social">
          <a href="https://www.instagram.com/cosf_cde" target="_blank" rel="noopener" aria-label="Instagram"><i class="fab fa-instagram" aria-hidden="true"></i></a>
          <a href="https://wa.me/${WHATSAPP}" target="_blank" rel="noopener" aria-label="WhatsApp" onclick="fbq('track','Contact')"><i class="fab fa-whatsapp" aria-hidden="true"></i></a>
        </div>
      </div>
      <nav class="footer-links" aria-label="Más páginas">
        <h4>Páginas</h4>
        <ul>
          <li><a href="/catalogo/">Catálogo</a></li>
          <li><a href="/lentes-multifocales/">Lentes multifocales</a></li>
          <li><a href="/contactologia">Contactología</a></li>
          <li><a href="/test-visual/">Test visual</a></li>
          <li><a href="/acerca-de-nosotros">Acerca de nosotros</a></li>
          <li><a href="/testimonios">Testimonios</a></li>
          <li><a href="/galeria">Galería de fotos</a></li>
          <li><a href="/como-llegar">Cómo llegar</a></li>
          <li><a href="/contactenos">Contáctenos</a></li>
        </ul>
      </nav>
      <div class="footer-links">
        <h4>Contacto</h4>
        <ul>
          <li>WhatsApp +595 973 851 449</li>
          <li>Instagram @cosf_cde</li>
          <li>Blas Garay 1149 c/ San José, Barrio San Isidro, CDE</li>
          <li>Todos los días, 08:00–19:00</li>
          <li>24 horas por WhatsApp y llamada</li>
        </ul>
      </div>
    </div>
    <div class="footer-bottom"><div class="container"><p>&copy; 2026 Centro Óptico Santa Fe — Ciudad del Este, Paraguay. · <a href="/privacidad/">Política de privacidad</a></p></div></div>
  </footer>

  <a href="https://wa.me/${WHATSAPP}?text=Hola%20Centro%20%C3%93ptico%20Santa%20Fe%2C%20quiero%20hacer%20una%20consulta" class="whatsapp-float" target="_blank" rel="noopener" aria-label="Contactar por WhatsApp" onclick="gtag('event','click_whatsapp',{event_category:'flotante'});fbq('track','Contact')"><i class="fab fa-whatsapp" aria-hidden="true"></i></a>

  <script src="/main.js"></script>
</body>
</html>
`;
}

// ---------- Principal ----------
function main() {
  console.log(demo ? 'Modo EJEMPLO (no usa tu planilla)' : 'Carpeta de datos: ' + DATOS);
  if (!ffmpegDisponible()) { console.error('ERROR: no se encontró ffmpeg. Instalalo para optimizar las fotos.'); process.exit(1); }

  let filas;
  let fotos = null;
  if (demo) filas = demoProductos();
  else {
    if (!fs.existsSync(path.join(DATOS, 'productos.csv'))) { crearPlantilla(); return; }
    filas = parseCSV(fs.readFileSync(path.join(DATOS, 'productos.csv'), 'utf8'));
    fotos = indexarFotos();
  }

  fs.mkdirSync(SALIDA_IMG, { recursive: true });
  fs.mkdirSync(SALIDA_HTML, { recursive: true });
  const usadas = new Set();
  const codigos = new Set();
  const productos = [];
  let ocultos = 0;

  filas.forEach((r, n) => {
    const linea = n + 2;
    if (!r.codigo && !r.nombre_modelo) return;
    if (!r.codigo || !r.nombre_modelo) { errores.push(`Fila ${linea}: faltan "codigo" o "nombre_modelo".`); return; }
    const id = clave(r.codigo).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (codigos.has(id)) { errores.push(`Fila ${linea}: el código "${r.codigo}" está repetido.`); return; }
    codigos.add(id);
    const estado = clave(r.estado) || 'disponible';
    if (!['disponible', 'agotado', 'oculto'].includes(estado)) { errores.push(`Fila ${linea} (${r.codigo}): estado "${r.estado}" no válido. Usá disponible, agotado u oculto.`); return; }
    if (estado === 'oculto') { ocultos++; return; }
    const cat = categoriaDe(r.categoria);
    if (!cat) { errores.push(`Fila ${linea} (${r.codigo}): categoría "${r.categoria}" no reconocida. Usá Armazones, Lentes de sol, Lentes de contacto o Accesorios.`); return; }

    const srcFrente = demo ? r._frente : buscarFoto(fotos, r.foto_frente, [id + '-frente', id]);
    if (!srcFrente || !fs.existsSync(srcFrente)) { errores.push(`Fila ${linea} (${r.codigo}): no se encontró la foto de frente${r.foto_frente ? ' "' + r.foto_frente + '"' : ''}.`); return; }
    const srcCostado = demo ? r._costado : buscarFoto(fotos, r.foto_costado, [id + '-costado', id + '-lado']);
    if (!demo && r.foto_costado && !srcCostado) avisos.push(`${r.codigo}: no se encontró la foto de costado "${r.foto_costado}"; se publica solo con la de frente.`);
    if (!srcCostado && ['armazones', 'lentes-de-sol'].includes(cat.slug)) avisos.push(`${r.codigo}: el ${cat.nombre.toLowerCase()} tiene una sola foto (se recomiendan frente y costado).`);

    const p = {
      id, codigo: r.codigo, cat, nombre: r.nombre_modelo, marca: r.marca, para: paraDe(r.para), forma: r.forma, material: r.material, estilo: r.estilo, color: r.color, medidas: r.medidas, desc: r.descripcion_corta,
      estado, destacado: esSi(r.destacado), fotos: [],
    };
    p.fotos.push(procesarFoto(srcFrente, id + '-frente', usadas));
    if (srcCostado) p.fotos.push(procesarFoto(srcCostado, id + '-costado', usadas));
    p.wa = mensajeWA(p);
    productos.push({ ...p, _orden: n });
  });

  if (errores.length) {
    console.error('\nNo se generó el catálogo. Corregí esto en la planilla:');
    errores.forEach((e) => console.error('  - ' + e));
    process.exit(1);
  }

  productos.sort((a, b) => (b.destacado - a.destacado) || (a._orden - b._orden));
  const categoriasUsadas = CATEGORIAS.filter((c) => productos.some((p) => p.cat.slug === c.slug));
  fs.writeFileSync(path.join(SALIDA_HTML, 'index.html'), pagina(productos, categoriasUsadas), 'utf8');

  let borradas = 0;
  for (const f of fs.readdirSync(SALIDA_IMG)) {
    if (f.endsWith('.webp') && !usadas.has(f)) { fs.unlinkSync(path.join(SALIDA_IMG, f)); borradas++; }
  }

  console.log(`\nListo. ${productos.length} productos publicados` + (ocultos ? `, ${ocultos} ocultos` : '') + '.');
  categoriasUsadas.forEach((c) => console.log(`  - ${c.nombre}: ${productos.filter((p) => p.cat.slug === c.slug).length}`));
  console.log(`  Fotos optimizadas: ${usadas.size}` + (borradas ? ` (se quitaron ${borradas} que ya no se usan)` : ''));
  console.log('  Página: ' + path.join(SALIDA_HTML, 'index.html'));
  if (avisos.length) { console.log('\nAvisos:'); avisos.forEach((a) => console.log('  - ' + a)); }
  if (demo) console.log('\nEs una VISTA DE EJEMPLO: abrila en ' + URL_PAGINA + ' (no se publica).');
  else console.log('\nPara publicar los cambios, avisale a Claude.');
}

main();
