const video = document.getElementById('video');
const canvas = document.getElementById('puntos');
const ctx = canvas.getContext('2d');
const lienzo = document.getElementById('personaje');
const ctxP = lienzo.getContext('2d');
const estado = document.getElementById('estado');
const datosTxt = document.getElementById('datos');
const btn = document.getElementById('btn');

const $ = id => document.getElementById(id);
const sG = $('sG'), sA = $('sA'), sU = $('sU'), sZG = $('sZG'), sZV = $('sZV'), sS = $('sS'), iV = $('iV');
const vG = $('vG'), vA = $('vA'), vU = $('vU'), vZG = $('vZG'), vZV = $('vZV'), vS = $('vS'), btnCal = $('btnCal');

const ARCHIVO_CABEZAS = 'spritesheet_sin_fondo.png';
const ARCHIVO_HABLAR = 'hablar.png';
const ARCHIVO_OJOS = 'ojos_cerrados.png';
const COLS = 5, FILAS = 5;
const FILA_NUCA = 4;
const COL_HABLAR = 4;
const SECUENCIA = [1, 2, 3, 2];   // 0 = cerrada, 1 = "a", 2 = "o", 3 = "i"
const MS_SIN_CARA = 1500;
const CAMBIO_BOCA_MS = 130;

// Parpadeo
const PARPADEO_MIN_MS = 2500;     // entre parpadeos, como mínimo
const PARPADEO_MAX_MS = 5000;     // y como máximo
const PARPADEO_DURACION_MS = 160; // lo que dura el parpadeo

// ---------- Ajustes (se cambian con los deslizadores) ----------
const cfg = { giro: 8, abajo: 10, arriba: 30, voz: 0.002, invertirV: true, zonaG: 0.03, zonaV: 0.03 };

function pintarValores() {
  vG.textContent = cfg.giro;
  vA.textContent = cfg.abajo;
  vU.textContent = cfg.arriba;
  vZG.textContent = cfg.zonaG.toFixed(3);
  vZV.textContent = cfg.zonaV.toFixed(3);
  vS.textContent = cfg.voz.toFixed(4);
}
sG.value = cfg.giro; sA.value = cfg.abajo; sU.value = cfg.arriba;
sZG.value = cfg.zonaG; sZV.value = cfg.zonaV; sS.value = cfg.voz;
iV.checked = cfg.invertirV;
sG.oninput = () => { cfg.giro = +sG.value; pintarValores(); };
sA.oninput = () => { cfg.abajo = +sA.value; pintarValores(); };
sU.oninput = () => { cfg.arriba = +sU.value; pintarValores(); };
sZG.oninput = () => { cfg.zonaG = +sZG.value; pintarValores(); };
sZV.oninput = () => { cfg.zonaV = +sZV.value; pintarValores(); };
sS.oninput = () => { cfg.voz = +sS.value; pintarValores(); };
iV.onchange = () => { cfg.invertirV = iV.checked; };
pintarValores();

// ---------- Utilidades ----------
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const clamp = (v, mn, mx) => Math.max(mn, Math.min(mx, v));

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

function trocear(img, columnas, filas) {
  const fw = img.width / columnas, fh = img.height / filas;
  const celdas = [];
  for (let f = 0; f < filas; f++) {
    celdas.push([]);
    for (let c = 0; c < columnas; c++) {
      const cv = document.createElement('canvas');
      cv.width = Math.round(fw);
      cv.height = Math.round(fh);
      cv.getContext('2d').drawImage(img, c * fw, f * fh, fw, fh, 0, 0, cv.width, cv.height);
      celdas[f].push(cv);
    }
  }
  return celdas;
}

function medirGiro(lm) {
  const cx = (lm[33].x + lm[263].x) / 2;
  return (lm[1].x - cx) / dist(lm[33], lm[263]);
}
function medirInclinacion(lm) {
  const cy = (lm[33].y + lm[263].y) / 2;
  return (lm[1].y - cy) / dist(lm[10], lm[152]);
}

// ---------- Calibración ----------
let base = { yaw: 0, pitch: 0 };
let cal = null;
btnCal.onclick = () => {
  cal = { t0: performance.now(), yaw: 0, pitch: 0, n: 0 };
  estado.textContent = 'Calibrando: mírate de frente...';
};

// ---------- Estado ----------
let CAB = null, HAB = null, OJOS = null;
let sm = { yaw: 0, pitch: 0 };
let ultimaVez = 0;
let audioCtx = null;
let analizador = null, buf = null;
let nivel = 0, hablando = false, microOk = false;
let idxBoca = 0, tBoca = 0;
let proximoParpadeo = 0, inicioParpadeo = 0, parpadeando = false;

// ---------- Micrófono ----------
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

function leerVoz() {
  if (!analizador) return;
  analizador.getFloatTimeDomainData(buf);
  let s = 0;
  for (const v of buf) s += v * v;
  nivel = Math.sqrt(s / buf.length);
  hablando = nivel > cfg.voz;
}

