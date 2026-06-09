/**
 * Reconocimiento Facial 3D y Perfilado de Consumo Algorítmico - Mirada Algorítmica
 * Estudio Estético de Trevor Paglen localmente en Castellano (run.bat)
 */

// --- ESTADO DE LA APLICACIÓN ---
const state = {
  deconstructValue: 0.0,    // 0.0 (coherente) a 1.0 (deconstruido/colapsado)
  orbitSpeed: 1.0,          // Velocidad de deriva orbital
  glitchDensity: 12,        // Frecuencia de glitches (%)
  viewMode: {
    points: true,
    wireframe: true,
    visionOverlay: false
  },
  systemFailure: false,     // Activo cuando deconstructValue > 0.7
  audioActive: false,
  targetName: "SUJETO_FACIAL_01",
  faceAspectOffset: 1.0,    // Modulación de escala derivada de la imagen cargada
  hueOffset: 0,              // Desplazamiento de tonalidad cromática (0-360°)
  sobelThreshold: 45         // Umbral del filtro Sobel (5-200)
};

// --- ELEMENTOS DEL DOM ---
const elCanvas = document.getElementById('webgl-canvas');
const elSliderDeconstruct = document.getElementById('slider-deconstruct');
const elSliderOrbit = document.getElementById('slider-orbit');
const elSliderGlitch = document.getElementById('slider-glitch');
const elSliderHue = document.getElementById('slider-hue');
const elSliderSobel = document.getElementById('slider-sobel');
const elValDeconstruct = document.getElementById('val-deconstruct');
const elValOrbit = document.getElementById('val-orbit');
const elValGlitch = document.getElementById('val-glitch');
const elValHue = document.getElementById('val-hue');
const elValSobel = document.getElementById('val-sobel');
const elBtnPoints = document.getElementById('btn-mode-points');
const elBtnWire = document.getElementById('btn-mode-wire');
const elBtnEdge = document.getElementById('btn-edge-detect');
const elBtnReset = document.getElementById('btn-reset');
const elBtnCapture = document.getElementById('btn-capture');
const elAudioToggle = document.getElementById('audio-toggle');
const elSystemStatusBadge = document.getElementById('system-status-badge');
const elSystemStatusDesc = document.getElementById('system-status-desc');
const elSysStateText = document.getElementById('sys-state-text');
const elLabelConfidence = document.getElementById('label-confidence');
const elBarConfidence = document.getElementById('bar-confidence');
const elLabelFragIndex = document.getElementById('label-frag-index');
const elBarFrag = document.getElementById('bar-frag');
const elBiometricStream = document.getElementById('biometric-stream');
const elDiagnosticLog = document.getElementById('diagnostic-log');
const elNodeGraphCanvas = document.getElementById('node-graph-canvas');
const elPitchVal = document.getElementById('pitch-val');
const elYawVal = document.getElementById('yaw-val');

// Puntos clave biométricos (Landmarks) flotantes 2D
const elLandmarkEyeL = document.getElementById('landmark-eye-l');
const elLandmarkEyeR = document.getElementById('landmark-eye-r');
const elLandmarkNose = document.getElementById('landmark-nose');
const elLandmarkMouth = document.getElementById('landmark-mouth');

const elEyeLX = document.getElementById('eye-l-x');
const elEyeLY = document.getElementById('eye-l-y');
const elEyeRX = document.getElementById('eye-r-x');
const elEyeRY = document.getElementById('eye-r-y');

// Módulo de Carga de Imagen y Detección Sobel
const elImageUpload = document.getElementById('image-upload');
const elVisorSource = document.getElementById('visor-source');
const elSourcePlaceholder = document.getElementById('source-placeholder');
const elLaserLine = document.getElementById('laser-line');
const elFaceBox = document.getElementById('face-box');
const elSobelCanvas = document.getElementById('sobel-canvas');
const sobelCtx = elSobelCanvas.getContext('2d');
let lastUploadedImage = null; // Guardar última imagen para reprocesar Sobel

// Elementos del Perfil de Consumo Táctico
const elTraitLifestyle = document.getElementById('trait-lifestyle');
const elTraitIncome = document.getElementById('trait-income');
const elTraitImpulsiveness = document.getElementById('trait-impulsiveness');
const elTraitClv = document.getElementById('trait-clv');
const elTraitSubscriptions = document.getElementById('trait-subscriptions');
const elTraitTravel = document.getElementById('trait-travel');
const elTraitWellness = document.getElementById('trait-wellness');
const elTraitDevices = document.getElementById('trait-devices');
const elTraitFood = document.getElementById('trait-food');
const elTraitEducation = document.getElementById('trait-education');
const elTraitScreentime = document.getElementById('trait-screentime');

const elBarApple = document.getElementById('brand-bar-apple');
const elValApple = document.getElementById('brand-val-apple');
const elBarTesla = document.getElementById('brand-bar-tesla');
const elValTesla = document.getElementById('brand-val-tesla');
const elBarStarbucks = document.getElementById('brand-bar-starbucks');
const elValStarbucks = document.getElementById('brand-val-starbucks');
const elBarNike = document.getElementById('brand-bar-nike');
const elValNike = document.getElementById('brand-val-nike');
const elBarAmazon = document.getElementById('brand-bar-amazon');
const elValAmazon = document.getElementById('brand-val-amazon');
const elBarNetflix = document.getElementById('brand-bar-netflix');
const elValNetflix = document.getElementById('brand-val-netflix');
const elBarMercedes = document.getElementById('brand-bar-mercedes');
const elValMercedes = document.getElementById('brand-val-mercedes');
const elBarAdidas = document.getElementById('brand-bar-adidas');
const elValAdidas = document.getElementById('brand-val-adidas');


// --- MOTOR DE AUDIO SINTETIZADO (WEB AUDIO API) ---
class GlitchAudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.ambientOsc = null;
    this.ambientFilter = null;
    this.alarmOsc = null;
    this.alarmGain = null;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioContextClass();
    
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.08, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);

    // 1. Zumbido de Fondo (Filtro paso-bajo a 55Hz)
    this.ambientFilter = this.ctx.createBiquadFilter();
    this.ambientFilter.type = 'lowpass';
    this.ambientFilter.frequency.setValueAtTime(190, this.ctx.currentTime);
    this.ambientFilter.Q.setValueAtTime(8, this.ctx.currentTime);
    this.ambientFilter.connect(this.masterGain);

    this.ambientOsc = this.ctx.createOscillator();
    this.ambientOsc.type = 'sawtooth';
    this.ambientOsc.frequency.setValueAtTime(55, this.ctx.currentTime);
    this.ambientOsc.connect(this.ambientFilter);
    this.ambientOsc.start();

    // LFO lento para el zumbido militar
    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.2, this.ctx.currentTime);
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(45, this.ctx.currentTime);
    lfo.connect(lfoGain);
    lfoGain.connect(this.ambientFilter.frequency);
    lfo.start();

    // 2. Alarma de colapso de datos (Onda cuadrada áspera)
    this.alarmGain = this.ctx.createGain();
    this.alarmGain.gain.setValueAtTime(0, this.ctx.currentTime);
    this.alarmGain.connect(this.masterGain);

    this.alarmOsc = this.ctx.createOscillator();
    this.alarmOsc.type = 'square';
    this.alarmOsc.frequency.setValueAtTime(900, this.ctx.currentTime);
    this.alarmOsc.connect(this.alarmGain);
    this.alarmOsc.start();

    this.runAlarmLoop();
    this.runGlitchLoop();

    this.initialized = true;
    logDiagnostic("Motor de audio analógico inicializado correctamente.");
  }

  setVolume(vol) {
    if (!this.initialized) return;
    this.masterGain.gain.setTargetAtTime(vol, this.ctx.currentTime, 0.1);
  }

  setDroneSpeed(speed) {
    if (!this.initialized) return;
    const baseFreq = 55 + speed * 15;
    this.ambientOsc.frequency.setTargetAtTime(baseFreq, this.ctx.currentTime, 0.3);
    this.ambientFilter.frequency.setTargetAtTime(190 + speed * 35, this.ctx.currentTime, 0.3);
  }

  playTriggerSound() {
    if (!this.initialized || !state.audioActive) return;

    const now = this.ctx.currentTime;
    
    // Chasquido táctico metálico (Ruido + Sine)
    const bufferSize = this.ctx.sampleRate * 0.12; 
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noiseNode = this.ctx.createBufferSource();
    noiseNode.buffer = buffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(3200, now);
    noiseFilter.Q.setValueAtTime(5, now);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.3, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    noiseNode.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.masterGain);
    noiseNode.start();

    // Barrido de confirmación biométrica
    const scanOsc = this.ctx.createOscillator();
    scanOsc.type = 'sine';
    scanOsc.frequency.setValueAtTime(3500, now);
    scanOsc.frequency.exponentialRampToValueAtTime(300, now + 0.15);

    const scanGain = this.ctx.createGain();
    scanGain.gain.setValueAtTime(0.12, now);
    scanGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    scanOsc.connect(scanGain);
    scanGain.connect(this.masterGain);
    scanOsc.start();
    scanOsc.stop(now + 0.2);
  }

  playLockOnSound() {
    if (!this.initialized || !state.audioActive) return;

    const now = this.ctx.currentTime;
    // Doble pitido de confirmación ("lock-on")
    const playBeep = (time, freq) => {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, time);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.15, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(time);
      osc.stop(time + 0.1);
    };

    playBeep(now, 2200);
    playBeep(now + 0.1, 2600);
  }

  runAlarmLoop() {
    setInterval(() => {
      if (!this.initialized || !state.audioActive) return;
      
      if (state.systemFailure) {
        const now = this.ctx.currentTime;
        this.alarmGain.gain.setValueAtTime(0.2, now);
        this.alarmGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        
        this.alarmOsc.frequency.setValueAtTime(1050, now);
        this.alarmOsc.frequency.setValueAtTime(920, now + 0.3);
      }
    }, 1400);
  }

  runGlitchLoop() {
    const triggerGlitch = () => {
      if (this.initialized && state.audioActive) {
        const now = this.ctx.currentTime;
        const duration = 0.015 + Math.random() * 0.035;
        
        const osc = this.ctx.createOscillator();
        osc.type = Math.random() > 0.5 ? 'square' : 'sawtooth';
        osc.frequency.setValueAtTime(1200 + Math.random() * 4800, now);
        
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.03 * (state.glitchDensity / 12), now);
        gain.gain.setValueAtTime(0.001, now + duration);
        
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start();
        osc.stop(now + duration + 0.01);
      }
      
      const nextDelay = 250 + Math.random() * 3500 / (1 + (state.glitchDensity / 10));
      setTimeout(triggerGlitch, nextDelay);
    };
    
    setTimeout(triggerGlitch, 1000);
  }
}

