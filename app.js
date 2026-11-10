/* =====================================================================
   AvatarSync · Interfaz natural de usuario (RA2 · 0488 Desarrollo de interfaces)
   ---------------------------------------------------------------------
   El personaje se controla SIN ratón ni teclado:
     · Cara  (MediaPipe Face Landmarker): giro, inclinación, ladeo, ojos y boca reales
     · Manos (MediaPipe Hand Landmarker): gestos (saludo, pulgar arriba, paz, puño)
     · Cuerpo (MediaPipe Pose Landmarker): brazos arriba y desplazamiento lateral
     · Voz   (Web Speech API): comandos hablados en español
     · Realidad aumentada: la cabeza del personaje se dibuja sobre tu cara en el vídeo
     · Extras: el personaje habla (síntesis de voz), cursor con la mano, minijuego AR,
       foto y grabación de vídeo
   ===================================================================== */

// ---------- Elementos de la página ----------
const $ = id => document.getElementById(id);
const video = $('video');
const capaAR = $('puntos');                 // lienzo encima del vídeo (realidad aumentada)
const ctxAR = capaAR.getContext('2d');
const lienzo = $('personaje');              // lienzo del personaje
const ctxP = lienzo.getContext('2d');
const estado = $('estado');
const datosTxt = $('datos');
const btn = $('btn');
const btnCal = $('btnCal');
const btnVoz = $('btnVoz');
const btnAR = $('btnAR');
const btnFoto = $('btnFoto');
const btnGrabar = $('btnGrabar');
const btnCursor = $('btnCursor');
const btnJuego = $('btnJuego');
const cursorMano = $('cursorMano');
const marcador = $('marcador');
const registro = $('registro');
const oidoTxt = $('oido');

// Capa intermedia donde se pinta SOLO el personaje (sin fondo ni efectos).
// Se reutiliza en el panel derecho y como máscara de realidad aumentada.
const pj = document.createElement('canvas');
pj.width = pj.height = 512;
const ctxPj = pj.getContext('2d');

// ---------- Archivos y constantes ----------
const ARCHIVO_CABEZAS = 'spritesheet_sin_fondo.png';
const ARCHIVO_HABLAR = 'hablar.png';
const ARCHIVO_OJOS = 'ojos_cerrados.png';
const COLS = 5, FILAS = 5;
const FILA_NUCA = 4;
const COL_HABLAR = 4;                       // 0 = cerrada, 1 = "a", 2 = "o", 3 = "i"
const SECUENCIA_VOZ = [1, 2, 3, 2];         // boca por micrófono (modo antiguo)
const MS_SIN_CARA = 1500;
const CAMBIO_BOCA_MS = 130;

