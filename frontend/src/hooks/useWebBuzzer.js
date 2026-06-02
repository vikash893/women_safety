import { useRef, useCallback } from 'react';

/**
 * useWebBuzzer Hook (AegisHer Safety platform)
 * Programmatically synthesizes an emergency siren utilizing HTML5 Web Audio API.
 * Modulates sweep pitch between 800Hz and 1200Hz to trigger local audio alarms.
 */
export function useWebBuzzer() {
  const audioCtxRef = useRef(null);
  const oscRef = useRef(null);
  const lfoRef = useRef(null);
  const volumeNodeRef = useRef(null);

  const startBuzzer = useCallback(() => {
    if (audioCtxRef.current) return;

    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) {
        console.warn('Web Audio API is not supported in this browser.');
        return;
      }
      
      const audioCtx = new AudioContextClass();
      audioCtxRef.current = audioCtx;

      const osc = audioCtx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = 1000; // Base frequency (Hz)
      oscRef.current = osc;

      const lfo = audioCtx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 2.5; // pitch changes 2.5 times per second
      lfoRef.current = lfo;

      const lfoGain = audioCtx.createGain();
      lfoGain.gain.value = 200; // sweep +/- 200Hz (ranges 800Hz - 1200Hz)

      const volumeNode = audioCtx.createGain();
      volumeNode.gain.setValueAtTime(0, audioCtx.currentTime);
      volumeNode.gain.linearRampToValueAtTime(0.5, audioCtx.currentTime + 0.15); // soft fade-in
      volumeNodeRef.current = volumeNode;

      // FM Connections: LFO -> Gain -> main oscillator frequency input
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);

      // Output Connections: Osc -> Volume -> Speakers
      osc.connect(volumeNode);
      volumeNode.connect(audioCtx.destination);

      osc.start();
      lfo.start();

      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
    } catch (err) {
      console.error('Failed to initiate local alarm siren:', err);
    }
  }, []);

  const stopBuzzer = useCallback(() => {
    try {
      if (audioCtxRef.current) {
        const audioCtx = audioCtxRef.current;
        const volumeNode = volumeNodeRef.current;

        if (volumeNode) {
          volumeNode.gain.cancelScheduledValues(audioCtx.currentTime);
          volumeNode.gain.setValueAtTime(volumeNode.gain.value, audioCtx.currentTime);
          volumeNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.12);
        }

        setTimeout(() => {
          if (oscRef.current) {
            try { oscRef.current.stop(); } catch (e) {}
            oscRef.current = null;
          }
          if (lfoRef.current) {
            try { lfoRef.current.stop(); } catch (e) {}
            lfoRef.current = null;
          }
          if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
            audioCtxRef.current.close();
            audioCtxRef.current = null;
          }
        }, 150);
      }
    } catch (err) {
      console.error('Failed to terminate buzzer securely:', err);
    }
  }, []);

  return { startBuzzer, stopBuzzer };
}
