'use client';

/**
 * ==============================================================================
 * TELEMED SENEGAL V2 — MOTEUR AUDIO CENTRALISÉ (WEB AUDIO API)
 * Synthèse audio mathématique native : 0 Ko de téléchargement réseau, instantané,
 * sans latence, 100% résilient hors-ligne et compatible avec les politiques autoplay.
 * ==============================================================================
 */

const AUDIO_MUTED_STORAGE_KEY = 'telemed_audio_muted';
const AUDIO_MUTED_EVENT = 'telemed_audio_muted_changed';

let sharedAudioCtx: AudioContext | null = null;

/**
 * Récupère ou instancie paresseusement l'AudioContext standard
 */
export function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;

  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return null;

    if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
      sharedAudioCtx = new AudioContextClass();
    }

    if (sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().catch(() => {});
    }

    return sharedAudioCtx;
  } catch (err) {
    console.warn('AudioContext initialization notice:', err);
    return null;
  }
}

/**
 * Débloque l'audio sur interaction utilisateur (politique autoplay mobile iOS/Android)
 */
export function ensureAudioUnlocked() {
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
}

/**
 * Indique si les alertes sonores sont actuellement en sourdine
 */
export function isSoundMuted(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(AUDIO_MUTED_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * Définit l'état silencieux global
 */
export function setSoundMuted(muted: boolean) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(AUDIO_MUTED_STORAGE_KEY, muted ? 'true' : 'false');
    window.dispatchEvent(new CustomEvent(AUDIO_MUTED_EVENT, { detail: { muted } }));
  } catch (err) {
    console.warn('Erreur de persistance audio mute:', err);
  }
}

/**
 * Alterne l'état silencieux et notifie les composants
 */
export function toggleSoundMuted(): boolean {
  const next = !isSoundMuted();
  setSoundMuted(next);
  return next;
}

/**
 * Écoute les changements d'état silencieux pour réactivité d'interface
 */
export function listenToSoundMuted(callback: (muted: boolean) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = (e: any) => {
    callback(Boolean(e.detail?.muted));
  };
  window.addEventListener(AUDIO_MUTED_EVENT, handler);
  return () => window.removeEventListener(AUDIO_MUTED_EVENT, handler);
}

/**
 * 🔔 Sonnerie d'appel visio entrant en boucle pour le patient
 * Accord polyphonique harmonieux (Ré5 & La5 puis Mi5 & Si5)
 * Cycle de 3 secondes (1,8s de sonnerie + 1,2s de silence).
 * Renvoie une fonction stop() sans clic sonore.
 */
export function startIncomingCallRing(): () => void {
  if (typeof window === 'undefined') return () => {};

  let isStopped = false;
  let intervalId: any = null;
  let activeNodes: { osc: OscillatorNode; gain: GainNode }[] = [];

  const playRingBurst = () => {
    if (isStopped || isSoundMuted()) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    const playChord = (freq1: number, freq2: number, startTime: number, duration: number) => {
      if (isStopped) return;

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'triangle';

      osc1.frequency.setValueAtTime(freq1, startTime);
      osc2.frequency.setValueAtTime(freq2, startTime);

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.22, startTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(startTime);
      osc2.start(startTime);
      osc1.stop(startTime + duration);
      osc2.stop(startTime + duration);

      activeNodes.push({ osc: osc1, gain }, { osc: osc2, gain });
    };

    // Motif en deux notes ascendantes chaleureuses
    playChord(587.33, 880.00, now, 0.6); // Ré5 + La5
    playChord(659.25, 987.77, now + 0.65, 0.85); // Mi5 + Si5
  };

  playRingBurst();
  intervalId = setInterval(playRingBurst, 3000);

  return () => {
    isStopped = true;
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
    const ctx = getAudioContext();
    if (ctx) {
      const now = ctx.currentTime;
      activeNodes.forEach(({ osc, gain }) => {
        try {
          gain.gain.setValueAtTime(gain.gain.value, now);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);
          setTimeout(() => {
            try {
              osc.stop();
              osc.disconnect();
            } catch {}
          }, 50);
        } catch {}
      });
    }
    activeNodes = [];
  };
}

/**
 * 📞 Tonalité d'attente d'appel sortant pour le praticien ("Tuuut... Tuuut...")
 * Fréquence 440 Hz sinusoïdale douce (1,2s tonalité / 2,5s silence)
 * Renvoie une fonction stop().
 */
export function startOutgoingCallRing(): () => void {
  if (typeof window === 'undefined') return () => {};

  let isStopped = false;
  let intervalId: any = null;
  let activeNode: { osc: OscillatorNode; gain: GainNode } | null = null;

  const playTone = () => {
    if (isStopped || isSoundMuted()) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.12, now + 0.08);
    gain.gain.setValueAtTime(0.12, now + 1.15);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.25);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 1.25);

    activeNode = { osc, gain };
  };

  playTone();
  intervalId = setInterval(playTone, 3700);

  return () => {
    isStopped = true;
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
    if (activeNode) {
      try {
        const ctx = getAudioContext();
        if (ctx) {
          const now = ctx.currentTime;
          activeNode.gain.gain.setValueAtTime(activeNode.gain.gain.value, now);
          activeNode.gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);
          setTimeout(() => {
            try {
              activeNode?.osc.stop();
              activeNode?.osc.disconnect();
            } catch {}
          }, 50);
        }
      } catch {}
      activeNode = null;
    }
  };
}

/**
 * 💬 Bip sonore discret lors de la réception d'un nouveau message ou note vocale
 * Effet goutte d'eau / pop médical doux (140 ms)
 */
export function playMessagePopSound() {
  if (typeof window === 'undefined' || isSoundMuted()) return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    // Glissé harmonique ascendant rapide
    osc.frequency.setValueAtTime(784.00, now); // Sol5
    osc.frequency.exponentialRampToValueAtTime(1046.50, now + 0.08); // Do6

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.14);
  } catch (err) {
    console.warn('Erreur playMessagePopSound:', err);
  }
}

/**
 * 🟢 Signal sonore de liaison visio établie (accord ascendant C5-E5-G5)
 */
export function playCallConnectedSound() {
  if (typeof window === 'undefined' || isSoundMuted()) return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const notes = [523.25, 659.25, 783.99]; // Do5, Mi5, Sol5
    const now = ctx.currentTime;

    notes.forEach((freq, idx) => {
      const startTime = now + idx * 0.09;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.16, startTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.22);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.22);
    });
  } catch (err) {
    console.warn('Erreur playCallConnectedSound:', err);
  }
}

/**
 * 🔴 Signal sonore de fin de consultation (accord descendant G4-E4-C4)
 */
export function playCallEndedSound() {
  if (typeof window === 'undefined' || isSoundMuted()) return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const notes = [392.00, 329.63, 261.63]; // Sol4, Mi4, Do4
    const now = ctx.currentTime;

    notes.forEach((freq, idx) => {
      const startTime = now + idx * 0.08;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.14, startTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.25);
    });
  } catch (err) {
    console.warn('Erreur playCallEndedSound:', err);
  }
}

/**
 * 🏥 Douce alerte sonore médicale harmonique (nouveau patient en file d'attente)
 */
export function playMedicalChime() {
  if (typeof window === 'undefined' || isSoundMuted()) return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Premier son (Note Ré5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.18, now + 0.04);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.4);

    // Second son harmonieux (Note La5)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880.00, now + 0.12);
    gain2.gain.setValueAtTime(0, now + 0.12);
    gain2.gain.linearRampToValueAtTime(0.22, now + 0.16);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.7);
  } catch (err) {
    console.warn('Audio playback error:', err);
  }
}
