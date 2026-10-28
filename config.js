const axios = require('axios');

const FIREBASE_URL = "https://interior-design-e00e9-default-rtdb.firebaseio.com/";
const FIREBASE_DATA_URL = "https://iterior-design-all-other-data-default-rtdb.asia-southeast1.firebasedatabase.app/";

const GITHUB_JS_URL = "https://raw.githubusercontent.com/rutujdhodapkar/Image-Hosting/main/index.js";
const REMOTE_KEYS_URL = "https://raw.githubusercontent.com/rutujdhodapkar/Image-Hosting/main/keys.csv";

let REMOTE_KEYS = {};

function parseKeysCsv(content) {
  const lines = content.split(/\r?\n/);
  // Detect delimiter: check if tab is present in all lines with content
  const hasTabs = lines.some(line => line.includes('\t'));
  const delimiter = hasTabs ? '\t' : ',';
  
  const values = {};
  for (let line of lines) {
    line = line.trim();
    if (!line) continue;
    
    // Parse line respecting quotes optionally, but standard splitting works for keys.csv
    let parts = [];
    if (line.startsWith('"') || line.startsWith("'")) {
      // Basic quoted CSV parsing
      const matches = [...line.matchAll(/("([^"\\]|\\.)*"|'([^'\\]|\\.)*'|[^,\t]+)/g)];
      parts = matches.map(m => m[0].replace(/^["']|["']$/g, '').trim());
    } else {
      parts = line.split(delimiter).map(p => p.trim());
    }

    if (parts.length >= 2) {
      const key = parts[0];
      const value = parts[1];
      if (key) {
        values[key] = value;
      }
    }
  }
  return values;
}

async function loadRemoteKeys() {
  const envUrl = process.env.REMOTE_KEYS_URL || REMOTE_KEYS_URL;
  try {
    console.log(`[CONFIG] Fetching remote keys from ${envUrl}...`);
    const response = await axios.get(envUrl, { timeout: 15000 });
    REMOTE_KEYS = parseKeysCsv(response.data);
    console.log(`[CONFIG] Loaded ${Object.keys(REMOTE_KEYS).length} keys successfully.`);
    return REMOTE_KEYS;
  } catch (error) {
    console.error(`[CRITICAL] Failed to load remote keys: ${error.message}`);
    throw error;
  }
}

module.exports = {
  FIREBASE_URL,
  FIREBASE_DATA_URL,
  GITHUB_JS_URL,
  loadRemoteKeys,
  get PROJECT_SECRET_KEY() { return REMOTE_KEYS["project_secret_key"] || ""; },
  get IMAGE_MODEL_ENDPOINT() { return REMOTE_KEYS["image_model_endpoint"] || "https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.1-dev"; },
  get REASONING_MODEL() { return REMOTE_KEYS["reasoning_model"] || "openai/gpt-oss-120b:free"; },
  get RECOGNITION_MODEL() { return REMOTE_KEYS["recognition_model"] || "nvidia/nemotron-nano-12b-v2-vl:free"; },
  get OPENROUTER_API_KEY() { return REMOTE_KEYS["openrouter_key"] || ""; },
  get NVIDIA_API_KEYS() {
    return Object.entries(REMOTE_KEYS)
      .filter(([key, val]) => key.startsWith("api_key_") && val)
      .map(([key, val]) => val);
  }
};
