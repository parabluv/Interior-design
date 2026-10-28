function buildPrompt(data) {
  const roomType = data.type || "Living Room";
  const roomName = (data.name || "").trim();
  const floorName = (data.floor || "").trim();
  const styles = data.styles || [];
  const colors = data.colors || [];
  const furniture = data.furniture || [];
  const dims = data.dimensions || {};
  const sourceImage = data.image;
  const additionalElements = (data.additionalElements || "").trim();
  const referenceDescription = (data.referenceDescription || "").trim();
  
  let dimensionsText = "";
  if (dims.w && dims.l) {
    dimensionsText = `Exact room size: ${dims.w}x${dims.l} ft`;
    if (dims.h) {
      dimensionsText += `, ceiling height ${dims.h} ft`;
    }
  }
  
  const stylesText = styles.length > 0 ? `Design style: ${styles.join(', ')}.` : "Design style: modern.";
  const colorsText = colors.length > 0 ? `Color palette: ${colors.join(', ')}.` : "";
  const furnitureText = furniture.length > 0 ? `Required furniture/elements: ${furniture.join(', ')}.` : "";
  const additionalText = additionalElements ? `Additional required elements: ${additionalElements}.` : "";
  const referenceText = referenceDescription ? `Reference image observations: ${referenceDescription}.` : "";
  
  let identityText = `Room type: ${roomType}.`;
  if (roomName) {
    identityText += ` Room name: ${roomName}.`;
  }
  if (floorName) {
    identityText += ` Located on: ${floorName}.`;
  }
  
  const noText = (
    `Render only one complete interior room scene. ` +
    `Do not turn it into any other room type than ${roomType}. ` +
    `No text, no labels, no watermarks, no collage, no split panels.`
  );

  let prompt = "";
  if (sourceImage) {
    prompt = (
      `Photorealistic architectural interior redesign. ${identityText} ` +
      `${stylesText} ${colorsText} ${furnitureText} ${additionalText} ${referenceText} ` +
      `${dimensionsText}. Preserve the exact room layout, wall positions, door positions, window positions, and camera perspective from the reference image. ` +
      `Keep the same architecture and only restyle materials, colors, furniture, and decor according to the input. ` +
      `Realistic lighting, premium residential visualization, 8k detail. ${noText}`
    );
  } else {
    prompt = (
      `Photorealistic architectural interior of exactly one ${roomType}. ${identityText} ` +
      `${stylesText} ${colorsText} ${furnitureText} ${additionalText} ${referenceText} ` +
      `${dimensionsText}. The space planning, scale, furniture count, and circulation must fit this exact room size and room type. ` +
      `Create a believable residential interior that clearly matches the requested use, not a random generic room. ` +
      `Professional interior photography, eye-level camera, realistic lighting, 8k detail. ${noText}`
    );
  }
  return prompt.trim();
}

function buildFloorplanSystemPrompt() {
  return (
    "You are an expert architectural drafter specializing in 2D BLUEPRINT SCHEMATICS. " +
    "Style: TECHNICAL BLUEPRINT / CAD DRAWING. " +
    "Perspective: 100% FLAT TOP-DOWN ORTHOGRAPHIC PROJECTION. " +
    "Background: PURE STARK WHITE. " +
    "Lines: CRISP BOLD BLACK INK LINES. " +
    "Walls: SOLID BLACK FILLED WALLS. " +
    "Labels: BOLD ARIAL BLACK TEXT LABELS for each room. " +
    "Details: Schematic symbols for doors (swings), windows, and minimal block furniture silhouettes. " +
    "Strict Negative Constraints: NO 3D, NO shadows, NO perspective, NO tilt, NO artistic shading, NO colors (BLACK AND WHITE ONLY), NO landscaping, NO gradients, NO blur, NO photography, NO human figures. " +
    "The image must be a perfectly flat, non-artistic 2D blueprint."
  );
}

