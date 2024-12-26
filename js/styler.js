// js/styler.js

// We'll keep a few global-ish variables, but they're enclosed in this module.
let model; 
let modelDescriptors;
let cachedDescriptors = null;

/**
 * Load the main Universal Sentence Encoder model.
 */
export async function loadModel() {
  if (!model) {
    model = await use.load();
    console.log("USE Model loaded");
  }
  return model;
}

/**
 * Load the descriptor embeddings (the big "model-descriptors.json").
 * Creates a tensor property on modelDescriptors.
 */
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

/**
 * Load the descriptors array from "descriptors.json".
 */
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

/**
 * Helper: Return the single big tensor from the descriptor model.
 */
async function getStackedEmbeddings() {
  await loadDescriptorsModel();
  return modelDescriptors.tfo;
}

/**
 * Dot product with the stacked descriptor embeddings.
 */
async function dotProductTensor(embedding) {
  const stackedDescriptors = await getStackedEmbeddings();
  // shape of embedding: [1, 512], shape of stackedDescriptors: [N, 512]
  // matMul(..., false, true) => shape [1, N], then we squeeze to [N]
  const dotProducts = tf.matMul(embedding, stackedDescriptors, false, true);
  return dotProducts.squeeze();
}

/**
 * Query descriptors by dot product score, sorted from highest to lowest.
 */
async function queryDescriptors(embedding) {
  const scores = await dotProductTensor(embedding);
  // topk with k = scores.size => sorted descending
  return tf.topk(scores, scores.size);
}

/**
 * Helper: get embedding from text using the loaded USE model.
 */
async function getEmbedding(text) {
  const useModel = await loadModel();
  return useModel.embed(text);
}

/**
 * Build the strings from an array of descriptor objects.
 */
function buildDescriptorStrings(descriptorArray) {
  // Provided logic that merges tags into groups, instruments, voice, etc.
  // This is your original "buildDescriptorStrings" function. Copy as-is.

  function joinedLength(arr) {
    return arr.join(", ").length;
  }

  const groupsMap = new Map();
  const finalStrings = [];

  for (let i = 0; i < descriptorArray.length; i++) {
    const descriptor = descriptorArray[i].descriptor;
    const { category, group, tag } = descriptor;
    
    const groupKey = `${category}::${group}`;
    let groupObj = groupsMap.get(groupKey);

    if (!groupObj) {
      groupObj = {
        category,
        group,
        ignoreSeen: false,
        chosenVoiceType: null,
        instrumentTags: [],
        tagCount: 0,
        finalIndex: -1,
        currentString: "",
      };

      let initialOutput;
      if (group === "Instruments") {
        initialOutput = "";
      } else {
        initialOutput = group;
      }

      // Test if adding initialOutput fits within 200 chars
      const simulated = [...finalStrings, initialOutput.trim()];
      if (joinedLength(simulated) > 200) {
        continue; // skip if it doesn't fit
      }

      groupObj.currentString = initialOutput.trim();
      groupObj.finalIndex = finalStrings.length;
      finalStrings.push(groupObj.currentString);
      groupsMap.set(groupKey, groupObj);
    }

    if (!groupObj) continue;
    if (groupObj.ignoreSeen) continue;

    if (tag === "Ignore") {
      groupObj.ignoreSeen = true;
      if (groupObj.tagCount === 0) {
        finalStrings.splice(groupObj.finalIndex, 1);
        groupsMap.delete(groupKey);

        // Re-fix finalIndex for subsequent items
        for (const [_, otherGroupObj] of groupsMap) {
          if (otherGroupObj.finalIndex > groupObj.finalIndex) {
            otherGroupObj.finalIndex--;
          }
        }
      }
      continue;
    }

    if (group !== "Instruments" && tag === group) {
      continue; // skip duplication
    }

    // Voice group logic
    const voiceTypes = new Set(["Male", "Female", "Duet"]);
    if (group === "Voice" && voiceTypes.has(tag)) {
      if (!groupObj.chosenVoiceType) {
        const maybeNewString = groupObj.currentString
          ? groupObj.currentString + " " + tag
          : tag;

        const tempArray = [...finalStrings];
        tempArray[groupObj.finalIndex] = maybeNewString.trim();

        if (joinedLength(tempArray) <= 200) {
          groupObj.currentString = maybeNewString.trim();
          groupObj.chosenVoiceType = tag;
          groupObj.tagCount++;
          finalStrings[groupObj.finalIndex] = groupObj.currentString;
        }
      }
      continue;
    }

    // Instruments logic
    if (group === "Instruments") {
      const newInstrumentTags = [...groupObj.instrumentTags, tag];
      const maybeNewString = newInstrumentTags.join(", ");
      const tempArray = [...finalStrings];
      tempArray[groupObj.finalIndex] = maybeNewString;

      if (joinedLength(tempArray) <= 200) {
        groupObj.instrumentTags = newInstrumentTags;
        groupObj.currentString = maybeNewString;
        groupObj.tagCount++;
        finalStrings[groupObj.finalIndex] = maybeNewString;
      }
      continue;
    }

    // Default logic for other groups
    const maybeNewString = groupObj.currentString
      ? groupObj.currentString + " " + tag
      : tag;

    const tempArray = [...finalStrings];
    tempArray[groupObj.finalIndex] = maybeNewString.trim();

    if (joinedLength(tempArray) <= 200) {
      groupObj.currentString = maybeNewString.trim();
      groupObj.tagCount++;
      finalStrings[groupObj.finalIndex] = groupObj.currentString;
    }
  }

  return finalStrings.filter((s) => s?.trim()?.length);
}

/**
 * Renamed function: "getSongStyles"
 * Returns { include: [...], exclude: [...], sorted: [...] } 
 * based on descriptor similarity to the prompt text.
 */
export async function getSongStyles(text) {
  const descriptorArray = await loadDescriptors();
  const embedding = await getEmbedding(text);
  const { values, indices } = await queryDescriptors(embedding);

  // Grab all similarity scores
  const scores = values.arraySync();

  // Convert indices to real descriptors (sorted descending by default)
  const sorted = indices.arraySync().map((i, index) => ({
    descriptor: descriptorArray[i],
    score: scores[index]
  }));

  // Clean up the resources in tfjs
  values.dispose();
  indices.dispose();

  // Define thresholds relative to the top score
  const topScore = sorted[0].score;
  const includeThreshold = topScore - 0.02;
  const excludeThreshold = topScore - 0.04;

  // 1) Find where scores drop below the include threshold:
  //    i.e., the first index where score < includeThreshold.
  let endIncludeIndex = sorted.findIndex(d => d.score < includeThreshold);

  // If none found, .findIndex() returns -1 => means all are above the threshold.
  if (endIncludeIndex === -1) {
    endIncludeIndex = sorted.length;
  }

  // 2) Find where scores drop below (or equal to) the exclude threshold:
  //    i.e., the first index where score <= excludeThreshold.
  let startExcludeIndex = sorted.findIndex(d => d.score <= excludeThreshold);

  // If none found, .findIndex() returns -1 => means none qualify for exclusion threshold.
  if (startExcludeIndex === -1) {
    startExcludeIndex = sorted.length;
  }

  // Use slice to grab the portion we want for “include” and “exclude”.
  const includeArray = sorted.slice(0, endIncludeIndex);
  const excludeArray = sorted.slice(startExcludeIndex);

  return {
    sorted,
    include: buildDescriptorStrings(includeArray),
    exclude: buildDescriptorStrings(excludeArray),
  };
}

