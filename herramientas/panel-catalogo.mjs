#!/usr/bin/env node
// Panel local para gestionar el catálogo: marcar modelos como vendidos y publicar los cambios.
// Corre SOLO en esta computadora (127.0.0.1): no está publicado en internet ni necesita contraseña.
// Uso:  node herramientas/panel-catalogo.mjs [--datos "C:\COSF\fotos"] [--no-abrir]
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { execFile, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { leerPlanilla, escribirPlanilla } from './planilla.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const idx = args.indexOf('--datos');
const DATOS = path.resolve(idx >= 0 ? args[idx + 1] : 'C:\\COSF\\fotos');
const CSV = path.join(DATOS, 'productos.csv');
const SIN_PUBLICAR_GIT = args.includes('--sin-git');
const EXT_IMG = ['.jpg', '.jpeg', '.png', '.webp', '.avif', '.jfif'];
const TIPOS = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.avif': 'image/avif', '.jfif': 'image/jpeg' };

const clave = (s) => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const idDe = (codigo) => clave(codigo).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const claveFoto = (t) => String(t || '').toLowerCase().replace(/[^a-z0-9]/g, '');

// ---------- Fotos ----------
let indiceFotos = null;
function fotos() {
  if (indiceFotos) return indiceFotos;
  const porNombre = new Map(), porCodigo = new Map();
  (function recorrer(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) { if (e.name !== 'respaldos') recorrer(p); }
      else if (EXT_IMG.includes(path.extname(e.name).toLowerCase())) {
        const n = e.name.toLowerCase();
        porNombre.set(n, p);
        const b = path.basename(n, path.extname(n));
        if (!porNombre.has(b)) porNombre.set(b, p);
        const m = b.match(/^(.*?)[-_ ]*(frente|costado)$/);
        if (m && !porCodigo.has(claveFoto(m[1]) + '|' + m[2])) porCodigo.set(claveFoto(m[1]) + '|' + m[2], p);
      }
    }
  })(DATOS);
  indiceFotos = { porNombre, porCodigo };
  return indiceFotos;
}
function fotoDe(fila) {
  const { porNombre, porCodigo } = fotos();
  const v = String(fila.foto_frente || '').toLowerCase();
  if (v && porNombre.has(v)) return porNombre.get(v);
  const cod = String(fila.codigo || '');
  for (const c of [cod, cod.replace(/-C\d+$/i, ''), cod.replace(/^GAN-/i, 'GANT-'), cod.replace(/-C\d+$/i, '').replace(/^GAN-/i, 'GANT-')]) {
    const h = porCodigo.get(claveFoto(c) + '|frente');
    if (h) return h;
  }
  const tramos = cod.replace(/\s+/g, '').split('-').filter(Boolean);
  for (let n = tramos.length - 1; n >= 2; n--) {
    const base = tramos.slice(0, n).join('-');
    for (const c of [base, base.replace(/^GAN-/i, 'GANT-')]) {
      const h = porCodigo.get(claveFoto(c) + '|frente');
      if (h) return h;
    }
  }
  return null;
}

// ---------- Planilla ----------
function leer() { return leerPlanilla(fs.readFileSync(CSV, 'utf8')); }

let respaldoHecho = false;
function guardar(filas) {
  if (!respaldoHecho) {
    const dir = path.join(DATOS, 'respaldos');
    fs.mkdirSync(dir, { recursive: true });
    const t = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, (c) => (c === 'T' ? '-' : ''));
    fs.copyFileSync(CSV, path.join(dir, `productos-${t}.csv`));
    respaldoHecho = true;
  }
  fs.writeFileSync(CSV, escribirPlanilla(filas), 'utf8');
}

// ---------- Lo que está publicado hoy (para saber qué falta publicar) ----------
function publicados() {
  try {
    const html = fs.readFileSync(path.join(REPO, 'catalogo', 'index.html'), 'utf8');
    const m = html.match(/<script type="application\/json" id="catalogo-datos">([\s\S]*?)<\/script>/);
    return new Set(JSON.parse(m[1]).productos.map((p) => p.id));
  } catch { return new Set(); }
}

function lista() {
  const filas = leer();
  const pub = publicados();
  const productos = filas.filter((f) => f.codigo).map((f) => {
    const id = idDe(f.codigo);
    const estado = clave(f.estado) || 'disponible';
    const visible = estado !== 'oculto';
    return { codigo: f.codigo, id, nombre: f.nombre_modelo, marca: f.marca, categoria: f.categoria, color: f.color, estado, publicado: pub.has(id), pendiente: visible !== pub.has(id) && (visible ? !!fotoDe(f) : true), conFoto: !!fotoDe(f) };
  });
  return { productos, pendientes: productos.filter((p) => p.pendiente).length };
}

