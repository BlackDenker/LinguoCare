import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FaceLandmarker, FilesetResolver, DrawingUtils } from '@mediapipe/tasks-vision';

// ── Índices de labios en el modelo de 478 puntos de MediaPipe ──────────────
const LIP_UPPER_OUTER = [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291];
const LIP_LOWER_OUTER = [146, 91, 181, 84, 17, 314, 405, 321, 375, 291];
const LIP_UPPER_INNER = [78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308];
const LIP_LOWER_INNER = [78, 95, 88, 178, 87, 14, 317, 402, 318, 324, 308];

const ALL_LIP_INDICES = [...new Set([
  ...LIP_UPPER_OUTER, ...LIP_LOWER_OUTER,
  ...LIP_UPPER_INNER, ...LIP_LOWER_INNER,
])];

const PREDEFINED_TOPICS = [
  'Pasado Simple',
  'Presente Perfecto',
  'Condicionales',
  'Phrasal Verbs Comunes',
  'Vocabulario de Viajes',
];

// ── Reutilizar la misma conversión WAV de Speak.jsx ────────────────────────
async function convertBlobToWav(audioBlob) {
  const arrayBuffer = await audioBlob.arrayBuffer();
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
  audioCtx.close();

  const samples = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;
  const pcm16 = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }

  const wavBuffer = new ArrayBuffer(44 + pcm16.byteLength);
  const view = new DataView(wavBuffer);
  const writeStr = (off, str) => {
    for (let i = 0; i < str.length; i++) view.setUint8(off + i, str.charCodeAt(i));
  };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + pcm16.byteLength, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, pcm16.byteLength, true);
  new Int16Array(wavBuffer, 44).set(pcm16);

  return new Blob([wavBuffer], { type: 'audio/wav' });
}

// ── Retry helper (igual que Speak) ─────────────────────────────────────────
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

async function callWithRetry(url, body, onWaiting) {
  const MAX_RETRIES = 5;
  let attempt = 0;
  while (true) {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    if (data.status === 'success') return { ok: true, data };

    if (response.status === 429) {
      if (data.errorType === 'rate_limit_retry' && attempt < MAX_RETRIES) {
        const waitMs = (data.retryAfterSeconds + 1) * 1000;
        onWaiting(attempt === 0 ? 'Espérame, sigo pensando...' : 'Ya casi estoy...');
        await sleep(waitMs);
        onWaiting(null);
        attempt++;
        continue;
      }
      return {
        ok: false,
        errorType: data.errorType === 'rate_limit_retry' ? 'rate_limit_exceeded' : 'quota_exhausted',
      };
    }
    return { ok: false, errorType: 'generic', message: data.message || 'Error desconocido' };
  }
}

// ── Mapping English IPA phonetic symbols to viseme categories ──────────────
function getPhonemeViseme(phoneme) {
  const p = phoneme.toLowerCase().trim();
  if (!p) return 'neutral';
  if (['p', 'b', 'm'].includes(p)) return 'closed';
  if (['f', 'v'].includes(p)) return 'labiodental';
  if (['θ', 'ð'].includes(p)) return 'dental';
  if (['u', 'ʊ', 'oʊ', 'w', 'ɔ', 'ɔɪ', 'aʊ', 'aw', 'ow', 'u:', 'ɔ:'].includes(p)) return 'rounded';
  if (['ɑ', 'æ', 'ʌ', 'aɪ', 'ɑ:', 'æ:', 'ʌ:', 'ai'].includes(p)) return 'wide-open';
  if (['i', 'ɪ', 'eɪ', 'ɛ', 'e', 'i:', 'ɪ:', 'ei'].includes(p)) return 'open-smile';
  if (['ʃ', 'ʒ', 'tʃ', 'dʒ', 's', 'z', 'ts', 'dz'].includes(p)) return 'clenched';
  return 'neutral';
}

// SVG background for mouth cavity — lighter so shapes are clearly visible
const MOUTH_BG = '#2a2d52';

