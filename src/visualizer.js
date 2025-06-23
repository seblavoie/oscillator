// Plain browser script to start Butterchurn visualiser without any bundler.
(() => {
  const PRESET_NAME = "$$$ Royal - mashup (326)";

  function init() {
    const butterchurn = window.butterchurn?.createVisualizer
      ? window.butterchurn
      : window.butterchurn?.default;
    const butterchurnPresets = window.butterchurnPresets?.getPresets
      ? window.butterchurnPresets
      : window.butterchurnPresets?.default;
    if (!butterchurn || !butterchurnPresets) {
      console.error("Butterchurn libs not loaded");
      return;
    }

    // Tone.js context (shared WebAudio context)
    const Tone = window.Tone;
    if (!Tone) {
      console.error("Tone.js not loaded");
      return;
    }

    const audioCtx = Tone.getContext().rawContext;

    /* === Rich ambient stack === */
    async function startTone() {
      await Tone.start();

      const base = 60;
      const offset = 1.5;

      // Global fade-in (3 seconds)
      Tone.Destination.volume.value = -Infinity;
      Tone.Destination.volume.rampTo(0, 3);

      // Left sine wave
      const oscL = new Tone.Oscillator(base, "sine").start();
      const panL = new Tone.Panner(-1);
      oscL.volume.value = -12;
      oscL.connect(panL).connect(Tone.Destination);

      // Right sine wave
      const oscR = new Tone.Oscillator(base + offset, "sine").start();
      const panR = new Tone.Panner(1);
      oscR.volume.value = -12;
      oscR.connect(panR).connect(Tone.Destination);

      // Sub saw layer with filter
      const sub = new Tone.Oscillator(30, "sawtooth").start();
      const subFilter = new Tone.Filter(100, "lowpass");
      const subGain = new Tone.Gain(0.4);
      sub.chain(subFilter, subGain, Tone.Destination);

      const lfo = new Tone.LFO("0.02hz", 60, 200);
      lfo.connect(subFilter.frequency).start();

      // Brown noise pad
      const noise = new Tone.Noise("brown").start();
      const noiseFilter = new Tone.Filter(500, "lowpass");
      const noiseGain = new Tone.Gain(0.05);
      noise.chain(noiseFilter, noiseGain, Tone.Destination);

      // Detuned fifth
      const fifth = new Tone.Oscillator(base * 1.5 + 0.3, "sine").start();
      fifth.volume.value = -20;
      fifth.connect(Tone.Destination);
    }

    let toneStarted = false;
    const tryStartTone = () => {
      if (toneStarted) return;
      startTone()
        .then(() => (toneStarted = true))
        .catch(() => {});
    };

    tryStartTone(); // attempt autoplay

    // Fallback on first user interaction
    window.addEventListener("pointerdown", tryStartTone, { once: true });

    // Node to route Tone audio into visualizer
    const vizGain = audioCtx.createGain();
    Tone.Destination.connect(vizGain);

    const canvas = document.getElementById("visualizer");
    const viz = butterchurn.createVisualizer(audioCtx, canvas, {
      width: window.innerWidth,
      height: window.innerHeight,
    });
    viz.connectAudio(vizGain);

    const presets = butterchurnPresets.getPresets();
    const keys = Object.keys(presets).sort((a, b) => a.localeCompare(b));

    // helper to load
    const loadPreset = (presetKey, blend = 0) => {
      viz.loadPreset(presets[presetKey], blend);
      select.value = presetKey;
    };

    // Build dropdown
    const select = document.createElement("select");
    select.id = "presetSelect";
    keys.forEach((k) => {
      const o = document.createElement("option");
      o.value = k;
      o.textContent = k;
      select.appendChild(o);
    });
    document.body.appendChild(select);

    select.addEventListener("change", () => {
      loadPreset(select.value, 2.7);
    });

    let key =
      keys.find((k) => k === PRESET_NAME) ||
      keys.find((k) => k.toLowerCase() === PRESET_NAME.toLowerCase()) ||
      keys.find((k) => k.toLowerCase().includes("royal - mashup"));
    if (!key) key = keys[0];

    loadPreset(key, 0);

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      viz.setRendererSize(canvas.width, canvas.height);
    }
    window.addEventListener("resize", resize);
    resize();

    (function loop() {
      viz.render();
      requestAnimationFrame(loop);
    })();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