// ---------- Publicar ----------
function correr(cmd, argv, cwd) {
  return execFileSync(cmd, argv, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 20 * 1024 * 1024 });
}
function publicar() {
  const log = [];
  try {
    log.push(correr('node', [path.join(REPO, 'herramientas', 'construir-catalogo.mjs'), '--datos', DATOS], REPO));
  } catch (e) {
    return { ok: false, paso: 'armar', mensaje: 'No se pudo armar el catálogo.', detalle: String(e.stderr || e.stdout || e.message) };
  }
  if (SIN_PUBLICAR_GIT) return { ok: true, publicado: false, mensaje: 'Catálogo armado en esta computadora (modo prueba, no se subió).', detalle: log.join('\n') };
  try {
    const rutas = ['assets/catalogo', 'assets/catalogo.css', 'assets/catalogo.js', 'catalogo/index.html', 'herramientas'];
    correr('git', ['add', '-A', '--', ...rutas], REPO);
    const hayCambios = (() => { try { correr('git', ['diff', '--cached', '--quiet'], REPO); return false; } catch { return true; } })();
    if (!hayCambios) return { ok: true, publicado: false, mensaje: 'No había nada nuevo para publicar.', detalle: log.join('\n') };
    correr('git', ['commit', '-q', '-m', 'Catálogo: actualización desde el panel de gestión\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>'], REPO);
    log.push(correr('git', ['push', 'origin', 'master'], REPO));
    return { ok: true, publicado: true, mensaje: 'Listo: se subió a GitHub y Netlify lo publica en uno o dos minutos.', detalle: log.join('\n') };
  } catch (e) {
    return { ok: false, paso: 'subir', mensaje: 'El catálogo se armó, pero no se pudo subir a GitHub.', detalle: String(e.stderr || e.stdout || e.message) };
  }
}

// ---------- Servidor ----------
const PAGINA = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'panel-catalogo.html'), 'utf8');

function json(res, codigo, obj) {
  res.writeHead(codigo, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(obj));
}
function cuerpo(req) {
  return new Promise((ok, mal) => {
    let t = '';
    req.on('data', (c) => { t += c; if (t.length > 1e6) req.destroy(); });
    req.on('end', () => { try { ok(t ? JSON.parse(t) : {}); } catch (e) { mal(e); } });
  });
}

function crear(puerto) {
  const origen = `http://127.0.0.1:${puerto}`;
  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, origen);
      // Solo se acepta la propia página (evita que otro sitio abierto en el navegador le mande órdenes)
      if (req.headers.host !== `127.0.0.1:${puerto}` && req.headers.host !== `localhost:${puerto}`) { res.writeHead(403); return res.end('No permitido'); }
      if (req.method === 'POST' && req.headers['x-panel'] !== '1') { res.writeHead(403); return res.end('No permitido'); }

      if (req.method === 'GET' && url.pathname === '/') { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }); return res.end(PAGINA); }
      if (req.method === 'GET' && url.pathname === '/api/lista') return json(res, 200, lista());
      if (req.method === 'GET' && url.pathname.startsWith('/foto/')) {
        const id = decodeURIComponent(url.pathname.slice(6));
        const fila = leer().find((f) => idDe(f.codigo) === id);
        let archivo = null;
        const pub = path.join(REPO, 'assets', 'catalogo', id + '-frente-480.webp');
        if (fs.existsSync(pub)) archivo = pub;
        else if (fila) archivo = fotoDe(fila);
        if (!archivo) { res.writeHead(404); return res.end(); }
        res.writeHead(200, { 'Content-Type': TIPOS[path.extname(archivo).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'max-age=60' });
        return fs.createReadStream(archivo).pipe(res);
      }
      if (req.method === 'POST' && url.pathname === '/api/estado') {
        const { codigo, estado } = await cuerpo(req);
        if (!['disponible', 'agotado', 'oculto'].includes(estado)) return json(res, 400, { ok: false, mensaje: 'Estado no válido.' });
        const filas = leer();
        const fila = filas.find((f) => f.codigo === codigo);
        if (!fila) return json(res, 404, { ok: false, mensaje: 'No se encontró ese modelo en la planilla.' });
        fila.estado = estado;
        try { guardar(filas); }
        catch (e) { return json(res, 409, { ok: false, mensaje: 'No se pudo guardar la planilla. Si tenés productos.csv abierto en Excel, cerralo y probá de nuevo.' }); }
        return json(res, 200, { ok: true, ...lista() });
      }
      if (req.method === 'POST' && url.pathname === '/api/publicar') return json(res, 200, publicar());
      res.writeHead(404); res.end('No encontrado');
    } catch (e) {
      json(res, 500, { ok: false, mensaje: 'Error inesperado: ' + e.message });
    }
  });
}

function iniciar(puerto, intentos = 0) {
  const srv = crear(puerto);
  srv.on('error', (e) => { if (e.code === 'EADDRINUSE' && intentos < 20) iniciar(puerto + 1, intentos + 1); else { console.error('No se pudo iniciar el panel: ' + e.message); process.exit(1); } });
  srv.listen(puerto, '127.0.0.1', () => {
    const dir = `http://127.0.0.1:${puerto}/`;
    console.log('\n  Panel del catálogo listo en: ' + dir);
    console.log('  Datos: ' + DATOS);
    console.log('  (Solo funciona en esta computadora. Para cerrarlo, cerrá esta ventana.)\n');
    if (!args.includes('--no-abrir')) {
      if (process.platform === 'win32') execFile('cmd', ['/c', 'start', '', dir]);
      else if (process.platform === 'darwin') execFile('open', [dir]);
      else execFile('xdg-open', [dir]);
    }
  });
}

if (!fs.existsSync(CSV)) { console.error('No encuentro la planilla: ' + CSV); process.exit(1); }
iniciar(4173);