const audio = new GlitchAudioEngine();

// Vinculación de Audio en Castellano
elAudioToggle.addEventListener('click', () => {
  if (!state.audioActive) {
    audio.init();
    state.audioActive = true;
    const spanEl = elAudioToggle.querySelector('span');
    if (spanEl) spanEl.innerText = "AUDIO: SÍ";
    elAudioToggle.classList.add('active');
    audio.setVolume(0.08);
  } else {
    state.audioActive = false;
    const spanEl = elAudioToggle.querySelector('span');
    if (spanEl) spanEl.innerText = "AUDIO: NO";
    elAudioToggle.classList.remove('active');
    audio.setVolume(0.0);
  }
  audio.playTriggerSound();
});


// --- CONFIGURACIÓN DE THREE.JS ---
let scene, camera, renderer;
let faceGroup; // Contenedor del rostro
let faceComponents = []; // Referencias de las 16 secciones
let shardParticles; // Partículas finas
let solidDebrisList = []; // Fragmentos tridimensionales
let telemetryLines; // Líneas de enlace

// Textura Sobel dinámica proyectada en 3D
let sobelTexture;

// Luces (para modificar color en runtime)
let purpleLight, greenLight;

// --- UTILIDAD DE DESPLAZAMIENTO CROMÁTICO ---
function shiftHue(hexColor, offsetDeg) {
  // Extraer RGB del hex
  const r = (hexColor >> 16) & 0xff;
  const g = (hexColor >> 8) & 0xff;
  const b = hexColor & 0xff;
  
  // Convertir RGB a HSL
  const rr = r / 255, gg = g / 255, bb = b / 255;
  const max = Math.max(rr, gg, bb), min = Math.min(rr, gg, bb);
  let h = 0, s, l = (max + min) / 2;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === rr) h = ((gg - bb) / d + (gg < bb ? 6 : 0)) / 6;
    else if (max === gg) h = ((bb - rr) / d + 2) / 6;
    else h = ((rr - gg) / d + 4) / 6;
  } else {
    s = 0;
  }
  
  // Desplazar tono
  h = (h * 360 + offsetDeg) % 360;
  if (h < 0) h += 360;
  h /= 360;
  
  // Convertir HSL de vuelta a RGB
  let r2, g2, b2;
  if (s === 0) {
    r2 = g2 = b2 = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r2 = hue2rgb(p, q, h + 1/3);
    g2 = hue2rgb(p, q, h);
    b2 = hue2rgb(p, q, h - 1/3);
  }
  
  // Convertir a entero hex
  const ri = Math.round(r2 * 255);
  const gi = Math.round(g2 * 255);
  const bi = Math.round(b2 * 255);
  return (ri << 16) | (gi << 8) | bi;
}

// --- ACTUALIZACIÓN DE COLORES DEL HUD SEGÚN TONALIDAD ---
function updateHUDColors(offsetDeg) {
  const root = document.documentElement;
  
  // Desplazar cyan (verde esmeralda → cualquier tono)
  const cyanHex = shiftHue(0x00ff66, offsetDeg);
  const cr = (cyanHex >> 16) & 0xff;
  const cg = (cyanHex >> 8) & 0xff;
  const cb = cyanHex & 0xff;
  root.style.setProperty('--color-cyan', `#${cyanHex.toString(16).padStart(6, '0')}`);
  root.style.setProperty('--color-cyan-dim', `rgba(${cr}, ${cg}, ${cb}, 0.12)`);
  
  // Desplazar amber (púrpura → cualquier tono)
  const amberHex = shiftHue(0xd000ff, offsetDeg);
  const ar = (amberHex >> 16) & 0xff;
  const ag = (amberHex >> 8) & 0xff;
  const ab = amberHex & 0xff;
  root.style.setProperty('--color-amber', `#${amberHex.toString(16).padStart(6, '0')}`);
  root.style.setProperty('--color-amber-dim', `rgba(${ar}, ${ag}, ${ab}, 0.12)`);
}

// Deriva orbital
let camTheta = 0;
let camPhi = 0.05;
const camRadius = 7.5;
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };

function initThree() {
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x040208, 0.03);

  camera = new THREE.PerspectiveCamera(45, elCanvas.clientWidth / elCanvas.clientHeight, 0.1, 100);
  
  renderer = new THREE.WebGLRenderer({
    canvas: elCanvas,
    antialias: true,
    alpha: false
  });
  renderer.setSize(elCanvas.clientWidth, elCanvas.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x040208, 1);

  faceGroup = new THREE.Group();
  scene.add(faceGroup);

  // Inicializar Textura Canvas del Filtro Sobel
  sobelTexture = new THREE.CanvasTexture(elSobelCanvas);
  sobelTexture.minFilter = THREE.LinearFilter;
  sobelTexture.magFilter = THREE.LinearFilter;

  // Iluminación Táctica de Alto Contraste
  const ambientLight = new THREE.AmbientLight(0x0c0418);
  scene.add(ambientLight);

  purpleLight = new THREE.DirectionalLight(0xd000ff, 2.5); // Púrpura
  purpleLight.position.set(4, 3, 5);
  scene.add(purpleLight);

  greenLight = new THREE.SpotLight(0x00ff66, 3.5); // Verde táctico
  greenLight.position.set(-6, -4, 4);
  greenLight.angle = Math.PI / 3.5;
  greenLight.penumbra = 0.6;
  scene.add(greenLight);

  // Armar Entorno 3D
  buildProceduralFace();
  buildFineDebrisField();
  buildCoarseDebrisField();
  buildTelemetryLines();

  window.addEventListener('resize', onWindowResize);

  // Controles de Cámara por Arrastre
  elCanvas.addEventListener('mousedown', (e) => {
    isDragging = true;
    previousMousePosition = { x: e.clientX, y: e.clientY };
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const deltaX = e.clientX - previousMousePosition.x;
    const deltaY = e.clientY - previousMousePosition.y;

    camTheta -= deltaX * 0.005;
    camPhi = Math.max(-Math.PI/4, Math.min(Math.PI/4, camPhi - deltaY * 0.005));

    previousMousePosition = { x: e.clientX, y: e.clientY };
  });

  window.addEventListener('mouseup', () => {
    isDragging = false;
  });

  // clic inyecta dispersión
  elCanvas.addEventListener('click', (e) => {
    if (isDragging) return;
    
    const mouse = new THREE.Vector2(
      (e.clientX / window.innerWidth) * 2 - 1,
      -(e.clientY / window.innerHeight) * 2 + 1
    );
    
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(faceGroup.children, true);
    
    if (intersects.length > 0) {
      let targetVal = Math.min(100, parseInt(elSliderDeconstruct.value) + 20);
      elSliderDeconstruct.value = targetVal;
      updateDeconstruct(targetVal);
      audio.playTriggerSound();
      logDiagnostic(`Fuerza Biométrica: Incremento de fragmentación del rostro en +20%.`);
      createGlitchFlash();
    }
  });

  logDiagnostic("Entorno WebGL configurado. Capa topológica iniciada.");
}

