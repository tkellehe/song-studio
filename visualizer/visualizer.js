// Basic audio object
let audio = new Audio();
let isPlaying = false;

// DOM references
const loadSongButton = document.getElementById("load-song-button");
const sunoLinkInput = document.getElementById("suno-link-input");
const songCoverImg = document.getElementById("song-cover");
const songTitleEl = document.getElementById("song-title");
const playPauseButton = document.getElementById("play-pause-button");

const sonogramContainer = document.getElementById("sonogram-container");
const audioFileInput = document.getElementById("audio-file-input");

// Create Two.js instance to draw the wave/sonogram.
const twoParams = {
  width: sonogramContainer.clientWidth,
  height: sonogramContainer.clientHeight
};
let two = new Two(twoParams).appendTo(sonogramContainer);

/**
 * Attempt to load a track from the Suno AI link (dummy logic).
 * In a real scenario, you'd fetch actual metadata, 
 * cover image, audio, etc.
 */
async function loadSongFromSunoLink(link) {
  // Example placeholder logic (fake data):
  const fakeSongResponse = {
    title: "Sample Title from Suno Link",
    cover: "https://via.placeholder.com/150/06b6d4/ec4899?text=Suno+Song",
    audioUrl: "https://example.com/your-audio-file.mp3" // Replace with real audio
  };

  // Update UI
  songCoverImg.src = fakeSongResponse.cover;
  songTitleEl.textContent = fakeSongResponse.title;

  // Load the audio
  audio.src = fakeSongResponse.audioUrl;
  audio.load();

  // Clear old waveforms or shapes and draw a new "splatter"
  drawSonogramWave();
}

/**
 * Draw a fancy "splatter-like" wave. 
 * You can replace this with real analysis of your audio file 
 * if you want a more accurate sonogram.
 */
function drawSonogramWave() {
  // Clear previous shapes from the Two.js scene
  two.clear();

  // Create a gradient fill for the wave
  const gradient = two.makeLinearGradient(
    0, 0,
    0, two.height,
    new Two.Stop(0, "#06b6d4"),
    new Two.Stop(1, "#ec4899")
  );

  // We'll create some random "splatter" circles or arcs in the top half
  const group = new Two.Group();
  for (let i = 0; i < 15; i++) {
    let x = Math.random() * two.width;
    let y = (Math.random() * two.height) / 2; // restrict to top half
    let radius = 20 + Math.random() * 30;
    let circle = two.makeCircle(x, y, radius);
    circle.fill = gradient;
    circle.noStroke();
    group.add(circle);
  }

  // Add a draggable "dot" to represent current playback position
  const dot = two.makeCircle(two.width / 2, two.height / 4, 8);
  dot.fill = "#fff";
  dot.noStroke();
  dot._isDraggable = true; // custom property for tracking
  group.add(dot);

  let dragging = false;

  sonogramContainer.addEventListener("mousedown", (e) => {
    const rect = sonogramContainer.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const dist = Math.hypot(mouseX - dot.translation.x, mouseY - dot.translation.y);
    if (dist <= 12) {
      dragging = true;
    }
  });

  sonogramContainer.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    const rect = sonogramContainer.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    // clamp Y to top half
    const clampedY = Math.max(0, Math.min(two.height / 2, e.clientY - rect.top));
    dot.translation.set(mouseX, clampedY);

    // Update audio currentTime if you want to allow scrubbing:
    // let progress = dot.translation.x / two.width;
    // audio.currentTime = progress * audio.duration;
  });

  sonogramContainer.addEventListener("mouseup", () => {
    dragging = false;
  });

  // Add the group to the Two.js scene
  two.add(group);

  // Render the initial state
  two.update();
}

/**
 * Toggle play/pause for the loaded track.
 */
function togglePlayPause() {
  if (!audio.src) return; // no audio loaded

  if (isPlaying) {
    audio.pause();
    playPauseButton.textContent = "Play";
  } else {
    audio.play();
    playPauseButton.textContent = "Pause";
  }
  isPlaying = !isPlaying;
}

/**
 * Handle local file selection (e.g., a WAV file).
 */
audioFileInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  // Create a blob URL for the file so we can load it into the Audio object
  const objectURL = URL.createObjectURL(file);

  // Update the UI (generic placeholder)
  songCoverImg.src = "../assets/note-gradient-icon.svg"; // or your own default cover
  songTitleEl.textContent = file.name || "Untitled";

  // Set audio source to the user-chosen file
  audio.src = objectURL;
  audio.load();

  // Redraw the sonogram
  drawSonogramWave();
});

/**
 * Event Listeners
 */
loadSongButton.addEventListener("click", () => {
  const link = sunoLinkInput.value.trim();
  if (!link) return;
  loadSongFromSunoLink(link);
});

playPauseButton.addEventListener("click", () => {
  togglePlayPause();
});

/**
 * (Optional) track timeupdate to move the dot or change color
 * audio.addEventListener('timeupdate', () => {
 *   const progress = audio.currentTime / audio.duration;
 *   dot.translation.x = progress * two.width;
 * });
 */