function MouthSVG({ viseme }) {
  const lipGrad = (id) => (
    <defs>
      <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#a855f7" />
        <stop offset="50%" stopColor="#f472b6" />
        <stop offset="100%" stopColor="#a855f7" />
      </linearGradient>
    </defs>
  );

  switch (viseme) {
    case 'closed':
      return (
        <svg viewBox="0 0 100 80" className="cac-mouth-svg" width="100%" height="100%">
          {lipGrad('lgC')}
          <path d="M 20 40 Q 50 32 80 40 Q 50 43 20 40 Z" fill="url(#lgC)" />
          <path d="M 20 40 Q 50 37 80 40 Q 50 48 20 40 Z" fill="url(#lgC)" />
          <path d="M 20 40 Q 50 39.5 80 40" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" fill="none" />
        </svg>
      );
    case 'labiodental':
      return (
        <svg viewBox="0 0 100 80" className="cac-mouth-svg" width="100%" height="100%">
          {lipGrad('lgL')}
          {/* mouth cavity */}
          <path d="M 22 36 Q 50 26 78 36 Q 50 52 22 36 Z" fill={MOUTH_BG} />
          {/* upper teeth */}
          <path d="M 33 28 L 33 36 L 41 36 L 41 28 Z M 41 28 L 41 37 L 49 37 L 49 28 Z M 49 28 L 49 37 L 57 37 L 57 28 Z M 57 28 L 57 36 L 65 36 L 65 28 Z" fill="#f0f0f0" stroke="#ccc" strokeWidth="0.5" />
          {/* lower lip */}
          <path d="M 20 36 Q 50 44 80 36 Q 50 56 20 36 Z" fill="url(#lgL)" />
          {/* upper lip */}
          <path d="M 20 36 Q 50 24 80 36 Q 50 38 20 36 Z" fill="url(#lgL)" />
        </svg>
      );
    case 'dental':
      return (
        <svg viewBox="0 0 100 80" className="cac-mouth-svg" width="100%" height="100%">
          {lipGrad('lgD')}
          <path d="M 22 35 Q 50 24 78 35 Q 50 54 22 35 Z" fill={MOUTH_BG} />
          {/* tongue tip visible */}
          <path d="M 38 36 C 38 36 38 45 50 45 C 62 45 62 36 62 36 Z" fill="#f87171" stroke="#ef4444" strokeWidth="1" />
          {/* upper teeth */}
          <path d="M 30 27 L 30 33 C 35 33 65 33 70 33 L 70 27 Z" fill="#f0f0f0" stroke="#ccc" strokeWidth="0.5" />
          <path d="M 20 35 Q 50 22 80 35 Q 50 37 20 35 Z" fill="url(#lgD)" />
          <path d="M 20 35 Q 50 42 80 35 Q 50 58 20 35 Z" fill="url(#lgD)" />
        </svg>
      );
    case 'rounded':
      return (
        <svg viewBox="0 0 100 80" className="cac-mouth-svg" width="100%" height="100%">
          {lipGrad('lgR')}
          {/* outer lip ring */}
          <circle cx="50" cy="40" r="18" fill="url(#lgR)" />
          {/* inner cavity */}
          <circle cx="50" cy="40" r="10" fill={MOUTH_BG} />
          {/* inner dark hole */}
          <circle cx="50" cy="40" r="6" fill="#12132a" />
        </svg>
      );
    case 'wide-open':
      return (
        <svg viewBox="0 0 100 80" className="cac-mouth-svg" width="100%" height="100%">
          {lipGrad('lgW')}
          {/* mouth cavity */}
          <path d="M 22 32 C 22 15, 78 15, 78 32 C 78 68, 22 68, 22 32 Z" fill={MOUTH_BG} />
          {/* upper teeth */}
          <path d="M 32 19 L 32 26 L 38 26 L 38 19 Z M 38 19 L 38 27 L 44 27 L 44 19 Z M 44 19 L 44 27 L 50 27 L 50 19 Z M 50 19 L 50 27 L 56 27 L 56 19 Z M 56 19 L 56 26 L 62 26 L 62 19 Z" fill="#f0f0f0" stroke="#ccc" strokeWidth="0.5" />
          {/* lower teeth */}
          <path d="M 33 52 L 33 59 L 39 59 L 39 52 Z M 39 52 L 39 59 L 45 59 L 45 52 Z M 45 52 L 45 59 L 55 59 L 55 52 Z M 55 52 L 55 59 L 61 59 L 61 52 Z M 61 52 L 61 59 L 67 59 L 67 52 Z" fill="#f0f0f0" stroke="#ccc" strokeWidth="0.5" />
          {/* lip ring */}
          <path d="M 20 32 C 20 12, 80 12, 80 32 C 80 72, 20 72, 20 32 Z M 22 32 C 22 68, 78 68, 78 32 C 78 15, 22 15, 22 32 Z" fill="url(#lgW)" fillRule="evenodd" />
        </svg>
      );
    case 'open-smile':
      return (
        <svg viewBox="0 0 100 80" className="cac-mouth-svg" width="100%" height="100%">
          {lipGrad('lgS')}
          {/* mouth cavity */}
          <path d="M 18 36 C 28 22, 72 22, 82 36 C 78 54, 22 54, 18 36 Z" fill={MOUTH_BG} />
          {/* upper teeth */}
          <path d="M 26 27 L 26 33 Q 50 36 74 33 L 74 27 Z" fill="#f0f0f0" stroke="#ccc" strokeWidth="0.5" />
          {/* lower teeth */}
          <path d="M 30 45 L 30 41 Q 50 39 70 41 L 70 45 Z" fill="#f0f0f0" stroke="#ccc" strokeWidth="0.5" opacity="0.9" />
          {/* lip ring */}
          <path d="M 15 36 C 28 18, 72 18, 85 36 C 75 58, 25 58, 15 36 Z M 18 36 C 22 54, 78 54, 82 36 C 72 22, 28 22, 18 36 Z" fill="url(#lgS)" fillRule="evenodd" />
        </svg>
      );
    case 'clenched':
      return (
        <svg viewBox="0 0 100 80" className="cac-mouth-svg" width="100%" height="100%">
          {lipGrad('lgCl')}
          {/* very narrow cavity */}
          <path d="M 22 36 Q 50 26 78 36 Q 50 50 22 36 Z" fill={MOUTH_BG} />
          {/* teeth band */}
          <path d="M 26 30 L 74 30 L 74 42 L 26 42 Z" fill="#f0f0f0" stroke="#ccc" strokeWidth="0.5" />
          {/* tooth dividers */}
          <path d="M 34 30 L 34 42 M 42 30 L 42 42 M 50 30 L 50 42 M 58 30 L 58 42 M 66 30 L 66 42" stroke="#d1d5db" strokeWidth="1" />
          {/* narrow gap line */}
          <path d="M 26 36 L 74 36" stroke="rgba(0,0,0,0.4)" strokeWidth="1.5" />
          <path d="M 20 36 Q 50 22 80 36 Q 50 38 20 36 Z" fill="url(#lgCl)" />
          <path d="M 20 36 Q 50 44 80 36 Q 50 54 20 36 Z" fill="url(#lgCl)" />
        </svg>
      );
    case 'neutral':
    default:
      return (
        <svg viewBox="0 0 100 80" className="cac-mouth-svg" width="100%" height="100%">
          {lipGrad('lgN')}
          {/* slight opening */}
          <path d="M 22 38 Q 50 28 78 38 Q 50 50 22 38 Z" fill={MOUTH_BG} />
          {/* upper teeth hint */}
          <path d="M 32 30 L 32 35 C 40 36 60 36 68 35 L 68 30 Z" fill="#f0f0f0" stroke="#ccc" strokeWidth="0.5" />
          <path d="M 20 38 Q 50 26 80 38 Q 50 40 20 38 Z" fill="url(#lgN)" />
          <path d="M 20 38 Q 50 42 80 38 Q 50 52 20 38 Z" fill="url(#lgN)" />
        </svg>
      );
  }
}