// Modelado de rasgos matemáticos del rostro con mapeo UV plano
function createFaceGeometry(uStart, uEnd, vStart, vEnd) {
  const geom = new THREE.BufferGeometry();
  const vertices = [];
  const uvs = [];
  const indices = [];
  const segments = 12;
  
  for (let i = 0; i <= segments; i++) {
    for (let j = 0; j <= segments; j++) {
      const u = uStart + (i / segments) * (uEnd - uStart);
      const v = vStart + (j / segments) * (vEnd - vStart);

      const x = (u - 0.5) * 3.4;
      const y = (v - 0.5) * 4.6;
      
      // Elipsoide de la máscara
      let z = Math.sqrt(Math.max(0, 3.8 - (x * x) - (y * y * 0.65))) * 0.85;

      // Frente
      if (y > 1.2) z -= (y - 1.2) * 0.35;
      
      // Ojos
      const distLEye = Math.sqrt((x + 0.55) * (x + 0.55) + (y - 0.5) * (y - 0.5));
      const distREye = Math.sqrt((x - 0.55) * (x - 0.55) + (y - 0.5) * (y - 0.5));
      const eyeDip = 0.38 * Math.exp(- (distLEye * distLEye) / 0.12) + 0.38 * Math.exp(- (distREye * distREye) / 0.12);
      z -= eyeDip;

      // Nariz
      const noseBridge = 0.75 * Math.exp(- (x * x) / 0.07) * Math.max(0, 1 - Math.abs(y - 0.15) * 1.3);
      z += noseBridge;
      
      // Boca
      const distMouth = Math.sqrt(x * x * 0.6 + (y + 0.75) * (y + 0.75));
      const mouthTip = 0.22 * Math.exp(- (distMouth * distMouth) / 0.08);
      z += mouthTip;

      // Pómulos
      const distLCheek = Math.sqrt((x + 0.85) * (x + 0.85) + (y + 0.1) * (y + 0.1));
      const distRCheek = Math.sqrt((x - 0.85) * (x - 0.85) + (y + 0.1) * (y + 0.1));
      z += 0.18 * Math.exp(- (distLCheek * distLCheek) / 0.25) + 0.18 * Math.exp(- (distRCheek * distRCheek) / 0.25);

      vertices.push(x, y, z);
      
      // Mapear coordenadas UV planas para proyectar la textura Sobel en 3D
      // El eje U mapea al eje X horizontal (0-1), y el eje V al eje Y vertical (0-1)
      uvs.push(u, v);
    }
  }

  for (let i = 0; i < segments; i++) {
    for (let j = 0; j < segments; j++) {
      const a = i * (segments + 1) + j;
      const b = i * (segments + 1) + j + 1;
      const c = (i + 1) * (segments + 1) + j;
      const d = (i + 1) * (segments + 1) + j + 1;

      indices.push(a, b, d);
      indices.push(a, d, c);
    }
  }

  geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  return geom;
}

// 16 secciones del rostro (rejilla 4x4)
function buildProceduralFace() {
  const patchesConfig = [
    { name: "FRENTE_EXT_IZQ", row: 3, col: 0, label: "FRENTE_LAT_IZQ", color: 0xd000ff }, // Púrpura
    { name: "FRENTE_INT_IZQ", row: 3, col: 1, label: "FRENTE_SUP_IZQ", color: 0xd000ff },
    { name: "FRENTE_INT_DER", row: 3, col: 2, label: "FRENTE_SUP_DER", color: 0xd000ff },
    { name: "FRENTE_EXT_DER", row: 3, col: 3, label: "FRENTE_LAT_DER", color: 0xd000ff },
    
    { name: "CEJA_IZQ_EXT", row: 2, col: 0, label: "CEJA_LAT_IZQ", color: 0xd000ff },
    { name: "OJO_IZQ_NUCLEO", row: 2, col: 1, label: "ÁREA_OCULAR_IZQ", color: 0x00ff66 }, // Verde esmeralda
    { name: "OJO_DER_NUCLEO", row: 2, col: 2, label: "ÁREA_OCULAR_DER", color: 0x00ff66 },
    { name: "CEJA_DER_EXT", row: 2, col: 3, label: "CEJA_LAT_DER", color: 0xd000ff },
    
    { name: "MEJILLA_IZQ_EXT", row: 1, col: 0, label: "PÓMULO_LAT_IZQ", color: 0xd000ff },
    { name: "NARIZ_DORSO", row: 1, col: 1, label: "TABIQUE_NASAL", color: 0x00ff66 },
    { name: "NARIZ_APICE", row: 1, col: 2, label: "ÁPICE_NASAL", color: 0x00ff66 },
    { name: "MEJILLA_DER_EXT", row: 1, col: 3, label: "PÓMULO_LAT_DER", color: 0xd000ff },
    
    { name: "MAXILAR_IZQ", row: 0, col: 0, label: "MAXILAR_IZQ", color: 0xd000ff },
    { name: "LABIOS_ORAL", row: 0, col: 1, label: "COMISURA_LABIAL", color: 0x00ff66 },
    { name: "MENTON_BASE", row: 0, col: 2, label: "ÁREA_MENTÓN", color: 0xd000ff },
    { name: "MAXILAR_DER", row: 0, col: 3, label: "MAXILAR_DER", color: 0xd000ff }
  ];

  patchesConfig.forEach(cfg => {
    const uStart = cfg.col * 0.25;
    const uEnd = (cfg.col + 1) * 0.25;
    const vStart = cfg.row * 0.25;
    const vEnd = (cfg.row + 1) * 0.25;

    const geom = createFaceGeometry(uStart, uEnd, vStart, vEnd);

    geom.computeBoundingBox();
    const center = new THREE.Vector3();
    geom.boundingBox.getCenter(center);

    const group = new THREE.Group();
    faceGroup.add(group);

    // 1. Puntos
    const pointsGeom = geom.clone();
    const pointsMat = new THREE.PointsMaterial({
      color: cfg.color,
      size: 0.045,
      transparent: true,
      opacity: 0.75,
      sizeAttenuation: true
    });
    const pointsMesh = new THREE.Points(pointsGeom, pointsMat);
    pointsMesh.visible = state.viewMode.points;
    group.add(pointsMesh);

    // 2. Estructura (Wireframe)
    const wireGeom = new THREE.WireframeGeometry(geom);
    const wireMat = new THREE.LineBasicMaterial({
      color: cfg.color,
      transparent: true,
      opacity: 0.65
    });
    const wireMesh = new THREE.LineSegments(wireGeom, wireMat);
    wireMesh.visible = state.viewMode.wireframe;
    group.add(wireMesh);

    // 3. Capa Sólida (Proyección de Textura Sobel en el centro de la página)
    // El material se configura en blanco (0xffffff) para no alterar los colores
    // de los bordes verde esmeralda y fondos oscuros de la textura Sobel
    const solidMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      map: sobelTexture,
      transparent: true,
      opacity: 0.8, // Opacidad para superponer sobre las líneas
      side: THREE.DoubleSide
    });
    const solidMesh = new THREE.Mesh(geom, solidMat);
    solidMesh.visible = state.viewMode.visionOverlay;
    group.add(solidMesh);

    // 4. Caja biométrica individual
    const boxGeom = new THREE.BoxGeometry(1, 1, 1);
    const edgesGeom = new THREE.EdgesGeometry(boxGeom);
    const boxMat = new THREE.LineBasicMaterial({
      color: 0xff5500, // Naranja
      transparent: true,
      opacity: 0.0
    });
    const boundingBox = new THREE.LineSegments(edgesGeom, boxMat);
    const size = new THREE.Vector3();
    geom.boundingBox.getSize(size);
    boundingBox.scale.set(size.x * 1.15, size.y * 1.15, Math.max(0.1, size.z) * 1.15);
    boundingBox.position.copy(center);
    group.add(boundingBox);

    // Dirección de explosión
    const expDir = new THREE.Vector3(
      center.x * 1.5,
      center.y * 1.5,
      center.z * 2.0 + 1.2
    ).normalize();

    // Rotación
    const expRot = new THREE.Vector3(
      (Math.random() - 0.5) * 1.5,
      (Math.random() - 0.5) * 1.5,
      (Math.random() - 0.5) * 2.5
    );

    faceComponents.push({
      name: cfg.name,
      label: cfg.label,
      group: group,
      points: pointsMesh,
      wire: wireMesh,
      solid: solidMesh,
      box: boundingBox,
      basePos: new THREE.Vector3(0, 0, 0),
      expDir: expDir,
      expRot: expRot,
      color: cfg.color,
      originColor: cfg.color,
      center: center.clone()
    });
  });
}

// Micropartículas
function buildFineDebrisField() {
  const particleCount = 500;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  const velocities = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);

  const purple = new THREE.Color(0xd000ff);
  const green = new THREE.Color(0x00ff66);
  const white = new THREE.Color(0xf8f9fa);

  for (let i = 0; i < particleCount; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos((Math.random() * 2) - 1);
    const rx = 1.6 * Math.sin(phi) * Math.cos(theta);
    const ry = 2.2 * Math.sin(phi) * Math.sin(theta);
    const rz = 1.0 * Math.cos(phi);

    positions[i * 3] = rx;
    positions[i * 3 + 1] = ry;
    positions[i * 3 + 2] = rz;

    const speed = 1.5 + Math.random() * 3.5;
    const dir = new THREE.Vector3(rx, ry, rz + 0.3).normalize();
    velocities[i * 3] = dir.x * speed;
    velocities[i * 3 + 1] = dir.y * speed;
    velocities[i * 3 + 2] = dir.z * speed;

    let pColor = purple;
    const roll = Math.random();
    if (roll > 0.7) pColor = green;
    else if (roll > 0.93) pColor = white;

    colors[i * 3] = pColor.r;
    colors[i * 3 + 1] = pColor.g;
    colors[i * 3 + 2] = pColor.b;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 0.035,
    vertexColors: true,
    transparent: true,
    opacity: 0.8
  });

  shardParticles = new THREE.Points(geometry, material);
  scene.add(shardParticles);
}

