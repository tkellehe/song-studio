// Global audio objects
let audio = new Audio();
let audioContext = null;
let sourceNode = null;
let analyserWave = null; // for waveform (time domain)
let analyserSpec = null; // for "spectrogram" line
let dataArrayWave = null;
let dataArraySpec = null;
let animationIdWave = null;

// For the "spectrogram" line, we'll do an offline analysis of the entire track
// to get an amplitude envelope across time. Then the user can click/drag to seek.
let offlineData = null; // an array of amplitude values for the entire track
let trackDuration = 0;  // in seconds

// DOM references
const fileStatus = document.getElementById("file-status");
const audioFileInput = document.getElementById("audio-file-input");

const spectrogramCanvas = document.getElementById("spectrogram-canvas");
const spectrogramCtx = spectrogramCanvas.getContext("2d");
const spectrogramTimeEl = document.getElementById("spectrogram-time");
const playbackDot = document.getElementById("playback-dot");

const sonogramCanvas = document.getElementById("sonogram-canvas");
const sonogramCtx = sonogramCanvas.getContext("2d");

const playPauseButton = document.getElementById("play-pause-button");

let isPlaying = false;
let isDraggingDot = false;

/**
 * Initialize or reuse an AudioContext and set up analyzers
 * for real-time waveform (sonogram) and for a quick-lazy "spectrogram" approach.
 */
function initAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  // Clean up any existing connections
  if (sourceNode) {
    sourceNode.disconnect();
  }
  sourceNode = audioContext.createMediaElementSource(audio);

  // Create two different AnalyserNodes
  analyserWave = audioContext.createAnalyser();
  analyserWave.fftSize = 2048;
  dataArrayWave = new Uint8Array(analyserWave.frequencyBinCount);

  analyserSpec = audioContext.createAnalyser();
  // For a "spectrogram" line, we might prefer frequency data, but let's 
  // keep it simple with a time-domain approach. We'll do offline for the line.
  analyserSpec.fftSize = 2048;
  dataArraySpec = new Uint8Array(analyserSpec.frequencyBinCount);

  // Connect them all: source -> waveAnalyser -> context destination
  sourceNode.connect(analyserWave);
  analyserWave.connect(audioContext.destination);

  // Optionally chain specAnaylser in parallel (but not strictly needed for the offline line)
  sourceNode.connect(analyserSpec);
}

/**
 * Generate an offline amplitude array for the entire track.
 * We'll decode the entire file, then sample its amplitude over time.
 * This allows us to draw a line for the entire track. 
 */
async function analyzeOffline(file) {
  // Read the file as ArrayBuffer
  const arrayBuffer = await file.arrayBuffer();

  // Use decodeAudioData
  return new Promise((resolve, reject) => {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    audioContext.decodeAudioData(
      arrayBuffer,
      (audioBuffer) => {
        trackDuration = audioBuffer.duration;
        const channelData = audioBuffer.getChannelData(0); // just left channel

        // We'll sample N points across the duration
        const N = 1000;
        let samplesPerBucket = Math.floor(channelData.length / N);
        let amplitudeArray = new Float32Array(N);

        for (let i = 0; i < N; i++) {
          let start = i * samplesPerBucket;
          let end = start + samplesPerBucket;
          if (end > channelData.length) end = channelData.length;

          let maxVal = 0;
          for (let j = start; j < end; j++) {
            const val = Math.abs(channelData[j]);
            if (val > maxVal) maxVal = val;
          }
          amplitudeArray[i] = maxVal; 
        }
        resolve(amplitudeArray);
      },
      (err) => reject(err)
    );
  });
}

/**
 * Draw the offline amplitude line on the spectrogram canvas.
 */
function drawSpectrogramLine() {
  if (!offlineData) return;

  const { width, height } = spectrogramCanvas;
  spectrogramCtx.clearRect(0, 0, width, height);

  // We'll draw a line from left -> right
  spectrogramCtx.lineWidth = 2;
  spectrogramCtx.strokeStyle = "#06b6d4"; // teal
  spectrogramCtx.beginPath();

  let sliceWidth = width / offlineData.length;
  let x = 0;

  for (let i = 0; i < offlineData.length; i++) {
    // offlineData[i] is in [0..1], scale vertically
    let v = offlineData[i];
    // half the canvas for up/down 
    let y = height - v * (height - 4); 
    if (i === 0) {
      spectrogramCtx.moveTo(x, y);
    } else {
      spectrogramCtx.lineTo(x, y);
    }
    x += sliceWidth;
  }
  spectrogramCtx.stroke();
}

/**
 * Position the playback dot based on currentTime.
 * Also update the text time display in bottom-right.
 */
