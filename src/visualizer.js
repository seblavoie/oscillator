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

      /* === Deep binaural beat layer === */
      const beatFreq = 4; // Hz difference between ears (theta range)
      const carrier = 120; // base carrier frequency

      const leftBeat = new Tone.Oscillator(
        carrier - beatFreq / 2,
        "sine"
      ).start();
      const rightBeat = new Tone.Oscillator(
        carrier + beatFreq / 2,
        "sine"
      ).start();

      const panLeftBeat = new Tone.Panner(-1);
      const panRightBeat = new Tone.Panner(1);

      const beatGain = new Tone.Gain(0.08);

      leftBeat.connect(panLeftBeat).connect(beatGain);
      rightBeat.connect(panRightBeat).connect(beatGain);

      beatGain.connect(Tone.Destination);

      // Very slow amplitude modulation to make it breathe
      const ampLFO = new Tone.LFO("0.03hz", 0, 0.12).start(); // breathe between 0–0.12
      ampLFO.connect(beatGain.gain);
    }

    const startBtn = document.getElementById("startBtn");
    startBtn.addEventListener("click", async () => {
      startBtn.style.display = "none";
      try {
        await startTone();
      } catch (err) {
        console.error("Failed to start audio", err);
      }

      // Enter fullscreen
      const root = document.documentElement;
      if (!document.fullscreenElement && root.requestFullscreen) {
        try {
          await root.requestFullscreen();
        } catch (e) {}
      }
    });

    // Node to route Tone audio into visualizer
    const vizGain = audioCtx.createGain();
    Tone.Destination.connect(vizGain);

    const canvas = document.getElementById("visualizer");
    const viz = butterchurn.createVisualizer(audioCtx, canvas, {
      width: window.innerWidth,
      height: window.innerHeight,
    });
    viz.connectAudio(vizGain);

    let presets = { ...butterchurnPresets.getPresets() };
    if (window.butterchurnPresetsExtra?.getPresets) {
      Object.assign(presets, window.butterchurnPresetsExtra.getPresets());
    }

    const keys = Object.keys(presets).sort((a, b) => a.localeCompare(b));

    let currentIndex = 0;
    const loadPreset = (presetKey, blend = 0) => {
      viz.loadPreset(presets[presetKey], blend);
      select.value = presetKey;
      currentIndex = keys.indexOf(presetKey);
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

    // Fullscreen button
    const fsBtn = document.getElementById("fsBtn");
    fsBtn.addEventListener("click", () => {
      const el = document.documentElement;
      if (!document.fullscreenElement) {
        el.requestFullscreen?.();
      } else {
        document.exitFullscreen?.();
      }
    });

    // Controls appear only when cursor near bottom 100px
    const micBtn = document.getElementById("micBtn");
    const toneBtn = document.getElementById("toneBtn");

    const controls = [select, fsBtn, micBtn, toneBtn];

    let visible = false;
    const setVisibility = (vis) => {
      if (visible === vis) return;
      visible = vis;
      controls.forEach((c) => (c.style.opacity = vis ? "1" : "0"));
    };

    window.addEventListener("mousemove", (e) => {
      const fromBottom = window.innerHeight - e.clientY;
      if (fromBottom < 120) {
        setVisibility(true);
      } else {
        setVisibility(false);
      }
    });

    // Space bar cycles to next preset
    window.addEventListener("keydown", (e) => {
      if (e.code === "Space") {
        currentIndex = (currentIndex + 1) % keys.length;
        loadPreset(keys[currentIndex], 2.7);
      }
    });

    /* === Microphone toggle === */
    let micActive = false;
    let micStream = null;
    let micSource = null;

    async function toggleMic() {
      if (!micActive) {
        try {
          micStream = await navigator.mediaDevices.getUserMedia({
            audio: true,
          });
          micSource = audioCtx.createMediaStreamSource(micStream);
          const micGain = new Tone.Gain(1);
          micSource.connect(micGain);
          micGain.connect(vizGain);
          micGain.connect(audioCtx.destination);
          micActive = true;
          micBtn.textContent = "Mic✓";
        } catch (err) {
          console.error("Mic error", err);
        }
      } else {
        if (micSource) {
          micSource.disconnect();
        }
        if (micStream) {
          micStream.getTracks().forEach((t) => t.stop());
        }
        micActive = false;
        micBtn.textContent = "Mic";
      }
    }
    micBtn.addEventListener("click", toggleMic);

    /* === Tone toggle === */
    let toneActive = true;
    function toggleTone() {
      toneActive = !toneActive;
      Tone.Destination.mute = !toneActive;
      toneBtn.textContent = toneActive ? "Tone✓" : "Tone";
    }
    toneBtn.addEventListener("click", toggleTone);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
