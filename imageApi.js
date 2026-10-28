const axios = require('axios');
const fs = require('fs');
const config = require('./config');

const logFile = "api_log.txt";

function logToFile(message) {
  const logStr = `\n[${new Date().toISOString()}] ${message}`;
  fs.appendFileSync(logFile, logStr, 'utf-8');
}

async function generateImage(prompt, imageInputB64 = null, width = 1024, height = 1024) {
  const serviceEndpoint = config.IMAGE_MODEL_ENDPOINT;
  const payload = {
    prompt: prompt,
    width: width,
    height: height,
    seed: 0
  };

  logToFile(`--- GENERATING IMAGE ---\nPrompt: ${prompt}\nPayload: ${JSON.stringify(payload)}`);
  console.log(`--- GENERATING IMAGE ---`);
  console.log(`Prompt: ${prompt}`);
  console.log(`Payload: ${JSON.stringify(payload, null, 2)}`);

  const keys = config.NVIDIA_API_KEYS;
  if (!keys || keys.length === 0) {
    throw new Error("No NVIDIA API keys available in config.");
  }

  let lastError = null;

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const headers = {
      "Authorization": `Bearer ${key}`,
      "Accept": "application/json",
      "Content-Type": "application/json"
    };

    try {
      const response = await axios.post(serviceEndpoint, payload, { headers, timeout: 60000 });
      if (response.status === 200) {
        const result = response.data;
        logToFile(`Response 200: Keys=${Object.keys(result).join(', ')}`);
        
        let imgB64 = null;
        if (result.artifacts && result.artifacts.length > 0) {
          imgB64 = result.artifacts[0].base64;
        } else if (result.data && result.data.length > 0) {
          imgB64 = result.data[0].b64_json || result.data[0].image;
        } else if (result.image) {
          imgB64 = result.image;
        } else if (result.b64_json) {
          imgB64 = result.b64_json;
        }

        if (imgB64) {
          return imgB64;
        } else {
          console.warn(`⚠️ Warning: No image data found in response from key ${i + 1}. Response:`, result);
          continue;
        }
      } else {
        lastError = `API Error (Key ${i + 1}): ${response.status} - ${JSON.stringify(response.data)}`;
        console.error(lastError);
        continue;
      }
    } catch (error) {
      const errorMsg = error.response ? `${error.response.status} - ${JSON.stringify(error.response.data)}` : error.message;
      lastError = `Network/Exception (Key ${i + 1}): ${errorMsg}`;
      console.error(lastError);
      continue;
    }
  }

  throw new Error(`Failed to generate image after trying all API keys. Last error: ${lastError}`);
}

module.exports = {
  generateImage
};
