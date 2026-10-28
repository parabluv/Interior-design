const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const axios = require('axios');
const uuid = require('uuid');
const fs = require('fs');
const path = require('path');
const systeminfo = require('systeminformation');

const config = require('./config');
const auth = require('./auth');
const prompts = require('./prompts');
const imageApi = require('./imageApi');
const floorplanRenderer = require('./floorplanRenderer');
const githubUploader = require('./githubUploader');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS
app.use(cors({
  origin: true,
  credentials: true
}));

// Middlewares
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());

// Persistent Session Key
const SECRET_KEY_FILE = path.join(__dirname, ".session_secret_key");
let sessionSecret = "";
try {
  if (fs.existsSync(SECRET_KEY_FILE)) {
    sessionSecret = fs.readFileSync(SECRET_KEY_FILE, 'utf-8').trim();
  }
} catch (e) {}

if (!sessionSecret) {
  sessionSecret = uuid.v4();
  try {
    fs.writeFileSync(SECRET_KEY_FILE, sessionSecret, 'utf-8');
  } catch (e) {}
}

app.use(session({
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    sameSite: 'lax',
    secure: false // Set to true if running behind https
  }
}));

// Serve static React files in production
const clientBuildPath = path.join(__dirname, 'client', 'dist');
if (fs.existsSync(clientBuildPath)) {
  app.use(express.static(clientBuildPath));
}

// Ensure remote keys are loaded on start
app.use(async (req, res, next) => {
  if (!config.OPENROUTER_API_KEY) {
    try {
      await config.loadRemoteKeys();
    } catch (err) {
      console.error("Warning: config keys not initialized yet.");
    }
  }
  next();
});

// Helper: Require Auth Middleware
function requireAuth(req, res, next) {
  if (req.session && req.session.user) {
    next();
  } else {
    res.status(401).json({ error: "Authentication required" });
  }
}

// ================= FIREBASE USER MANAGEMENTS =================

async function loadUsers() {
  try {
    const response = await axios.get(`${config.FIREBASE_URL}users.json`, { timeout: 10000 });
    const data = response.data;
    if (!data) return [];
    
    let users = Array.isArray(data) ? data.filter(Boolean) : Object.values(data);
    
    // Migration: ensure all users have id
    let modified = false;
    users = users.map(u => {
      if (!u.id) {
        u.id = uuid.v4();
        modified = true;
      }
      return u;
    });

    if (modified) {
      await saveUsers(users);
    }
    return users;
  } catch (error) {
    console.error("Firebase load users error:", error.message);
    return [];
  }
}

async function saveUsers(users) {
  try {
    await axios.put(`${config.FIREBASE_URL}users.json`, users, { timeout: 10000 });
  } catch (error) {
    console.error("Firebase save users error:", error.message);
  }
}

function publicUserProfile(user) {
  const firstName = user.first_name || "";
  const lastName = user.last_name || "";
  const fullName = user.name || `${firstName} ${lastName}`.trim() || user.username || (user.email || "").split("@")[0] || "User";

  return {
    id: user.id,
    username: user.username || fullName,
    email: user.email,
    first_name: firstName,
    last_name: lastName,
    name: fullName,
    avatar: user.avatar || "",
    provider: user.provider || "email"
  };
}

// ================= AUTH ENDPOINTS =================