const VISION_VER = '0.10.14';
const VISION_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VISION_VER}`;
const MODELOS = {
  cara: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
  manos: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
  cuerpo: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
};

const FONDOS = [
  { nombre: 'noche', radial: true, colores: ['#3a2a6b', '#120d26'] },
  { nombre: 'atardecer', colores: ['#ff7e5f', '#feb47b', '#3b1d4a'] },
  { nombre: 'neón', radial: true, colores: ['#ff00e5', '#5a0f8f', '#0b0221'] },
  { nombre: 'bosque', colores: ['#a8e6cf', '#3d8361', '#1c3d2b'] },
  { nombre: 'océano', radial: true, colores: ['#4fc3f7', '#01579b', '#002040'] },
  { nombre: 'croma', colores: ['#00b140'] },
];

// ---------- Ajustes (deslizadores y casillas) ----------
const cfg = {
  giro: 8, abajo: 10, arriba: 30, invertirV: true, zonaG: 0.03, zonaV: 0.03,
  voz: 0.002, bocaPorMicro: false, umbralBoca: 0.12,
  tamMascara: 2.4, altMascara: 0,
  ladeo: true, verPuntos: true, efectos: true,
};

// Los ajustes se guardan en el navegador (localStorage) y se recuperan al volver.
// Va dentro de try/catch porque en algunos modos (incógnito, file://) puede fallar.
const CLAVE_AJUSTES = 'avatarsync-ajustes';
const CLAVE_RECORD = 'avatarsync-record';
try { Object.assign(cfg, JSON.parse(localStorage.getItem(CLAVE_AJUSTES)) || {}); } catch (e) { /* sin ajustes guardados */ }
function guardarAjustes() {
  try { localStorage.setItem(CLAVE_AJUSTES, JSON.stringify(cfg)); } catch (e) { /* no se puede guardar */ }
}
$('btnReset').onclick = () => {
  try { localStorage.removeItem(CLAVE_AJUSTES); } catch (e) { /* nada */ }
  location.reload();
};

function enlazarRango(idInput, idValor, clave, decimales = 1) {
  const input = $(idInput), valor = $(idValor);
  input.value = cfg[clave];
  const pintarValor = () => { valor.textContent = (+cfg[clave]).toFixed(decimales); };
  input.oninput = () => { cfg[clave] = +input.value; pintarValor(); guardarAjustes(); };
  pintarValor();
}
function enlazarCasilla(idInput, clave) {
  const input = $(idInput);
  input.checked = cfg[clave];
  input.onchange = () => { cfg[clave] = input.checked; guardarAjustes(); };
}
enlazarRango('sG', 'vG', 'giro');
enlazarRango('sA', 'vA', 'abajo');
enlazarRango('sU', 'vU', 'arriba');
enlazarRango('sZG', 'vZG', 'zonaG', 3);
enlazarRango('sZV', 'vZV', 'zonaV', 3);
enlazarRango('sS', 'vS', 'voz', 4);
enlazarRango('sB', 'vB', 'umbralBoca', 2);
enlazarRango('sM', 'vM', 'tamMascara', 1);
enlazarRango('sMA', 'vMA', 'altMascara', 2);
enlazarCasilla('iV', 'invertirV');
enlazarCasilla('iMic', 'bocaPorMicro');
enlazarCasilla('iLadeo', 'ladeo');
enlazarCasilla('iPuntos', 'verPuntos');
enlazarCasilla('iEfectos', 'efectos');

// ---------- Utilidades ----------
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const clamp = (v, mn, mx) => Math.max(mn, Math.min(mx, v));
const suavizar = (actual, objetivo, k) => actual + (objetivo - actual) * k;
const quitarTildes = t => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function zonaMuerta(v, z) {
  if (Math.abs(v) < z) return 0;
  return v - Math.sign(v) * z;
}

function cargarImagen(src) {
  return new Promise((resolver, rechazar) => {
    const img = new Image();
    img.onload = () => resolver(img);
    img.onerror = () => rechazar(new Error('No encuentro ' + src + '. Revisa que esté en la misma carpeta.'));
    img.src = src;
  });
}

// Corta una hoja de sprites en celdas (cada celda es un canvas)
function trocear(img, columnas, filas) {
  const fw = img.width / columnas, fh = img.height / filas;
  const celdas = [];
  for (let f = 0; f < filas; f++) {
    celdas.push([]);
    for (let c = 0; c < columnas; c++) {
      const cv = document.createElement('canvas');
      cv.width = Math.round(fw);
      cv.height = Math.round(fh);
      const cx = cv.getContext('2d');
      cx.drawImage(img, c * fw, f * fh, fw, fh, 0, 0, cv.width, cv.height);
      // Borra un margen de 3 px: al recortar se colaba una línea de la celda vecina
      const m = 3;
      cx.clearRect(0, 0, cv.width, m);
      cx.clearRect(0, cv.height - m, cv.width, m);
      cx.clearRect(0, 0, m, cv.height);
      cx.clearRect(cv.width - m, 0, m, cv.height);
      celdas[f].push(cv);
    }
  }
  return celdas;
}

// Registro de eventos visible en la página (sirve para demostrar qué se ha detectado)
function anotar(icono, texto) {
  const li = document.createElement('li');
  const hora = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  li.innerHTML = `<span>${icono}</span><span>${texto}</span><small>${hora}</small>`;
  registro.prepend(li);
  while (registro.children.length > 12) registro.lastChild.remove();
}

// Barras de los medidores: normales (0..1) o con el cero en el centro (-1..1)
function medidor(id, v, centrado = false) {
  const barra = $(id).firstElementChild;
  if (centrado) {
    barra.style.left = `${50 + Math.min(v, 0) * 50}%`;
    barra.style.width = `${Math.abs(v) * 50}%`;
  } else {
    barra.style.width = `${clamp(v, 0, 1) * 100}%`;
  }
}

function marcarChip(id, activo, texto) {
  const chip = $(id);
  chip.classList.toggle('on', activo);
  if (texto !== undefined) chip.querySelector('b').textContent = texto;
}

/* =====================================================================
   1. CARA — medidas a partir de los 478 puntos de Face Landmarker
   ===================================================================== */
function medirGiro(lm) {                 // izquierda / derecha
  const cx = (lm[33].x + lm[263].x) / 2;
  return (lm[1].x - cx) / dist(lm[33], lm[263]);
}
function medirInclinacion(lm) {          // arriba / abajo
  const cy = (lm[33].y + lm[263].y) / 2;
  return (lm[1].y - cy) / dist(lm[10], lm[152]);
}
function medirLadeo(lm) {                // cabeza ladeada hacia un hombro (radianes)
  return Math.atan2(lm[263].y - lm[33].y, lm[263].x - lm[33].x);
}

// Convierte la lista de "blendshapes" (expresiones) en un objeto { nombre: valor 0..1 }
function leerExpresiones(res) {
  const lista = res.faceBlendshapes && res.faceBlendshapes[0];
  const e = {};
  if (lista) for (const c of lista.categories) e[c.categoryName] = c.score;
  return e;
}

/* =====================================================================
   2. MANOS — reconocimiento de gestos con los 21 puntos de cada mano
   ===================================================================== */
// Un dedo está estirado si la punta está más lejos de la muñeca que su articulación media
function dedosEstirados(m) {
  const muneca = m[0];
  const estirado = (punta, medio) => dist(m[punta], muneca) > dist(m[medio], muneca) * 1.12;
  return {
    pulgar: dist(m[4], m[17]) > dist(m[3], m[17]) * 1.08 && dist(m[4], m[5]) > dist(m[0], m[5]) * 0.35,
    indice: estirado(8, 6),
    corazon: estirado(12, 10),
    anular: estirado(16, 14),
    menique: estirado(20, 18),
  };
}

function reconocerGesto(m) {
  const d = dedosEstirados(m);
  const cuatro = [d.indice, d.corazon, d.anular, d.menique];
  const nEstirados = cuatro.filter(Boolean).length;
  if (nEstirados === 4 && d.pulgar) return 'saludo';
  if (d.indice && d.corazon && !d.anular && !d.menique) return 'paz';
  if (nEstirados === 0 && d.pulgar && m[4].y < m[5].y - 0.04 && m[4].y < m[0].y) return 'pulgar';
  if (nEstirados === 0 && !d.pulgar) return 'puno';
  return null;
}

const GESTOS = {
  saludo: { icono: '✋', texto: 'Saludo', accion: () => { decir('¡Hola!'); lanzarParticulas('estrella', 14); } },
  pulgar: { icono: '👍', texto: 'Pulgar arriba', accion: () => { textoImpacto('¡GENIAL!', '#ffd34d'); lanzarParticulas('brillo', 24); } },
  paz: { icono: '✌️', texto: 'Paz → cambiar fondo', accion: () => cambiarFondo() },
  puno: { icono: '✊', texto: 'Puño → golpe', accion: () => { textoImpacto('¡PUM!', '#ff4d6d'); temblor(350); } },
  guino: { icono: '😉', texto: 'Guiño', accion: () => lanzarParticulas('estrella', 10) },
  sonrisa: { icono: '😄', texto: 'Sonrisa', accion: () => lanzarParticulas('corazon', 12) },
  brazos: { icono: '🙌', texto: 'Brazos arriba → modo poder', accion: () => textoImpacto('¡PODER!', '#b388ff') },
};

// Un gesto solo cuenta si se mantiene varios fotogramas seguidos (evita falsos positivos)
// y después espera un rato antes de poder repetirse.
const FOTOGRAMAS_ESTABLES = 6;
const ESPERA_GESTO_MS = 1800;
const contadorGesto = {};
const ultimoGesto = {};
function evaluarGesto(nombre, presente, ahora) {
  contadorGesto[nombre] = presente ? (contadorGesto[nombre] || 0) + 1 : 0;
  if (contadorGesto[nombre] === FOTOGRAMAS_ESTABLES && ahora - (ultimoGesto[nombre] || 0) > ESPERA_GESTO_MS) {
    ultimoGesto[nombre] = ahora;
    const g = GESTOS[nombre];
    anotar(g.icono, g.texto);
    if (cfg.efectos) g.accion();
    return true;
  }
  return false;
}

/* =====================================================================
   3. VOZ — comandos hablados con la Web Speech API
   ===================================================================== */
const COMANDOS = [
  { palabras: ['calibrar', 'calibra'], texto: 'calibrar', accion: () => btnCal.click() },
  { palabras: ['mascara', 'realidad aumentada'], texto: 'máscara (realidad aumentada)', accion: () => alternarAR() },
  { palabras: ['fondo'], texto: 'cambiar fondo', accion: () => cambiarFondo() },
  { palabras: ['foto', 'captura'], texto: 'hacer foto', accion: () => hacerFoto() },
  { palabras: ['puntos', 'malla'], texto: 'mostrar / ocultar puntos', accion: () => alternarCasilla('iPuntos', 'verPuntos') },
  { palabras: ['efectos'], texto: 'activar / desactivar efectos', accion: () => alternarCasilla('iEfectos', 'efectos') },
  { palabras: ['grabar', 'grabacion'], texto: 'grabar / parar vídeo', accion: () => alternarGrabacion() },
  { palabras: ['juego', 'jugar'], texto: 'empezar el juego', accion: () => empezarJuego() },
  { palabras: ['parar', 'detener', 'stop'], texto: 'parar', accion: () => { if (grabador) pararGrabacion(); if (juego.activo) terminarJuego(); } },
  { palabras: ['cursor', 'control con la mano'], texto: 'cursor con la mano', accion: () => alternarCursor() },
  { palabras: ['quien eres', 'presentate'], texto: '¿quién eres?', accion: () => decir('Soy tu avatar. Me muevo con tu cara, tus manos, tu cuerpo y tu voz.') },
  { palabras: ['chiste'], texto: 'chiste', accion: () => decir(CHISTES[Math.floor(Math.random() * CHISTES.length)]) },
  { palabras: ['ayuda', 'que puedo decir'], texto: 'ayuda', accion: () => decir('Puedes decir: máscara, fondo, foto, grabar, juego, cursor, poder, brillos o chiste.') },
  { palabras: ['hola', 'saluda'], texto: 'hola', accion: () => decir('¡Hola, Diego! ¿Qué hacemos hoy?') },
  { palabras: ['poder', 'kamehameha', 'energia'], texto: 'poder', accion: () => { textoImpacto('¡PODER!', '#b388ff'); auraForzada = performance.now() + 2500; } },
  { palabras: ['brillos', 'magia'], texto: 'brillos', accion: () => lanzarParticulas('brillo', 30) },
];

const CHISTES = [
  '¿Por qué los ninjas nunca pierden al escondite? Porque nadie los encuentra.',
  'Mi entrenamiento es tan duro que hasta mi sombra ha pedido vacaciones.',
  'He gritado el nombre de mi ataque tan fuerte que el enemigo se ha ido a por palomitas.',
  'Tengo el pelo así de alborotado porque cada mañana lo peina un huracán.',
];

const Reconocimiento = window.SpeechRecognition || window.webkitSpeechRecognition;
let reconocedor = null;
let vozActiva = false;

function iniciarVoz() {
  if (!Reconocimiento) {
    anotar('⚠️', 'Este navegador no tiene reconocimiento de voz. Usa Chrome o Edge.');
    return;
  }
  reconocedor = new Reconocimiento();
  reconocedor.lang = 'es-ES';
  reconocedor.continuous = true;
  reconocedor.interimResults = false;

  reconocedor.onresult = ev => {
    // Mientras el personaje habla, se ignora lo que se oye (para que no se escuche a sí mismo)
    if (hablaPersonaje || performance.now() - finHabla < 700) return;
    const frase = ev.results[ev.results.length - 1][0].transcript.trim();
    oidoTxt.textContent = `«${frase}»`;
    ejecutarComando(frase, '🎤', 'Comando de voz');
  };
  reconocedor.onerror = ev => {
    if (ev.error === 'no-speech' || ev.error === 'aborted') return;
    const ayuda = ev.error === 'not-allowed'
      ? 'permiso de micrófono denegado (ábrelo con Live Server o desde GitHub Pages, no con doble clic)'
      : ev.error === 'network' ? 'sin conexión con el servicio de voz del navegador' : ev.error;
    anotar('⚠️', 'Voz: ' + ayuda);
    if (ev.error === 'not-allowed') pararVoz();
  };
  // El navegador corta la escucha cada cierto tiempo: si sigue activa, se reinicia sola
  reconocedor.onend = () => { if (vozActiva) try { reconocedor.start(); } catch (e) { /* ya estaba arrancado */ } };

  vozActiva = true;
  reconocedor.start();
  btnVoz.textContent = '🎤 Voz activada';
  btnVoz.classList.add('activo');
  marcarChip('chipVoz', true, 'escuchando');
  anotar('🎤', 'Reconocimiento de voz activado');
}

function pararVoz() {
  vozActiva = false;
  if (reconocedor) reconocedor.stop();
  btnVoz.textContent = '🎤 Activar voz';
  btnVoz.classList.remove('activo');
  marcarChip('chipVoz', false, 'apagada');
}
btnVoz.onclick = () => (vozActiva ? pararVoz() : iniciarVoz());

// Busca qué comando contiene la frase y lo ejecuta (lo usan la voz y los botones de la lista)
function ejecutarComando(frase, icono, origen) {
  const limpia = quitarTildes(frase);
  const cmd = COMANDOS.find(c => c.palabras.some(p => limpia.includes(p)));
  if (!cmd) return false;
  anotar(icono, `${origen}: <b>${cmd.texto}</b>`);
  cmd.accion();
  return true;
}
// Los botones de la lista de comandos permiten probarlos sin micrófono
document.querySelectorAll('[data-cmd]').forEach(boton => {
  boton.onclick = () => ejecutarComando(boton.dataset.cmd, '🖱️', 'Comando pulsado');
});

function alternarCasilla(id, clave) {
  cfg[clave] = !cfg[clave];
  $(id).checked = cfg[clave];
  guardarAjustes();
}

/* ---------- El personaje habla (síntesis de voz) ---------- */
let hablaPersonaje = false;
let finHabla = 0;
function decir(texto) {
  bocadillo(texto);
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const frase = new SpeechSynthesisUtterance(texto);
  frase.lang = 'es-ES';
  const vozEs = speechSynthesis.getVoices().find(v => v.lang.startsWith('es'));
  if (vozEs) frase.voice = vozEs;
  frase.rate = 1.05;
  frase.pitch = 1.1;
  frase.onstart = () => { hablaPersonaje = true; };
  frase.onend = frase.onerror = () => { hablaPersonaje = false; finHabla = performance.now(); };
  speechSynthesis.speak(frase);
}

/* =====================================================================
   4. EFECTOS VISUALES (partículas, textos de impacto, aura, temblor)
   ===================================================================== */
let particulas = [];
let textos = [];
let bocadilloActual = null;
let finTemblor = 0;
let aura = 0;               // 0..1, se enciende con los brazos arriba
let auraForzada = 0;        // momento hasta el que el aura se mantiene por comando de voz
let indiceFondo = 0;

function lanzarParticulas(tipo, n) {
  const colores = { brillo: ['#ffd34d', '#fff6c2', '#ffb300'], estrella: ['#7cf8ff', '#ffffff', '#b388ff'], corazon: ['#ff4d8d', '#ff8fb1'] };
  for (let i = 0; i < n; i++) {
    const ang = Math.random() * Math.PI * 2;
    const vel = 1.5 + Math.random() * 3.5;
    particulas.push({
      tipo, x: 256 + Math.cos(ang) * 60, y: 230 + Math.sin(ang) * 60,
      vx: Math.cos(ang) * vel, vy: Math.sin(ang) * vel - (tipo === 'corazon' ? 1.5 : 0),
      vida: 0, max: 50 + Math.random() * 40, tam: 6 + Math.random() * 10,
      color: colores[tipo][i % colores[tipo].length],
    });
  }
}

function textoImpacto(texto, color) {
  textos.push({ texto, color, t0: performance.now(), dur: 1100 });
}
function bocadillo(texto) {
  // Cuanto más largo el texto, más tiempo se queda en pantalla
  bocadilloActual = { texto, t0: performance.now(), dur: Math.max(1800, texto.length * 75) };
}
function temblor(ms) {
  finTemblor = performance.now() + ms;
}
function cambiarFondo() {
  indiceFondo = (indiceFondo + 1) % FONDOS.length;
  $('fondoTxt').textContent = FONDOS[indiceFondo].nombre;
  anotar('🎨', 'Fondo: ' + FONDOS[indiceFondo].nombre);
}
// El fondo se pinta DENTRO del canvas (no con CSS) para que salga también en las fotos y vídeos
function pintarFondo(c, w, h) {
  const f = FONDOS[indiceFondo];
  if (f.colores.length === 1) {
    c.fillStyle = f.colores[0];
  } else {
    const g = f.radial
      ? c.createRadialGradient(w / 2, h * 0.4, 0, w / 2, h * 0.4, w * 0.75)
      : c.createLinearGradient(0, 0, 0, h);
    f.colores.forEach((col, i) => g.addColorStop(i / (f.colores.length - 1), col));
    c.fillStyle = g;
  }
  c.fillRect(0, 0, w, h);
}

function trazarEstrella(c, x, y, r) {
  c.beginPath();
  for (let i = 0; i < 8; i++) {
    const rr = i % 2 === 0 ? r : r * 0.3;
    const a = (Math.PI / 4) * i - Math.PI / 2;
    c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  c.closePath();
  c.fill();
}
function trazarCorazon(c, x, y, r) {
  c.beginPath();
  c.moveTo(x, y + r * 0.35);
  c.bezierCurveTo(x - r, y - r * 0.5, x - r * 0.4, y - r * 1.1, x, y - r * 0.45);
  c.bezierCurveTo(x + r * 0.4, y - r * 1.1, x + r, y - r * 0.5, x, y + r * 0.35);
  c.fill();
}

function pintarAura(c, cx, cy, radio, intensidad, t) {
  if (intensidad < 0.02) return;
  const pulso = 1 + Math.sin(t / 120) * 0.06;
  const g = c.createRadialGradient(cx, cy, radio * 0.3, cx, cy, radio * pulso);
  g.addColorStop(0, `rgba(179, 136, 255, ${0.55 * intensidad})`);
  g.addColorStop(0.6, `rgba(124, 248, 255, ${0.25 * intensidad})`);
  g.addColorStop(1, 'rgba(124, 248, 255, 0)');
  c.fillStyle = g;
  c.beginPath();
  c.arc(cx, cy, radio * pulso, 0, Math.PI * 2);
  c.fill();
}

function pintarEfectos(c, ahora) {
  // Partículas
  particulas = particulas.filter(p => p.vida < p.max);
  for (const p of particulas) {
    p.vida++;
    p.x += p.vx; p.y += p.vy;
    p.vy += p.tipo === 'corazon' ? -0.02 : 0.05;
    c.globalAlpha = 1 - p.vida / p.max;
    c.fillStyle = p.color;
    if (p.tipo === 'corazon') trazarCorazon(c, p.x, p.y, p.tam);
    else trazarEstrella(c, p.x, p.y, p.tam);
  }
  c.globalAlpha = 1;

  // Textos de impacto estilo manga
  textos = textos.filter(t => ahora - t.t0 < t.dur);
  for (const t of textos) {
    const k = (ahora - t.t0) / t.dur;
    const escala = k < 0.15 ? 0.5 + (k / 0.15) * 0.7 : 1.2 - k * 0.2;
    c.save();
    c.globalAlpha = k > 0.75 ? (1 - k) / 0.25 : 1;
    c.translate(256, 90);
    c.rotate(-0.08);
    c.scale(escala, escala);
    c.font = '900 64px "Arial Black", Impact, sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.lineWidth = 10;
    c.strokeStyle = '#120d26';
    c.strokeText(t.texto, 0, 0);
    c.fillStyle = t.color;
    c.fillText(t.texto, 0, 0);
    c.restore();
  }

  // Bocadillo de diálogo
  if (bocadilloActual) {
    const k = (ahora - bocadilloActual.t0) / bocadilloActual.dur;
    if (k >= 1) bocadilloActual = null;
    else {
      c.save();
      c.globalAlpha = k > 0.8 ? (1 - k) / 0.2 : 1;
      c.font = '700 22px system-ui, sans-serif';
      // Parte el texto en líneas que quepan en el bocadillo
      const lineas = [];
      let linea = '';
      for (const palabra of bocadilloActual.texto.split(' ')) {
        const prueba = linea ? linea + ' ' + palabra : palabra;
        if (c.measureText(prueba).width > 300 && linea) { lineas.push(linea); linea = palabra; } else linea = prueba;
      }
      lineas.push(linea);
      const ancho = Math.max(...lineas.map(l => c.measureText(l).width)) + 36;
      const alto = lineas.length * 28 + 22;
      const cx = clamp(380, ancho / 2 + 10, 502 - ancho / 2);
      const x = cx - ancho / 2, y = 20;
      c.fillStyle = '#fff';
      c.beginPath();
      c.roundRect(x, y, ancho, alto, 18);
      c.moveTo(cx - 10, y + alto); c.lineTo(cx - 40, y + alto + 28); c.lineTo(cx + 15, y + alto);
      c.fill();
      c.fillStyle = '#120d26';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      lineas.forEach((l, i) => c.fillText(l, cx, y + 25 + i * 28));
      c.restore();
    }
  }
}

/* =====================================================================
   5. DETECCIÓN — Face, Hand y Pose Landmarker (MediaPipe Tasks Vision)
   ===================================================================== */
const det = { cara: null, manos: null, cuerpo: null };
const resultados = { cara: null, manos: null, cuerpo: null };

async function crearDetectores() {
  estado.textContent = 'Cargando los modelos de aprendizaje automático (cara, manos y cuerpo)...';
  // import() dinámico: funciona también si abres el index.html con doble clic
  const vision = await import(`${VISION_URL}/vision_bundle.mjs`);
  const { FilesetResolver, FaceLandmarker, HandLandmarker, PoseLandmarker } = vision;
  const archivos = await FilesetResolver.forVisionTasks(`${VISION_URL}/wasm`);

  // Intenta usar la tarjeta gráfica (GPU) y, si no se puede, el procesador (CPU)
  async function crear(Clase, modelo, extra) {
    for (const delegate of ['GPU', 'CPU']) {
      try {
        return await Clase.createFromOptions(archivos, {
          baseOptions: { modelAssetPath: modelo, delegate },
          runningMode: 'VIDEO',
          ...extra,
        });
      } catch (e) {
        if (delegate === 'CPU') throw e;
      }
    }
  }

  [det.cara, det.manos, det.cuerpo] = await Promise.all([
    crear(FaceLandmarker, MODELOS.cara, { numFaces: 1, outputFaceBlendshapes: true }),
    crear(HandLandmarker, MODELOS.manos, { numHands: 2 }),
    crear(PoseLandmarker, MODELOS.cuerpo, { numPoses: 1 }),
  ]);
  anotar('🧠', 'Modelos cargados: cara, manos y cuerpo');
}

// Bucle de detección: la cara en cada fotograma; manos y cuerpo, alternos (para ir fluido)
let ultimoTiempoVideo = -1;
let fotograma = 0;
let ultimaMarca = 0;
function cicloDeteccion() {
  if (det.cara && video.readyState >= 2 && video.currentTime !== ultimoTiempoVideo) {
    ultimoTiempoVideo = video.currentTime;
    const marca = Math.max(performance.now(), ultimaMarca + 1);   // debe crecer siempre
    ultimaMarca = marca;
    try {
      resultados.cara = det.cara.detectForVideo(video, marca);
      // En el juego y con el cursor las manos importan más: se miran en cada fotograma
      const manosPrioridad = juego.activo || modoCursor;
      if (manosPrioridad) {
        resultados.manos = det.manos.detectForVideo(video, marca);
        if (fotograma % 3 === 0) resultados.cuerpo = det.cuerpo.detectForVideo(video, marca);
      } else if (fotograma % 2 === 0) resultados.manos = det.manos.detectForVideo(video, marca);
      else resultados.cuerpo = det.cuerpo.detectForVideo(video, marca);
      fotograma++;
      contarFps(marca);
      procesarResultados(marca);
    } catch (e) {
      console.warn('Error de detección:', e);
    }
  }
  requestAnimationFrame(cicloDeteccion);
}

// Detecciones por segundo (fps): cuántas veces por segundo se analiza la cámara
let fps = 0, cuentaFps = 0, inicioFps = 0;
function contarFps(ahora) {
  cuentaFps++;
  if (ahora - inicioFps >= 1000) {
    fps = Math.round(cuentaFps * 1000 / (ahora - inicioFps));
    $('fpsTxt').textContent = `${fps} det/s`;
    cuentaFps = 0;
    inicioFps = ahora;
  }
}

/* =====================================================================
   6. ESTADO DEL PERSONAJE (lo que se calcula a partir de las detecciones)
   ===================================================================== */
let base = { yaw: 0, pitch: 0, ladeo: 0, centroX: 0.5 };
let cal = null;
const sm = { yaw: 0, pitch: 0, ladeo: 0, ojos: 0, desplX: 0, escala: 1 };
let ultimaVez = 0;
let boca = { frame: 0, alpha: 0 };
let cara = null;              // último conjunto de puntos de la cara
let manos = [];               // puntos de cada mano detectada
let cuerpo = null;            // puntos del cuerpo
let expr = {};

btnCal.onclick = () => {
  cal = { t0: performance.now(), yaw: 0, pitch: 0, ladeo: 0, centroX: 0, nCentro: 0, n: 0 };
  estado.textContent = 'Calibrando: mírate de frente...';
};

function procesarResultados(ahora) {
  // ----- Cara -----
  const rc = resultados.cara;
  cara = rc && rc.faceLandmarks && rc.faceLandmarks[0] ? rc.faceLandmarks[0] : null;
  marcarChip('chipCara', !!cara, cara ? 'detectada' : 'no');

  // ----- Manos -----
  const rm = resultados.manos;
  manos = rm && rm.landmarks ? rm.landmarks : [];
  const gestosVistos = manos.map(reconocerGesto);
  marcarChip('chipManos', manos.length > 0, manos.length ? `${manos.length} · ${gestosVistos.filter(Boolean).join(', ') || 'sin gesto'}` : '0');
  // Con el cursor o en el juego, las manos se usan para eso: los gestos se desactivan
  const manosLibres = !modoCursor && !juego.activo;
  for (const g of ['saludo', 'pulgar', 'paz', 'puno']) evaluarGesto(g, manosLibres && gestosVistos.includes(g), ahora);
  actualizarCursor(manos[0] || null);

  // ----- Cuerpo -----
  const rp = resultados.cuerpo;
  cuerpo = rp && rp.landmarks && rp.landmarks[0] ? rp.landmarks[0] : null;
  let brazosArriba = false;
  if (cuerpo) {
    const nariz = cuerpo[0], hI = cuerpo[11], hD = cuerpo[12], mI = cuerpo[15], mD = cuerpo[16];
    const visibles = [mI, mD].every(p => (p.visibility ?? 1) > 0.5);
    brazosArriba = visibles && mI.y < nariz.y && mD.y < nariz.y;
    const centroX = (hI.x + hD.x) / 2;
    if (cal) { cal.centroX += centroX; cal.nCentro++; }
    // El vídeo se ve en espejo: si te mueves a tu derecha, x baja → el personaje va a la derecha
    sm.desplX = suavizar(sm.desplX, clamp(-(centroX - base.centroX) * 2.2, -1, 1), 0.2);
  }
  marcarChip('chipCuerpo', !!cuerpo, cuerpo ? (brazosArriba ? 'brazos arriba' : 'detectado') : 'no');
  evaluarGesto('brazos', brazosArriba, ahora);
  const auraObjetivo = brazosArriba || ahora < auraForzada ? 1 : 0;
  aura = suavizar(aura, auraObjetivo, 0.08);

  if (!cara) return;
  ultimaVez = ahora;

  const yaw = medirGiro(cara);
  const pitch = medirInclinacion(cara);
  const ladeo = medirLadeo(cara);
  expr = leerExpresiones(rc);

  if (cal) {
    cal.yaw += yaw; cal.pitch += pitch; cal.ladeo += ladeo; cal.n++;
    if (ahora - cal.t0 > 2000 && cal.n > 0) {
      base = {
        yaw: cal.yaw / cal.n, pitch: cal.pitch / cal.n, ladeo: cal.ladeo / cal.n,
        centroX: cal.nCentro ? cal.centroX / cal.nCentro : 0.5,
      };
      cal = null;
      anotar('🎯', 'Calibrado');
    }
    return;
  }

  sm.yaw = suavizar(sm.yaw, yaw - base.yaw, 0.25);
  sm.pitch = suavizar(sm.pitch, pitch - base.pitch, 0.25);
  sm.ladeo = suavizar(sm.ladeo, clamp(ladeo - base.ladeo, -0.5, 0.5), 0.25);

  // ----- Ojos reales (blendshapes eyeBlinkLeft / eyeBlinkRight) -----
  const ojoI = expr.eyeBlinkLeft || 0, ojoD = expr.eyeBlinkRight || 0;
  sm.ojos = suavizar(sm.ojos, clamp((Math.max(ojoI, ojoD) - 0.35) / 0.3, 0, 1), 0.5);
  evaluarGesto('guino', Math.abs(ojoI - ojoD) > 0.4 && Math.max(ojoI, ojoD) > 0.6, ahora);

  // ----- Boca real (jawOpen, mouthPucker, mouthSmile...) -----
  const abierta = expr.jawOpen || 0;
  const morritos = Math.max(expr.mouthPucker || 0, expr.mouthFunnel || 0);
  const sonrisa = ((expr.mouthSmileLeft || 0) + (expr.mouthSmileRight || 0)) / 2;
  if (abierta < cfg.umbralBoca && morritos < 0.5) boca = { frame: 0, alpha: 0 };
  else if (morritos > 0.45) boca = { frame: 2, alpha: 1 };              // "o"
  else if (sonrisa > 0.4 || abierta < cfg.umbralBoca * 2) boca = { frame: 3, alpha: 1 }; // "i"
  else boca = { frame: 1, alpha: 1 };                                    // "a"
  evaluarGesto('sonrisa', sonrisa > 0.7 && abierta < 0.3, ahora);

  medidor('mGiro', clamp(-sm.yaw * 4, -1, 1), true);
  medidor('mInclinacion', clamp(sm.pitch * 6, -1, 1), true);
  medidor('mLadeo', clamp(-sm.ladeo * 2.5, -1, 1), true);
  medidor('mOjoI', ojoI);
  medidor('mOjoD', ojoD);
  medidor('mBoca', abierta);
  medidor('mSonrisa', sonrisa);

  datosTxt.textContent =
    `giro ${sm.yaw.toFixed(2)} · arriba/abajo ${sm.pitch.toFixed(2)} · ladeo ${(sm.ladeo * 57.3).toFixed(0)}° · ` +
    `ojos ${ojoI.toFixed(2)}/${ojoD.toFixed(2)} · boca ${abierta.toFixed(2)} · sonrisa ${sonrisa.toFixed(2)} · ${fps} detecciones/s`;
}

/* =====================================================================
   7. MICRÓFONO (volumen) — modo opcional para mover la boca al hablar
   ===================================================================== */
let audioCtx = null, analizador = null, buf = null;
let nivel = 0, hablando = false, microOk = false;
let idxBocaVoz = 0, tBocaVoz = 0;

function prepararAudio() {
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  audioCtx.resume();
}
function conectarMicro(stream) {
  const src = audioCtx.createMediaStreamSource(stream);
  analizador = audioCtx.createAnalyser();
  analizador.fftSize = 1024;
  src.connect(analizador);
  buf = new Float32Array(1024);
  microOk = true;
}
function leerVolumen() {
  if (!analizador) return;
  analizador.getFloatTimeDomainData(buf);
  let s = 0;
  for (const v of buf) s += v * v;
  nivel = Math.sqrt(s / buf.length);
  hablando = nivel > cfg.voz;
}

/* =====================================================================
   8. DIBUJO DEL PERSONAJE
   ===================================================================== */
let CAB = null, HAB = null, OJOS = null;

function celda(f, c, alpha) {
  if (alpha < 0.01) return;
  ctxPj.globalAlpha = alpha;
  ctxPj.drawImage(CAB[f][c], 0, 0, pj.width, pj.height);
}

// Pinta el personaje (sin fondo) en la capa "pj". Devuelve cuánto mira de frente (0..1).
function pintarPersonaje(ahora) {
  ctxPj.setTransform(1, 0, 0, 1, 0, 0);
  ctxPj.clearRect(0, 0, pj.width, pj.height);

  const yawE = zonaMuerta(sm.yaw, cfg.zonaG);
  const pitchE = zonaMuerta(sm.pitch, cfg.zonaV);
  const sensV = pitchE > 0 ? cfg.arriba : cfg.abajo;
  const colPos = clamp(2 - yawE * cfg.giro, 0, 4);
  const filaPos = clamp(2 - (cfg.invertirV ? -1 : 1) * pitchE * sensV, 0, 3);
  const sinCara = ultimaVez && ahora - ultimaVez > MS_SIN_CARA;
  const deFrente = clamp(1 - Math.abs(colPos - 2) / 1.5, 0, 1) * clamp(1 - Math.abs(filaPos - 2) / 1.5, 0, 1);

  if (sinCara) {
    // Si no te ve, el personaje se da la vuelta (fila de la nuca)
    celda(FILA_NUCA, clamp(Math.round(colPos), 0, 4), 1);
    ctxPj.globalAlpha = 1;
    return 0;
  }

  // Mezcla las 4 celdas más cercanas para que el giro sea suave
  const f0 = Math.floor(filaPos), c0 = Math.floor(colPos);
  const tf = filaPos - f0, tc = colPos - c0;
  const f1 = Math.min(f0 + 1, 3), c1 = Math.min(c0 + 1, 4);
  celda(f0, c0, (1 - tf) * (1 - tc));
  celda(f0, c1, (1 - tf) * tc);
  celda(f1, c0, tf * (1 - tc));
  celda(f1, c1, tf * tc);

  // Boca: por defecto la mueve tu boca real; opcionalmente, el volumen del micro.
  // Va ANTES que los ojos: cada imagen de hablar.png es la cara entera (con los ojos abiertos)
  // y, si se pintara después, taparía el parpadeo.
  // Cuando el personaje habla (síntesis de voz) o, en modo micro, cuando hablas tú,
  // la boca va alternando "a", "o", "i".
  if (hablaPersonaje || cfg.bocaPorMicro) {
    if (hablaPersonaje || hablando) {
      if (ahora - tBocaVoz > CAMBIO_BOCA_MS) { idxBocaVoz = (idxBocaVoz + 1) % SECUENCIA_VOZ.length; tBocaVoz = ahora; }
      ctxPj.globalAlpha = deFrente;
      ctxPj.drawImage(HAB[0][SECUENCIA_VOZ[idxBocaVoz]], 0, 0, pj.width, pj.height);
    }
  } else if (boca.alpha > 0) {
    ctxPj.globalAlpha = deFrente * boca.alpha;
    ctxPj.drawImage(HAB[0][boca.frame], 0, 0, pj.width, pj.height);
  }

  // Ojos: se cierran cuando TÚ los cierras (solo en la vista de frente, que es la que tiene el dibujo)
  const cerrados = sm.ojos * deFrente;
  if (cerrados > 0.01) {
    ctxPj.globalAlpha = cerrados;
    ctxPj.drawImage(OJOS, 0, 0, pj.width, pj.height);
  }
  ctxPj.globalAlpha = 1;
  return deFrente;
}

// Panel derecho: aura + personaje (con ladeo, desplazamiento y temblor) + efectos
function pintarPanel(ahora) {
  ctxP.setTransform(1, 0, 0, 1, 0, 0);
  pintarFondo(ctxP, lienzo.width, lienzo.height);

  let tx = sm.desplX * 120, ty = 0;
  if (ahora < finTemblor) { tx += (Math.random() - 0.5) * 18; ty += (Math.random() - 0.5) * 18; }

  pintarAura(ctxP, 256 + tx, 260 + ty, 250, aura, ahora);

  ctxP.save();
  ctxP.translate(256 + tx, 256 + ty);
  if (cfg.ladeo) ctxP.rotate(-sm.ladeo);     // la vista es de espejo, por eso el signo
  ctxP.drawImage(pj, -256, -256, 512, 512);
  ctxP.restore();

  if (cfg.efectos) pintarEfectos(ctxP, ahora);
}

/* =====================================================================
   9. REALIDAD AUMENTADA — capa encima del vídeo de la cámara
   ===================================================================== */
let modoAR = false;
function alternarAR() {
  modoAR = !modoAR;
  btnAR.textContent = modoAR ? '🎭 Quitar máscara AR' : '🎭 Máscara AR';
  btnAR.classList.toggle('activo', modoAR);
  marcarChip('chipAR', modoAR, modoAR ? 'activa' : 'apagada');
  anotar('🎭', modoAR ? 'Realidad aumentada activada' : 'Realidad aumentada desactivada');
}
btnAR.onclick = alternarAR;

const CONEXIONES_MANO = [[0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16], [13, 17], [17, 18], [18, 19], [19, 20], [0, 17]];
const CONEXIONES_CUERPO = [[11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [11, 23], [12, 24], [23, 24]];

function pintarLineas(c, puntos, conexiones, color, w, h) {
  c.strokeStyle = color;
  c.lineWidth = 3;
  c.beginPath();
  for (const [a, b] of conexiones) {
    if (!puntos[a] || !puntos[b]) continue;
    c.moveTo(puntos[a].x * w, puntos[a].y * h);
    c.lineTo(puntos[b].x * w, puntos[b].y * h);
  }
  c.stroke();
}

function pintarCapaAR(ahora) {
  const w = video.videoWidth, h = video.videoHeight;
  if (!w) return;
  if (capaAR.width !== w) capaAR.width = w;
  if (capaAR.height !== h) capaAR.height = h;
  ctxAR.setTransform(1, 0, 0, 1, 0, 0);
  ctxAR.clearRect(0, 0, w, h);

  // Puntos de la cara, esqueleto de las manos y del cuerpo
  if (cfg.verPuntos) {
    if (cara && !modoAR) {
      ctxAR.fillStyle = 'rgba(0, 255, 200, 0.85)';
      for (const p of cara) ctxAR.fillRect(p.x * w - 1, p.y * h - 1, 2, 2);
    }
    if (cuerpo) pintarLineas(ctxAR, cuerpo, CONEXIONES_CUERPO, 'rgba(179, 136, 255, 0.9)', w, h);
    for (const m of manos) {
      pintarLineas(ctxAR, m, CONEXIONES_MANO, 'rgba(255, 211, 77, 0.95)', w, h);
      ctxAR.fillStyle = '#fff';
      for (const p of m) { ctxAR.beginPath(); ctxAR.arc(p.x * w, p.y * h, 3, 0, Math.PI * 2); ctxAR.fill(); }
    }
  }

  // Máscara: la cabeza del personaje sigue tu cara (posición, tamaño y ladeo)
  if (modoAR && cara && ahora - ultimaVez < MS_SIN_CARA) {
    const ojoI = cara[33], ojoD = cara[263];
    const cx = ((ojoI.x + ojoD.x) / 2) * w;
    const cy = ((ojoI.y + ojoD.y) / 2) * h;
    const anchoCara = dist({ x: cara[234].x * w, y: cara[234].y * h }, { x: cara[454].x * w, y: cara[454].y * h });
    const tam = anchoCara * cfg.tamMascara;
    const ang = Math.atan2((ojoD.y - ojoI.y) * h, (ojoD.x - ojoI.x) * w);

    pintarAura(ctxAR, cx, cy, tam * 0.7, aura, ahora);
    ctxAR.save();
    ctxAR.translate(cx, cy + cfg.altMascara * tam);
    ctxAR.rotate(ang);
    ctxAR.scale(-1, 1);     // el vídeo se muestra en espejo: así el personaje no sale al revés
    ctxAR.drawImage(pj, -tam / 2, -tam / 2, tam, tam);
    ctxAR.restore();
  }

  pintarJuego(ctxAR, w, h);
}

/* =====================================================================
   10. FOTO Y VÍDEO — captura y grabación de la vista con realidad aumentada
   ===================================================================== */
// Junta en un solo canvas el vídeo (en espejo, como en pantalla), la capa AR,
// el marcador del juego y el personaje a la derecha.
function componer(c, w, h) {
  c.save();
  c.translate(w, 0);
  c.scale(-1, 1);
  c.drawImage(video, 0, 0, w, h);
  c.drawImage(capaAR, 0, 0, w, h);
  c.restore();
  if (juego.activo) {
    c.font = '700 24px system-ui, sans-serif';
    c.fillStyle = 'rgba(16, 12, 34, 0.75)';
    c.fillRect(10, 10, 330, 40);
    c.fillStyle = '#ffd34d';
    c.fillText(marcador.textContent, 20, 38);
  }
  c.drawImage(lienzo, w, 0, h, h);
}

function hacerFoto() {
  const w = video.videoWidth, h = video.videoHeight;
  if (!w) { anotar('⚠️', 'Primero inicia la cámara'); return; }
  const foto = document.createElement('canvas');
  foto.width = w + h;   // vídeo + personaje cuadrado al lado
  foto.height = h;
  componer(foto.getContext('2d'), w, h);
  try {
    const enlace = document.createElement('a');
    enlace.download = `avatarsync-${Date.now()}.png`;
    enlace.href = foto.toDataURL('image/png');
    enlace.click();
    anotar('📸', 'Foto guardada');
  } catch (e) {
    // Con doble clic (file://) el navegador no deja exportar imágenes locales
    anotar('⚠️', 'No se pudo guardar la foto: abre la página con Live Server o desde GitHub Pages');
  }
}
btnFoto.onclick = hacerFoto;

// Grabación de vídeo con MediaRecorder: graba el canvas compuesto y el sonido del micro
let grabador = null;
let trozos = [];
let lienzoGrab = null;
let inicioGrab = 0;

function empezarGrabacion() {
  const w = video.videoWidth, h = video.videoHeight;
  if (!w) { anotar('⚠️', 'Primero inicia la cámara'); return; }
  lienzoGrab = document.createElement('canvas');
  lienzoGrab.width = w + h;
  lienzoGrab.height = h;
  componer(lienzoGrab.getContext('2d'), w, h);
  try {
    const flujo = lienzoGrab.captureStream(30);
    for (const pista of video.srcObject.getAudioTracks()) flujo.addTrack(pista);
    const tipo = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']
      .find(t => window.MediaRecorder && MediaRecorder.isTypeSupported(t));
    grabador = new MediaRecorder(flujo, tipo ? { mimeType: tipo } : {});
  } catch (e) {
    grabador = null;
    anotar('⚠️', 'No se puede grabar: abre la página con Live Server o desde GitHub Pages');
    return;
  }
  trozos = [];
  grabador.ondataavailable = ev => { if (ev.data.size) trozos.push(ev.data); };
  grabador.onstop = () => {
    const blob = new Blob(trozos, { type: 'video/webm' });
    const enlace = document.createElement('a');
    enlace.download = `avatarsync-${Date.now()}.webm`;
    enlace.href = URL.createObjectURL(blob);
    enlace.click();
    setTimeout(() => URL.revokeObjectURL(enlace.href), 5000);
    anotar('🎬', `Vídeo guardado (${Math.round((performance.now() - inicioGrab) / 1000)} s)`);
  };
  grabador.start(1000);
  inicioGrab = performance.now();
  btnGrabar.textContent = '⏹ Parar grabación';
  btnGrabar.classList.add('grabando');
  anotar('⏺', 'Grabando vídeo...');
}

function pararGrabacion() {
  if (!grabador) return;
  grabador.stop();
  grabador = null;
  btnGrabar.textContent = '⏺ Grabar';
  btnGrabar.classList.remove('grabando');
}
function alternarGrabacion() { grabador ? pararGrabacion() : empezarGrabacion(); }
btnGrabar.onclick = alternarGrabacion;

/* =====================================================================
   12. CURSOR CON LA MANO — manejar la página sin ratón
   ---------------------------------------------------------------------
   La punta del dedo índice mueve un cursor por la pantalla.
   Juntar el pulgar y el índice (pellizco) hace clic; manteniéndolo
   sobre un deslizador, lo arrastra.
   ===================================================================== */
let modoCursor = false;
const cursor = { x: innerWidth / 2, y: innerHeight / 2, pulsado: false, deslizador: null, sobre: null };

function alternarCursor() {
  modoCursor = !modoCursor;
  btnCursor.classList.toggle('activo', modoCursor);
  btnCursor.textContent = modoCursor ? '👆 Quitar cursor' : '👆 Cursor con la mano';
  cursorMano.hidden = true;
  if (!modoCursor) soltarCursor();
  anotar('👆', modoCursor ? 'Cursor con la mano activado: pellizca (pulgar + índice) para hacer clic' : 'Cursor con la mano desactivado');
}
btnCursor.onclick = alternarCursor;

function soltarCursor() {
  cursor.pulsado = false;
  cursor.deslizador = null;
  cursorMano.classList.remove('pulsado');
  if (cursor.sobre) cursor.sobre.classList.remove('sobre-mano');
  cursor.sobre = null;
}

function actualizarCursor(m) {
  if (!modoCursor) return;
  if (!m) { cursorMano.hidden = true; soltarCursor(); return; }
  cursorMano.hidden = false;

  // La zona central de la cámara se estira a toda la ventana (así no hay que llegar a los bordes).
  // x se invierte porque la cámara se ve en espejo.
  const punta = m[8];
  const nx = clamp(((1 - punta.x) - 0.2) / 0.6, 0, 1);
  const ny = clamp((punta.y - 0.15) / 0.55, 0, 1);
  cursor.x = suavizar(cursor.x, nx * innerWidth, 0.35);
  cursor.y = suavizar(cursor.y, ny * innerHeight, 0.35);
  cursorMano.style.transform = `translate(${cursor.x}px, ${cursor.y}px)`;

  // Qué control hay debajo del cursor
  const debajo = document.elementFromPoint(cursor.x, cursor.y);
  const control = debajo && debajo.closest('button, input[type=range], label.casilla');
  if (control !== cursor.sobre) {
    if (cursor.sobre) cursor.sobre.classList.remove('sobre-mano');
    if (control) control.classList.add('sobre-mano');
    cursor.sobre = control;
  }

  // Pellizco con histéresis: se activa por debajo de 0.33 y se suelta por encima de 0.5
  const pellizco = dist(m[4], m[8]) / dist(m[0], m[5]);
  if (!cursor.pulsado && pellizco < 0.33) {
    cursor.pulsado = true;
    cursorMano.classList.add('pulsado');
    pulsarControl(control);
  } else if (cursor.pulsado && pellizco > 0.5) {
    cursor.pulsado = false;
    cursor.deslizador = null;
    cursorMano.classList.remove('pulsado');
  }
  if (cursor.pulsado && cursor.deslizador) moverDeslizador(cursor.deslizador, cursor.x);
}

function pulsarControl(control) {
  if (!control || control.disabled) return;
  if (control.matches('input[type=range]')) { cursor.deslizador = control; return; }
  control.click();
  const nombre = control.textContent.trim().replace(/\s+/g, ' ').slice(0, 40) || 'control';
  anotar('👆', 'Clic con la mano: ' + nombre);
}

function moverDeslizador(rango, x) {
  const r = rango.getBoundingClientRect();
  const t = clamp((x - r.left) / r.width, 0, 1);
  const min = +rango.min, max = +rango.max, paso = +rango.step || 1;
  rango.value = min + Math.round((t * (max - min)) / paso) * paso;
  rango.dispatchEvent(new Event('input'));
}

/* =====================================================================
   13. MINIJUEGO DE REALIDAD AUMENTADA — atrapa las estrellas
   ---------------------------------------------------------------------
   Caen estrellas y bombas sobre el vídeo de la cámara. Se atrapan
   tocándolas con las puntas de los dedos. 30 segundos.
   ===================================================================== */
const DURACION_JUEGO = 30000;
const PUNTAS_DEDOS = [4, 8, 12, 16, 20];
const juego = { activo: false, fin: 0, puntos: 0, objetos: [], ultimoObjeto: 0, ultimoPaso: 0, destellos: [] };
let record = 0;
try { record = +(localStorage.getItem(CLAVE_RECORD) || 0); } catch (e) { /* sin récord */ }

function empezarJuego() {
  if (!video.srcObject) { anotar('⚠️', 'Primero inicia la cámara'); return; }
  if (juego.activo) return;
  Object.assign(juego, { activo: true, fin: performance.now() + DURACION_JUEGO, puntos: 0, objetos: [], destellos: [], ultimoPaso: performance.now() });
  marcador.hidden = false;
  btnJuego.classList.add('activo');
  anotar('⭐', 'Juego empezado');
  decir('¡Atrapa las estrellas con las manos! Cuidado con las bombas.');
}

function terminarJuego() {
  juego.activo = false;
  juego.objetos = [];
  marcador.hidden = true;
  btnJuego.classList.remove('activo');
  const nuevoRecord = juego.puntos > record;
  if (nuevoRecord) {
    record = juego.puntos;
    try { localStorage.setItem(CLAVE_RECORD, String(record)); } catch (e) { /* no se guarda */ }
  }
  textoImpacto(`¡${juego.puntos}!`, '#ffd34d');
  lanzarParticulas('brillo', 30);
  decir(`¡Has atrapado ${juego.puntos} estrellas!${nuevoRecord ? ' ¡Nuevo récord!' : ''}`);
  anotar('🏁', `Juego terminado: ${juego.puntos} puntos${nuevoRecord ? ' (nuevo récord)' : ''}`);
}
btnJuego.onclick = () => (juego.activo ? terminarJuego() : empezarJuego());

// Pitido sencillo con la Web Audio API
function sonido(tipo) {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const vol = audioCtx.createGain();
  const t = audioCtx.currentTime;
  osc.type = tipo === 'bomba' ? 'sawtooth' : 'triangle';
  osc.frequency.setValueAtTime(tipo === 'bomba' ? 180 : 880, t);
  osc.frequency.exponentialRampToValueAtTime(tipo === 'bomba' ? 60 : 1760, t + 0.15);
  vol.gain.setValueAtTime(0.15, t);
  vol.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
  osc.connect(vol).connect(audioCtx.destination);
  osc.start(t);
  osc.stop(t + 0.25);
}

function actualizarJuego(ahora) {
  if (!juego.activo) return;
  if (ahora >= juego.fin) { terminarJuego(); return; }
  const w = video.videoWidth || 640, h = video.videoHeight || 480;
  const dt = Math.min(50, ahora - juego.ultimoPaso) / 16.7;   // para que caigan igual de rápido a cualquier fps
  juego.ultimoPaso = ahora;

  // Cada vez caen más rápido y salen más seguido
  const progreso = 1 - (juego.fin - ahora) / DURACION_JUEGO;
  if (ahora - juego.ultimoObjeto > 700 - progreso * 350) {
    juego.ultimoObjeto = ahora;
    juego.objetos.push({
      x: 0.1 + Math.random() * 0.8, y: -0.05,
      vel: (0.004 + Math.random() * 0.003) * (1 + progreso),
      bomba: Math.random() < 0.2, giro: Math.random() * Math.PI,
    });
  }

  const puntas = manos.flatMap(m => PUNTAS_DEDOS.map(i => m[i]));
  const radio = 0.05 * w;
  juego.objetos = juego.objetos.filter(o => {
    o.y += o.vel * dt;
    o.giro += 0.05 * dt;
    const tocado = puntas.some(p => Math.hypot((p.x - o.x) * w, (p.y - o.y) * h) < radio * 1.3);
    if (tocado) {
      if (o.bomba) {
        juego.puntos = Math.max(0, juego.puntos - 2);
        temblor(300);
        sonido('bomba');
      } else {
        juego.puntos++;
        sonido('estrella');
      }
      juego.destellos.push({ x: o.x * w, y: o.y * h, t0: ahora, bomba: o.bomba });
      return false;
    }
    return o.y < 1.1;
  });

  const quedan = Math.ceil((juego.fin - ahora) / 1000);
  marcador.textContent = `⭐ ${juego.puntos}   ⏱ ${quedan} s   🏆 ${Math.max(record, juego.puntos)}`;
}

function pintarJuego(c, w, h) {
  if (!juego.activo && !juego.destellos.length) return;
  const ahora = performance.now();
  const r = 0.05 * w;
  for (const o of juego.objetos) {
    const x = o.x * w, y = o.y * h;
    if (o.bomba) {
      c.fillStyle = '#1a1a1a';
      c.beginPath(); c.arc(x, y, r * 0.75, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#ff4d6d'; c.lineWidth = 3; c.stroke();
      c.fillStyle = Math.sin(ahora / 60) > 0 ? '#ffd34d' : '#ff4d6d';   // mecha que parpadea
      c.beginPath(); c.arc(x + r * 0.5, y - r * 0.7, r * 0.18, 0, Math.PI * 2); c.fill();
    } else {
      c.save();
      c.translate(x, y);
      c.rotate(o.giro);
      c.shadowColor = '#ffd34d';
      c.shadowBlur = 18;
      c.fillStyle = '#ffd34d';
      trazarEstrella(c, 0, 0, r);
      c.restore();
    }
  }
  // Destellos al atrapar algo
  juego.destellos = juego.destellos.filter(d => ahora - d.t0 < 400);
  for (const d of juego.destellos) {
    const k = (ahora - d.t0) / 400;
    c.strokeStyle = d.bomba ? `rgba(255, 77, 109, ${1 - k})` : `rgba(255, 211, 77, ${1 - k})`;
    c.lineWidth = 4;
    c.beginPath(); c.arc(d.x, d.y, r * (0.6 + k * 1.6), 0, Math.PI * 2); c.stroke();
  }
}

/* =====================================================================
   14. BUCLE PRINCIPAL DE DIBUJO
   ===================================================================== */
function pintar() {
  const ahora = performance.now();
  if (CAB && HAB && OJOS) {
    leerVolumen();
    actualizarJuego(ahora);
    pintarPersonaje(ahora);
    pintarPanel(ahora);
    pintarCapaAR(ahora);
    if (grabador) componer(lienzoGrab.getContext('2d'), video.videoWidth, video.videoHeight);

    if (cal) estado.textContent = 'Calibrando: mírate de frente...';
    else if (det.cara && video.srcObject) {
      const micro = cfg.bocaPorMicro ? ` · boca por micro (${hablando ? 'hablando' : 'callado'}, ${nivel.toFixed(4)})` : '';
      const rec = grabador ? `⏺ GRABANDO ${Math.round((ahora - inicioGrab) / 1000)} s · ` : '';
      estado.textContent = `${rec}Todo listo. Prueba a girar la cabeza, parpadear, hacer gestos con las manos o levantar los brazos${micro}.`;
    }
  }
  requestAnimationFrame(pintar);
}

/* =====================================================================
   15. ARRANQUE
   ===================================================================== */
let arrancado = false;
const promesaDetectores = crearDetectores().catch(e => {
  estado.textContent = 'No se pudieron cargar los modelos (¿hay conexión a Internet?): ' + e.message;
  throw e;
});

btn.addEventListener('click', async () => {
  prepararAudio();
  estado.textContent = 'Pidiendo permiso para la cámara y el micro...';
  let stream = null;
  try {
    const restricciones = { facingMode: 'user', width: 640, height: 480 };
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: restricciones, audio: true });
    } catch (e) {
      estado.textContent = 'Sin micro (' + e.name + '). Probando solo la cámara...';
      stream = await navigator.mediaDevices.getUserMedia({ video: restricciones, audio: false });
    }
    video.srcObject = stream;
    await video.play();
    if (stream.getAudioTracks().length) conectarMicro(stream);
    audioCtx.resume();
    btn.disabled = true;
    btnAR.disabled = false;
    btnFoto.disabled = false;
    btnGrabar.disabled = false;
    btnCursor.disabled = false;
    btnJuego.disabled = false;
    document.body.classList.add('camara-activa');   // oculta la portada
    anotar('📷', 'Cámara iniciada');
    try {
      await promesaDetectores;
    } catch (e) {
      estado.textContent = 'La cámara funciona, pero no se pudieron descargar los modelos de MediaPipe. Revisa la conexión a Internet y recarga la página.';
      return;
    }
    btnCal.click();
    ultimaVez = performance.now();
    if (!arrancado) { arrancado = true; cicloDeteccion(); }
  } catch (e) {
    estado.textContent = 'No se pudo abrir la cámara: ' + e.name + ' - ' + e.message;
  }
});

Promise.all([cargarImagen(ARCHIVO_CABEZAS), cargarImagen(ARCHIVO_HABLAR), cargarImagen(ARCHIVO_OJOS)])
  .then(([cab, hab, ojos]) => {
    CAB = trocear(cab, COLS, FILAS);
    HAB = trocear(hab, COL_HABLAR, 1);
    OJOS = ojos;
    btn.disabled = false;
    estado.textContent = 'Personaje cargado. Pulsa "Iniciar cámara".';
    pintar();
  })
  .catch(e => { estado.textContent = e.message; });
