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
const fileStatus = do