export default function CaraACara({ setView, handleMouseMove }) {
  // ── Pasos ─────────────────────────────────────────────────────────────────
  const [step, setStep] = useState(1); // 1: Tema, 2: Frases, 3: Grabar

  // ── Paso 1 ────────────────────────────────────────────────────────────────
  const [topic, setTopic] = useState('');
  const [customTopic, setCustomTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [retryWaitMessage, setRetryWaitMessage] = useState(null);
  const [generalError, setGeneralError] = useState(null);

  // ── Paso 2 ────────────────────────────────────────────────────────────────
  const [sentences, setSentences] = useState([]);

  // ── Paso 3 ────────────────────────────────────────────────────────────────
  const [selectedSentence, setSelectedSentence] = useState('');
  const [accuracy, setAccuracy] = useState(80);
  const [recording, setRecording] = useState(false);
  const [evaluation, setEvaluation] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedWord, setSelectedWord] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [details, setDetails] = useState(null);

  // ── MediaPipe ─────────────────────────────────────────────────────────────
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const faceLandmarkerRef = useRef(null);
  const animFrameRef = useRef(null);
  const streamRef = useRef(null);
  const lastVideoTimeRef = useRef(-1);
  const [cameraReady, setCameraReady] = useState(false);
  const [mpReady, setMpReady] = useState(false);
  const [cameraError, setCameraError] = useState(null);

  // ── Audio recording ───────────────────────────────────────────────────────
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // ── Inicializar MediaPipe Tasks Vision ────────────────────────────────────
  const initMediaPipe = useCallback(async () => {
    try {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
      );
      const landmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
          delegate: 'GPU',
        },
        outputFaceBlendshapes: false,
        runningMode: 'VIDEO',
        numFaces: 1,
      });
      faceLandmarkerRef.current = landmarker;
      setMpReady(true);
    } catch (err) {
      console.error('Error inicializando MediaPipe:', err);
      // Si GPU falla, reintentar con CPU
      try {
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
        );
        const landmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
            delegate: 'CPU',
          },
          outputFaceBlendshapes: false,
          runningMode: 'VIDEO',
          numFaces: 1,
        });
        faceLandmarkerRef.current = landmarker;
        setMpReady(true);
      } catch (err2) {
        console.error('Error crítico MediaPipe:', err2);
      }
    }
  }, []);

  // ── Abrir cámara ──────────────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
          setCameraReady(true);
        };
      }
    } catch (err) {
      console.error('Error accediendo a la cámara:', err);
      setCameraError('No se pudo acceder a la cámara. Verifica los permisos del navegador.');
    }
  }, []);

  // ── Detener todo al desmontar ─────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
      if (faceLandmarkerRef.current) faceLandmarkerRef.current.close();
    };
  }, []);

  // ── Activar cámara + MediaPipe al entrar al paso 3 ────────────────────────
  useEffect(() => {
    if (step === 3) {
      initMediaPipe();
      startCamera();
    } else {
      // Limpiar si volvemos atrás
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      setCameraReady(false);
      setEvaluation(null);
    }
  }, [step, initMediaPipe, startCamera]);

  // ── Loop de detección de rostro ───────────────────────────────────────────
  const drawLandmarks = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const landmarker = faceLandmarkerRef.current;

    if (!video || !canvas || !landmarker || video.paused || video.ended) {
      animFrameRef.current = requestAnimationFrame(drawLandmarks);
      return;
    }

    const ctx = canvas.getContext('2d');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const now = performance.now();
    if (video.currentTime !== lastVideoTimeRef.current) {
      lastVideoTimeRef.current = video.currentTime;
      try {
        const results = landmarker.detectForVideo(video, now);
        if (results.faceLandmarks && results.faceLandmarks.length > 0) {
          const landmarks = results.faceLandmarks[0];
          const W = canvas.width;
          const H = canvas.height;

          // Dibujar puntos de referencia del rostro completo (sutil)
          ctx.fillStyle = 'rgba(255,255,255,0.12)';
          for (let i = 0; i < landmarks.length; i++) {
            const lm = landmarks[i];
            ctx.beginPath();
            ctx.arc(lm.x * W, lm.y * H, 1.5, 0, Math.PI * 2);
            ctx.fill();
          }

          // Resaltar puntos de la boca con glow
          ALL_LIP_INDICES.forEach((idx) => {
            if (idx >= landmarks.length) return;
            const lm = landmarks[idx];
            const x = lm.x * W;
            const y = lm.y * H;

            // Glow externo
            const grd = ctx.createRadialGradient(x, y, 0, x, y, 8);
            grd.addColorStop(0, 'rgba(0,242,254,0.9)');
            grd.addColorStop(1, 'rgba(0,242,254,0)');
            ctx.fillStyle = grd;
            ctx.beginPath();
            ctx.arc(x, y, 8, 0, Math.PI * 2);
            ctx.fill();

            // Punto central sólido
            ctx.fillStyle = '#00f2fe';
            ctx.beginPath();
            ctx.arc(x, y, 3, 0, Math.PI * 2);
            ctx.fill();
          });

          // Dibujar contorno de labios
          const drawLipContour = (indices, color, glow) => {
            if (indices.length < 2) return;
            ctx.save();
            ctx.shadowColor = glow;
            ctx.shadowBlur = 12;
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            const first = landmarks[indices[0]];
            ctx.moveTo(first.x * W, first.y * H);
            for (let i = 1; i < indices.length; i++) {
              if (indices[i] >= landmarks.length) continue;
              const lm = landmarks[indices[i]];
              ctx.lineTo(lm.x * W, lm.y * H);
            }
            ctx.closePath();
            ctx.stroke();
            ctx.restore();
          };

          drawLipContour(LIP_UPPER_OUTER, '#00f2fe', '#00f2fe');
          drawLipContour(LIP_LOWER_OUTER, '#00f2fe', '#00f2fe');
          drawLipContour(LIP_UPPER_INNER, 'rgba(127,0,255,0.8)', '#7f00ff');
          drawLipContour(LIP_LOWER_INNER, 'rgba(127,0,255,0.8)', '#7f00ff');
        }
      } catch (_) {
        // Ignorar errores de frame
      }
    }

    animFrameRef.current = requestAnimationFrame(drawLandmarks);
  }, []);

  // Iniciar loop cuando cámara + MediaPipe estén listos
  useEffect(() => {
    if (cameraReady && mpReady) {
      animFrameRef.current = requestAnimationFrame(drawLandmarks);
    }
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [cameraReady, mpReady, drawLandmarks]);

  // ── Paso 1: generar frases ─────────────────────────────────────────────────
  const handleGenerateSentences = async () => {
    const finalTopic = topic === 'custom' ? customTopic : topic;
    if (!finalTopic.trim()) return;

    setLoading(true);
    setGeneralError(null);
    setRetryWaitMessage(null);
    try {
      const result = await callWithRetry(
        '/api/generate_sentences',
        { topic: finalTopic, count: 5 },
        setRetryWaitMessage
      );
      if (result.ok) {
        setSentences(result.data.sentences);
        setStep(2);
      } else if (result.errorType === 'quota_exhausted') {
        setGeneralError('quota_exhausted');
      } else if (result.errorType === 'rate_limit_exceeded') {
        setGeneralError('rate_limit_exceeded');
      } else {
        setGeneralError(result.message);
      }
    } catch (err) {
      setGeneralError('Error de red al generar las frases.');
    } finally {
      setLoading(false);
      setRetryWaitMessage(null);
    }
  };

  // ── Paso 3: grabación ─────────────────────────────────────────────────────
  const startRecording = () => {
    if (!streamRef.current) return;
    const audioTracks = streamRef.current.getAudioTracks();
    if (!audioTracks.length) {
      alert('No se encontró micrófono en el stream.');
      return;
    }

    // Crear stream solo de audio para el recorder
    const audioStream = new MediaStream(audioTracks);
    const mediaRecorder = new MediaRecorder(audioStream);
    mediaRecorderRef.current = mediaRecorder;
    audioChunksRef.current = [];

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunksRef.current.push(e.data);
    };

    mediaRecorder.onstop = async () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      await verifyPronunciation(audioBlob);
    };

    mediaRecorder.start();
    setRecording(true);
    setEvaluation(null);
    setSelectedWord(null);
    setDetails(null);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const verifyPronunciation = async (audioBlob) => {
    setAnalyzing(true);
    try {
      const wavBlob = await convertBlobToWav(audioBlob);
      const formData = new FormData();
      formData.append('audio', wavBlob, 'record.wav');
      formData.append('sentence', selectedSentence);
      formData.append('accuracy', accuracy);

      const response = await fetch('/api/pronunciation', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (data.status === 'success') {
        setEvaluation(data.evaluation);
      } else {
        alert(data.message || 'Error evaluando el audio.');
      }
    } catch (err) {
      console.error('Error evaluando pronunciación:', err);
      alert('Error de red al evaluar.');
    } finally {
      setAnalyzing(false);
    }
  };

  // ── Volver al paso anterior limpiando estado ──────────────────────────────
  const goToStep1 = () => {
    setStep(1);
    setTopic('');
    setCustomTopic('');
    setSentences([]);
    setSelectedSentence('');
    setEvaluation(null);
    setSelectedWord(null);
    setDetails(null);
    setGeneralError(null);
  };

  const goToStep2 = () => {
    setStep(2);
    setEvaluation(null);
    setSelectedWord(null);
    setDetails(null);
  };

  // Clicking a word: just show SVG phoneme diagrams (no AI call)
  const getDetails = (wordData) => {
    setSelectedWord(wordData);
    setDetails(null);
    setGeneralError(null);
  };

  // Explicit button: call Gemini for pronunciation recommendation
  const getAIRecommendation = async () => {
    if (!selectedWord || selectedWord.correct) return;
    setDetailsLoading(true);
    setDetails(null);
    setGeneralError(null);
    setRetryWaitMessage(null);
    try {
      const result = await callWithRetry(
        '/api/pronunciation_details',
        {
          word: selectedWord.word,
          expected_phonemes: selectedWord.expected_phonemes,
          actual_phonemes: selectedWord.actual_phonemes,
          sentence: selectedSentence
        },
        setRetryWaitMessage
      );
      if (result.ok) {
        setDetails(result.data.details);
      } else if (result.errorType === 'quota_exhausted') {
        setGeneralError('quota_exhausted');
      } else if (result.errorType === 'rate_limit_exceeded') {
        setGeneralError('rate_limit_exceeded');
      } else {
        setGeneralError(result.message);
      }
    } catch (err) {
      console.error('Error getting AI details:', err);
      setGeneralError('Error de conexión al obtener recomendaciones.');
    } finally {
      setDetailsLoading(false);
      setRetryWaitMessage(null);
    }
  };

  // ── Métricas del resultado ────────────────────────────────────────────────
  const getResultStats = () => {
    if (!evaluation) return null;
    const total = evaluation.length;
    const correct = evaluation.filter((w) => w.correct).length;
    const pct = Math.round((correct / total) * 100);
    return { total, correct, wrong: total - correct, pct };
  };

  const stats = getResultStats();

  // ── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <main
      className="card wide cara-a-cara"
      onMouseMove={handleMouseMove}
      style={{ padding: '2rem', maxWidth: '860px' }}
    >
      {/* ── Header ── */}
      <h1 className="title" style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
        Cara a <span className="highlight">Cara</span>
      </h1>
      <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
        Analiza tu pronunciación en tiempo real con visión por computadora
      </p>

      {/* ── Stepper ── */}
      <div className="cac-stepper">
        {['Tema', 'Frase', 'Práctica'].map((label, i) => (
          <div key={i} className={`cac-step ${step > i + 1 ? 'done' : ''} ${step === i + 1 ? 'active' : ''}`}>
            <div className="cac-step-circle">{step > i + 1 ? '✓' : i + 1}</div>
            <span className="cac-step-label">{label}</span>
            {i < 2 && <div className="cac-step-line" />}
          </div>
        ))}
      </div>

      {/* ════════════════════════════════
          PASO 1 — Selección de tema
      ════════════════════════════════ */}
      {step === 1 && (
        <div className="topic-selection">
          <h2 style={{ fontSize: '1.15rem', marginBottom: '1rem', color: 'var(--text-light)' }}>
            Selecciona un tema para practicar:
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {PREDEFINED_TOPICS.map((t, idx) => (
              <button
                key={idx}
                className={`btn ${topic === t ? 'btn-primary' : 'btn-secondary'} cac-topic-btn`}
                onClick={() => setTopic(t)}
              >
                <span className="cac-topic-icon">
                  {['📘', '⏳', '🔀', '🔗', '✈️'][idx]}
                </span>
                {t}
              </button>
            ))}

            <div style={{ marginTop: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: 'var(--text-muted)' }}>
                O escribe tu propio tema:
              </label>
              <div className="textarea-container" style={{ minHeight: 'auto' }}>
                <textarea
                  className="custom-textarea"
                  style={{ minHeight: '90px', resize: 'none' }}
                  placeholder="Ej: Entrevista de trabajo, Saludos formales..."
                  value={customTopic}
                  onChange={(e) => { setCustomTopic(e.target.value); setTopic('custom'); }}
                  onFocus={() => setTopic('custom')}
                />
              </div>
            </div>
          </div>

          <button
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '1.5rem' }}
            onClick={handleGenerateSentences}
            disabled={loading || !topic}
          >
            {loading ? (retryWaitMessage || '✨ Generando frases...') : 'Continuar →'}
          </button>

          {/* Errores de cuota */}
          {generalError === 'quota_exhausted' && (
            <div className="quota-exhausted-banner" style={{ marginTop: '1.5rem' }}>
              <span className="quota-icon">🚫</span>
              <div>
                <strong>Límite diario alcanzado</strong>
                <p>Has agotado la cuota diaria. Intenta mañana.</p>
              </div>
            </div>
          )}
          {generalError === 'rate_limit_exceeded' && (
            <div className="quota-exhausted-banner" style={{ marginTop: '1.5rem' }}>
              <span className="quota-icon">⏳</span>
              <div>
                <strong>Demasiadas peticiones</strong>
                <p>Espera un momento y vuelve a intentar.</p>
              </div>
            </div>
          )}
          {generalError && !['quota_exhausted', 'rate_limit_exceeded'].includes(generalError) && (
            <div className="detail-error-banner" style={{ marginTop: '1.5rem' }}>⚠️ {generalError}</div>
          )}
        </div>
      )}

      {/* ════════════════════════════════
          PASO 2 — Selección de frase
      ════════════════════════════════ */}
      {step === 2 && (
        <div className="sentences-selection">
          <button className="btn btn-secondary" onClick={goToStep1} style={{ marginBottom: '1rem' }}>
            ← Cambiar tema
          </button>
          <h2 style={{ fontSize: '1.15rem', marginBottom: '1rem' }}>
            Selecciona una frase para practicar:
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {sentences.map((sent, idx) => (
              <div
                key={idx}
                className="cac-sentence-card"
                onClick={() => {
                  setSelectedSentence(sent);
                  setEvaluation(null);
                  setStep(3);
                }}
              >
                <span className="cac-sentence-num">{idx + 1}</span>
                <p style={{ margin: 0, fontSize: '1.05rem', flex: 1 }}>{sent}</p>
                <span className="cac-sentence-arrow">→</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ════════════════════════════════
          PASO 3 — Cámara + grabación
      ════════════════════════════════ */}
      {step === 3 && (
        <div className="cac-practice">
          <button className="btn btn-secondary" onClick={goToStep2} style={{ marginBottom: '1rem' }}>
            ← Volver a frases
          </button>

          {/* ── Panel de cámara ── */}
          <div className="cac-camera-wrapper">
            {/* Loading overlay */}
            {(!cameraReady || !mpReady) && !cameraError && (
              <div className="cac-loading-overlay">
                <div className="cac-spinner" />
                <p>{!cameraReady ? 'Activando cámara...' : 'Cargando modelo IA...'}</p>
              </div>
            )}

            {/* Error de cámara */}
            {cameraError && (
              <div className="cac-loading-overlay" style={{ flexDirection: 'column', gap: '1rem' }}>
                <span style={{ fontSize: '2.5rem' }}>📵</span>
                <p style={{ color: '#ff4757', textAlign: 'center', maxWidth: '280px' }}>{cameraError}</p>
                <button className="btn btn-secondary" onClick={startCamera} style={{ fontSize: '0.9rem' }}>
                  Reintentar
                </button>
              </div>
            )}

            {/* Video + canvas superpuesto */}
            <video
              ref={videoRef}
              className="cac-video"
              autoPlay
              playsInline
              muted
              style={{ transform: 'scaleX(-1)' }}
            />
            <canvas
              ref={canvasRef}
              className="cac-canvas"
              style={{ transform: 'scaleX(-1)' }}
            />

            {/* Frase flotante sobre el video */}
            {selectedSentence && (
              <div className="cac-sentence-overlay">
                <p>{selectedSentence}</p>
              </div>
            )}

            {/* Badge de grabación */}
            {recording && (
              <div className="cac-recording-badge">
                <span className="cac-rec-dot" />
                REC
              </div>
            )}
          </div>

          {/* ── Controles bajo el video ── */}
          <div className="cac-controls">
            {/* Nivel de exigencia */}
            <div style={{ textAlign: 'left', width: '100%', maxWidth: '420px' }}>
              <label style={{ display: 'block', marginBottom: '0.4rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                Nivel de exigencia:
              </label>
              <select
                className="cac-select"
                value={accuracy}
                onChange={(e) => setAccuracy(Number(e.target.value))}
                disabled={recording || analyzing}
              >
                <option value={60}>60% — Básico, te entiendes a duras penas</option>
                <option value={70}>70% — Intermedio, comprensible con esfuerzo</option>
                <option value={80}>80% — Avanzado, buena pronunciación</option>
                <option value={90}>90% — Casi nativo, acento muy leve</option>
                <option value={100}>100% — Nativo perfecto</option>
              </select>
            </div>

            {/* Botón grabar / detener */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
              {!recording ? (
                <button
                  className="btn btn-primary cac-record-btn"
                  onClick={startRecording}
                  disabled={analyzing || !cameraReady || !mpReady}
                >
                  🎤 Grabar
                </button>
              ) : (
                <button
                  className="btn cac-stop-btn"
                  onClick={stopRecording}
                >
                  ⏹️ Detener
                </button>
              )}
            </div>

            {analyzing && (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⚙️</span>
                Analizando pronunciación con Allosaurus...
              </p>
            )}
          </div>

          {/* ── Resultados de pronunciación ── */}
          {evaluation && (
            <div className="cac-evaluation">
              {/* Score bar */}
              {stats && (
                <div className="cac-score-header">
                  <div className="cac-score-label">
                    <span className="cac-score-number" style={{ color: stats.pct >= 70 ? '#2ed573' : '#ff4757' }}>
                      {stats.pct}%
                    </span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                      {stats.correct}/{stats.total} palabras correctas
                    </span>
                  </div>
                  <div className="cac-progress-bar">
                    <div
                      className="cac-progress-fill"
                      style={{
                        width: `${stats.pct}%`,
                        background: stats.pct >= 70
                          ? 'linear-gradient(90deg, #2ed573, #7bed9f)'
                          : 'linear-gradient(90deg, #ff4757, #ff6b81)',
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Palabras */}
              <h3 style={{ marginBottom: '0.75rem', fontSize: '1.1rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                Resultado palabra a palabra (haz clic en una palabra para ver su pronunciación visual y recomendaciones):
              </h3>
              <div className="cac-words-row" style={{ marginBottom: '2rem' }}>
                {evaluation.map((wordData, idx) => (
                  <div
                    key={idx}
                    className={`cac-word-chip ${wordData.correct ? 'correct' : 'wrong'} ${selectedWord?.word === wordData.word ? 'selected' : ''}`}
                    onClick={() => getDetails(wordData)}
                    style={{
                      borderWidth: selectedWord?.word === wordData.word ? '2px' : '1px',
                      boxShadow: selectedWord?.word === wordData.word
                        ? (wordData.correct ? '0 0 15px rgba(46, 213, 115, 0.4)' : '0 0 15px rgba(255, 71, 87, 0.4)')
                        : 'none',
                      transform: selectedWord?.word === wordData.word ? 'translateY(-2px)' : 'none'
                    }}
                    title={wordData.correct
                      ? `✅ Correcto\nFonemas: ${wordData.expected_phonemes}\nClic para ver posiciones`
                      : `❌ Incorrecto\nEsperado: ${wordData.expected_phonemes}\nDetectado: ${wordData.actual_phonemes}\nClic para ver recomendaciones`
                    }
                  >
                    <span className="cac-word-icon">{wordData.correct ? '✓' : '✗'}</span>
                    {wordData.word}
                    {!wordData.correct && (
                      <div className="cac-word-tooltip">
                        <div className="cac-tooltip-row">
                          <span className="cac-tooltip-label">Esperado:</span>
                          <span className="cac-tooltip-val">{wordData.expected_phonemes}</span>
                        </div>
                        <div className="cac-tooltip-row">
                          <span className="cac-tooltip-label">Detectado:</span>
                          <span className="cac-tooltip-val">{wordData.actual_phonemes}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Panel de detalle de fonemas y recomendaciones de IA */}
              {selectedWord && (
                <div className="cac-details-panel" style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '20px',
                  padding: '1.5rem',
                  marginBottom: '2rem',
                  animation: 'fadeInUp 0.4s ease forwards'
                }}>
                  <div className="cac-details-header" style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                    paddingBottom: '0.75rem',
                    marginBottom: '1.25rem'
                  }}>
                    <h4 style={{ margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                      Detalle para: <span className="cac-details-word" style={{ color: 'var(--accent)', fontWeight: 'bold' }}>"{selectedWord.word}"</span>
                      <span className={`cac-details-badge ${selectedWord.correct ? 'correct' : 'wrong'}`} style={{
                        fontSize: '0.75rem',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '6px',
                        fontWeight: 'bold',
                        background: selectedWord.correct ? 'rgba(46, 213, 115, 0.12)' : 'rgba(255, 71, 87, 0.12)',
                        color: selectedWord.correct ? '#2ed573' : '#ff4757',
                        border: selectedWord.correct ? '1px solid rgba(46, 213, 115, 0.25)' : '1px solid rgba(255, 71, 87, 0.25)',
                        whiteSpace: 'nowrap'
                      }}>
                        {selectedWord.correct ? 'Correcto' : 'Por mejorar'}
                      </span>
                    </h4>
                    <button className="cac-details-close" onClick={() => setSelectedWord(null)} style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-muted)',
                      fontSize: '1.2rem',
                      cursor: 'pointer',
                      padding: '0.2rem 0.5rem',
                      lineHeight: 1,
                      flexShrink: 0
                    }}>✕</button>
                  </div>

                  <div className="cac-details-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* Visualización de la secuencia de fonemas */}
                    <div className="cac-phoneme-section">
                      <h5 style={{ margin: '0 0 0.75rem 0', fontSize: '0.95rem', color: 'var(--text-muted)' }}>Posiciones recomendadas de la boca:</h5>
                      <div className="cac-phoneme-sequence" style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                        {selectedWord.expected_phonemes.split(' ').map((ph, pIdx) => {
                          const viseme = getPhonemeViseme(ph);
                          const visemeLabelSp = {
                            closed: 'Bilabial (Cerrada)',
                            labiodental: 'Labiodental (Dientes-Labio)',
                            dental: 'Dental (Lengua-Dientes)',
                            rounded: 'Redondeada (Fruncida)',
                            'wide-open': 'Abierta (Ancha)',
                            'open-smile': 'Semiabierta (Sonrisa)',
                            clenched: 'Sibilante (Dientes juntos)',
                            neutral: 'Relajada (Neutral)'
                          }[viseme] || 'Relajada (Neutral)';

                          return (
                            <div key={pIdx} className="cac-phoneme-card" style={{
                              background: 'rgba(255, 255, 255, 0.02)',
                              border: '1px solid rgba(255, 255, 255, 0.06)',
                              borderRadius: '12px',
                              padding: '0.75rem',
                              textAlign: 'center',
                              minWidth: '115px',
                              flex: '0 0 auto',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              gap: '0.5rem'
                            }}>
                              <div className="cac-phoneme-char" style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#fff' }}>/{ph}/</div>
                              <div className="cac-mouth-svg-container" style={{ width: '60px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <MouthSVG viseme={viseme} />
                              </div>
                              <div className="cac-phoneme-label" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.2' }}>{visemeLabelSp}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Botón explícito para recomendaciones de IA */}
                    {!selectedWord.correct && !detailsLoading && !details && (
                      <div style={{ borderTop: '1px dashed rgba(255,255,255,0.08)', paddingTop: '1.25rem', textAlign: 'center' }}>
                        <button
                          className="btn btn-primary"
                          style={{
                            background: 'linear-gradient(135deg, #7c3aed, #db2777)',
                            border: 'none',
                            borderRadius: '12px',
                            padding: '0.65rem 1.5rem',
                            fontSize: '0.95rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                            color: '#fff',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            boxShadow: '0 0 18px rgba(139,92,246,0.35)',
                            transition: 'box-shadow 0.2s'
                          }}
                          onClick={getAIRecommendation}
                        >
                          ✨ Recomendaciones con IA
                        </button>
                        <p style={{ marginTop: '0.5rem', fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          Analiza tus fonemas con Gemini
                        </p>
                      </div>
                    )}

                    {/* Spinner mientras carga */}
                    {!selectedWord.correct && detailsLoading && (
                      <div style={{ borderTop: '1px dashed rgba(255,255,255,0.08)', paddingTop: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                        <span style={{
                          width: '18px', height: '18px',
                          border: '2px solid rgba(255,255,255,0.1)',
                          borderTopColor: 'var(--accent)',
                          borderRadius: '50%',
                          animation: 'spin 1s linear infinite',
                          display: 'inline-block',
                          flexShrink: 0
                        }}></span>
                        {retryWaitMessage || 'Consultando con la IA…'}
                      </div>
                    )}

                    {/* Error de cuota/red */}
                    {!selectedWord.correct && !detailsLoading && generalError && !details && (
                      <div style={{ borderTop: '1px dashed rgba(255,255,255,0.08)', paddingTop: '1.25rem' }}>
                        {generalError === 'quota_exhausted' ? (
                          <div className="quota-exhausted-banner">
                            <span className="quota-icon">🚫</span>
                            <div><strong>Límite diario alcanzado</strong><p>Intenta mañana.</p></div>
                          </div>
                        ) : generalError === 'rate_limit_exceeded' ? (
                          <div className="quota-exhausted-banner">
                            <span className="quota-icon">⏳</span>
                            <div><strong>Demasiadas peticiones</strong><p>Espera un momento y vuelve a intentar.</p></div>
                          </div>
                        ) : (
                          <div className="detail-error-banner">⚠️ {generalError}</div>
                        )}
                        <div style={{ textAlign: 'center', marginTop: '0.75rem' }}>
                          <button
                            className="btn btn-primary"
                            style={{
                              background: 'linear-gradient(135deg, #7c3aed, #db2777)',
                              border: 'none', borderRadius: '12px',
                              padding: '0.55rem 1.25rem', fontSize: '0.88rem',
                              fontWeight: '600', cursor: 'pointer', color: '#fff',
                              display: 'inline-flex', alignItems: 'center', gap: '0.4rem'
                            }}
                            onClick={getAIRecommendation}
                          >
                            🔁 Reintentar
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Resultado de IA */}
                    {!selectedWord.correct && details && (
                      <div style={{ borderTop: '1px dashed rgba(255,255,255,0.08)', paddingTop: '1.25rem' }}>
                        <h5 style={{ margin: '0 0 0.75rem 0', fontSize: '0.95rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          💡 Recomendación de la IA
                        </h5>
                        <div style={{
                          background: 'rgba(0,242,254,0.05)',
                          border: '1px solid rgba(0,242,254,0.18)',
                          borderRadius: '12px',
                          padding: '1rem',
                          fontSize: '0.95rem',
                          color: 'var(--text-light)',
                          lineHeight: '1.7'
                        }}>
                          <p style={{ margin: 0 }}>
                            {details.split(/(?<![a-zA-Z])'(.+?)'/g).map((part, i) =>
                              i % 2 === 1
                                ? <span key={i} style={{ color: 'var(--accent)', fontWeight: 'bold' }}>"{part}"</span>
                                : <span key={i}>{part}</span>
                            )}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Feedback general */}
              <div className="cac-feedback-banner">
                {stats.pct === 100 && <span>🎉 ¡Pronunciación perfecta! Eres increíble.</span>}
                {stats.pct >= 70 && stats.pct < 100 && <span>👍 Buena pronunciación. Sigue practicando los fonemas en rojo.</span>}
                {stats.pct < 70 && <span>💪 Sigue adelante. La práctica hace al maestro — repite las palabras en rojo.</span>}
              </div>

              {/* Botón reintentar */}
              <button
                className="btn btn-secondary"
                style={{ marginTop: '1rem', width: '100%' }}
                onClick={() => {
                  setEvaluation(null);
                  setSelectedWord(null);
                  setDetails(null);
                }}
              >
                🔄 Intentar de nuevo
              </button>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
