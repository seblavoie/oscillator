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

    // Audio input state
    let isMicrophoneActive = false;
    let microphoneStream = null;
    let microphoneSource = null;
    let toneAudioActive = false;

    // Tone.js audio nodes storage
    let toneNodes = {
      oscillators: [],
      lfos: [],
      noise: null,
      filters: [],
      gains: [],
      panners: [],
    };

    // Audio routing nodes
    const vizGain = audioCtx.createGain();
    let currentAudioSource = null;

    // Function to switch audio input
    async function switchToMicrophone() {
      if (isMicrophoneActive) return;

      try {
        // Stop all Tone.js audio nodes
        if (toneAudioActive) {
          // Stop all oscillators
          toneNodes.oscillators.forEach((osc) => osc.stop());

          // Stop all LFOs
          toneNodes.lfos.forEach((lfo) => lfo.stop());

          // Stop noise
          if (toneNodes.noise) {
            toneNodes.noise.stop();
          }

          // Disconnect from visualizer
          Tone.Destination.disconnect(vizGain);
          toneAudioActive = false;
        }

        // Get microphone stream
        microphoneStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          },
        });

        // Create audio source from microphone
        microphoneSource = audioCtx.createMediaStreamSource(microphoneStream);
        microphoneSource.connect(vizGain);
        currentAudioSource = microphoneSource;

        isMicrophoneActive = true;
        updateInputButton();

        console.log("Switched to microphone input");
      } catch (err) {
        console.error("Failed to access microphone:", err);
        alert("Failed to access microphone. Please check permissions.");
      }
    }

    async function switchToTone() {
      if (!isMicrophoneActive) return;

      // Stop microphone
      if (microphoneSource) {
        microphoneSource.disconnect(vizGain);
        microphoneSource = null;
      }
      if (microphoneStream) {
        microphoneStream.getTracks().forEach((track) => track.stop());
        microphoneStream = null;
      }

      // Restart all Tone.js audio nodes
      if (!toneAudioActive) {
        // Restart all oscillators
        toneNodes.oscillators.forEach((osc) => osc.start());

        // Restart all LFOs
        toneNodes.lfos.forEach((lfo) => lfo.start());

        // Restart noise
        if (toneNodes.noise) {
          toneNodes.noise.start();
        }

        // Reconnect to visualizer
        Tone.Destination.connect(vizGain);
        toneAudioActive = true;
      }

      isMicrophoneActive = false;
      currentAudioSource = null;
      updateInputButton();

      console.log("Switched to Tone.js input");
    }

    function updateInputButton() {
      const inputBtn = document.getElementById("inputBtn");
      if (inputBtn) {
        inputBtn.textContent = isMicrophoneActive ? "🎤" : "🎵";
        inputBtn.title = isMicrophoneActive
          ? "Switch to Tone.js"
          : "Switch to Microphone";
      }
    }

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

      // Store references to all audio nodes for later control
      toneNodes.oscillators = [oscL, oscR, sub, fifth, leftBeat, rightBeat];
      toneNodes.lfos = [lfo, ampLFO];
      toneNodes.noise = noise;
      toneNodes.filters = [subFilter, noiseFilter];
      toneNodes.gains = [subGain, noiseGain, beatGain];
      toneNodes.panners = [panL, panR, panLeftBeat, panRightBeat];

      // Mark Tone.js as active and connect to visualizer
      toneAudioActive = true;
      Tone.Destination.connect(vizGain);
    }

    const startToneBtn = document.getElementById("startToneBtn");
    const startMicBtn = document.getElementById("startMicBtn");

    startToneBtn.addEventListener("click", async () => {
      startToneBtn.style.display = "none";
      startMicBtn.style.display = "none";
      try {
        await startTone();
        isMicrophoneActive = false;
        updateInputButton();
      } catch (err) {
        console.error("Failed to start Tone.js audio", err);
      }

      // Enter fullscreen
      const root = document.documentElement;
      if (!document.fullscreenElement && root.requestFullscreen) {
        try {
          await root.requestFullscreen();
        } catch (e) {}
      }
    });

    startMicBtn.addEventListener("click", async () => {
      startToneBtn.style.display = "none";
      startMicBtn.style.display = "none";
      try {
        await startTone(); // Initialize Tone.js context
        await switchToMicrophone(); // Switch to microphone input
      } catch (err) {
        console.error("Failed to start microphone audio", err);
      }

      // Enter fullscreen
      const root = document.documentElement;
      if (!document.fullscreenElement && root.requestFullscreen) {
        try {
          await root.requestFullscreen();
        } catch (e) {}
      }
    });

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

    // Input toggle button
    const inputBtn = document.createElement("button");
    inputBtn.id = "inputBtn";
    inputBtn.textContent = "🎵";
    inputBtn.title = "Switch to Microphone";
    document.body.appendChild(inputBtn);

    inputBtn.addEventListener("click", async () => {
      if (isMicrophoneActive) {
        await switchToTone();
      } else {
        await switchToMicrophone();
      }
    });

    // Controls appear only when cursor near bottom 100px
    const controls = [select, fsBtn, inputBtn];

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
  }

  document.addEventListener("DOMContentLoaded", init);
})();