// Polígonos libres gruesos
function buildCoarseDebrisField() {
  const shardCount = 45;
  const colors = [0xd000ff, 0x00ff66, 0xff5500];

  for (let i = 0; i < shardCount; i++) {
    const size = 0.07 + Math.random() * 0.12;
    const geom = Math.random() > 0.5 
      ? new THREE.TetrahedronGeometry(size) 
      : new THREE.DodecahedronGeometry(size);

    const group = new THREE.Group();
    
    const solidMesh = new THREE.Mesh(geom, new THREE.MeshBasicMaterial({
      color: colors[Math.floor(Math.random() * colors.length)],
      transparent: true,
      opacity: 0.18,
      side: THREE.DoubleSide
    }));
    group.add(solidMesh);

    const wireGeom = new THREE.WireframeGeometry(geom);
    const wireMesh = new THREE.LineSegments(wireGeom, new THREE.LineBasicMaterial({
      color: solidMesh.material.color,
      transparent: true,
      opacity: 0.85
    }));
    group.add(wireMesh);

    const initialPos = new THREE.Vector3(
      (Math.random() - 0.5) * 2.0,
      (Math.random() - 0.5) * 3.0,
      (Math.random() - 0.5) * 1.0
    );
    group.position.copy(initialPos);
    group.scale.set(0.001, 0.001, 0.001);
    scene.add(group);

    const speed = 2.0 + Math.random() * 3.5;
    const expDir = new THREE.Vector3(
      initialPos.x * 1.2,
      initialPos.y * 1.2,
      initialPos.z * 2.0 + 1.5
    ).normalize().multiplyScalar(speed);

    const spin = new THREE.Vector3(
      (Math.random() - 0.5) * 6,
      (Math.random() - 0.5) * 6,
      (Math.random() - 0.5) * 6
    );

    solidDebrisList.push({
      group: group,
      basePos: initialPos.clone(),
      expDir: expDir,
      spin: spin
    });
  }
}

// Líneas de enlace
function buildTelemetryLines() {
  const lineCount = faceComponents.length;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(lineCount * 2 * 3);
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const material = new THREE.LineBasicMaterial({
    color: 0x00ff66, // Verde
    transparent: true,
    opacity: 0.35,
    blending: THREE.AdditiveBlending
  });

  telemetryLines = new THREE.LineSegments(geometry, material);
  scene.add(telemetryLines);
}

function onWindowResize() {
  camera.aspect = elCanvas.clientWidth / elCanvas.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(elCanvas.clientWidth, elCanvas.clientHeight);
}


// --- DECONSTRUCCIÓN Y ESTADOS (CASTELLANO) ---

function updateDeconstruct(valuePercent) {
  const val01 = valuePercent / 100.0;
  state.deconstructValue = val01;

  elValDeconstruct.innerText = `${valuePercent}% DECONSTRUIDO`;
  if (elLabelFragIndex) { elLabelFragIndex.innerText = `${valuePercent}.00%`; }
  if (elBarFrag) { elBarFrag.style.width = `${valuePercent}%`; }

  if (valuePercent === 0) {
    state.systemFailure = false;
    document.body.classList.remove('system-collapse');
    elSystemStatusBadge.innerText = "SISTEMA ESTABLE";
    elSystemStatusDesc.innerText = "ROSTRO COHERENTE: DETECTADO EN ESPACIO PÚBLICO";
    elSysStateText.innerText = "NOMINAL";
    elSysStateText.style.color = "var(--color-cyan)";
    if (elLabelConfidence) { elLabelConfidence.innerText = "99.91%"; }
    if (elBarConfidence) { elBarConfidence.style.width = "99.91%"; elBarConfidence.classList.remove('amber'); }
    logDiagnostic("Sincronización estable. Malla de coordenadas bloqueada.");
  } else if (valuePercent > 0 && valuePercent <= 70) {
    state.systemFailure = false;
    document.body.classList.remove('system-collapse');
    elSystemStatusBadge.innerText = "DESCOMPOSICIÓN ACTIVA";
    elSystemStatusDesc.innerText = "ADVERTENCIA DE DESACOPLE COGNITIVO";
    elSysStateText.innerText = "INESTABLE";
    elSysStateText.style.color = "var(--color-amber)";
    
    const conf = (99.91 - val01 * 60).toFixed(2);
    if (elLabelConfidence) { elLabelConfidence.innerText = `${conf}%`; }
    if (elBarConfidence) { elBarConfidence.style.width = `${conf}%`; elBarConfidence.classList.add('amber'); }
  } else {
    if (!state.systemFailure) {
      state.systemFailure = true;
      document.body.classList.add('system-collapse');
      logDiagnostic("CRÍTICO: COLAPSO ALGORÍTMICO DETECTADO.");
      createGlitchFlash();
    }
    elSystemStatusBadge.innerText = "COLAPSO ALGORÍTMICO";
    elSystemStatusDesc.innerText = "DESBORDAMIENTO MÉTRICO CRÍTICO // CORRUPCIÓN DE DATOS";
    elSysStateText.innerText = "FALLO";
    elSysStateText.style.color = "var(--color-red)";

    const conf = Math.max(0.88, (99.91 - val01 * 97.4) + (Math.random() - 0.5) * 4).toFixed(2);
    if (elLabelConfidence) { elLabelConfidence.innerText = `${conf}%`; }
    if (elBarConfidence) { elBarConfidence.style.width = `${conf}%`; }
  }
}

elSliderDeconstruct.addEventListener('input', (e) => {
  updateDeconstruct(parseInt(e.target.value));
});


// --- OTROS BOTONES Y DESLIZADORES ---

elSliderOrbit.addEventListener('input', (e) => {
  const val = parseFloat(e.target.value) / 100.0;
  state.orbitSpeed = val;
  elValOrbit.innerText = `${val.toFixed(1)}x`;
  audio.setDroneSpeed(val);
});

elSliderGlitch.addEventListener('input', (e) => {
  const val = parseInt(e.target.value);
  state.glitchDensity = val;
  elValGlitch.innerText = `${val}%`;
});

elSliderHue.addEventListener('input', (e) => {
  const val = parseInt(e.target.value);
  state.hueOffset = val;
  elValHue.innerText = `${val}°`;
  if (elValHue) {
    const hueColor = shiftHue(0xd000ff, val);
    elValHue.style.color = `#${hueColor.toString(16).padStart(6, '0')}`;
  }
  updateHUDColors(val);
  audio.playTriggerSound();
});

elSliderSobel.addEventListener('change', (e) => {
  const val = parseInt(e.target.value);
  state.sobelThreshold = val;
  elValSobel.innerText = val;
  
  // Reprocesar el filtro Sobel con el nuevo umbral si hay imagen cargada
  if (lastUploadedImage) {
    applySobelFilter(lastUploadedImage);
    logDiagnostic(`UMBRAL SOBEL: Ajustado a ${val}. Reconstruyendo textura...`);
  }
});

elBtnPoints.addEventListener('click', () => {
  state.viewMode.points = !state.viewMode.points;
  elBtnPoints.classList.toggle('active', state.viewMode.points);
  faceComponents.forEach(c => c.points.visible = state.viewMode.points);
  audio.playTriggerSound();
});

elBtnWire.addEventListener('click', () => {
  state.viewMode.wireframe = !state.viewMode.wireframe;
  elBtnWire.classList.toggle('active', state.viewMode.wireframe);
  faceComponents.forEach(c => c.wire.visible = state.viewMode.wireframe);
  audio.playTriggerSound();
});

elBtnEdge.addEventListener('click', () => {
  state.viewMode.visionOverlay = !state.viewMode.visionOverlay;
  elBtnEdge.classList.toggle('active', state.viewMode.visionOverlay);
  faceComponents.forEach(c => c.solid.visible = state.viewMode.visionOverlay);
  audio.playTriggerSound();
});

elBtnCapture.addEventListener('click', () => {
  try {
    // Forzar un render para capturar el frame actual
    renderer.render(scene, camera);
    const dataURL = elCanvas.toDataURL('image/png');
    const link = document.createElement('a');
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    link.download = `captura-facial-${ts}.png`;
    link.href = dataURL;
    link.click();
    audio.playTriggerSound();
    logDiagnostic("CAPTURA PNG: Imagen del canvas 3D exportada correctamente.");
  } catch (err) {
    console.warn('[CAPTURE_ERROR]', err.message);
    logDiagnostic("ERROR: No se pudo exportar la captura PNG.");
  }
});