// ---------- Detector de caras ----------
const faceMesh = new FaceMesh({
  locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/${f}`
});
faceMesh.setOptions({ maxNumFaces: 1, refineLandmarks: false, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });

faceMesh.onResults(res => {
  if (canvas.width !== video.videoWidth) canvas.width = video.videoWidth;
  if (canvas.height !== video.videoHeight) canvas.height = video.videoHeight;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const lm = res.multiFaceLandmarks && res.multiFaceLandmarks[0];
  if (!lm) return;

  ultimaVez = performance.now();
  ctx.fillStyle = 'rgba(0, 255, 200, 0.9)';
  for (const p of lm) ctx.fillRect(p.x * canvas.width - 1, p.y * canvas.height - 1, 2, 2);

  const yaw = medirGiro(lm);
  const pitch = medirInclinacion(lm);

  if (cal) {
    cal.yaw += yaw;
    cal.pitch += pitch;
    cal.n++;
    if (performance.now() - cal.t0 > 2000 && cal.n > 0) {
      base = { yaw: cal.yaw / cal.n, pitch: cal.pitch / cal.n };
      cal = null;
      estado.textContent = 'Calibrado. Ya puedes moverte.';
    }
    return;
  }

  sm.yaw += ((yaw - base.yaw) - sm.yaw) * 0.25;
  sm.pitch += ((pitch - base.pitch) - sm.pitch) * 0.25;
});

let detectando = false;
function cicloDeteccion() {
  if (video.readyState >= 2 && !detectando) {
    detectando = true;
    faceMesh.send({ image: video }).catch(() => {}).finally(() => { detectando = false; });
  }
  setTimeout(cicloDeteccion, 33);
}

// ---------- Parpadeo ----------
function programarParpadeo(desde) {
  proximoParpadeo = desde + PARPADEO_MIN_MS + Math.random() * (PARPADEO_MAX_MS - PARPADEO_MIN_MS);
}

// Devuelve 0..1: cuánto están cerrados los ojos en este momento
function valorParpadeo(ahora) {
  if (!parpadeando && ahora >= proximoParpadeo) {
    parpadeando = true;
    inicioParpadeo = ahora;
  }
  if (!parpadeando) return 0;
  const t = (ahora - inicioParpadeo) / PARPADEO_DURACION_MS;
  if (t >= 1) {
    parpadeando = false;
    programarParpadeo(ahora);
    return 0;
  }
  return Math.sin(Math.PI * t);   // sube y baja durante el parpadeo
}

// ---------- Dibujo ----------
function celda(f, c, alpha) {
  if (alpha < 0.01) return;
  ctxP.globalAlpha = alpha;
  ctxP.drawImage(CAB[f][c], 0, 0, lienzo.width, lienzo.height);
}

function pintar() {
  ctxP.setTransform(1, 0, 0, 1, 0, 0);
  ctxP.clearRect(0, 0, lienzo.width, lienzo.height);
  if (!CAB || !HAB || !OJOS) { requestAnimationFrame(pintar); return; }

  const ahora = performance.now();
  leerVoz();

  const yawE = zonaMuerta(sm.yaw, cfg.zonaG);
  const pitchE = zonaMuerta(sm.pitch, cfg.zonaV);

  const sensV = pitchE > 0 ? cfg.arriba : cfg.abajo;
  const colPos = clamp(2 - yawE * cfg.giro, 0, 4);
  const filaPos = clamp(2 - (cfg.invertirV ? -1 : 1) * pitchE * sensV, 0, 3);
  const sinCara = ultimaVez && ahora - ultimaVez > MS_SIN_CARA;

  // Qué tan de frente estás (1 = de frente, 0 = girado)
  const deFrente = clamp(1 - Math.abs(colPos - 2) / 1.5, 0, 1) * clamp(1 - Math.abs(filaPos - 2) / 1.5, 0, 1);

  if (sinCara) {
    celda(FILA_NUCA, clamp(Math.round(colPos), 0, 4), 1);
  } else {
    const f0 = Math.floor(filaPos), c0 = Math.floor(colPos);
    const tf = filaPos - f0, tc = colPos - c0;
    const f1 = Math.min(f0 + 1, 3), c1 = Math.min(c0 + 1, 4);
    celda(f0, c0, (1 - tf) * (1 - tc));
    celda(f0, c1, (1 - tf) * tc);
    celda(f1, c0, tf * (1 - tc));
    celda(f1, c1, tf * tc);

    // Parpadeo: solo de frente
    const cerrados = valorParpadeo(ahora) * deFrente;
    if (cerrados > 0.01) {
      ctxP.globalAlpha = cerrados;
      ctxP.drawImage(OJOS, 0, 0, lienzo.width, lienzo.height);
    }

    // Boca: solo si hablas, y se ve cuanto más de frente estás
    if (hablando) {
      if (ahora - tBoca > CAMBIO_BOCA_MS) {
        idxBoca = (idxBoca + 1) % SECUENCIA.length;
        tBoca = ahora;
      }
      ctxP.globalAlpha = deFrente;
      ctxP.drawImage(HAB[0][SECUENCIA[idxBoca]], 0, 0, lienzo.width, lienzo.height);
    }
  }
  ctxP.globalAlpha = 1;

  if (cal) {
    estado.textContent = 'Calibrando: mírate de frente...';
  } else {
    const micro = microOk ? 'micro activo' : 'MICRO NO ACTIVO';
    estado.textContent =
      `${hablando ? 'HABLANDO' : 'callado'} · voz ${nivel.toFixed(4)} (umbral ${cfg.voz.toFixed(4)}) · ${micro} · ` +
      `giro ${sm.yaw.toFixed(3)} · arriba/abajo ${sm.pitch.toFixed(3)}`;
  }
  requestAnimationFrame(pintar);
}

// ---------- Arranque ----------
let arrancado = false;
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
    btnCal.click();
    ultimaVez = performance.now();
    programarParpadeo(performance.now());
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
    programarParpadeo(performance.now());
    pintar();
  })
  .catch(e => { estado.textContent = e.message; });