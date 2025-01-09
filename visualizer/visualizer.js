// Audio, AudioContext, and analyzer
let audio = new Audio();
let audioContext = null;
let sourceNode = null;
let analyser = null;
let dataArray = null;
let animationId = null;

let isPlaying = false;

// DOM references
const fileStatus = document.getElementById("file-status");
const audioFileInput = document.getElementById("audio-file-input");
const canvas = document.getElementById("sonogram-canvas");
const canvasCtx = canvas.getContext("2d");
const playPauseButton = document.getElementById("play-pause-button");

/**
 * Set up or reuse the AudioContext and AnalyserNode.
 * We connect the <audio> element to the Analyser so we can get time-domain data.
 */
function initAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (sourceNode) {
    sourceNode.disconnect();
  }
  sourceNode = audioContext.createMediaElementSource(audio);

  // Create an analyser node
  analyser = audioContext.createAnalyser();
  analyser.fftSize = 2048; // or 1024, etc.
  let bufferLength = analyser.frequencyBinCount;
  dataArray = new Uint8Array(bufferLength);

  // Connect the source -> analyser -> destination
  sourceNode.connect(analyser);
  analyser.connect(audioContext.destination);
}

/**
 * The main animation loop to draw the waveform in real-time.
 */
function drawWaveform() {
  if (!analyser) return;

  // requestAnimationFrame to repeatedly call drawWaveform
  animationId = requestAnimationFrame(drawWaveform);

  // Retrieve time-domain data
  analyser.getByteTimeDomainData(dataArray);

  // Clear canvas
  canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw a simple line-based waveform
  canvasCtx.lineWidth = 2;
  canvasCtx.strokeStyle = "#06b6d4"; // teal-ish from your theme
  canvasCtx.beginPath();

  let sliceWidth = canvas.width * 1.0 / dataArray.length;
  let x = 0;

  for (let i = 0; i < dataArray.length; i++) {
    let v = dataArray[i] / 128.0;
    let y = (v * canvas.height) / 2;

    if (i === 0) {
      canvasCtx.moveTo(x, y);
    } else {
      canvasCtx.lineTo(x, y);
    }
    x += sliceWidth;
  }

  canvasCtx.lineTo(canvas.width, canvas.height / 2);
  canvasCtx.stroke();
}

/**
 * Play/pause toggle
 */
function togglePlayPause() {
  if (!audio.src) return; // no audio loaded

  // Must resume AudioContext if it's suspended
  if (audioContext && audioContext.state === "suspended") {
    audioContext.resume();
  }

  if (isPlaying) {
    audio.pause();
    cancelAnimationFrame(animationId);
    playPauseButton.textContent = "▶"; // play icon
  } else {
    audio.play();
    drawWaveform(); // start animation
    playPauseButton.textContent = "⏸"; // pause icon
  }
  isPlaying = !isPlaying;
}

/**
 * Handle file selection
 */
audioFileInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  // Display the file name above the canvas
  fileStatus.textContent = file.name;

  // Create a blob URL for the file
  const objectURL = URL.createObjectURL(file);

  // Reset audio and context
  audio.src = objectURL;
  audio.load();

  // Initialize or reuse AudioContext & Analyser
  initAudioContext();

  // Stop any ongoing playback if needed
  audio.pause();
  cancelAnimationFrame(animationId);
  isPlaying = false;
  playPauseButton.textContent = "▶";
});

/**
 * The play/pause button
 */
playPauseButton.addEventListener("click", togglePlayPause);