elBtnReset.addEventListener('click', () => {
  elSliderDeconstruct.value = 0;
  updateDeconstruct(0);
  const prevImg = elVisorSource.querySelector('.user-source-img');
  if (prevImg) prevImg.remove();
  
  elSourcePlaceholder.style.display = 'block';
  elFaceBox.style.display = 'none';

  // Resetear perfiles
  resetConsumerProfile();

  // Resetear umbral Sobel y limpiar imagen almacenada
  state.sobelThreshold = 45;
  elSliderSobel.value = 45;
  elValSobel.innerText = 45;
  lastUploadedImage = null;

  // Limpiar lienzo Sobel y actualizar textura a negro
  if (sobelCtx) {
    sobelCtx.fillStyle = '#050214';
    sobelCtx.fillRect(0, 0, elSobelCanvas.width, elSobelCanvas.height);
  }
  if (sobelTexture) sobelTexture.needsUpdate = true;

  audio.playTriggerSound();
  logDiagnostic("Re-ensamblando estructura facial. Re-calibrando sensores.");
});


// --- ALGORITMO HASH Y PERFILADO DE CONSUMO CONSISTENTE ---

function getSimpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function processConsumerProfiling(seedHash) {
  const lifestyles = [
    "TECNO-OPTIMISTA SOHO",
    "NÓMADA DIGITAL CORPORATIVO",
    "CONSUMIDOR DE LUJO EXCLUSIVO",
    "URBANO MINIMALISTA",
    "ADDICT DE TENDENCIAS"
  ];
  
  const incomes = [
    "A/B (INGRESOS ALTOS)",
    "C+ (MEDIO-ALTO)",
    "C (ESTÁNDAR SOLVENTE)"
  ];

  // Selección de rasgos mediante el hash
  const lifestyle = lifestyles[seedHash % lifestyles.length];
  const income = incomes[seedHash % incomes.length];
  
  // Porcentajes consistentes
  const impulsiveness = 55 + (seedHash % 41); // 55% - 95%
  const clvVal = 3000 + (seedHash % 17) * 1200; // $3000 - $22200
  
  // Rasgos de consumo adicionales
  const subscriptions = ["PREMIUM (8+ servicios)", "ESTÁNDAR (4-6 servicios)", "BÁSICO (1-3 servicios)"][seedHash % 3];
  const travel = ["ALTA FRECUENCIA (>6 vuelos/año)", "MODERADO (2-4 vuelos/año)", "ESPORÁDICO (<1 vuelo/año)"][seedHash % 3];
  const wellness = 15 + (seedHash % 36); // 15% - 50% del ingreso
  
  // Rasgos de consumo extendidos
  const devices = ["HIPERCONECTADO (12+ disp.)", "CONECTADO (5-11 disp.)", "MÍNIMO (<5 disp.)"][seedHash % 3];
  const food = 25 + (seedHash % 41); // 25% - 65% del ingreso
  const education = ["POSGRADO/DOCTORADO", "UNIVERSITARIO", "TÉCNICO"][seedHash % 3];
  const screentime = ["EXTREMO (>10h/día)", "ALTO (6-10h/día)", "MODERADO (<6h/día)"][seedHash % 3];

  // Afinidades de marca
  const affApple = 55 + (seedHash % 39); // 55% - 93%
  const affTesla = 35 + (seedHash % 56); // 35% - 90%
  const affStarbucks = 60 + (seedHash % 35); // 60% - 94%
  const affNike = 50 + (seedHash % 44); // 50% - 93%
  const affAmazon = 65 + (seedHash % 30); // 65% - 94%
  const affNetflix = 45 + (seedHash % 48); // 45% - 92%
  const affMercedes = 30 + (seedHash % 55); // 30% - 84%
  const affAdidas = 40 + (seedHash % 50); // 40% - 89%

  // Retornar objeto
  return {
    lifestyle,
    income,
    impulsiveness: `${impulsiveness}%`,
    clv: `$${clvVal.toLocaleString()} USD`,
    subscriptions,
    travel,
    wellness: `${wellness}%`,
    devices,
    food: `${food}%`,
    education,
    screentime,
    brands: {
      apple: affApple,
      tesla: affTesla,
      starbucks: affStarbucks,
      nike: affNike,
      amazon: affAmazon,
      netflix: affNetflix,
      mercedes: affMercedes,
      adidas: affAdidas
    }
  };
}

function updateProfileUI(profile) {
  // Rellenar métricas escritas
  elTraitLifestyle.innerText = profile.lifestyle;
  elTraitIncome.innerText = profile.income;
  elTraitImpulsiveness.innerText = profile.impulsiveness;
  elTraitClv.innerText = profile.clv;
  elTraitSubscriptions.innerText = profile.subscriptions;
  elTraitTravel.innerText = profile.travel;
  elTraitWellness.innerText = profile.wellness;
  elTraitDevices.innerText = profile.devices;
  elTraitFood.innerText = profile.food;
  elTraitEducation.innerText = profile.education;
  elTraitScreentime.innerText = profile.screentime;

  // Animar las barras de afinidad
  const setBar = (elBar, elVal, targetVal) => {
    elVal.innerText = `${targetVal}%`;
    elBar.style.width = `${targetVal}%`;
  };

  setBar(elBarApple, elValApple, profile.brands.apple);
  setBar(elBarTesla, elValTesla, profile.brands.tesla);
  setBar(elBarStarbucks, elValStarbucks, profile.brands.starbucks);
  setBar(elBarNike, elValNike, profile.brands.nike);
  setBar(elBarAmazon, elValAmazon, profile.brands.amazon);
  setBar(elBarNetflix, elValNetflix, profile.brands.netflix);
  setBar(elBarMercedes, elValMercedes, profile.brands.mercedes);
  setBar(elBarAdidas, elValAdidas, profile.brands.adidas);

  // Logs en la terminal táctica
  logDiagnostic(`[PERFILADO]: Afinidades de marca bloqueadas.`);
  logDiagnostic(`[VIGILANCIA]: Sujeto clasificado como: ${profile.lifestyle}.`);
  logDiagnostic(`[MONETIZACIÓN]: CLV estimado en ${profile.clv}.`);
  logDiagnostic(`[SUSCRIPCIONES]: Perfil ${profile.subscriptions}.`);
  logDiagnostic(`[MOVILIDAD]: Frecuencia de viaje ${profile.travel}.`);
  logDiagnostic(`[DISPOSITIVOS]: ${profile.devices}.`);
  logDiagnostic(`[EDUCACIÓN]: Nivel estimado ${profile.education}.`);
}

function resetConsumerProfile() {
  elTraitLifestyle.innerText = "--";
  elTraitIncome.innerText = "--";
  elTraitImpulsiveness.innerText = "--";
  elTraitClv.innerText = "--";
  elTraitSubscriptions.innerText = "--";
  elTraitTravel.innerText = "--";
  elTraitWellness.innerText = "--";
  elTraitDevices.innerText = "--";
  elTraitFood.innerText = "--";
  elTraitEducation.innerText = "--";
  elTraitScreentime.innerText = "--";

  const clearBar = (elBar, elVal) => {
    elVal.innerText = "0%";
    elBar.style.width = "0%";
  };

  clearBar(elBarApple, elValApple);
  clearBar(elBarTesla, elValTesla);
  clearBar(elBarStarbucks, elValStarbucks);
  clearBar(elBarNike, elValNike);
  clearBar(elBarAmazon, elValAmazon);
  clearBar(elBarNetflix, elValNetflix);
  clearBar(elBarMercedes, elValMercedes);
  clearBar(elBarAdidas, elValAdidas);
}


// --- VINCULACIÓN DE CARGA DE IMÁGENES Y PROCESAMIENTO SOBEL ---

