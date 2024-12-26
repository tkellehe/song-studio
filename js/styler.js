// js/styler.js

// Global references so they can be reused
let model; 
let modelDescriptors;
let cachedDescriptors = null;

// Load the Universal Sentence Encoder model
export async function loadModel() {
  if (!model) {
    model = await use.load();
    console.log("USE Model loaded");
  }
  return model;
}

// Load the descriptor embeddings (the big "model-descriptors.json")
export async function loadDescriptorsModel() {
  if (!modelDescriptors) {
    const response = await fetch("models/v0.1/model-descriptors.json");
    const jsonData = await response.json();
    modelDescriptors = jsonData;
    modelDescriptors.tfo = tf.tensor(
      jsonData.data,
      jsonData.shape,
      jsonData.dtype
    );
    console.log("Descriptors Model loaded");
  }
  return modelDescriptors;
}

// Load the descriptors array from "descriptors.json"
export async function loadDescriptors() {
  if (!cachedDescriptors) {
    const response = await fetch("models/v0.1/descriptors.json");
    const data = await response.json();
    // data is { descriptors: [ ... ] }
    cachedDescriptors = data.descriptors;
    console.log("Descriptors loaded");
  }
  return cachedDescriptors;
}

// Return the single big tensor for stacked embeddings
async function getStackedEmbeddings() {
  await loadDescriptorsModel();
  return modelDescriptors.tfo;
}

// Dot product with the stacked descriptor embeddings
async function dotProductTensor(embedding) {
  const stackedDescriptors = await getStackedEmbeddings();
  // Keep track of tensors to dispose
  const dotProducts = tf.matMul(embedding, stackedDescriptors, false, true);
  // shape: [1, N], so squeeze to [N]
  return dotProducts.squeeze();
}

// Query descriptors by dot product score, then sorted
async function queryDescriptors(embedding) {
  const scores = await dotProductTensor(embedding);
  return tf.topk(scores, scores.size);
}

// Helper to get embedding from text
async function getEmbedding(text) {
  const useModel = await loadModel();
  return useModel.embed(text);
}

// Build strings from a sorted subset of descriptors
function buildDescriptorStrings(descriptorArray) {
  // (Same code that merges tags into groups, instruments, voice, etc.)
  // Your existing buildDescriptorStrings implementation here...
  // ...
  // [Unchanged from your original, just moved here]
  
  function joinedLength(arr) {
    return arr.join(", ").length;
  }

  const groupsMap = new Map();
  const finalStrings = [];

  // ... same logic from your snippet ...

  return finalStrings;
}

/**
 * Renamed from "buildCustomDescriptor" to "getSongStyles"
 * - Returns an object with { include: [...], exclude: [...] }
 */
export async function getSongStyles(text) {
  const descriptorArray = await loadDescriptors();
  const embedding = await getEmbedding(text);
  const { values, indices } = await queryDescriptors(embedding);
  // We don’t actually use 'values' for anything in your example
  values.dispose();

  // Convert indices to real descriptors
  const sorted = indices.arraySync().map(i => descriptorArray[i]);

  return {
    include: buildDescriptorStrings(sorted.slice(0, 100)),
    exclude: buildDescriptorStrings(sorted.slice(-100).reverse()),
  };
}
