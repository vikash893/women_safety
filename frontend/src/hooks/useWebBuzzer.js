import { useRef, useCallback, useEffect } from 'react';

/**
 * useWebBuzzer Hook — AegisHer Women Safety Platform
 *
 * Synthesizes a piercing emergency siren using the Web Audio API.
 * Creates a sawtooth oscillator that wails between 600 Hz and 1200 Hz
 * via a setInterval loop, mimicking a real emergency vehicle siren.
 *
 * Exports:
 *   startSiren()  — Resumes the AudioContext (if suspended) and begins the wail.
 *   stopSiren()   — Gracefully stops audio, clears timers, and releases hardware.
 */
export function useWebBuzzer() {
  // ─── Persistent refs across re-renders ───────────────────────────
  const audioCtxRef   = useRef(null);   // AudioContext instance
  const oscRef        = useRef(null);   // OscillatorNode
  const gainRef       = useRef(null);   // GainNode (master volume)
  const intervalRef   = useRef(null);   // setInterval ID for the wail loop
  const isGoingUpRef  = useRef(true);   // tracks current sweep direction

  // ─── CONSTANTS ───────────────────────────────────────────────────
  const LOW_FREQ      = 600;    // Hz — bottom of the siren sweep
  const HIGH_FREQ     = 1200;   // Hz — top of the siren sweep
  const SWEEP_TICK_MS = 450;    // ms — interval between frequency ramps
  const RAMP_TIME_S   = 0.4;   // seconds — duration of each linearRamp

  // ═══════════════════════════════════════════════════════════════════
  //  1.  START SIREN
  // ═══════════════════════════════════════════════════════════════════
  const startSiren = useCallback(() => {
    // Guard: don't stack multiple sirens
    if (oscRef.current) return;

    try {
      // ── 1a. Create or reuse AudioContext (handle webkit prefix) ──
      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
        const AudioContextClass =
          window.AudioContext || window.webkitAudioContext;

        if (!AudioContextClass) {
          console.warn('[useWebBuzzer] Web Audio API is not supported.');
          return;
        }

        audioCtxRef.current = new AudioContextClass();
      }

      const audioCtx = audioCtxRef.current;

      // ── 1b. Resume suspended context (browser autoplay policy) ──
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }

      // ── 1c. Build the audio graph ───────────────────────────────
      //   OscillatorNode (sawtooth) → GainNode → destination (speakers)
      const osc = audioCtx.createOscillator();
      osc.type = 'sawtooth';                // piercing, high-attention waveform
      osc.frequency.setValueAtTime(LOW_FREQ, audioCtx.currentTime);
      oscRef.current = osc;

      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(0, audioCtx.currentTime);
      // Soft fade-in over 150 ms to avoid speaker pop
      gain.gain.linearRampToValueAtTime(0.55, audioCtx.currentTime + 0.15);
      gainRef.current = gain;

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();

      // ── 1d. Frequency oscillation loop (the siren "wail") ──────
      isGoingUpRef.current = true;

      intervalRef.current = setInterval(() => {
        if (!oscRef.current || !audioCtxRef.current) return;

        const ctx = audioCtxRef.current;
        const targetFreq = isGoingUpRef.current ? HIGH_FREQ : LOW_FREQ;

        // Smooth ramp to the target frequency over RAMP_TIME_S seconds
        oscRef.current.frequency.linearRampToValueAtTime(
          targetFreq,
          ctx.currentTime + RAMP_TIME_S,
        );

        // Flip direction for the next tick
        isGoingUpRef.current = !isGoingUpRef.current;
      }, SWEEP_TICK_MS);

    } catch (err) {
      console.error('[useWebBuzzer] Failed to start siren:', err);
    }
  }, []);

  // ═══════════════════════════════════════════════════════════════════
  //  2.  STOP SIREN
  // ═══════════════════════════════════════════════════════════════════
  const stopSiren = useCallback(() => {
    try {
      // ── 2a. Clear the wail interval ─────────────────────────────
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      // ── 2b. Fade out the gain to avoid a harsh click ────────────
      const audioCtx  = audioCtxRef.current;
      const gain      = gainRef.current;

      if (audioCtx && gain) {
        const now = audioCtx.currentTime;
        gain.gain.cancelScheduledValues(now);
        gain.gain.setValueAtTime(gain.gain.value, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.12);
      }

      // ── 2c. Tear down nodes after the fade completes ────────────
      setTimeout(() => {
        if (oscRef.current) {
          try { oscRef.current.stop(); } catch (_) { /* already stopped */ }
          oscRef.current.disconnect();
          oscRef.current = null;
        }

        if (gainRef.current) {
          gainRef.current.disconnect();
          gainRef.current = null;
        }

        // Close the context to release hardware resources
        if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
          audioCtxRef.current.close().catch(() => {});
          audioCtxRef.current = null;
        }
      }, 150); // matches the fade-out duration
    } catch (err) {
      console.error('[useWebBuzzer] Failed to stop siren:', err);
    }
  }, []);

  // ═══════════════════════════════════════════════════════════════════
  //  3.  CLEANUP on unmount / view change
  //      Prevents memory leaks and phantom audio when the component
  //      that called this hook is removed from the tree.
  // ═══════════════════════════════════════════════════════════════════
  useEffect(() => {
    return () => {
      // Clear any running interval
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      // Stop the oscillator immediately (no fade needed on unmount)
      if (oscRef.current) {
        try { oscRef.current.stop(); } catch (_) {}
        oscRef.current.disconnect();
        oscRef.current = null;
      }

      if (gainRef.current) {
        gainRef.current.disconnect();
        gainRef.current = null;
      }

      // Release the AudioContext
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
    };
  }, []);

  // ═══════════════════════════════════════════════════════════════════
  //  Public API
  // ═══════════════════════════════════════════════════════════════════
  return { startSiren, stopSiren };
}