elImageUpload.addEventListener('change', (e) => {
  try {
    const file = e.target.files[0];
  if (!file) return;

  logDiagnostic(`Archivo detectado: ${file.name}. Procesando...`);
  
  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const img = new Image();
      img.onload = () => {
        try {
      // 1. Limpiar placeholder e insertar imagen en el visor fuente
      elSourcePlaceholder.style.display = 'none';
      
      const prevImg = elVisorSource.querySelector('.user-source-img');
      if (prevImg) prevImg.remove();

      const sourceImgElement = document.createElement('img');
      sourceImgElement.src = img.src;
      sourceImgElement.className = 'user-source-img';
      sourceImgElement.style.width = '100%';
      sourceImgElement.style.height = '100%';
      sourceImgElement.style.objectFit = 'contain';
      elVisorSource.appendChild(sourceImgElement);

      // 2. Ejecutar Detección de Bordes por Filtro Sobel Real
      lastUploadedImage = img; // Almacenar para reprocesar con cambio de umbral
      applySobelFilter(img);

      // 3. Lanzar secuencia de escaneo biométrico
      elLaserLine.style.display = 'block';
      elLaserLine.style.animation = 'scan-vertical 1.6s infinite linear';
      elFaceBox.style.display = 'none';
      
      if (elLabelConfidence) { elLabelConfidence.innerText = "ANALIZANDO..."; }
      if (elBarConfidence) { elBarConfidence.style.width = "40%"; }
      
      logDiagnostic("Aplicando operador Sobel. Generando textura holográfica 3D...");
      audio.playTriggerSound();

      // Sembrar el perfil de consumo consistente basado en el hash del nombre del archivo
      const fileHash = getSimpleHash(file.name + file.size);
      const generatedProfile = processConsumerProfiling(fileHash);

      // Cambiar proporción geométrica del rostro 3D basada en el hash de la imagen
      state.faceAspectOffset = 0.75 + ((fileHash % 40) / 100.0); // 0.75 - 1.15

      setTimeout(() => {
        // Detener escaneo láser
        elLaserLine.style.display = 'none';
        elLaserLine.style.animation = '';
        
        // Simular posicionamiento de la caja facial sobre la foto
        const visorWidth = elVisorSource.clientWidth;
        const visorHeight = elVisorSource.clientHeight;
        const boxSize = 55 + (fileHash % 25);
        
        elFaceBox.style.width = `${boxSize}px`;
        elFaceBox.style.height = `${boxSize}px`;
        elFaceBox.style.left = `${(visorWidth - boxSize) / 2}px`;
        elFaceBox.style.top = `${(visorHeight - boxSize) / 2}px`;
        elFaceBox.style.display = 'block';

        // Restaurar confianza
        if (elLabelConfidence) { elLabelConfidence.innerText = "99.96%"; }
        if (elBarConfidence) { elBarConfidence.style.width = "99.96%"; }

        // Actualizar HUD con el Perfil de Consumo consistente
        updateProfileUI(generatedProfile);

        // Forzar a activar la "Capa de Visión" Sobel 3D central automáticamente al finalizar
        state.viewMode.visionOverlay = true;
        elBtnEdge.classList.add('active');
        faceComponents.forEach(c => c.solid.visible = true);

          audio.playLockOnSound();
          logDiagnostic("ANÁLISIS DE MERCADO COMPLETADO: Sujeto perfilado comercialmente.");
        }, 1600);
        } catch (err) {
          console.warn('[IMAGE_ONLOAD_ERROR]', err.message);
        }
      };
      img.src = event.target.result;
    } catch (err) {
      console.warn('[FILE_READER_ERROR]', err.message);
    }
  };
  reader.readAsDataURL(file);
  } catch (err) {
    console.warn('[IMAGE_UPLOAD_ERROR]', err.message);
  }
});

// Algoritmo de convolución Sobel pixel-por-pixel
function applySobelFilter(imgElement) {
  const width = 180;
  const height = 125;
  elSobelCanvas.width = width;
  elSobelCanvas.height = height;

  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = width;
  tempCanvas.height = height;
  const tempCtx = tempCanvas.getContext('2d');
  tempCtx.drawImage(imgElement, 0, 0, width, height);

  const imgData = tempCtx.getImageData(0, 0, width, height);
  const data = imgData.data;

  if (!sobelCtx) return;
  const outputImgData = sobelCtx.createImageData(width, height);
  const outputData = outputImgData.data;

  const grayscale = new Uint8Array(width * height);
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    grayscale[i / 4] = 0.299 * r + 0.587 * g + 0.114 * b;
  }

  // Operadores de gradiente
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const valGx = 
        -1 * grayscale[(y - 1) * width + (x - 1)] + 1 * grayscale[(y - 1) * width + (x + 1)] +
        -2 * grayscale[ y      * width + (x - 1)] + 2 * grayscale[ y      * width + (x + 1)] +
        -1 * grayscale[(y + 1) * width + (x - 1)] + 1 * grayscale[(y + 1) * width + (x + 1)];

      const valGy = 
        -1 * grayscale[(y - 1) * width + (x - 1)] - 2 * grayscale[(y - 1) * width + x] - 1 * grayscale[(y - 1) * width + (x + 1)] +
         1 * grayscale[(y + 1) * width + (x - 1)] + 2 * grayscale[(y + 1) * width + x] + 1 * grayscale[(y + 1) * width + (x + 1)];

      const mag = Math.min(255, Math.sqrt(valGx * valGx + valGy * valGy));
      const pixelIdx = (y * width + x) * 4;
      
      if (mag > state.sobelThreshold) { 
        outputData[pixelIdx] = 0;         // Rojo
        outputData[pixelIdx + 1] = 255;   // Verde Esmeralda Sobel
        outputData[pixelIdx + 2] = 102;   // Azul
        outputData[pixelIdx + 3] = 255;   // Alfa
      } else {
        // Fondo negro-púrpura muy sutil
        outputData[pixelIdx] = 5;
        outputData[pixelIdx + 1] = 2;
        outputData[pixelIdx + 2] = 10;
        outputData[pixelIdx + 3] = 255;
      }
    }
  }

  sobelCtx.putImageData(outputImgData, 0, 0);

  // Forzar la recarga de la textura WebGL
  if (sobelTexture) {
    sobelTexture.needsUpdate = true;
  }
}


// --- TERMINAL Y SIMULADORES EN CASTELLANO ---

function logDiagnostic(text) {
  const now = new Date();
  const timeStr = now.toTimeString().split(' ')[0];
  const line = document.createElement('div');
  line.innerHTML = `<span style="color: var(--color-cyan)">[${timeStr}]</span> ${text}`;
  elDiagnosticLog.appendChild(line);
  elDiagnosticLog.scrollTop = elDiagnosticLog.scrollHeight;
}

function runDiagnosticSimulator() {
  const messages = [
    "INFO: Mapeo de vectores faciales correcto.",
    "BIOMETRÍA: Calibrando coordenadas de landmarks...",
    "SISTEMA: Alineación de iris coincidente [99%].",
    "MIRADA: Escaneo de puntos clave biométricos estable.",
    "VISIÓN: Bounding-boxes proyectados correctamente.",
    "SEÑAL: Retroalimentación de contraste clínico activa.",
    "HARDWARE: Temperatura del procesador visual estable."
  ];

  const errMessages = [
    "ADVERTENCIA: Desacople detectado en comisura labial.",
    "ERR: Error de triangulación en malla ocular.",
    "ALERTA: Corrupción del set de puntos en el tabique.",
    "COLAPSO: estructural de malla en aumento.",
    "FATAL: Desbordamiento de landmarks. Desalineación."
  ];

  const trigger = () => {
    if (Math.random() < 0.65) {
      const msg = state.systemFailure 
        ? errMessages[Math.floor(Math.random() * errMessages.length)]
        : messages[Math.floor(Math.random() * messages.length)];
      logDiagnostic(msg);
    }
    setTimeout(trigger, 2500 + Math.random() * 4500);
  };
  setTimeout(trigger, 1500);
}

function runBiometricStream() {
  const landmarksTags = ["PUNTO_CLAVE_OJO_IZQ", "PUNTO_CLAVE_OJO_DER", "PUNTO_CLAVE_APICE_NASAL", "PUNTO_CLAVE_MENTON", "COMISURA_LABIAL", "ANGULO_MIRADA"];
  const hex = "0123456789ABCDEF";

  const trigger = () => {
    let hexBytes = "";
    for(let i=0; i<4; i++) {
      hexBytes += hex[Math.floor(Math.random()*16)] + hex[Math.floor(Math.random()*16)] + " ";
    }
    
    const now = new Date();
    const ms = String(now.getMilliseconds()).padStart(3, '0');
    const timeStr = `${now.getSeconds()}:${ms}`;

    const line = document.createElement('div');
    line.className = 'stream-line';
    
    if (state.systemFailure) {
      line.innerHTML = `<span class="time">[${timeStr}]</span> <span class="event" style="color: var(--color-red)">[CORRUPTO]</span> 0x${hexBytes} ERROR_COLAPSO_REDISEÑO`;
    } else {
      const tag = landmarksTags[Math.floor(Math.random() * landmarksTags.length)];
      const val = (Math.random() * 100).toFixed(2);
      line.innerHTML = `<span class="time">[${timeStr}]</span> <span class="event">${tag}</span>: ${val}% [0x${hexBytes}]`;
    }

    elBiometricStream.appendChild(line);
    
    if (elBiometricStream.children.length > 18) {
      elBiometricStream.removeChild(elBiometricStream.firstChild);
    }

    setTimeout(trigger, 180 + Math.random() * 350);
  };
  setTimeout(trigger, 500);
}


// --- 2D NODE TOPOLOGY GRAPH (Mapeo de Nodos) ---

const nodeCtx = elNodeGraphCanvas.getContext('2d');
let nodeGraphWidth = 0;
let nodeGraphHeight = 0;

const nodes = [
  { id: "CEJA_I", x: 0.25, y: 0.22, label: "CEJA_IZQ", state: "OK" },
  { id: "CEJA_D", x: 0.75, y: 0.22, label: "CEJA_DER", state: "OK" },
  { id: "OJO_I", x: 0.35, y: 0.38, label: "OJO_IZQ", state: "OK" },
  { id: "OJO_D", x: 0.65, y: 0.38, label: "OJO_DER", state: "OK" },
  { id: "TABIQUE", x: 0.5, y: 0.45, label: "TABIQUE", state: "OK" },
  { id: "APICE", x: 0.5, y: 0.6, label: "NARIZ_TIP", state: "OK" },
  { id: "BOCA_I", x: 0.38, y: 0.72, label: "BOCA_IZQ", state: "OK" },
  { id: "BOCA_D", x: 0.62, y: 0.72, label: "BOCA_DER", state: "OK" },
  { id: "MENTON", x: 0.5, y: 0.88, label: "MENTÓN", state: "OK" }
];

