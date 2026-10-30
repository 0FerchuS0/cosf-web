(function () {
  var dataEl = document.getElementById('catalogo-datos');
  if (!dataEl) return;

  var productos = JSON.parse(dataEl.textContent).productos;
  var porId = {};
  productos.forEach(function (p) { porId[p.id] = p; });

  var chips = Array.prototype.slice.call(document.querySelectorAll('.chip[data-cat]'));
  var secciones = Array.prototype.slice.call(document.querySelectorAll('.cat-section'));
  var tarjetas = Array.prototype.slice.call(document.querySelectorAll('.pcard'));
  var sinResultados = document.getElementById('cat-sin-resultados');
  var filtrosEl = document.getElementById('cat-filtros');
  var cat = 'todos';

  /* ----- Filtros: se arman solos con los datos que haya en la planilla ----- */
  function norm(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
  }
  function cap(s) { s = String(s || '').trim(); return s.charAt(0).toUpperCase() + s.slice(1); }

  var FACETAS = [
    { id: 'marca', nombre: 'Marca', valores: function (p) { return p.marca ? [p.marca] : []; } },
    { id: 'para', nombre: 'Para', valores: function (p) { return p.paraTexto ? [p.paraTexto] : []; } },
    { id: 'forma', nombre: 'Forma', valores: function (p) { return p.forma ? [p.forma] : []; } },
    { id: 'material', nombre: 'Material', valores: function (p) { return p.material ? [p.material] : []; } },
    { id: 'estilo', nombre: 'Estilo', valores: function (p) { return p.estilo ? p.estilo.split(',') : []; } }
  ];
  var sel = { marca: '', para: '', forma: '', material: '', estilo: '' };
  var consulta = '';

  productos.forEach(function (p) {
    p._texto = norm([p.nombre, p.marca, p.forma, p.material, p.estilo, p.color, p.paraTexto].join(' '));
    p._valores = {};
    FACETAS.forEach(function (f) {
      p._valores[f.id] = f.valores(p).map(function (v) { return norm(v); }).filter(Boolean);
    });
  });

  function coincideFacet(p, f, valor) {
    if (!valor) return true;
    if (f.id === 'para') {
      var k = norm(p.paraTexto);
      if (k === valor || !k) return true;
      return k === 'unisex' && (valor === 'mujer' || valor === 'hombre');
    }
    return p._valores[f.id].indexOf(valor) !== -1;
  }
  /* omitir: faceta que no se aplica (para contar sus opciones); 'cat' ignora la categoría */
  function coincide(p, omitir) {
    if (omitir !== 'cat' && cat !== 'todos' && p.cat !== cat) return false;
    for (var i = 0; i < FACETAS.length; i++) {
      var f = FACETAS[i];
      if (f.id !== omitir && !coincideFacet(p, f, sel[f.id])) return false;
    }
    if (consulta) {
      var palabras = consulta.split(' ');
      for (var j = 0; j < palabras.length; j++) if (p._texto.indexOf(palabras[j]) === -1) return false;
    }
    return true;
  }

  var ui = { selects: {}, opciones: {} };
  function armarFiltros() {
    if (!filtrosEl) return;
    var det = document.createElement('details');
    det.className = 'cat-filtros-det';
    det.open = true;
    var sum = document.createElement('summary');
    sum.innerHTML = '<span>Filtrar y buscar</span><span class="cat-activos" hidden></span>';
    sum.addEventListener('click', function (e) { e.preventDefault(); });
    det.appendChild(sum);
    var cuerpo = document.createElement('div');
    cuerpo.className = 'cat-filtros-cuerpo';

    var lb = document.createElement('label');
    lb.className = 'cat-buscar';
    lb.innerHTML = '<span>Buscar</span>';
    var inp = document.createElement('input');
    inp.type = 'search';
    inp.placeholder = 'Modelo, marca, forma…';
    inp.autocomplete = 'off';
    inp.addEventListener('input', function () { consulta = norm(inp.value); aplicar(); });
    lb.appendChild(inp);
    cuerpo.appendChild(lb);
    ui.buscador = inp;

    var grupo = document.createElement('div');
    grupo.className = 'cat-facetas';
    FACETAS.forEach(function (f) {
      var vistos = {}, lista = [];
      productos.forEach(function (p) {
        f.valores(p).forEach(function (raw) {
          var k = norm(raw);
          if (k && !vistos[k]) { vistos[k] = true; lista.push({ k: k, label: cap(raw) }); }
        });
      });
      if (lista.length < 2) return;
      lista.sort(function (a, b) { return a.label.localeCompare(b.label, 'es'); });
      var l = document.createElement('label');
      l.className = 'cat-faceta';
      var t = document.createElement('span');
      t.textContent = f.nombre;
      var s = document.createElement('select');
      s.setAttribute('data-faceta', f.id);
      var todos = document.createElement('option');
      todos.value = '';
      todos.textContent = 'Todas';
      s.appendChild(todos);
      ui.opciones[f.id] = [];
      lista.forEach(function (it) {
        var o = document.createElement('option');
        o.value = it.k;
        o.setAttribute('data-label', it.label);
        o.textContent = it.label;
        s.appendChild(o);
        ui.opciones[f.id].push(o);
      });
      s.addEventListener('change', function () { sel[f.id] = s.value; aplicar(); });
      l.appendChild(t);
      l.appendChild(s);
      grupo.appendChild(l);
      ui.selects[f.id] = s;
    });
    cuerpo.appendChild(grupo);

    var pie = document.createElement('div');
    pie.className = 'cat-resultado';
    var cont = document.createElement('p');
    cont.setAttribute('role', 'status');
    cont.setAttribute('aria-live', 'polite');
    var limpiar = document.createElement('button');
    limpiar.type = 'button';
    limpiar.className = 'cat-limpiar';
    limpiar.textContent = 'Limpiar filtros';
    limpiar.hidden = true;
    limpiar.addEventListener('click', function () {
      FACETAS.forEach(function (f) { sel[f.id] = ''; if (ui.selects[f.id]) ui.selects[f.id].value = ''; });
      consulta = '';
      if (ui.buscador) ui.buscador.value = '';
      aplicar();
    });
    pie.appendChild(cont);
    pie.appendChild(limpiar);
    cuerpo.appendChild(pie);
    det.appendChild(cuerpo);
    filtrosEl.appendChild(det);
    ui.contador = cont;
    ui.limpiar = limpiar;
    ui.activos = sum.querySelector('.cat-activos');
  }

  function aplicar() {
    var visibles = 0;
    var conteoCat = {};
    tarjetas.forEach(function (t) {
      var p = porId[t.dataset.id];
      var okSinCat = p ? coincide(p, 'cat') : true;
      if (okSinCat) conteoCat[t.dataset.cat] = (conteoCat[t.dataset.cat] || 0) + 1;
      var ok = p ? coincide(p) : true;
      t.hidden = !ok;
      if (ok) visibles++;
    });
    secciones.forEach(function (s) { s.hidden = !s.querySelector('.pcard:not([hidden])'); });

    var total = 0;
    chips.forEach(function (c) {
      if (c.dataset.cat !== 'todos') total += conteoCat[c.dataset.cat] || 0;
      c.setAttribute('aria-pressed', String(c.dataset.cat === cat));
    });
    chips.forEach(function (c) {
      c.querySelector('.n').textContent = String(c.dataset.cat === 'todos' ? total : (conteoCat[c.dataset.cat] || 0));
    });

    /* cuántos modelos hay con cada opción, respetando los demás filtros */
    FACETAS.forEach(function (f) {
      (ui.opciones[f.id] || []).forEach(function (o) {
        var n = 0;
        productos.forEach(function (p) {
          if (coincide(p, f.id) && coincideFacet(p, f, o.value)) n++;
        });
        o.textContent = o.getAttribute('data-label') + ' (' + n + ')';
        o.disabled = n === 0 && sel[f.id] !== o.value;
      });
    });

    var activos = FACETAS.filter(function (f) { return sel[f.id]; }).length + (consulta ? 1 : 0);
    if (ui.contador) ui.contador.textContent = visibles === 1 ? '1 modelo' : visibles + ' modelos';
    if (ui.limpiar) ui.limpiar.hidden = activos === 0;
    if (ui.activos) { ui.activos.hidden = activos === 0; ui.activos.textContent = activos ? String(activos) : ''; }
    if (sinResultados) sinResultados.hidden = visibles !== 0;
  }

  function elegirCategoria(valor, actualizarHash) {
    cat = valor;
    aplicar();
    if (actualizarHash && window.history && history.replaceState) {
      history.replaceState(null, '', valor === 'todos' ? location.pathname : '#' + valor);
    }
  }

  chips.forEach(function (c) {
    c.addEventListener('click', function () { elegirCategoria(c.dataset.cat, true); });
  });

  armarFiltros();
  var hash = location.hash.replace('#', '');
  if (hash && chips.some(function (c) { return c.dataset.cat === hash; })) cat = hash;
  aplicar();

  /* ----- Portada: pasa de un destacado a otro, con sus características en lista ----- */
  var stage = document.getElementById('cat-stage');
  var stageImg = document.getElementById('cat-stage-img');
  var stageFicha = document.getElementById('cat-stage-ficha');
  if (stage && stageImg && stageFicha) {
    /* Todos los modelos con sus características, en orden distinto en cada visita (el de la foto inicial va primero). */
    var lista = productos.filter(function (p) {
      return (p.cat === 'armazones' || p.cat === 'lentes-de-sol') && p.estado !== 'agotado' && p.fotos.length && (p.material || p.forma || p.estilo);
    });
    var inicial = stageImg.getAttribute('src');
    var primero = lista.filter(function (p) { return p.fotos[0].src === inicial; });
    var resto = lista.filter(function (p) { return p.fotos[0].src !== inicial; });
    for (var k = resto.length - 1; k > 0; k--) {
      var r = Math.floor(Math.random() * (k + 1));
      var tmp = resto[k]; resto[k] = resto[r]; resto[r] = tmp;
    }
    lista = primero.concat(resto).slice(0, 10);
    var idx = 0;
    var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    var ponerFicha = function (p) {
      stageFicha.textContent = '';
      var h = document.createElement('p');
      h.className = 'ficha-nombre';
      h.textContent = p.nombre;
      stageFicha.appendChild(h);
      var viejo = stage.querySelector('.stage-chars');
      if (viejo) stage.removeChild(viejo);
      var ul = document.createElement('ul');
      ul.className = 'stage-chars';
      [p.material, p.forma, p.estilo].filter(Boolean).forEach(function (w, i) {
        var li = document.createElement('li');
        li.textContent = w.charAt(0).toUpperCase() + w.slice(1);
        li.style.setProperty('--i', i);
        ul.appendChild(li);
      });
      stage.appendChild(ul);
    };
    var mostrarDestacado = function (i) {
      var p = lista[i];
      stageImg.src = p.fotos[0].src;
      stageImg.alt = p.nombre;
      ponerFicha(p);
    };
    if (lista.length) {
      idx = Math.max(0, lista.findIndex(function (p) { return p.fotos[0].src === stageImg.getAttribute('src'); }));
      ponerFicha(lista[idx]);
      if (lista.length > 1 && !reduce) {
        setInterval(function () {
          if (document.hidden) return;
          idx = (idx + 1) % lista.length;
          stage.classList.add('sale');
          setTimeout(function () { mostrarDestacado(idx); stage.classList.remove('sale'); }, 400);
        }, 9000);
      }
    }
  }

  /* ----- Ventana de producto ----- */
  var dlg = document.getElementById('pdialog');
  if (!dlg || typeof dlg.showModal !== 'function') return;

  var el = {
    img: document.getElementById('pd-img'),
    thumbs: document.getElementById('pd-thumbs'),
    marca: document.getElementById('pd-marca'),
    titulo: document.getElementById('pd-titulo'),
    desc: document.getElementById('pd-desc'),
    ficha: document.getElementById('pd-ficha'),
    wa: document.getElementById('pd-wa'),
    estado: document.getElementById('pd-estado'),
    prev: document.getElementById('pd-prev'),
    next: document.getElementById('pd-next'),
    cerrar: document.getElementById('pd-cerrar')
  };
  var actual = null;

  function evento(nombre, id) {
    if (typeof gtag === 'function') gtag('event', nombre, { event_category: 'catalogo', producto: id });
  }

  function mostrarFoto(p, i) {
    var f = p.fotos[i];
    el.img.src = f.src;
    el.img.alt = p.nombre + (p.fotos.length > 1 ? ' — ' + f.label : '');
    Array.prototype.forEach.call(el.thumbs.children, function (b, k) { b.setAttribute('aria-pressed', String(k === i)); });
  }

  function fila(nombre, valor) {
    if (!valor) return;
    var dt = document.createElement('dt');
    dt.textContent = nombre;
    var dd = document.createElement('dd');
    dd.textContent = valor;
    el.ficha.appendChild(dt);
    el.ficha.appendChild(dd);
  }

  function abrir(id) {
    var p = porId[id];
    if (!p) return;
    actual = id;
    el.marca.textContent = p.marca || '';
    el.titulo.textContent = p.nombre;
    el.desc.textContent = p.desc || '';
    el.desc.hidden = !p.desc;
    el.ficha.textContent = '';
    fila('Para', p.paraTexto);
    fila('Forma', p.forma);
    fila('Material', p.material);
    fila('Estilo', p.estilo);
    fila('Color', p.color);
    fila('Medidas', p.medidas);
    el.wa.href = p.wa;
    el.estado.hidden = p.estado !== 'agotado';
    el.thumbs.textContent = '';
    el.thumbs.hidden = p.fotos.length < 2;
    p.fotos.forEach(function (f, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', 'Ver foto: ' + f.label);
      var im = document.createElement('img');
      im.src = f.thumb;
      im.alt = '';
      b.appendChild(im);
      b.addEventListener('click', function () { mostrarFoto(p, i); });
      el.thumbs.appendChild(b);
    });
    mostrarFoto(p, 0);
    if (!dlg.open) dlg.showModal();
    dlg.scrollTop = 0;
    evento('catalogo_ver_producto', id);
  }

  function visibles() {
    return tarjetas.filter(function (t) { return !t.hidden; }).map(function (t) { return t.dataset.id; });
  }

  function mover(delta) {
    var ids = visibles();
    if (ids.length < 2) return;
    var i = ids.indexOf(actual);
    abrir(ids[(i + delta + ids.length) % ids.length]);
  }

  document.addEventListener('click', function (e) {
    var a = e.target.closest('[data-open]');
    if (a) { e.preventDefault(); abrir(a.dataset.open); return; }
    var w = e.target.closest('a[data-wa]');
    if (w) {
      evento('click_whatsapp', w.dataset.wa);
      if (typeof fbq === 'function') fbq('track', 'Contact');
    }
  });

  el.prev.addEventListener('click', function () { mover(-1); });
  el.next.addEventListener('click', function () { mover(1); });
  el.cerrar.addEventListener('click', function () { dlg.close(); });
  dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
  dlg.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft') mover(-1);
    if (e.key === 'ArrowRight') mover(1);
  });
})();
