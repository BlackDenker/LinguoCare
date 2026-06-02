import React from 'react';

// ── Mapping English IPA phonetic symbols to viseme categories ──────────────
export function getPhonemeViseme(phoneme) {
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

export function MouthSVG({ viseme }) {
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