const links = [
  { from: "CEJA_I", to: "CEJA_D" },
  { from: "CEJA_I", to: "OJO_I" },
  { from: "CEJA_D", to: "OJO_D" },
  { from: "OJO_I", to: "TABIQUE" },
  { from: "OJO_D", to: "TABIQUE" },
  { from: "TABIQUE", to: "APICE" },
  { from: "APICE", to: "BOCA_I" },
  { from: "APICE", to: "BOCA_D" },
  { from: "BOCA_I", to: "BOCA_D" },
  { from: "BOCA_I", to: "MENTON" },
  { from: "BOCA_D", to: "MENTON" }
];

function resizeNodeGraph() {
  nodeGraphWidth = elNodeGraphCanvas.parentElement.clientWidth;
  nodeGraphHeight = elNodeGraphCanvas.parentElement.clientHeight;
  elNodeGraphCanvas.width = nodeGraphWidth;
  elNodeGraphCanvas.height = nodeGraphHeight;
}

function updateNodeGraph() {
  if (!nodeCtx) return;
  resizeNodeGraph();
  
  nodeCtx.clearRect(0, 0, nodeGraphWidth, nodeGraphHeight);
  const scaleX = nodeGraphWidth;
  const scaleY = nodeGraphHeight;
  const tVal = state.deconstructValue;
  const hueVal = state.hueOffset || 0;
  
  // Colores desplazados por tono cromático
  const greenHex = shiftHue(0x00ff66, hueVal);
  const purpleHex = shiftHue(0xd000ff, hueVal);
  const greenRgba = `rgba(${(greenHex>>16)&0xff}, ${(greenHex>>8)&0xff}, ${greenHex&0xff}`;
  const purpleRgba = `rgba(${(purpleHex>>16)&0xff}, ${(purpleHex>>8)&0xff}, ${purpleHex&0xff}`;

  // Dibujar enlaces
  links.forEach(link => {
    const fromNode = nodes.find(n => n.id === link.from);
    const toNode = nodes.find(n => n.id === link.to);
    
    let shakeX = 0;
    let shakeY = 0;
    if (tVal > 0.4) {
      shakeX = (Math.random() - 0.5) * tVal * 8;
      shakeY = (Math.random() - 0.5) * tVal * 8;
    }

    const fx = fromNode.x * scaleX + (fromNode.x - 0.5) * tVal * 45 + shakeX;
    const fy = fromNode.y * scaleY + (fromNode.y - 0.5) * tVal * 45 + shakeY;
    const tx = toNode.x * scaleX + (toNode.x - 0.5) * tVal * 45 + shakeX;
    const ty = toNode.y * scaleY + (toNode.y - 0.5) * tVal * 45 + shakeY;

    nodeCtx.beginPath();
    nodeCtx.moveTo(fx, fy);
    nodeCtx.lineTo(tx, ty);
    
    if (tVal > 0.75) {
      nodeCtx.strokeStyle = 'rgba(255, 85, 0, 0.25)'; // Naranja crítico (fijo)
      nodeCtx.setLineDash([2, 3]);
    } else if (tVal > 0.2) {
      nodeCtx.strokeStyle = `${purpleRgba}, 0.4)`;
      nodeCtx.setLineDash([3, 2]);
    } else {
      nodeCtx.strokeStyle = `${greenRgba}, 0.35)`;
      nodeCtx.setLineDash([]);
    }
    nodeCtx.lineWidth = 1;
    nodeCtx.stroke();
  });

  // Dibujar Nodos
  nodes.forEach(node => {
    let shakeX = 0;
    let shakeY = 0;
    if (tVal > 0.3) {
      shakeX = (Math.random() - 0.5) * tVal * 6;
      shakeY = (Math.random() - 0.5) * tVal * 6;
    }

    const nx = node.x * scaleX + (node.x - 0.5) * tVal * 45 + shakeX;
    const ny = node.y * scaleY + (node.y - 0.5) * tVal * 45 + shakeY;

    nodeCtx.beginPath();
    nodeCtx.arc(nx, ny, 4, 0, Math.PI * 2);
    
    let color = `${greenRgba}, 1)`;
    let textState = 'CONECTADO';
    
    if (tVal > 0.7) {
      color = 'rgba(255, 85, 0, 1)'; // Naranja (fijo)
      textState = 'FALLO';
    } else if (tVal > 0.25) {
      color = `${purpleRgba}, 1)`;
      textState = 'DESACOPLE';
    }

    nodeCtx.fillStyle = color;
    nodeCtx.shadowColor = color;
    nodeCtx.shadowBlur = 4;
    nodeCtx.fill();
    nodeCtx.shadowBlur = 0;

    // Etiqueta
    nodeCtx.fillStyle = 'rgba(248, 249, 250, 0.7)';
    nodeCtx.font = '7px "Share Tech Mono"';
    nodeCtx.fillText(node.label, nx + 8, ny - 2);

    nodeCtx.fillStyle = color;
    nodeCtx.font = '6px "Share Tech Mono"';
    nodeCtx.fillText(textState, nx + 8, ny + 5);
  });
}


// --- PROYECCIÓN DE MARCADORES (LANDMARKS) BIOMÉTRICOS ---

function updateLandmarkOverlays() {
  if (faceComponents.length === 0) return;

  const eyeLComp = faceComponents.find(c => c.name === "OJO_IZQ_NUCLEO");
  const eyeRComp = faceComponents.find(c => c.name === "OJO_DER_NUCLEO");
  const noseComp = faceComponents.find(c => c.name === "NARIZ_APICE");
  const mouthComp = faceComponents.find(c => c.name === "LABIOS_ORAL");

  const tVal = state.deconstructValue;

  // Ojo Izquierdo
  if (eyeLComp) {
    const wPos = new THREE.Vector3();
    eyeLComp.group.getWorldPosition(wPos);
    
    // Aplicamos los offsets de escala en el cálculo del offset del centro para el tracker
    const scaledCenter = eyeLComp.center.clone();
    scaledCenter.x *= state.faceAspectOffset;
    scaledCenter.y *= (2.0 - state.faceAspectOffset);

    wPos.add(scaledCenter);
    const pos = getProjectedPosition(wPos, camera, renderer);
    
    if (pos.visible) {
      elLandmarkEyeL.style.display = 'block';
      elLandmarkEyeL.style.transform = `translate(${pos.x - 30}px, ${pos.y - 30}px)`;
      elEyeLX.innerText = pos.x.toFixed(0);
      elEyeLY.innerText = pos.y.toFixed(0);
      
      if (tVal > 0.7) {
        elLandmarkEyeL.style.borderColor = "var(--color-red)";
        elLandmarkEyeL.style.color = "var(--color-red)";
      } else {
        elLandmarkEyeL.style.borderColor = "var(--color-cyan)";
        elLandmarkEyeL.style.color = "var(--color-cyan)";
      }
    } else {
      elLandmarkEyeL.style.display = 'none';
    }
  }

  // Ojo Derecho
  if (eyeRComp) {
    const wPos = new THREE.Vector3();
    eyeRComp.group.getWorldPosition(wPos);
    
    const scaledCenter = eyeRComp.center.clone();
    scaledCenter.x *= state.faceAspectOffset;
    scaledCenter.y *= (2.0 - state.faceAspectOffset);

    wPos.add(scaledCenter);
    const pos = getProjectedPosition(wPos, camera, renderer);
    
    if (pos.visible) {
      elLandmarkEyeR.style.display = 'block';
      elLandmarkEyeR.style.transform = `translate(${pos.x - 30}px, ${pos.y - 30}px)`;
      elEyeRX.innerText = pos.x.toFixed(0);
      elEyeRY.innerText = pos.y.toFixed(0);
      
      if (tVal > 0.7) {
        elLandmarkEyeR.style.borderColor = "var(--color-red)";
        elLandmarkEyeR.style.color = "var(--color-red)";
      } else {
        elLandmarkEyeR.style.borderColor = "var(--color-cyan)";
        elLandmarkEyeR.style.color = "var(--color-cyan)";
      }
    } else {
      elLandmarkEyeR.style.display = 'none';
    }
  }

  // Ápice Nasal
  if (noseComp) {
    const wPos = new THREE.Vector3();
    noseComp.group.getWorldPosition(wPos);
    
    const scaledCenter = noseComp.center.clone();
    scaledCenter.x *= state.faceAspectOffset;
    scaledCenter.y *= (2.0 - state.faceAspectOffset);

    wPos.add(scaledCenter);
    const pos = getProjectedPosition(wPos, camera, renderer);
    
    if (pos.visible && tVal > 0.03) {
      elLandmarkNose.style.display = 'block';
      elLandmarkNose.style.transform = `translate(${pos.x - 30}px, ${pos.y - 35}px)`;
      
      if (tVal > 0.7) {
        elLandmarkNose.style.borderColor = "var(--color-red)";
        elLandmarkNose.style.color = "var(--color-red)";
      } else {
        elLandmarkNose.style.borderColor = "var(--color-cyan)";
        elLandmarkNose.style.color = "var(--color-cyan)";
      }
    } else {
      elLandmarkNose.style.display = 'none';
    }
  }

  // Boca
  if (mouthComp) {
    const wPos = new THREE.Vector3();
    mouthComp.group.getWorldPosition(wPos);
    
    const scaledCenter = mouthComp.center.clone();
    scaledCenter.x *= state.faceAspectOffset;
    scaledCenter.y *= (2.0 - state.faceAspectOffset);

    wPos.add(scaledCenter);
    const pos = getProjectedPosition(wPos, camera, renderer);
    
    if (pos.visible && tVal > 0.03) {
      elLandmarkMouth.style.display = 'block';
      elLandmarkMouth.style.transform = `translate(${pos.x - 30}px, ${pos.y - 35}px)`;
      
      if (tVal > 0.7) {
        elLandmarkMouth.style.borderColor = "var(--color-red)";
        elLandmarkMouth.style.color = "var(--color-red)";
      } else {
        elLandmarkMouth.style.borderColor = "var(--color-cyan)";
        elLandmarkMouth.style.color = "var(--color-cyan)";
      }
    } else {
      elLandmarkMouth.style.display = 'none';
    }
  }
}

