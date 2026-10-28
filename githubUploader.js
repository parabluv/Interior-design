const axios = require('axios');
const uuid = require('uuid');

const ENCRYPTED_GITHUB_TOKEN = "jlwkxe_pat_11EER6PTT04Opewlcs1G6c_NmNamj9WS9KNZebcEgLJt5lFGpZVXqEoGy3hMgrnlxNAKFMRJUPCi9K3LtG";
const REPO_OWNER = (process.env.GITHUB_REPO_OWNER || "rutujdhodapkar").trim();
const REPO_NAME = (process.env.GITHUB_REPO_NAME || "Image-Hosting").trim();
const BASE_URL = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents`;

function caesarDecryptLetters(value, shift = 3) {
  let decrypted = '';
  for (let i = 0; i < value.length; i++) {
    const char = value[i];
    if (char >= 'a' && char <= 'z') {
      const code = ((char.charCodeAt(0) - 97 - shift + 26) % 26) + 97;
      decrypted += String.fromCharCode(code);
    } else if (char >= 'A' && char <= 'Z') {
      const code = ((char.charCodeAt(0) - 65 - shift + 26) % 26) + 65;
      decrypted += String.fromCharCode(code);
    } else {
      decrypted += char;
    }
  }
  return decrypted;
}

function decryptGithubToken(encryptedToken, shift = 3) {
  if (!encryptedToken) return '';
  if (encryptedToken.startsWith('github_pat_')) return encryptedToken;
  if (encryptedToken.includes('_pat_')) {
    const parts = encryptedToken.split('_pat_');
    return `${caesarDecryptLetters(parts[0], shift)}_pat_${caesarDecryptLetters(parts[1], shift)}`;
  }
  return caesarDecryptLetters(encryptedToken, shift);
}

const GITHUB_TOKEN = (process.env.GITHUB_TOKEN || "").trim() || decryptGithubToken(
  (process.env.GITHUB_TOKEN_ENCRYPTED || ENCRYPTED_GITHUB_TOKEN).trim()
);

function slugifyFilenamePart(value, fallback = "image") {
  if (!value) return fallback;
  const cleaned = value.trim().replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '').toLowerCase();
  return cleaned || fallback;
}

function getHeaders() {
  if (!GITHUB_TOKEN) return null;
  return {
    "Authorization": `Bearer ${GITHUB_TOKEN}`,
    "Accept": "application/vnd.github.v3+json",
    "Content-Type": "application/json"
  };
}

function githubIsConfigured() {
  return !!(GITHUB_TOKEN && REPO_OWNER && REPO_NAME);
}

async function getFileSha(filePath) {
  const headers = getHeaders();
  if (!headers) return null;
  const url = `${BASE_URL}/${filePath}`;
  try {
    const response = await axios.get(url, { headers, timeout: 10000 });
    if (response.status === 200) {
      return response.data.sha;
    }
  } catch (error) {
    // 404 is expected if file doesn't exist
  }
  return null;
}

async function uploadImageToGithub(imageBase64, remotePath, commitMessage = "Upload generated image") {
  const headers = getHeaders();
  if (!headers) {
    console.log("GitHub upload skipped: GITHUB_TOKEN is not configured.");
    return null;
  }

  const url = `${BASE_URL}/${remotePath}`;
  let content = imageBase64;
  if (content.includes("base64,")) {
    content = content.split("base64,")[1];
  }

  const data = {
    message: commitMessage,
    content: content
  };

  const sha = await getFileSha(remotePath);
  if (sha) {
    data.sha = sha;
  }

  try {
    const response = await axios.put(url, data, { headers, timeout: 20000 });
    if (response.status === 200 || response.status === 201) {
      return `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/main/${remotePath}`;
    }
  } catch (error) {
    const errorMsg = error.response ? `${error.response.status} - ${JSON.stringify(error.response.data)}` : error.message;
    console.error(`Failed to upload image ${remotePath}: ${errorMsg}`);
  }
  return null;
}

async function uploadTextAssetToGithub(textContent, remotePath, commitMessage = "Upload generated asset") {
  const headers = getHeaders();
  if (!headers) {
    console.log("GitHub upload skipped: GITHUB_TOKEN is not configured.");
    return null;
  }

  const contentB64 = Buffer.from(textContent, 'utf-8').toString('base64');
  const url = `${BASE_URL}/${remotePath}`;
  const data = {
    message: commitMessage,
    content: contentB64
  };

  const sha = await getFileSha(remotePath);
  if (sha) {
    data.sha = sha;
  }

  try {
    const response = await axios.put(url, data, { headers, timeout: 20000 });
    if (response.status === 200 || response.status === 201) {
      return `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/main/${remotePath}`;
    }
  } catch (error) {
    const errorMsg = error.response ? `${error.response.status} - ${JSON.stringify(error.response.data)}` : error.message;
    console.error(`Failed to upload asset ${remotePath}: ${errorMsg}`);
  }
  return null;
}

async function updatePromptsCsv(imageUrl, promptText, imageType) {
  const headers = getHeaders();
  if (!headers) return;

  const csvPath = "prompts.csv";
  const url = `${BASE_URL}/${csvPath}`;
  
  let existingContent = "";
  const sha = await getFileSha(csvPath);
  
  if (sha) {
    try {
      const response = await axios.get(url, { headers, timeout: 10000 });
      if (response.status === 200) {
        const contentB64 = response.data.content || '';
        existingContent = Buffer.from(contentB64, 'base64').toString('utf-8');
      }
    } catch (error) {
      console.error(`Failed to fetch prompts.csv: ${error.message}`);
    }
  }
  
  let newCsvContent = existingContent;
  if (!newCsvContent) {
    newCsvContent = "Image_URL,Prompt,Type\n";
  } else if (!newCsvContent.endsWith('\n')) {
    newCsvContent += '\n';
  }
  
  // Format prompt string for CSV (escaping quotes)
  const escapedPrompt = `"${promptText.replace(/"/g, '""')}"`;
  const escapedUrl = `"${imageUrl.replace(/"/g, '""')}"`;
  const escapedType = `"${imageType.replace(/"/g, '""')}"`;
  
  newCsvContent += `${escapedUrl},${escapedPrompt},${escapedType}\n`;
  
  const newCsvB64 = Buffer.from(newCsvContent, 'utf-8').toString('base64');
  const data = {
    message: `Update prompts.csv with new ${imageType}`,
    content: newCsvB64
  };
  if (sha) {
    data.sha = sha;
  }
  
  try {
    const res = await axios.put(url, data, { headers, timeout: 20000 });
    if (res.status === 200 || res.status === 201) {
      console.log("Successfully tracked image in prompts.csv!");
    } else {
      console.error(`Failed to update CSV: ${JSON.stringify(res.data)}`);
    }
  } catch (error) {
    const errorMsg = error.response ? `${error.response.status} - ${JSON.stringify(error.response.data)}` : error.message;
    console.error(`Failed to update CSV: ${errorMsg}`);
  }
}