function buildFloorplanPrompt(floor = null, houseDimensions = null, planMode = "Manual", autoRequirements = null) {
  if (planMode === "Auto") {
    const requirements = autoRequirements || {};
    const totalFloors = requirements.total_floors || "unspecified";
    const totalRooms = requirements.total_rooms || "auto";
    const roomTypes = requirements.room_types || "auto-generated practical room mix";
    const floorRoomPlan = requirements.floor_room_plan || [];
    let prompt = (
      `Generate one proper 2D architectural floor plan layout. ` +
      `Project requirement: ${totalFloors} floor(s). ` +
      `Room count: ${totalRooms}. ` +
      `Requested room mix: ${roomTypes}. `
    );
    if (floorRoomPlan.length > 0) {
      const planLines = [];
      for (let f of floorRoomPlan) {
        const floorName = f.floor || "Level";
        const roomsCount = f.rooms || "auto";
        const floorTypes = f.room_types || "practical random mix";
        planLines.push(`${floorName}: ${roomsCount} rooms (${floorTypes})`);
      }
      prompt += "Floor-by-floor program: " + planLines.join(" | ") + ". ";
    }
    
    prompt += (
      "Show a compact, readable arrangement with connected rooms, wall thickness, door openings, and room labels using normal home room names. " +
      "Use the full drawing area so the plan is not sparse or mostly empty. " +
      "If rooms are not explicitly provided, choose a proper realistic mix such as living room, bedroom, kitchen, bathroom, dining, stairs, utility, or study depending on the floor. " +
      "Generate 2D floor plan image. dont generate 3d view of it. Do not generate random room arrangement unrelated to the requested floor program."
    );
    if (houseDimensions) {
      prompt += ` Overall footprint: ${houseDimensions}. `;
    }
    return prompt;
  }

  if (!floor) {
    return (
      "Generate a blank but proper 2D architectural plan shell with exterior boundary only. " +
      "Keep it top-down, technical, and on a white background."
    );
  }

  const rooms = floor.rooms || [];
  const roomDescriptions = [];
  for (let room of rooms) {
    const dims = room.dimensions || {};
    let dimsText = "";
    if (dims.w && dims.l) {
      dimsText = `(${dims.w}x${dims.l} ft)`;
    }
    roomDescriptions.push(
      `- ${room.type || 'Room'} named '${room.name || 'Unnamed'}' ${dimsText}`
    );
  }
  
  const roomListStr = roomDescriptions.join("\n");
  
  let prompt = (
    `Generate a strict technical 2D floorplan for '${floor.name || 'Floor'}'.\n` +
    `STRICT CONSTRAINT: Include ONLY the following rooms. DONT generate any other plan elements, hallways, or extra rooms.\n` +
    `REQUIRED ROOM LIST:\n${roomListStr}\n\n` +
    `Instructions: Arrange these rooms into a logical, connected architectural layout. ` +
    `Every room from the list must be present. NO hallucinated rooms. ` +
    `Style: TECHNICAL BLUEPRINT. High contrast, black and white only. ` +
    `Generate 2D floor plan image. dont generate 3d view of it. Do not invent another house plan.`
  );
  
  if (houseDimensions) {
    prompt += ` Overall plot size: ${houseDimensions}. `;
  }

  return prompt.trim();
}