function getProjectedPosition(vector3, camera, renderer) {
  const widthHalf = renderer.domElement.clientWidth / 2;
  const heightHalf = renderer.domElement.clientHeight / 2;
  const tempV = vector3.clone();
  tempV.project(camera);
  return {
    x: (tempV.x * widthHalf) + widthHalf,
    y: -(tempV.y * heightHalf) + heightHalf,
    visible: tempV.z < 1
  };
}


// --- FLASH GLITCH ALARMA ---

function createGlitchFlash() {
  const flash = document.createElement('div');
  flash.style.position = 'absolute';
  flash.style.top = '0';
  flash.style.left = '0';
  flash.style.width = '100vw';
  flash.style.height = '100vh';
  flash.style.backgroundColor = 'rgba(255, 85, 0, 0.2)';
  flash.style.zIndex = '99';
  flash.style.pointerEvents = 'none';
  document.body.appendChild(flash);
  
  setTimeout(() => {
    flash.style.backgroundColor = 'rgba(208, 0, 255, 0.12)';
    setTimeout(() => {
      document.body.removeChild(flash);
    }, 50);
  }, 50);
}


// --- BUCLE DE ANIMACIÓN (TICK ENGINE) ---

let clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  try {
    const dt = clock.getDelta();
  const tVal = state.deconstructValue;

  // 1. Deriva orbital de la cámara
  if (!isDragging && state.orbitSpeed > 0) {
    camTheta += 0.04 * state.orbitSpeed * dt;
  }

  camera.position.x = camRadius * Math.sin(camTheta) * Math.cos(camPhi);
  camera.position.y = camRadius * Math.sin(camPhi);
  camera.position.z = camRadius * Math.cos(camTheta) * Math.cos(camPhi);
  camera.lookAt(0, 0, 0);

  const pitchDeg = (camPhi * 180 / Math.PI).toFixed(1);
  const yawDeg = ((camTheta * 180 / Math.PI) % 360).toFixed(1);
  if (elPitchVal) { elPitchVal.innerText = `${pitchDeg}°`; }
  if (elYawVal) { elYawVal.innerText = `${yawDeg}°`; }

  // Modulamos la escala del rostro basado en la carga de la imagen (faceAspectOffset)
  faceGroup.scale.x = THREE.MathUtils.lerp(faceGroup.scale.x, state.faceAspectOffset, 0.1);
  faceGroup.scale.y = THREE.MathUtils.lerp(faceGroup.scale.y, 2.0 - state.faceAspectOffset, 0.1);

  // 2. Animar los 16 patches del rostro (Deriva y rotación)
  const hueVal = state.hueOffset || 0;
  faceComponents.forEach(comp => {
    const shiftedColor = shiftHue(comp.originColor, hueVal);
    comp.points.material.color.setHex(shiftedColor);
    comp.wire.material.color.setHex(shiftedColor);

    const targetPos = comp.basePos.clone().addScaledVector(comp.expDir, tVal * 1.6);
    comp.group.position.lerp(targetPos, 0.12);

    const rotX = comp.expRot.x * tVal * 2.2;
    const rotY = comp.expRot.y * tVal * 2.2;
    const rotZ = comp.expRot.z * tVal * 2.2;
    
    comp.group.rotation.x = THREE.MathUtils.lerp(comp.group.rotation.x, rotX, 0.12);
    comp.group.rotation.y = THREE.MathUtils.lerp(comp.group.rotation.y, rotY, 0.12);
    comp.group.rotation.z = THREE.MathUtils.lerp(comp.group.rotation.z, rotZ, 0.12);

    if (tVal > 0) {
      comp.box.material.opacity = THREE.MathUtils.lerp(comp.box.material.opacity, 0.45, 0.08);
      if (state.systemFailure) {
        comp.box.material.color.setHex(0xff5500); // Naranja de alarma
      } else {
        comp.box.material.color.setHex(shiftHue(0xd000ff, hueVal)); // Púrpura desplazado
      }
    } else {
      comp.box.material.opacity = THREE.MathUtils.lerp(comp.box.material.opacity, 0.0, 0.15);
    }
  });

  // Luces dinámicas según tono cromático
  if (purpleLight) purpleLight.color.setHex(shiftHue(0xd000ff, hueVal));
  if (greenLight) greenLight.color.setHex(shiftHue(0x00ff66, hueVal));

  // 3. Animar microescombros (Nube de Puntos)
  if (shardParticles) {
    const positions = shardParticles.geometry.attributes.position.array;
    const velocities = shardParticles.geometry.attributes.velocity.array;
    const count = shardParticles.geometry.attributes.position.count;

    for (let i = 0; i < count; i++) {
      const theta = (i * 15.71) % (Math.PI * 2);
      const phi = ((i * 3.14) % Math.PI);
      
      // Ajustamos los puntos en X/Y según la modulación de aspecto
      const initialX = 1.6 * Math.sin(phi) * Math.cos(theta) * state.faceAspectOffset;
      const initialY = 2.2 * Math.sin(phi) * Math.sin(theta) * (2.0 - state.faceAspectOffset);
      const initialZ = 1.0 * Math.cos(phi);

      positions[i * 3] = initialX + velocities[i * 3] * tVal * 0.9;
      positions[i * 3 + 1] = initialY + velocities[i * 3 + 1] * tVal * 0.9;
      positions[i * 3 + 2] = initialZ + velocities[i * 3 + 2] * tVal * 0.9;
    }
    shardParticles.geometry.attributes.position.needsUpdate = true;
    shardParticles.material.opacity = tVal > 0.05 ? 0.85 : 0.0;
  }

  // 4. Animar fragmentos sólidos
  solidDebrisList.forEach(shard => {
    if (tVal > 0.05) {
      const targetPos = shard.basePos.clone().addScaledVector(shard.expDir, tVal * 0.7);
      shard.group.position.lerp(targetPos, 0.12);

      shard.group.rotation.x += shard.spin.x * dt * tVal;
      shard.group.rotation.y += shard.spin.y * dt * tVal;
      shard.group.rotation.z += shard.spin.z * dt * tVal;

      shard.group.scale.set(1.0, 1.0, 1.0);
    } else {
      shard.group.scale.lerp(new THREE.Vector3(0, 0, 0), 0.18);
      shard.group.position.copy(shard.basePos);
    }
  });

  // 5. Dibujar vectores de telemetría
  if (telemetryLines && faceComponents.length > 0) {
    const linePos = telemetryLines.geometry.attributes.position.array;
    for (let i = 0; i < faceComponents.length; i++) {
      const comp = faceComponents[i];
      const worldPos = new THREE.Vector3();
      comp.group.getWorldPosition(worldPos);

      // Multiplicamos el center por la escala del grupo
      const scaledCenter = comp.center.clone();
      scaledCenter.x *= state.faceAspectOffset;
      scaledCenter.y *= (2.0 - state.faceAspectOffset);

      linePos[i * 6] = scaledCenter.x;
      linePos[i * 6 + 1] = scaledCenter.y;
      linePos[i * 6 + 2] = scaledCenter.z;

      linePos[i * 6 + 3] = worldPos.x + scaledCenter.x;
      linePos[i * 6 + 4] = worldPos.y + scaledCenter.y;
      linePos[i * 6 + 5] = worldPos.z + scaledCenter.z;
    }
    telemetryLines.geometry.attributes.position.needsUpdate = true;
    telemetryLines.material.color.setHex(shiftHue(0x00ff66, hueVal));
    telemetryLines.material.opacity = tVal > 0.05 ? 0.35 : 0.0;
  }

  // 6. Interfaces 2D
  updateLandmarkOverlays();
  updateNodeGraph();

    // 7. Render
    renderer.render(scene, camera);
  } catch (err) {
    console.warn('[ANIMATE_FRAME_ERROR]', err.message);
  }
}


// --- INICIALIZACIÓN ---

initThree();
animate();
runDiagnosticSimulator();
runBiometricStream();
updateHUDColors(0);

logDiagnostic("RECONOCIMIENTO FACIAL: Sistema táctico cargado.");
logDiagnostic("Buscando imagen fuente en el puerto de entrada...");
