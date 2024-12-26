// js/page-styler.js

import { 
  loadModel, 
  loadDescriptorsModel,
  loadDescriptors,
  getSongStyles 
} from './styler.js';

const DEBOUNCE = 500;
let timeoutId;
let lastButtonTextUsed = "";
const MAX_LENGTH = 200;

const generateButton = document.getElementById("generate-button");
const promptInput = document.getElementById("prompt-input");
const debounceToggle = document.getElementById("debounce-toggle");

// Update the "XX/200" label
function updateCharLabel(text, labelId) {
  const length = text.length;
  document.getElementById(labelId).textContent = `${length}/${MAX_LENGTH}`;
}

// Button state
function setButtonGenerate() {
  generateButton.innerText = "Generate";
  generateButton.disabled = false;
  generateButton.classList.remove("btn-disabled");
  generateButton.title = "Click to generate tags if live toggle is OFF";
}

function setButtonStyling() {
  generateButton.innerText = "Styling...";
  generateButton.disabled = true;
  generateButton.classList.add("btn-disabled");
  generateButton.title = "Generating tags...";
}

function setButtonAuto() {
  generateButton.innerText = "Auto";
  generateButton.disabled = true;
  generateButton.classList.add("btn-disabled");
  generateButton.title = "Auto-generation is ON";
}

// The core function that uses getSongStyles and populates the DOM
async function handleDescriptorGeneration(text) {
  setButtonStyling();

  if (text.trim().length > 0) {
    const descriptors = await getSongStyles(text);
    const incString = descriptors.include.join(", ");
    const excString = descriptors.exclude.join(", ");

    document.getElementById("include-tags").value = incString;
    document.getElementById("exclude-tags").value = excString;

    updateCharLabel(incString, "include-char-counter");
    updateCharLabel(excString, "exclude-char-counter");
  } else {
    // Clear the fields if empty
    document.getElementById("include-tags").value = "";
    document.getElementById("exclude-tags").value = "";
    updateCharLabel("", "include-char-counter");
    updateCharLabel("", "exclude-char-counter");
  }

  if (debounceToggle.checked) {
    setButtonAuto();
  } else {
    setButtonGenerate();
  }
}

// Event: Debounced prompt input
promptInput.addEventListener("input", () => {
  if (!debounceToggle.checked) return; // only auto-generate if toggle is ON

  clearTimeout(timeoutId);
  const text = promptInput.value;

  timeoutId = setTimeout(async () => {
    await handleDescriptorGeneration(text);
  }, DEBOUNCE);
});

// Event: Generate button (manual mode)
generateButton.addEventListener("click", async () => {
  // Only relevant if toggle is OFF
  if (debounceToggle.checked) return;

  const text = promptInput.value;
  if (text.trim().length === 0) return; // no empty text
  if (text === lastButtonTextUsed) return; // no repetition

  lastButtonTextUsed = text;
  await handleDescriptorGeneration(text);
});

// Event: Toggle switch
debounceToggle.addEventListener("change", () => {
  if (debounceToggle.checked) {
    setButtonAuto();
  } else {
    setButtonGenerate();
  }
});

// On page load
window.onload = async () => {
  // Preload models and descriptors
  await loadModel();
  await loadDescriptorsModel();
  await loadDescriptors();

  // Set char counters to 0/200 initially
  updateCharLabel("", "include-char-counter");
  updateCharLabel("", "exclude-char-counter");

  // Setup the button state
  if (debounceToggle.checked) {
    setButtonAuto();
  } else {
    setButtonGenerate();
  }
};