function buildExteriorPrompt(data, viewName = null) {
  const style = data.style || "Modern";
  const colors = data.colors || [];
  const palette = colors.join(', ') || "neutral colors";
  const theme = data.theme || "Contemporary";
  const extraElements = (data.extra_elements || "").trim();
  const floors = data.floors || [];
  const houseDimensions = data.house_dimensions;

  const numStories = floors.length || 1;
  const storyText = numStories === 1 ? "single-story" : `${numStories}-story`;

  const roomSummary = [];
  const roomConstraints = [];
  let totalRoomCount = 0;
  for (let floor of floors) {
    const floorName = floor.name || "Level";
    const roomNames = [];
    for (let room of floor.rooms || []) {
      let roomName = room.name || room.type || "Room";
      const dims = room.dimensions || {};
      if (dims.w && dims.l) {
        roomName = `${roomName} (${dims.w}x${dims.l} ft)`;
      }
      roomNames.push(roomName);
    }
    totalRoomCount += roomNames.length;
    if (roomNames.length > 0) {
      roomSummary.push(`${floorName}: ${roomNames.slice(0, 6).join(', ')}`);
      roomConstraints.push(
        `${floorName} must correspond to exactly ${roomNames.length} rooms in the program: ${roomNames.slice(0, 8).join(', ')}.`
      );
    }
  }

  let structureHeader = `Photorealistic residential exterior of exactly one ${storyText} house with exactly ${numStories} floor(s).`;
  if (roomSummary.length > 0) {
    const roomList = roomSummary.join(" | ");
    structureHeader = (
      `Photorealistic residential exterior of exactly one ${storyText} house with exactly ${numStories} floor(s), ` +
      `designed from this floor-by-floor program: ${roomList}.`
    );
  }

  let viewText = "Exterior view.";
  if (viewName === "Front Side") {
    viewText = "Front-on facade view, symmetrical composition.";
  } else if (viewName === "Left Side") {
    viewText = "Left-side profile view.";
  } else if (viewName === "Right Side") {
    viewText = "Right-side profile view.";
  } else if (viewName === "Perspective View" || viewName === "Front + Side View") {
    viewText = (
      "Three-quarter corner exterior showing the FRONT facade and ONE SIDE facade together in the SAME single image. " +
      "The front elevation must be the primary face, with the side elevation clearly visible. " +
      "This must be one single render, not two separate views. " +
      "The visible outside corner of the house should sit near the center of the frame so both faces are obvious."
    );
  }

  const parts = [
    structureHeader,
    `View: ${viewText}`,
    `Architectural Style: ${style}.`,
    `Theme: ${theme}.`,
    `Exterior materials and colors: ${palette}.`,
    `The building massing, facade rhythm, roofline, window placement, and height must match a realistic ${storyText} home, not a random mansion or unrelated house.`
  ];

  if (totalRoomCount > 0) {
    parts.push(
      `Program total: exactly ${totalRoomCount} room(s) across exactly ${numStories} floor(s). Do not invent a different room program.`
    );
  }

  if (houseDimensions && typeof houseDimensions === 'object') {
    const width = houseDimensions.w;
    const length = houseDimensions.l;
    if (width && length) {
      parts.push(
        `Approximate built footprint: ${width} ft x ${length} ft. Keep the house proportions faithful to this size.`
      );
    }
  }

  if (roomConstraints.length > 0) {
    parts.push("Program constraints: " + roomConstraints.join(" "));
  }

  if (extraElements) {
    parts.push(`Details: ${extraElements}.`);
  }

  parts.push(
    "Architectural visualization quality, bright daylight, realistic materials, sharp detail, clean landscaping, driveway or entry path only if appropriate. " +
    "Show only one complete house, filling most of the frame. No multiple houses, no apartment block, no villa compound, no collage, no split panels."
  );

  if (viewName === "Perspective View" || viewName === "Front + Side View") {
    parts.push(
      "CRITICAL CAMERA: eye-level three-quarter camera from outside the front corner so both the front wall and exactly one side wall are visible in perspective. " +
      "Do not show only the front. Do not show only the side. Do not use aerial view. Do not use top-down view. " +
      "The image must clearly show two exterior faces of the same house in one composition. " +
      "At least 30 percent of the front facade and 30 percent of one side facade must be visible."
    );
  }

  if (numStories === 1) {
    parts.push(
      "CRITICAL STRUCTURE: strictly single-floor bungalow massing only. No upper floor, no mezzanine, no dormer pretending to be a second level, no extra upper windows, no stacked facade elements. " +
      "All visible windows, doors, and roofline must belong to one ground-level floor only."
    );
  } else {
    parts.push(
      `CRITICAL STRUCTURE: show exactly {num_stories} clearly readable levels in the facade composition, with believable stacked windows and floor heights.`
    );
  }

  parts.push(
    "No text, no labels, no watermarks, no floorplan overlay, no cutaway, no isolated interior room rendering, no invented extra levels, no unrelated house type, no second building."
  );

  return parts.join(" ").trim();
}

module.exports = {
  buildPrompt,
  buildFloorplanPrompt,
  buildFloorplanSystemPrompt,
  buildExteriorPrompt
};