app.post('/api/auth/signup', async (req, res) => {
  try {
    const { username, email, first, last, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: "Username, email and password are required" });
    }

    const users = await loadUsers();
    if (users.some(u => u.email === email)) {
      return res.status(400).json({ error: "Email already registered" });
    }
    if (users.some(u => u.username === username)) {
      return res.status(400).json({ error: "Username already taken" });
    }

    const newUser = {
      id: uuid.v4(),
      username,
      email,
      first_name: first || "",
      last_name: last || "",
      password: auth.hashPassword(password)
    };

    users.push(newUser);
    await saveUsers(users);

    req.session.user = publicUserProfile(newUser);

    res.json({ user: req.session.user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const users = await loadUsers();
    const user = users.find(u => u.email === email);

    if (user && auth.verifyPassword(password, user.password)) {
      req.session.user = publicUserProfile(user);
      return res.json({ user: req.session.user });
    }

    res.status(401).json({ error: "Invalid email or password" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/google', async (req, res) => {
  try {
    const { uid, email, name, avatar } = req.body;
    if (!uid || !email) {
      return res.status(400).json({ error: "Google uid and email are required" });
    }

    const users = await loadUsers();
    const normalizedEmail = String(email).trim().toLowerCase();
    let user = users.find(u => u.google_uid === uid || String(u.email || "").toLowerCase() === normalizedEmail);

    if (!user) {
      user = {
        id: uuid.v4(),
        google_uid: uid,
        username: name || normalizedEmail.split("@")[0],
        email: normalizedEmail,
        name: name || normalizedEmail.split("@")[0],
        first_name: "",
        last_name: "",
        avatar: avatar || "",
        provider: "google"
      };
      users.push(user);
    } else {
      user.google_uid = user.google_uid || uid;
      user.email = normalizedEmail;
      user.name = name || user.name || user.username || normalizedEmail.split("@")[0];
      user.username = user.username || user.name;
      user.avatar = avatar || user.avatar || "";
      user.provider = user.provider || "google";
    }

    await saveUsers(users);
    req.session.user = publicUserProfile(user);
    res.json({ user: req.session.user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/profile', requireAuth, async (req, res) => {
  try {
    const { username, first_name, last_name, name, avatar } = req.body;
    const users = await loadUsers();
    const idx = users.findIndex(u => u.id === req.session.user.id);

    if (idx === -1) {
      return res.status(404).json({ error: "User not found" });
    }

    const cleanUsername = String(username || "").trim();
    if (!cleanUsername) {
      return res.status(400).json({ error: "Display name is required" });
    }

    const duplicate = users.find(u => u.id !== req.session.user.id && u.username === cleanUsername);
    if (duplicate) {
      return res.status(400).json({ error: "Username already taken" });
    }

    users[idx] = {
      ...users[idx],
      username: cleanUsername,
      first_name: String(first_name || "").trim(),
      last_name: String(last_name || "").trim(),
      name: String(name || cleanUsername).trim(),
      avatar: String(avatar || users[idx].avatar || "").trim()
    };

    await saveUsers(users);
    req.session.user = publicUserProfile(users[idx]);
    res.json({ user: req.session.user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: "Failed to log out" });
    }
    res.clearCookie('connect.sid');
    res.json({ ok: true });
  });
});

app.get('/api/auth/me', (req, res) => {
  if (req.session && req.session.user) {
    res.json({ user: req.session.user });
  } else {
    res.status(401).json({ error: "Not authenticated" });
  }
});

// ================= PROJECT HISTORY ENDPOINTS =================

function projectFilenameFromId(projectName, projectId) {
  const ts = new Date().toISOString().replace(/T/, '_').replace(/\..+/, '').replace(/:/g, '').replace(/-/g, '');
  const safeName = projectName.replace(/[^A-Za-z0-9]/g, '_');
  return `${safeName}_${ts}_${projectId}.json`;
}

app.post('/api/projects/save', requireAuth, async (req, res) => {
  try {
    const data = req.body;
    const projectName = data.name || "Untitled Project";
    const floors = data.floors || [];
    const auto_floor_hierarchy = data.auto_floor_hierarchy || [];
    const generated_2d_interiors = data.generated_2d_interiors || [];
    const floorplan_manual_floors = data.floorplan_manual_floors || [];
    const floorplan_mode = data.floorplan_mode || "Manual";
    const floorplan_house_dimensions = data.floorplan_house_dimensions || {};
    let filename = data.filename;
    let projectId = null;

    if (!filename) {
      projectId = uuid.v4().split('-')[0];
      filename = projectFilenameFromId(projectName, projectId);
    } else {
      const parts = filename.replace('.json', '').split('_');
      projectId = parts[parts.length - 1] || uuid.v4().split('-')[0];
    }

    const projectState = {
      name: projectName,
      timestamp: new Date().toISOString(),
      floors,
      auto_floor_hierarchy,
      generated_2d_interiors,
      floorplan_manual_floors,
      floorplan_mode,
      floorplan_house_dimensions,
      filename,
      project_id: projectId
    };

    const userId = req.session.user.id;
    const url = `${config.FIREBASE_URL}projects/${userId}/${projectId}.json`;
    await axios.put(url, projectState, { timeout: 10000 });

    res.json({ status: "success", filename });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/projects/history', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const response = await axios.get(`${config.FIREBASE_URL}projects/${userId}.json`, { timeout: 10000 });
    const data = response.data || {};
    
    const projects = [];
    Object.entries(data).forEach(([projectId, meta]) => {
      if (!meta || typeof meta !== 'object') return;
      const filename = meta.filename || `project_${projectId}.json`;
      projects.push({
        filename,
        name: meta.name || "Untitled",
        timestamp: meta.timestamp
      });
    });

    projects.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    res.json(projects);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/projects/load/:filename', requireAuth, async (req, res) => {
  try {
    const filename = req.params.filename;
    const parts = filename.replace('.json', '').split('_');
    const projectId = parts[parts.length - 1];

    if (!projectId) {
      return res.status(400).json({ error: "Invalid project filename" });
    }

    const userId = req.session.user.id;
    const response = await axios.get(`${config.FIREBASE_URL}projects/${userId}/${projectId}.json`, { timeout: 10000 });
    if (!response.data) {
      return res.status(404).json({ error: "Project not found" });
    }
    res.json(response.data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ================= OPENROUTER AI INTEGRATION =================

async function describeRoomReferenceImage(imageB64, roomType = "Room") {
  if (!imageB64) return "";
  let formattedB64 = imageB64;
  if (!formattedB64.startsWith("data:image")) {
    formattedB64 = `data:image/png;base64,${formattedB64}`;
  }

  const headers = {
    "Authorization": `Bearer ${config.OPENROUTER_API_KEY}`,
    "Content-Type": "application/json"
  };

  const payload = {
    model: config.RECOGNITION_MODEL,
    messages: [
      {
        role: "system",
        content: `You are an architectural interior analyst. Describe only the visible room layout and architectural facts from the image in one short paragraph. Focus on room shape, wall layout, doors, windows, ceiling form, fixed cabinetry, and viewpoint. The target room type is ${roomType}. Do not invent unseen objects. Do not return JSON.`
      },
      {
        role: "user",
        content: [
          { type: "text", text: `Describe this ${roomType} reference image for image generation grounding.` },
          { type: "image_url", image_url: { url: formattedB64 } }
        ]
      }
    ],
    temperature: 0.1
  };

  const response = await axios.post(config.OPENROUTER_ENDPOINT, payload, { headers, timeout: 30000 });
  if (response.status !== 200) {
    throw new Error(`Vision API Error: ${response.data}`);
  }
  
  const content = response.data.choices[0].message.content.trim();
  return content.substring(0, 600);
}

function cleanJsonText(content) {
  let cleaned = (content || "").trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.substring(7);
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.substring(3);
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.substring(0, cleaned.length - 3);
  }
  return cleaned.trim();
}

async function queryOpenRouterReasoning(userPrompt, systemPrompt) {
  const headers = {
    "Authorization": `Bearer ${config.OPENROUTER_API_KEY}`,
    "Content-Type": "application/json"
  };

  const messages = [];
  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }
  messages.push({ role: "user", content: userPrompt });

  const payload = {
    model: config.REASONING_MODEL,
    messages,
    temperature: 0.2
  };

  const response = await axios.post(config.OPENROUTER_ENDPOINT, payload, { headers, timeout: 25000 });
  if (response.status !== 200) {
    throw new Error(`OpenRouter Reasoning API Error: ${response.data}`);
  }
  return response.data.choices[0].message.content.trim();
}

// ================= GENERATIVE ENDPOINTS =================

// Helper: sync Firebase asset
function syncFirebaseAssetAsync(userId, type, prompt, imageUrl) {
  setTimeout(async () => {
    try {
      await axios.post(`${config.FIREBASE_URL}generated_assets/${userId}.json`, {
        timestamp: new Date().toISOString(),
        type,
        prompt,
        image_data: imageUrl
      }, { timeout: 10000 });
    } catch (e) {
      console.error("Firebase asset backup failed:", e.message);
    }
  }, 10);
}

app.post('/api/generate/interior', requireAuth, async (req, res) => {
  try {
    const data = req.body;
    let sourceImage = data.image;
    const roomType = data.type || "Room";

    if (sourceImage && !data.referenceDescription) {
      try {
        data.referenceDescription = await describeRoomReferenceImage(sourceImage, roomType);
      } catch (visionExc) {
        console.error("Reference room image analysis failed:", visionExc.message);
      }
    }

    const prompt = prompts.buildPrompt(data);
    const imgB64 = await imageApi.generateImage(prompt, sourceImage);
    if (!imgB64) {
      throw new Error("Image generation failed");
    }

    const userId = req.session.user.id;
    const username = req.session.user.username;
    
    // Background sync to GitHub & Firebase
    let finalUrl = `data:image/webp;base64,${imgB64}`;
    githubUploader.syncGenerationToGithub(imgB64, prompt, "Interior", username)
      .then(githubUrl => {
        if (githubUrl) {
          syncFirebaseAssetAsync(userId, "Interior", prompt, githubUrl);
        }
      })
      .catch(err => console.error("GitHub upload async failed:", err.message));

    // Save history record in Firebase Realtime DB
    axios.post(`${config.FIREBASE_URL}generations/${userId}/interiors.json`, {
      timestamp: new Date().toISOString(),
      user_id: userId,
      prompt,
      type: "interior",
      image_url: finalUrl
    }, { timeout: 10000 }).catch(e => console.error(e.message));

    res.json({
      image_url: finalUrl,
      prompt_used: prompt
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/generate/floorplan', requireAuth, async (req, res) => {
  try {
    const data = req.body;
    const floors = data.floors || [];
    const houseDimensions = data.house_dimensions;
    const planMode = data.plan_mode || "Manual";
    const autoRequirements = data.auto_requirements || {};

    let houseDimensionsText = "";
    if (houseDimensions && typeof houseDimensions === 'object') {
      const { w, l, h } = houseDimensions;
      if (w && l) {
        houseDimensionsText = `${w}x${l} ft`;
        if (h) houseDimensionsText += ` height ${h} ft`;
      }
    }

    const imageUrls = [];
    const promptsUsed = [];
    const floorNames = [];
    const floorplanSystemPrompt = prompts.buildFloorplanSystemPrompt();
    const userId = req.session.user.id;
    const username = req.session.user.username;

    if (planMode === "Auto" || floors.length === 0) {
      let autoFloorPlan = autoRequirements.floor_room_plan || [];
      if (autoFloorPlan.length === 0) {
        const totalFloors = Math.max(1, parseInt(autoRequirements.total_floors) || 1);
        for (let idx = 0; idx < totalFloors; idx++) {
          const floorName = idx === 0 ? "Ground Floor" : (idx === 1 ? "1st Floor" : (idx === 2 ? "2nd Floor" : `${idx}th Floor`));
          autoFloorPlan.push({ floor: floorName });
        }
      }

      for (let i = 0; i < autoFloorPlan.length; i++) {
        const floorSpec = autoFloorPlan[i];
        const floorAutoRequirements = { ...autoRequirements, floor_room_plan: [floorSpec] };
        const userPrompt = prompts.buildFloorplanPrompt(null, houseDimensionsText, planMode, floorAutoRequirements);
        const prompt = `SYSTEM:\n${floorplanSystemPrompt}\n\nUSER:\n${userPrompt}`;
        promptsUsed.push(prompt);

        const imgB64 = await imageApi.generateImage(prompt, null, 1024, 1024);
        const cloudUrl = `data:image/png;base64,${imgB64}`;
        
        // Async sync to GitHub
        githubUploader.syncGenerationToGithub(imgB64, prompt, "Floorplan", username)
          .then(githubUrl => {
            if (githubUrl) {
              syncFirebaseAssetAsync(userId, "Floorplan", prompt, githubUrl);
            }
          })
          .catch(e => console.error("GitHub upload async failed:", e.message));

        imageUrls.push(cloudUrl);
        floorNames.push(floorSpec.floor || `Floor ${i + 1}`);
      }
    } else {
      for (let i = 0; i < floors.length; i++) {
        const floor = floors[i];
        const userPrompt = prompts.buildFloorplanPrompt(floor, houseDimensionsText, planMode, autoRequirements);
        const prompt = `SYSTEM:\n${floorplanSystemPrompt}\n\nUSER:\n${userPrompt}`;
        promptsUsed.push(prompt);

        const svgMarkup = floorplanRenderer.renderFloorplanSvg(floor, houseDimensions, planMode, autoRequirements);
        const svgB64 = Buffer.from(svgMarkup, 'utf-8').toString('base64');
        const imageUrl = `data:image/svg+xml;base64,${svgB64}`;
        imageUrls.push(imageUrl);
        floorNames.push(floor.name || `Floor ${i + 1}`);

        // Async upload SVG to GitHub
        githubUploader.syncTextAssetToGithub(svgMarkup, prompt, "Floorplan", username, "svg")
          .catch(e => console.error("GitHub upload SVG failed:", e.message));
      }
    }

    // Save record to Firebase
    axios.post(`${config.FIREBASE_URL}generations/${userId}/floorplans.json`, {
      timestamp: new Date().toISOString(),
      user_id: userId,
      type: "floorplan",
      plan_mode: planMode,
      image_urls: imageUrls,
      prompts_used: promptsUsed
    }, { timeout: 10000 }).catch(e => console.error(e.message));

    res.json({
      image_urls: imageUrls,
      floor_names: floorNames,
      prompts_used: promptsUsed
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

async function generateReasonedExteriorPrompt(data, viewName) {
  const style = data.style || "Modern";
  const theme = data.theme || "Contemporary";
  const colors = data.colors || [];
  const extraElements = (data.extra_elements || "").trim();
  const floors = data.floors || [];
  const houseDimensions = data.house_dimensions || {};

  const floorCount = floors.length || 1;
  let floorInstruction = "";
  if (floorCount === 1) {
    floorInstruction = "The house MUST be a STRICTLY SINGLE-STORY bungalow. ABSOLUTELY NO second floor, no mezzanine, no upper terrace massing, and no upper-level windows.";
  } else {
    floorInstruction = `The house must have EXACTLY ${floorCount} floors, no more and no fewer.`;
  }

  const roomProgram = [];
  let totalRooms = 0;
  for (let floor of floors) {
    const floorName = floor.name || "Level";
    const roomNames = [];
    for (let room of floor.rooms || []) {
      let rName = room.name || room.type || "Room";
      const dims = room.dimensions || {};
      if (dims.w && dims.l) {
        rName = `${rName} (${dims.w}x${dims.l} ft)`;
      }
      roomNames.push(rName);
    }
    totalRooms += roomNames.length;
    if (roomNames.length > 0) {
      roomProgram.push(`${floorName}: ${roomNames.slice(0, 8).join(', ')}`);
    }
  }

  let footprintText = "";
  if (houseDimensions.w && houseDimensions.l) {
    footprintText = `Approximate footprint: ${houseDimensions.w} ft x ${houseDimensions.l} ft.`;
  }

  let viewInstruction = `Create a ${viewName} exterior image.`;
  if (viewName === "Perspective View" || viewName === "Front + Side View") {
    viewInstruction = "Create exactly one exterior image showing the FRONT facade and ONE SIDE facade of the same house together in a single three-quarter perspective composition. The outside corner where those two facades meet should be near the center of the frame, with substantial visible area from both facades.";
  }

  const userQuery = (
    `Generate a professional architectural image-generation prompt for a residential exterior render. ` +
    `${viewInstruction} ` +
    `${floorInstruction} ` +
    `Style: ${style}. Theme: ${theme}. Colors/materials: ${colors.length > 0 ? colors.join(', ') : 'neutral'}. ` +
    `Room program: ${roomProgram.length > 0 ? roomProgram.join(' | ') : 'standard residential program'}. ` +
    `Total rooms: ${totalRooms || 'unspecified'}. ` +
    `${footprintText} ` +
    `Extra elements: ${extraElements || 'none'}. ` +
    `The final prompt must strongly prevent random buildings, random extra floors, multiple houses, or split views. ` +
    `It must demand one proper house that matches the requested floors and room program. ` +
    `The prompt should be photorealistic, 8k, luxury architectural photography style. ` +
    `Output ONLY the final prompt string, no other text.`
  );

  try {
    let prompt = await queryOpenRouterReasoning(userQuery, null);
    if (prompt.startsWith('"') && prompt.endsWith('"')) {
      prompt = prompt.substring(1, prompt.length - 1);
    }
    return prompt;
  } catch (error) {
    console.warn("Reasoned exterior prompt fallback:", error.message);
    return prompts.buildExteriorPrompt(data, viewName);
  }
}

async function generateSingleExteriorView(data, viewName, username) {
  const prompt = await generateReasonedExteriorPrompt(data, viewName);
  const imgB64 = await imageApi.generateImage(prompt, null, 1344, 768);
  if (!imgB64) {
    throw new Error(`Exterior image generation failed for ${viewName}`);
  }

  // Decoupled cloud upload in the background
  const dataUrl = `data:image/webp;base64,${imgB64}`;
  githubUploader.syncGenerationToGithub(imgB64, prompt, "Exterior", username)
    .catch(e => console.error("GitHub upload async failed:", e.message));

  return {
    view: viewName,
    prompt,
    image_url: dataUrl
  };
}

function buildImageProperties(imageUrls) {
  return (imageUrls || []).map(url => {
    let mime = "image/webp";
    let extension = "webp";
    let source = "url";

    if (url.startsWith("data:")) {
      source = "data_url";
      mime = url.split(";")[0].replace("data:", "") || "image/png";
      extension = mime.split("/")[1] || "png";
    } else if (url.includes(".svg")) {
      mime = "image/svg+xml";
      extension = "svg";
    } else if (url.includes(".png")) {
      mime = "image/png";
      extension = "png";
    } else if (url.includes(".jpg") || url.includes(".jpeg")) {
      mime = "image/jpeg";
      extension = "jpg";
    }

    return {
      mime_type: mime,
      extension,
      is_webp: extension === "webp",
      source
    };
  });
}

app.post('/api/generate/exterior', requireAuth, async (req, res) => {
  try {
    const rawData = req.body;
    // Normalize data
    const requestedFloorCount = Math.max(0, parseInt(rawData.requested_floor_count) || 0);
    const data = {
      style: (rawData.style || "Modern").trim(),
      theme: (rawData.theme || "Contemporary").trim(),
      colors: (rawData.colors || []).map(c => String(c).trim()).filter(Boolean),
      extra_elements: (rawData.extra_elements || "").trim(),
      house_dimensions: rawData.house_dimensions || {},
      requested_floor_count: requestedFloorCount,
      floors: []
    };

    const rawFloors = rawData.floors || [];
    rawFloors.forEach((floor, idx) => {
      if (!floor || typeof floor !== 'object') return;
      let floorName = (floor.name || floor.floor || "").trim();
      if (!floorName) {
        floorName = idx === 0 ? "Ground Floor" : (idx === 1 ? "1st Floor" : (idx === 2 ? "2nd Floor" : `${idx}th Floor`));
      }
      const rooms = (floor.rooms || []).map(room => {
        if (!room || typeof room !== 'object') return null;
        const roomType = (room.type || room.name || "Room").trim() || "Room";
        const roomName = (room.name || roomType).trim() || roomType;
        const dims = room.dimensions || {};
        return {
          type: roomType,
          name: roomName,
          dimensions: {
            w: dims.w || "",
            l: dims.l || "",
            h: dims.h || ""
          }
        };
      }).filter(Boolean);

      data.floors.push({
        name: floorName,
        rooms
      });
    });

    if (requestedFloorCount > 0) {
      data.floors = data.floors.slice(0, requestedFloorCount);
    }
    if (data.floors.length === 0) {
      return res.status(400).json({ error: "Exterior generation requires at least one configured floor." });
    }

    const userId = req.session.user.id;
    const username = req.session.user.username;
    const requestedViews = ["Front + Side View"];
    const imageUrls = [];
    const promptsUsed = [];
    const generatedViews = [];
    const generationErrors = [];

    for (let view of requestedViews) {
      try {
        const result = await generateSingleExteriorView(data, view, username);
        generatedViews.push(result.view);
        promptsUsed.push(result.prompt);
        imageUrls.push(result.image_url);
      } catch (viewExc) {
        generationErrors.push(`${view}: ${viewExc.message}`);
      }
    }

    if (imageUrls.length === 0) {
      throw new Error(`Exterior generation failed. ${generationErrors.join(', ')}`);
    }

    const imageProperties = buildImageProperties(imageUrls);
    
    // Save record to Firebase
    axios.post(`${config.FIREBASE_URL}generations/${userId}/exteriors.json`, {
      timestamp: new Date().toISOString(),
      user_id: userId,
      type: "exterior",
      input_used: data,
      image_urls: imageUrls,
      image_properties: imageProperties,
      views: generatedViews,
      prompts_used: promptsUsed,
      errors: generationErrors
    }, { timeout: 10000 }).catch(e => console.error(e.message));

    res.json({
      input_used: data,
      image_urls: imageUrls,
      image_properties: imageProperties,
      views: generatedViews,
      prompts_used: promptsUsed,
      warnings: generationErrors
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/generate/recognize_2d_plan', requireAuth, async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ error: "No image provided" });
    }

    let imageB64 = image;
    if (!imageB64.startsWith("data:image")) {
      imageB64 = `data:image/png;base64,${imageB64}`;
    }

    const headers = {
      "Authorization": `Bearer ${config.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json"
    };

    const systemPrompt = (
      "You are an expert architectural assistant. Look at the provided 2D floorplan image " +
      "and extract the rooms and their dimensions (if visible). " +
      "For each room, you must also infer or suggest appropriate styles, colors, and furniture. " +
      "You MUST output ONLY a pure JSON object, with no markdown formatting or backticks. " +
      "The JSON strictly follow this structure: " +
      '{"floors": [{"name": "Ground Floor", "rooms": [{"type": "Living Room", "name": "Main Lounge", "dimensions": {"w": 20, "l": 15}, "styles": ["Modern"], "colors": ["White", "Grey"], "furniture": ["Sofa", "Coffee Table"]}]}]}'
    );

    const payload = {
      model: config.RECOGNITION_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: "Extract the rooms and dimensions from this floorplan into the requested JSON format." },
            { type: "image_url", image_url: { url: imageB64 } }
          ]
        }
      ],
      temperature: 0.2
    };

    const response = await axios.post(config.OPENROUTER_ENDPOINT, payload, { headers, timeout: 45000 });
    if (response.status !== 200) {
      return res.status(500).json({ error: `OpenRouter API Error: ${response.data}` });
    }

    const contentRaw = response.data.choices[0].message.content.trim();
    const contentCleaned = cleanJsonText(contentRaw);

    let parsedJson = {};
    try {
      parsedJson = JSON.parse(contentCleaned);
    } catch (e) {
      return res.status(500).json({ error: "LLM returned invalid JSON output", raw: contentRaw });
    }

    // Normalize outputs to prevent front-end crashes
    if (parsedJson.floors) {
      parsedJson.floors.forEach(floor => {
        if (!floor.rooms) return;
        floor.rooms.forEach(room => {
          if (!room.styles || !Array.isArray(room.styles)) room.styles = ["Modern"];
          if (!room.colors || !Array.isArray(room.colors)) room.colors = [];
          if (!room.furniture || !Array.isArray(room.furniture)) room.furniture = [];
          if (!room.dimensions) room.dimensions = { w: "", l: "", h: "" };
          if (!room.name) room.name = room.type || "Room";
        });
      });
    }

    res.json(parsedJson);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

async function generateAutoFloorProgram(houseDimensions, totalFloors) {
  const systemPrompt = (
    "You are a residential architect. Generate only valid JSON. " +
    "Return a practical room program for each floor of a normal house. " +
    "Use normal room names like Living Room, Bedroom, Kitchen, Bathroom, Dining, Study, Utility, Balcony, Stair Lobby. " +
    "JSON format must be: " +
    '{"floors":[{"name":"Ground Floor","rooms":[{"type":"Living Room","name":"Living Room","dimensions":{"w":16,"l":14,"h":10}}]}]}'
  );
  
  const userPrompt = (
    `Create a realistic home floor program for a plot size of ${houseDimensions || 'unspecified'} ` +
    `with exactly ${totalFloors} floors. ` +
    "Return 4 to 7 practical rooms per floor. " +
    "Ground floor should usually include living, kitchen, dining, bathroom, and utility or guest room. " +
    "Upper floors should usually include bedrooms, bathrooms, study, family lounge, balcony, or utility. " +
    "Keep room names natural and repeated only when realistic. " +
    "Output only JSON."
  );

  try {
    const rawContent = await queryOpenRouterReasoning(userPrompt, systemPrompt);
    const cleaned = cleanJsonText(rawContent);
    const parsed = JSON.parse(cleaned);
    const floors = parsed.floors || [];
    
    const normalized = [];
    for (let idx = 0; idx < Math.min(floors.length, totalFloors); idx++) {
      const floor = floors[idx];
      const floorName = floor.name || (idx === 0 ? "Ground Floor" : `${idx}st Floor`);
      const rooms = [];
      
      for (let room of floor.rooms || []) {
        const dims = room.dimensions || {};
        rooms.push({
          type: room.type || room.name || "Room",
          name: room.name || room.type || "Room",
          dimensions: {
            w: dims.w || "",
            l: dims.l || "",
            h: dims.h || ""
          }
        });
      }
      if (rooms.length > 0) {
        normalized.push({ name: floorName, rooms });
      }
    }
    if (normalized.length > 0) return normalized;
  } catch (error) {
    console.error("Auto floor program query failed, using fallback:", error.message);
  }

  // Fallbacks
  const fallback = [];
  for (let idx = 0; idx < totalFloors; idx++) {
    if (idx === 0) {
      fallback.push({
        name: "Ground Floor",
        rooms: [
          { type: "Living Room", name: "Living Room", dimensions: { w: 16, l: 14, h: 10 } },
          { type: "Kitchen", name: "Kitchen", dimensions: { w: 12, l: 10, h: 10 } },
          { type: "Dining", name: "Dining", dimensions: { w: 12, l: 10, h: 10 } },
          { type: "Bathroom", name: "Bathroom", dimensions: { w: 8, l: 6, h: 10 } }
        ]
      });
    } else {
      fallback.push({
        name: idx === 1 ? "1st Floor" : `${idx}th Floor`,
        rooms: [
          { type: "Master Bedroom", name: "Master Bedroom", dimensions: { w: 14, l: 12, h: 10 } },
          { type: "Bedroom", name: "Bedroom", dimensions: { w: 12, l: 11, h: 10 } },
          { type: "Bathroom", name: "Bathroom", dimensions: { w: 8, l: 6, h: 10 } },
          { type: "Study", name: "Study", dimensions: { w: 10, l: 9, h: 10 } }
        ]
      });
    }
  }
  return fallback;
}

app.post('/api/generate/infer_auto_floor_program', requireAuth, async (req, res) => {
  try {
    const data = req.body;
    const totalFloors = Math.max(1, parseInt(data.total_floors) || 1);
    const houseDimensions = data.house_dimensions || {};
    let dimensionText = "";
    if (typeof houseDimensions === 'object') {
      dimensionText = `${houseDimensions.w || ''}x${houseDimensions.l || ''} ft`.trim();
    } else {
      dimensionText = String(houseDimensions || "").trim();
    }

    const floors = await generateAutoFloorProgram(dimensionText, totalFloors);
    const plan = [];
    
    floors.slice(0, totalFloors).forEach(floor => {
      const rooms = floor.rooms || [];
      const roomTypes = [...new Set(rooms.map(r => r.type || r.name || "Room"))].join(", ");
      plan.push({
        floor: floor.name || "Floor",
        rooms: String(Math.max(1, rooms.length)),
        room_types: roomTypes
      });
    });

    res.json({ floor_room_plan: plan });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Serve the frontend index.html for all other client-side routes
if (fs.existsSync(clientBuildPath)) {
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
}

// Start Server
app.listen(PORT, async () => {
  console.log(`================================================================================`);
  console.log(`      HOME DESIGN AI BACKEND SERVER INITIALIZATION`);
  console.log(`      Running on http://localhost:${PORT}`);
  console.log(`================================================================================`);
  try {
    await config.loadRemoteKeys();
    console.log(`[SYSTEM] Initialized remote keys CSV from GitHub successfully.`);
  } catch (e) {
    console.error(`[CRITICAL] Failed to load remote keys on startup.`);
  }
});
