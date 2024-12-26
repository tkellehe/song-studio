import { buildCustomDescriptor } from './styler.js';

const MAX_LENGTH = 200;

function updateCharLabel(text, labelId) {
  const length = text.length;
  document.getElementById(labelId).textContent = `${length}/${MAX_LENGTH}`;
}

function setButtonState(button, state) {
  const states = {
    generate: { text: "Generate", disabled: false },
    styling: { text: "Styling...", disabled: true },
    auto: { text: "Auto", disabled: true },
  };
  const { text, disabled } = states[state];
  button.textContent = text;
  button.disabled = disabled;
}

document.addEventListener("DOMContentLoaded", () => {
  const promptInput = document.getElementById("prompt-input");
  const generateButton = document.getElementById("generate-button");
  const debounceToggle = document.getElementById("debounce-toggle");

  promptInput.addEventListener("input", debounce(async () => {
    if (!debounceToggle.checked) return;

    const text = promptInput.value;
    const descriptors = await buildCustomDescriptor(text);
    document.getElementById("include-tags").value = descriptors.include.join(", ");
    document.getElementById("exclude-tags").value = descriptors.exclude.join(", ");

    updateCharLabel(descriptors.include.join(", "), "include-char-counter");
    updateCharLabel(descriptors.exclude.join(", "), "exclude-char-counter");
  }, 500));

  generateButton.addEventListener("click", async () => {
    const text = promptInput.value.trim();
    if (!text) return;

    setButtonState(generateButton, "styling");

    const descriptors = await buildCustomDescriptor(text);
    document.getElementById("include-tags").value = descriptors.include.join(", ");
    document.getElementById("exclude-tags").value = descriptors.exclude.join(", ");

    updateCharLabel(descriptors.include.join(", "), "include-char-counter");
    updateCharLabel(descriptors.exclude.join(", "), "exclude-char-counter");

    setButtonState(generateButton, debounceToggle.checked ? "auto" : "generate");
  });

  debounceToggle.addEventListener("change", () => {
    setButtonState(generateButton, debounceToggle.checked ? "auto" : "generate");
  });
});

function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}