async function uploadJsonToGithub(jsonData, remotePath, commitMessage = "Update telemetry data") {
  const headers = getHeaders();
  if (!headers) {
    console.log("GitHub JSON upload skipped: GITHUB_TOKEN is not configured.");
    return null;
  }

  const jsonStr = typeof jsonData === 'object' ? JSON.stringify(jsonData, null, 2) : String(jsonData);
  const contentB64 = Buffer.from(jsonStr, 'utf-8').toString('base64');
  
  const url = `${BASE_URL}/${remotePath}`;
  const data = {
    message: commitMessage,
    content: contentB64
  };
  
  const sha = await getFileSha(remotePath);
  if (sha) {
    data.sha = sha;
  }

  try {
    const response = await axios.put(url, data, { headers, timeout: 20000 });
    if (response.status === 200 || response.status === 201) {
      return `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/main/${remotePath}`;
    }
  } catch (error) {
    const errorMsg = error.response ? `${error.response.status} - ${JSON.stringify(error.response.data)}` : error.message;
    console.error(`Failed to upload JSON ${remotePath}: ${errorMsg}`);
  }
  return null;
}

function getFormattedTimestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

async function syncGenerationToGithub(imageBase64, promptText, imageType, nameHint = null) {
  const timestamp = getFormattedTimestamp();
  const cleanType = slugifyFilenamePart(imageType, "generated");
  const cleanName = slugifyFilenamePart(nameHint, "anonymous");
  const uniqueSuffix = uuid.v4().split('-')[0];
  const filename = `${cleanName}_${cleanType}_${timestamp}_${uniqueSuffix}.webp`;
  const remotePath = `generated_images/${cleanName}/${filename}`;
  
  const rawUrl = await uploadImageToGithub(imageBase64, remotePath);
  if (rawUrl) {
    await updatePromptsCsv(rawUrl, promptText, imageType);
    return rawUrl;
  }
  return null;
}

async function syncTextAssetToGithub(textContent, promptText, imageType, nameHint = null, extension = "svg") {
  const timestamp = getFormattedTimestamp();
  const cleanType = slugifyFilenamePart(imageType, "generated");
  const cleanName = slugifyFilenamePart(nameHint, "anonymous");
  const cleanExtension = slugifyFilenamePart(extension, "svg");
  const uniqueSuffix = uuid.v4().split('-')[0];
  const filename = `${cleanName}_${cleanType}_${timestamp}_${uniqueSuffix}.${cleanExtension}`;
  const remotePath = `generated_images/${cleanName}/${filename}`;

  const rawUrl = await uploadTextAssetToGithub(
    textContent,
    remotePath,
    `Upload generated ${imageType}`
  );
  if (rawUrl) {
    await updatePromptsCsv(rawUrl, promptText, imageType);
    return rawUrl;
  }
  return null;
}

module.exports = {
  githubIsConfigured,
  syncGenerationToGithub,
  syncTextAssetToGithub,
  uploadJsonToGithub
};
