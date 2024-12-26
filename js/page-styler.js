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

// New copy buttons
const includeCopyBtn = document.getElementById("include-copy");
const excludeCopyBtn = document.getElementById("exclude-copy");

/**
 * Update the "XX/200" label for a given textarea.
 */
function updateCharLabel(text, labelId) {
  const length = text.length;
  document.getElementById(labelId).textContent = `${length}/${MAX_LENGTH}`;
}

/**
 * Button state management.
 */
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

/**
 * The core function that uses getSongStyles and populates the DOM.
 */
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
    // If prompt is empty, clear the fields and reset counters
    document.getElementById("include-tags").value = "";
    document.getElementById("exclude-tags").value = "";
    updateCharLabel("", "include-char-counter");
    updateCharLabel("", "exclude-char-counter");
  }

  // Return button to either "Auto" (if toggle ON) or "Generate" (if toggle OFF).
  if (debounceToggle.checked) {
    setButtonAuto();
  } else {
    setButtonGenerate();
  }
}

/**
 * Debounced input event on the prompt text field.
 */
promptInput.addEventListener("input", () => {
  // Only do live generation if toggle is ON
  if (!debounceToggle.checked) return;

  clearTimeout(timeoutId);
  const text = promptInput.value;

  timeoutId = setTimeout(() => {
    handleDescriptorGeneration(text);
  }, DEBOUNCE);
});

/**
 * Generate button: only relevant if toggle is OFF (manual).
 */
generateButton.addEventListener("click", async () => {
  if (debounceToggle.checked) return; // do nothing if auto is ON

  const text = promptInput.value;
  if (text.trim().length === 0) return; // no empty
  if (text === lastButtonTextUsed) return; // same as last used

  lastButtonTextUsed = text;
  await handleDescriptorGeneration(text);
});

/**
 * Toggle switch changes between auto and manual.
 */
debounceToggle.addEventListener("change", () => {
  if (debounceToggle.checked) {
    setButtonAuto();
  } else {
    setButtonGenerate();
  }
});

/**
 * Copy button functionality
 */
function copyToClipboard(textareaId, buttonEl) {
  const textToCopy = document.getElementById(textareaId).value;
  navigator.clipboard.writeText(textToCopy).then(() => {
    // Temporarily change button text to "Copied"
    const originalText = buttonEl.innerText;
    buttonEl.innerText = "Copied";
    setTimeout(() => {
      buttonEl.innerText = originalText;
    }, 2000);
  });
}

// Attach event listeners for copy buttons
includeCopyBtn.addEventListener("click", () => {
  copyToClipboard("include-tags", includeCopyBtn);
});

excludeCopyBtn.addEventListener("click", () => {
  copyToClipboard("exclude-tags", excludeCopyBtn);
});

/**
 * On page load: pre-load the models and descriptors, init button states.
 */
window.onload = async () => {
  // Preload everything
  await loadModel();
  await loadDescriptorsModel();
  await loadDescriptors();

  // Initialize char counters
  updateCharLabel("", "include-char-counter");
  updateCharLabel("", "exclude-char-counter");

  // Setup button based on toggle
  if (debounceToggle.checked) {
    setButtonAuto();
  } else {
    setButtonGenerate();
  }
};

// Export the getSongStyles function to be used in the browser.
export getSongStyles;