function updateSpectrogramUI() {
  if (!trackDuration) return;

  const currentTime = audio.currentTime;
  const progress = currentTime / trackDuration;
  const { width, height } = spectrogramCanvas;

  // Move dot horizontally
  let dotX = progress * width;
  // Center dot vertically (approx middle)
  let dotY = height / 2;

  // Update styles
  playbackDot.style.left = `${dotX}px`;
  playbackDot.style.top = `${dotY}px`;

  // Format time as M:SS
  function formatTime(sec) {
    let m = Math.floor(sec / 60);
    let s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? "0" + s : s}`;
  }
  spectrogramTimeEl.textContent = `${formatTime(currentTime)} / ${formatTime(trackDuration)}`;
}

/**
 * The user can drag the dot to seek in the track.
 */
function enableDotDragging() {
  let offsetX = 0; // track difference on mousedown
  let containerRect = spectrogramCanvas.getBoundingClientRect();

  // Start drag
  playbackDot.addEventListener("mousedown", (e) => {
    isDraggingDot = true;
    offsetX = e.clientX - playbackDot.getBoundingClientRect().left;
  });

  // Move
  document.addEventListener("mousemove", (e) => {
    if (!isDraggingDot) return;
    e.preventDefault();

    // Clip dot within canvas
    let newX = e.clientX - containerRect.left - offsetX;
    newX = Math.max(0, Math.min(containerRect.width, newX));

    // Move the dot
    playbackDot.style.left = `${newX}px`;

    // Convert to track time
    let progress = newX / containerRect.width;
    let newTime = progress * trackDuration;

    // Update time display
    audio.currentTime = newTime;
    updateSpectrogramUI();
  });

  // End drag
  document.addEventListener("mouseup", () => {
    isDraggingDot = false;
  });
}

/**
 * Animate the real-time waveform (bottom canvas).
 */
function animateWaveform() {
  if (!analyserWave) return;
  animationIdWave = requestAnimationFrame(animateWaveform);

  analyserWave.getByteTimeDomainData(dataArrayWave);

  let { width, height } = sonogramCanvas;
  sonogramCtx.clearRect(0, 0, width, height);

  sonogramCtx.lineWidth = 2;
  sonogramCtx.strokeStyle = "#ec4899"; // pink
  sonogramCtx.beginPath();

  let sliceWidth = width / dataArrayWave.length;
  let x = 0;

  for (let i = 0; i < dataArrayWave.length; i++) {
    let v = dataArrayWave[i] / 128.0; // 0..255 => around center
    let y = (v * height) / 2;

    if (i === 0) {
      sonogramCtx.moveTo(x, y);
    } else {
      sonogramCtx.lineTo(x, y);
    }
    x += sliceWidth;
  }
  sonogramCtx.lineTo(width, height / 2);
  sonogramCtx.stroke();

  // Also update the top spectrogram UI
  if (!isDraggingDot) {
    updateSpectrogramUI();
  }
}

/**
 * Play/pause toggle
 */
function togglePlayPause() {
  if (!audio.src) return; // no audio loaded

  // resume context if needed
  if (audioContext && audioContext.state === "suspended") {
    audioContext.resume();
  }

  if (isPlaying) {
    audio.pause();
    cancelAnimationFrame(animationIdWave);
    playPauseButton.textContent = "▶";
  } else {
    audio.play();
    animateWaveform();
    playPauseButton.textContent = "⏸";
  }
  isPlaying = !isPlaying;
}

/**
 * Handle file selection
 */
audioFileInput.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  fileStatus.textContent = file.name;

  // Create a blob URL
  const objectURL = URL.createObjectURL(file);
  
  // Stop old audio
  audio.pause();
  cancelAnimationFrame(animationIdWave);
  isPlaying = false;
  playPauseButton.textContent = "▶";

  // Offline analysis to get amplitude envelope
  offlineData = await analyzeOffline(file);

  // Draw once
  drawSpectrogramLine();
  updateSpectrogramUI();

  // Reset audio and context
  audio.src = objectURL;
  audio.load();
  initAudioContext(); // connect everything

  // Set currentTime = 0, etc.
  audio.currentTime = 0;
  trackDuration = 0; // We'll reassign once the audio can query duration
  audio.addEventListener("loadedmetadata", () => {
    trackDuration = audio.duration;
    updateSpectrogramUI();
  });
});

/**
 * The play/pause button
 */
playPauseButton.addEventListener("click", togglePlayPause);

/**
 * On page load, set up the dot dragging logic
 */
window.addEventListener("load", () => {
  enableDotDragging();
});
