// Lectura y escritura de la planilla de productos (productos.csv).
// Es tolerante con lo que hace Excel: filas guardadas como una sola celda, descripciones con comas sin comillas
// y columnas de fotos/estado que faltan. Al escribir, siempre deja el archivo en el formato correcto.

export const COLUMNAS = ['codigo', 'categoria', 'nombre_modelo', 'marca', 'para', 'forma', 'material', 'estilo', 'color', 'medidas', 'descripcion_corta', 'foto_frente', 'foto_costado', 'destacado', 'estado'];
const COLA = ['foto_frente', 'foto_costado', 'destacado', 'estado'];
const ESTADOS = ['disponible', 'agotado', 'oculto'];

const sinAcentos = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '');
const normalizarNombre = (h) => sinAcentos(h).toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

function partir(texto, sep) {
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
  return filas;
}

export function leerPlanilla(texto) {
  texto = texto.replace(/^﻿/, '');
  const primera = texto.split(/\r?\n/)[0] || '';
  const sep = (primera.match(/;/g) || []).length > (primera.match(/,/g) || []).length ? ';' : ',';
  const filas = partir(texto, sep).filter((f) => f.some((v) => v.trim() !== ''));
  if (!filas.length) return [];
  const [cab, ...resto] = filas;
  const nombres = cab.map(normalizarNombre);
  const di = nombres.indexOf('descripcion_corta');
  const colaEsperada = di >= 0 && COLA.every((n, k) => nombres[di + 1 + k] === n);

  return resto.map((f0) => {
    let f = f0;
    // Excel guardó toda la fila como una sola celda: se vuelve a separar
    if (f.length === 1 && f[0].includes(sep)) f = partir(f[0], sep)[0] || f;
    if (colaEsperada) {
      const n = f.length;
      const tieneCola = n >= di + 5 && ESTADOS.includes(String(f[n - 1]).trim().toLowerCase()) && ['si', 'sí', 'no'].includes(String(f[n - 2]).trim().toLowerCase());
      const desc = (tieneCola ? f.slice(di, n - 4) : f.slice(di)).join(',');
      const cola = tieneCola ? f.slice(n - 4) : ['', '', '', ''];
      f = [...f.slice(0, di), desc, ...cola];
    }
    return Object.fromEntries(nombres.map((nombre, i) => [nombre, String(f[i] ?? '').trim()]));
  });
}

const celda = (v) => {
  const s = String(v ?? '');
  return /[",\r\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};

export function escribirPlanilla(filas) {
  const lineas = [COLUMNAS.join(',')];
  for (const f of filas) lineas.push(COLUMNAS.map((c) => celda(f[c])).join(','));
  return '﻿' + lineas.join('\r\n') + '\r\n';
}
