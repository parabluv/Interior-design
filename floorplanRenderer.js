function safeText(value, fallback = "") {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text || fallback;
}

function toNumber(value, fallback) {
  try {
    const number = parseFloat(value);
    return !isNaN(number) && number > 0 ? number : fallback;
  } catch (error) {
    return fallback;
  }
}

function parseHouseDimensions(houseDimensions) {
  if (!houseDimensions) {
    return [60.0, 40.0];
  }

  if (typeof houseDimensions === 'string' && houseDimensions.toLowerCase().includes('x')) {
    const parts = houseDimensions.toLowerCase().replace(/ft/g, '').split('x');
    if (parts.length >= 2) {
      return [toNumber(parts[0], 60.0), toNumber(parts[1], 40.0)];
    }
  }

  if (typeof houseDimensions === 'object') {
    return [toNumber(houseDimensions.w, 60.0), toNumber(houseDimensions.l, 40.0)];
  }

  return [60.0, 40.0];
}

function roomZone(roomType) {
  const text = safeText(roomType).toLowerCase();
  if (["living", "dining", "drawing", "family", "lounge", "foyer"].some(token => text.includes(token))) {
    return "public";
  }
  if (["bed", "master", "guest", "study", "office", "kids"].some(token => text.includes(token))) {
    return "private";
  }
  if (["kitchen", "bath", "toilet", "wash", "store", "utility", "laundry", "garage", "stair", "pantry"].some(token => text.includes(token))) {
    return "service";
  }
  return "mixed";
}

function roomFill(roomType) {
  const zone = roomZone(roomType);
  if (zone === "public") return "#f1e8dc";
  if (zone === "private") return "#e7eef7";
  if (zone === "service") return "#ebe9f3";
  return "#edf0e8";
}

function roomLabel(room) {
  const dims = room.dimensions || {};
  const name = safeText(room.name, "Room");
  const parts = [name];
  if (dims.w && dims.l) {
    parts.push(`${dims.w} x ${dims.l} ft`);
  }
  return parts;
}

function addWindowMarks(parts, x, y, rectW, rectH) {
  const windowLen = Math.min(rectW * 0.24, 86);
  if (rectW > 150) {
    const wx = x + (rectW - windowLen) / 2.0;
    parts.push(
      `<rect x="${wx.toFixed(1)}" y="${(y - 4).toFixed(1)}" width="${windowLen.toFixed(1)}" height="8" rx="2" fill="#ffffff" stroke="#8a8a8a" stroke-width="1.3"/>`
    );
  }
  if (rectH > 150) {
    const windowLenH = Math.min(rectH * 0.24, 86);
    const wy = y + (rectH - windowLenH) / 2.0;
    parts.push(
      `<rect x="${(x - 4).toFixed(1)}" y="${wy.toFixed(1)}" width="8" height="${windowLenH.toFixed(1)}" rx="2" fill="#ffffff" stroke="#8a8a8a" stroke-width="1.3"/>`
    );
  }
}

function addFurniture(parts, roomType, x, y, rectW, rectH) {
  const type = roomType.toLowerCase();
  const pad = 18;

  if (type.includes("bed") && rectW > 120 && rectH > 150) {
    const bw = Math.min(rectW * 0.42, 122);
    const bh = Math.min(rectH * 0.34, 150);
    const bx = x + pad;
    const by = y + pad;
    parts.push(`<rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" rx="18" fill="none" stroke="#656565" stroke-width="2.5"/>`);
    const pillowW = bw * 0.26;
    const pillowH = bh * 0.26;
    parts.push(`<rect x="${(bx + 8).toFixed(1)}" y="${(by + 8).toFixed(1)}" width="${pillowW.toFixed(1)}" height="${pillowH.toFixed(1)}" rx="7" fill="none" stroke="#7a7a7a" stroke-width="1.8"/>`);
    parts.push(`<rect x="${(bx + bw - pillowW - 8).toFixed(1)}" y="${(by + 8).toFixed(1)}" width="${pillowW.toFixed(1)}" height="${pillowH.toFixed(1)}" rx="7" fill="none" stroke="#7a7a7a" stroke-width="1.8"/>`);
    parts.push(`<circle cx="${(x + rectW - 30).toFixed(1)}" cy="${(y + 30).toFixed(1)}" r="16" fill="none" stroke="#606060" stroke-width="2.1"/>`);
    return;
  }

  if (["living", "lounge", "family", "drawing"].some(token => type.includes(token)) && rectW > 160 && rectH > 135) {
    const sw = Math.min(rectW * 0.42, 130);
    const sh = Math.min(rectH * 0.18, 46);
    const sx = x + pad;
    const sy = y + pad;
    parts.push(`<rect x="${sx.toFixed(1)}" y="${sy.toFixed(1)}" width="${sw.toFixed(1)}" height="${sh.toFixed(1)}" rx="10" fill="none" stroke="#636363" stroke-width="2.3"/>`);
    parts.push(`<line x1="${(sx + sw * 0.2).toFixed(1)}" y1="${(sy + 7).toFixed(1)}" x2="${(sx + sw * 0.2).toFixed(1)}" y2="${(sy + sh - 7).toFixed(1)}" stroke="#787878" stroke-width="1.7"/>`);
    parts.push(`<line x1="${(sx + sw * 0.8).toFixed(1)}" y1="${(sy + 7).toFixed(1)}" x2="${(sx + sw * 0.8).toFixed(1)}" y2="${(sy + sh - 7).toFixed(1)}" stroke="#787878" stroke-width="1.7"/>`);
    parts.push(`<circle cx="${(x + rectW - 36).toFixed(1)}" cy="${(y + rectH - 34).toFixed(1)}" r="17" fill="none" stroke="#636363" stroke-width="2.1"/>`);
    return;
  }

  if (type.includes("kitchen") && rectW > 120 && rectH > 140) {
    const unitW = Math.min(rectW * 0.18, 40);
    const unitH = Math.min(rectH * 0.58, 154);
    const ux = x + rectW - unitW - pad;
    const uy = y + pad;
    parts.push(`<rect x="${ux.toFixed(1)}" y="${uy.toFixed(1)}" width="${unitW.toFixed(1)}" height="${unitH.toFixed(1)}" fill="none" stroke="#606060" stroke-width="2.3"/>`);
    for (let i = 1; i <= 3; i++) {
      const yy = uy + (unitH * i / 4.0);
      parts.push(`<line x1="${ux.toFixed(1)}" y1="${yy.toFixed(1)}" x2="${(ux + unitW).toFixed(1)}" y2="${yy.toFixed(1)}" stroke="#767676" stroke-width="1.5"/>`);
    }
    const sinkW = Math.min(rectW * 0.24, 66);
    parts.push(`<rect x="${(ux - sinkW - 10).toFixed(1)}" y="${uy.toFixed(1)}" width="${sinkW.toFixed(1)}" height="34" rx="6" fill="none" stroke="#606060" stroke-width="2"/>`);
    parts.push(`<circle cx="${(ux - sinkW / 2 - 10).toFixed(1)}" cy="${(uy + 17).toFixed(1)}" r="7" fill="none" stroke="#767676" stroke-width="1.5"/>`);
    return;
  }

  if (["bath", "toilet", "wash"].some(token => type.includes(token)) && rectW > 110 && rectH > 110) {
    const tubW = Math.min(rectW * 0.32, 74);
    const tubH = Math.min(rectH * 0.2, 40);
    const tx = x + rectW - tubW - pad;
    const ty = y + pad;
    parts.push(`<rect x="${tx.toFixed(1)}" y="${ty.toFixed(1)}" width="${tubW.toFixed(1)}" height="${tubH.toFixed(1)}" rx="14" fill="none" stroke="#606060" stroke-width="2.1"/>`);
    parts.push(`<circle cx="${(x + 28).toFixed(1)}" cy="${(y + 28).toFixed(1)}" r="15" fill="none" stroke="#606060" stroke-width="2.1"/>`);
    parts.push(`<rect x="${(x + 18).toFixed(1)}" y="${(y + rectH - 46).toFixed(1)}" width="40" height="24" rx="10" fill="none" stroke="#606060" stroke-width="1.9"/>`);
  }
}

function normalizeManualRooms(rooms) {
  const normalized = [];
  for (let room of rooms || []) {
    const dims = room.dimensions || {};
    const width = toNumber(dims.w, 12.0);
    const length = toNumber(dims.l, 12.0);
    normalized.push({
      type: safeText(room.type, "Room"),
      name: safeText(room.name, safeText(room.type, "Room")),
      width_ft: width,
      length_ft: length,
      area: width * length,
      dimensions: dims
    });
  }
  return normalized;
}

function normalizeAutoRooms(autoRequirements) {
  const roomSpecs = autoRequirements.floor_room_plan || [];
  const normalized = [];
  for (let spec of roomSpecs) {
    const floorName = safeText(spec.floor, "Level");
    const roomTypesText = safeText(spec.room_types, "Room");
    let splitTypes = roomTypesText.split(",").map(item => item.trim()).filter(Boolean);
    if (splitTypes.length === 0) {
      const floorLower = floorName.toLowerCase();
      if (floorLower.includes("ground")) {
        splitTypes = ["Living Room", "Kitchen", "Dining", "Bathroom", "Utility"];
      } else if (floorLower.includes("1st") || floorLower.includes("first")) {
        splitTypes = ["Master Bedroom", "Bedroom", "Bathroom", "Study"];
      } else {
        splitTypes = ["Bedroom", "Bedroom", "Bathroom", "Lounge"];
      }
    }

    let roomCount = 0;
    try {
      roomCount = parseInt(spec.rooms);
      if (isNaN(roomCount)) throw new Error();
    } catch (error) {
      roomCount = Math.max(4, splitTypes.length);
    }

    for (let idx = 0; idx < roomCount; idx++) {
      const roomType = splitTypes[idx % splitTypes.length];
      const defaultW = roomType.toLowerCase().includes("living") ? 16.0 : 12.0;
      const defaultL = roomType.toLowerCase().includes("bed") ? 14.0 : 12.0;
      normalized.push({
        type: roomType,
        name: roomType,
        width_ft: defaultW,
        length_ft: defaultL,
        area: defaultW * defaultL,
        dimensions: {}
      });
    }
  }
  if (normalized.length > 0) {
    return normalized;
  }

  const roomTypes = safeText(autoRequirements.room_types, "Living Room, Bedroom, Kitchen, Bathroom");
  let totalRooms = 4;
  try {
    totalRooms = parseInt(autoRequirements.total_rooms);
    if (isNaN(totalRooms)) totalRooms = 4;
  } catch (error) {}

  const splitTypes = roomTypes.split(",").map(item => item.trim()).filter(Boolean);
  const types = splitTypes.length > 0 ? splitTypes : ["Room"];
  for (let idx = 0; idx < totalRooms; idx++) {
    const roomType = types[idx % types.length];
    const defaultW = roomType.toLowerCase().includes("living") ? 16.0 : 12.0;
    const defaultL = roomType.toLowerCase().includes("bed") ? 14.0 : 12.0;
    normalized.push({
      type: roomType,
      name: roomType,
      width_ft: defaultW,
      length_ft: defaultL,
      area: defaultW * defaultL,
      dimensions: {}
    });
  }
  return normalized;
}

function weightedHorizontalLayout(rooms, x, y, width, height, gap) {
  const layouts = [];
  if (!rooms || rooms.length === 0) return layouts;
  const total = Math.max(rooms.reduce((sum, r) => sum + r.area, 0), 1.0);
  let cursor = x;
  const usableWidth = width - (gap * (rooms.length - 1));
  for (let i = 0; i < rooms.length; i++) {
    const room = rooms[i];
    let roomWidth = usableWidth * (room.area / total);
    if (i === rooms.length - 1) {
      roomWidth = x + width - cursor;
    }
    layouts.push({ room, x: cursor, y, w: roomWidth, h: height });
    cursor += roomWidth + gap;
  }
  return layouts;
}

function weightedVerticalLayout(rooms, x, y, width, height, gap) {
  const layouts = [];
  if (!rooms || rooms.length === 0) return layouts;
  const total = Math.max(rooms.reduce((sum, r) => sum + r.area, 0), 1.0);
  let cursor = y;
  const usableHeight = height - (gap * (rooms.length - 1));
  for (let i = 0; i < rooms.length; i++) {
    const room = rooms[i];
    let roomHeight = usableHeight * (room.area / total);
    if (i === rooms.length - 1) {
      roomHeight = y + height - cursor;
    }
    layouts.push({ room, x, y: cursor, w: width, h: roomHeight });
    cursor += roomHeight + gap;
  }
  return layouts;
}

function treemapLayout(rooms, x, y, width, height, gap = 14.0) {
  const filteredRooms = (rooms || []).filter(Boolean);
  if (filteredRooms.length === 0) return [];
  if (filteredRooms.length === 1) {
    return [{ room: filteredRooms[0], x, y, w: width, h: height }];
  }

  const totalArea = Math.max(filteredRooms.reduce((sum, r) => sum + r.area, 0), 1.0);
  const halfTarget = totalArea / 2.0;
  let running = 0.0;
  let splitIndex = 0;
  for (let idx = 0; idx < filteredRooms.length; idx++) {
    running += filteredRooms[idx].area;
    splitIndex = idx + 1;
    if (running >= halfTarget) break;
  }

  let first = filteredRooms.slice(0, splitIndex);
  let second = filteredRooms.slice(splitIndex);
  if (second.length === 0) {
    second = filteredRooms.slice(-1);
  }
  if (first.length === 0) {
    first = filteredRooms.slice(0, 1);
  }
  if (first.length === filteredRooms.length) {
    const midpoint = Math.max(1, Math.floor(filteredRooms.length / 2));
    first = filteredRooms.slice(0, midpoint);
    second = filteredRooms.slice(midpoint);
  }

  const firstArea = first.reduce((sum, r) => sum + r.area, 0);
  if (width >= height) {
    const usableWidth = Math.max(width - gap, width * 0.55);
    let splitWidth = usableWidth * (firstArea / totalArea);
    splitWidth = Math.min(Math.max(splitWidth, width * 0.28), width * 0.72);
    const left = treemapLayout(first, x, y, splitWidth, height, gap);
    const rightX = x + splitWidth + gap;
    const rightW = Math.max(0.0, width - splitWidth - gap);
    const right = treemapLayout(second, rightX, y, rightW, height, gap);
    return left.concat(right);
  }

  const usableHeight = Math.max(height - gap, height * 0.55);
  let splitHeight = usableHeight * (firstArea / totalArea);
  splitHeight = Math.min(Math.max(splitHeight, height * 0.28), height * 0.72);
  const top = treemapLayout(first, x, y, width, splitHeight, gap);
  const bottomY = y + splitHeight + gap;
  const bottomH = Math.max(0.0, height - splitHeight - gap);
  const bottom = treemapLayout(second, x, bottomY, width, bottomH, gap);
  return top.concat(bottom);
}

function layoutStructured(rooms, totalW, totalH) {
  if (rooms.length <= 2) {
    return [weightedHorizontalLayout(rooms, 0.0, 0.0, totalW, totalH, 14.0), null];
  }

  let publicRooms = [];
  let privateRooms = [];
  let serviceRooms = [];
  let mixedRooms = [];

  const sortedRooms = [...rooms].sort((a, b) => b.area - a.area);
  for (let room of sortedRooms) {
    const zone = roomZone(room.type);
    if (zone === "public") publicRooms.push(room);
    else if (zone === "private") privateRooms.push(room);
    else if (zone === "service") serviceRooms.push(room);
    else mixedRooms.push(room);
  }

  if (publicRooms.length === 0 && mixedRooms.length > 0) {
    publicRooms.push(mixedRooms.shift());
  }
  if (privateRooms.length === 0 && mixedRooms.length > 1) {
    privateRooms.push(mixedRooms.pop());
  }

  let frontRooms = publicRooms.slice(0, 2);
  let rearRooms = privateRooms.concat(mixedRooms).concat(publicRooms.slice(2));
  let sideRooms = serviceRooms;

  if (rearRooms.length === 0) {
    rearRooms = frontRooms.slice(1);
    frontRooms = frontRooms.slice(0, 1);
  }
  if (frontRooms.length === 0) {
    frontRooms = rearRooms.slice(0, 1);
    rearRooms = rearRooms.slice(1);
  }

  const gap = 16.0;
  const sideWidth = sideRooms.length > 0 ? Math.min(Math.max(totalW * 0.24, 170.0), totalW * 0.30) : 0.0;
  const mainWidth = totalW - sideWidth - (sideRooms.length > 0 ? gap : 0.0);

  const hallHeight = rooms.length >= 4 ? Math.min(Math.max(totalH * 0.10, 78.0), 110.0) : 0.0;
  let frontHeight = totalH * 0.42;
  if (!rearRooms || rearRooms.length === 0) {
    frontHeight = totalH;
  }
  if (hallHeight > 0) {
    const maxFront = totalH - hallHeight - gap;
    frontHeight = Math.min(frontHeight, maxFront * 0.58);
  }
  let rearHeight = totalH - frontHeight - (hallHeight > 0 ? hallHeight + gap : 0.0) - (rearRooms.length > 0 ? gap : 0.0);
  if (rearHeight < totalH * 0.24 && rearRooms.length > 0) {
    const deficit = (totalH * 0.24) - rearHeight;
    frontHeight = Math.max(frontHeight - deficit, totalH * 0.28);
    rearHeight = totalH - frontHeight - (hallHeight > 0 ? hallHeight + gap : 0.0) - gap;
  }

  const layouts = [];
  layouts.push(...weightedHorizontalLayout(frontRooms, 0.0, 0.0, mainWidth, frontHeight, gap));

  let hall = null;
  let rearY = frontHeight + gap;
  if (hallHeight > 0) {
    hall = {
      x: 0.0,
      y: frontHeight + gap,
      w: mainWidth,
      h: hallHeight
    };
    rearY += hallHeight + gap;
  }

  if (rearRooms.length > 0) {
    const rearSorted = [...rearRooms].sort((a, b) => b.area - a.area);
    layouts.push(...treemapLayout(rearSorted, 0.0, rearY, mainWidth, Math.max(rearHeight, totalH * 0.22), gap));
  }

  if (sideRooms.length > 0) {
    const sideSorted = [...sideRooms].sort((a, b) => b.area - a.area);
    layouts.push(...weightedVerticalLayout(sideSorted, mainWidth + gap, 0.0, sideWidth, totalH, gap));
  }

  return [layouts, hall];
}

function fitPlanBounds(totalW, totalH, houseWFt, houseLFt) {
  const houseRatio = Math.max(houseWFt, 1.0) / Math.max(houseLFt, 1.0);
  const areaRatio = totalW / totalH;

  let planW, planH;
  if (houseRatio >= areaRatio) {
    planW = totalW;
    planH = totalW / houseRatio;
  } else {
    planH = totalH;
    planW = totalH * houseRatio;
  }

  return [planW, planH, (totalW - planW) / 2.0, (totalH - planH) / 2.0];
}

function doorSegments(layouts) {
  const segments = [];
  const tolerance = 6;
  for (let idx = 0; idx < layouts.length; idx++) {
    const current = layouts[idx];
    for (let oIdx = idx + 1; oIdx < layouts.length; oIdx++) {
      const other = layouts[oIdx];
      const currentRight = current.x + current.w;
      const otherRight = other.x + other.w;
      const currentBottom = current.y + current.h;
      const otherBottom = other.y + other.h;

      if (Math.abs(currentRight - other.x) <= tolerance) {
        const overlapTop = Math.max(current.y, other.y);
        const overlapBottom = Math.min(currentBottom, otherBottom);
        if (overlapBottom - overlapTop > 92) {
          const middle = (overlapTop + overlapBottom) / 2.0;
          segments.push(["vertical", currentRight, middle - 28, middle + 28]);
        }
      }

      if (Math.abs(currentBottom - other.y) <= tolerance) {
        const overlapLeft = Math.max(current.x, other.x);
        const overlapRight = Math.min(currentRight, otherRight);
        if (overlapRight - overlapLeft > 92) {
          const middle = (overlapLeft + overlapRight) / 2.0;
          segments.push(["horizontal", currentBottom, middle - 28, middle + 28]);
        }
      }
    }
  }
  return segments;
}

function northArrow(parts, x, y) {
  parts.push(`<g transform="translate(${x},${y})">`);
  parts.push('<circle cx="0" cy="0" r="28" fill="#fcfcfc" stroke="#202020" stroke-width="2.5"/>');
  parts.push('<path d="M 0 -18 L 9 9 L 0 4 L -9 9 Z" fill="#202020"/>');
  parts.push('<text x="0" y="48" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="14" font-weight="700" fill="#202020">N</text>');
  parts.push('</g>');
}

function scaleBar(parts, x, y, houseWFt, planW) {
  const segmentCount = 4;
  const segmentWidth = Math.min(planW * 0.12, 45);
  const totalWidth = segmentWidth * segmentCount;
  parts.push(`<g transform="translate(${x},${y})">`);
  for (let index = 0; index < segmentCount; index++) {
    const fill = index % 2 === 0 ? "#202020" : "#ffffff";
    parts.push(`<rect x="${(index * segmentWidth).toFixed(1)}" y="0" width="${segmentWidth.toFixed(1)}" height="14" fill="${fill}" stroke="#202020" stroke-width="1"/>`);
  }
  parts.push(`<text x="0" y="-8" font-family="Arial, Helvetica, sans-serif" font-size="12" fill="#333333">Scale</text>`);
  parts.push(`<text x="${totalWidth.toFixed(1)}" y="30" text-anchor="end" font-family="Arial, Helvetica, sans-serif" font-size="12" fill="#333333">${houseWFt.toFixed(0)} ft overall</text>`);
  parts.push('</g>');
}

function escapeHtml(string) {
  return String(string)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderFloorplanSvg(floor = null, houseDimensions = null, planMode = "Manual", autoRequirements = null) {
  const requirements = autoRequirements || {};
  const width = 1480;
  const height = 1020;
  const margin = 46;
  const headerH = 128;
  const drawingX = margin;
  const drawingY = headerH + 24;
  const drawingW = width - (margin * 2);
  const drawingH = height - drawingY - margin;
  
  const [houseWFt, houseLFt] = parseHouseDimensions(houseDimensions);

  let titleSuffix = "";
  let rooms = [];
  if (planMode === "Auto") {
    titleSuffix = `Auto layout: ${safeText(requirements.total_floors, '1')} floor(s), ${safeText(requirements.total_rooms, 'unspecified')} room(s)`;
    rooms = normalizeAutoRooms(requirements);
  } else {
    const fl = floor || {};
    titleSuffix = `Level: ${safeText(fl.name, 'Current Level')}`;
    rooms = normalizeManualRooms(fl.rooms || []);
  }

  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    '<defs>',
    '<filter id="planShadow" x="-20%" y="-20%" width="140%" height="160%">',
    '<feDropShadow dx="0" dy="18" stdDeviation="18" flood-color="#000000" flood-opacity="0.14"/>',
    '</filter>',
    '<filter id="roomShadow" x="-20%" y="-20%" width="160%" height="160%">',
    '<feDropShadow dx="0" dy="6" stdDeviation="5" flood-color="#000000" flood-opacity="0.08"/>',
    '</filter>',
    '<pattern id="grid" width="36" height="36" patternUnits="userSpaceOnUse">',
    '<path d="M 36 0 L 0 0 0 36" fill="none" stroke="#ececec" stroke-width="1"/>',
    '</pattern>',
    '</defs>',
    '<rect width="100%" height="100%" fill="#dfe4ea"/>',
    '<rect x="18" y="18" width="1444" height="984" rx="28" fill="#f6f3ee"/>',
    '<rect x="34" y="34" width="1412" height="952" rx="24" fill="#fbfaf8" stroke="#d8d2cb" stroke-width="1.5"/>',
    '<text x="58" y="62" font-family="Arial, Helvetica, sans-serif" font-size="34" font-weight="700" fill="#171717">Residential Floor Plan</text>',
    `<text x="58" y="94" font-family="Arial, Helvetica, sans-serif" font-size="17" fill="#444444">${escapeHtml(titleSuffix)}</text>`,
    planMode === "Manual" 
      ? `<text x="58" y="118" font-family="Arial, Helvetica, sans-serif" font-size="13" letter-spacing="1.2" fill="#7a6f63">MANUAL 2D LAYOUT</text>` 
      : `<text x="58" y="118" font-family="Arial, Helvetica, sans-serif" font-size="13" letter-spacing="1.2" fill="#7a6f63">AUTO PROGRAMMED LAYOUT</text>`,
    `<text x="1120" y="62" font-family="Arial, Helvetica, sans-serif" font-size="18" fill="#333333">Footprint: ${houseWFt.toFixed(0)} ft x ${houseLFt.toFixed(0)} ft</text>`
  ];

  northArrow(parts, 1376, 84);

  parts.push(
    `<rect x="${drawingX}" y="${drawingY}" width="${drawingW}" height="${drawingH}" rx="22" fill="#fefefe" stroke="#191919" stroke-width="5" filter="url(#planShadow)"/>`
  );

  if (rooms.length === 0) {
    parts.push(`<rect x="${drawingX + 18}" y="${drawingY + 18}" width="${drawingW - 36}" height="${drawingH - 36}" rx="16" fill="url(#grid)"/>`);
    parts.push(
      `<text x="${width / 2}" y="${height / 2}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="26" fill="#555555">Add manual rooms to generate the plan</text>`
    );
    parts.push("</svg>");
    return parts.join("");
  }

  const innerW = drawingW - 28;
  const innerH = drawingH - 28;
  const [planW, planH, insetX, insetY] = fitPlanBounds(innerW, innerH, houseWFt, houseLFt);
  const [layouts, hall] = layoutStructured(rooms, planW, planH);
  const doorSegs = doorSegments(layouts);

  parts.push(`<g transform="translate(${drawingX + 14},${drawingY + 14})">`);
  parts.push(`<rect x="0" y="0" width="${innerW}" height="${innerH}" rx="16" fill="url(#grid)"/>`);
  parts.push(`<g transform="translate(${insetX.toFixed(1)},${insetY.toFixed(1)})">`);
  parts.push(`<rect x="0" y="0" width="${planW.toFixed(1)}" height="${planH.toFixed(1)}" fill="#ffffff" stroke="#151515" stroke-width="10" filter="url(#roomShadow)"/>`);
  parts.push(`<rect x="12" y="12" width="${(planW - 24).toFixed(1)}" height="${(planH - 24).toFixed(1)}" fill="none" stroke="#bbb2a6" stroke-width="1.2" stroke-dasharray="10 10"/>`);

  parts.push(`<line x1="0" y1="-28" x2="${planW.toFixed(1)}" y2="-28" stroke="#444444" stroke-width="2"/>`);
  parts.push(`<line x1="0" y1="-38" x2="0" y2="-18" stroke="#444444" stroke-width="2"/>`);
  parts.push(`<line x1="${planW.toFixed(1)}" y1="-38" x2="${planW.toFixed(1)}" y2="-18" stroke="#444444" stroke-width="2"/>`);
  parts.push(`<text x="${(planW / 2).toFixed(1)}" y="-34" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="16" fill="#333333">${houseWFt.toFixed(0)} ft</text>`);
  parts.push(`<line x1="-28" y1="0" x2="-28" y2="${planH.toFixed(1)}" stroke="#444444" stroke-width="2"/>`);
  parts.push(`<line x1="-38" y1="0" x2="-18" y2="0" stroke="#444444" stroke-width="2"/>`);
  parts.push(`<line x1="-38" y1="${planH.toFixed(1)}" x2="-18" y2="${planH.toFixed(1)}" stroke="#444444" stroke-width="2"/>`);
  parts.push(`<text x="-40" y="${(planH / 2).toFixed(1)}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="16" fill="#333333" transform="rotate(-90 -40 ${(planH / 2).toFixed(1)})">${houseLFt.toFixed(0)} ft</text>`);

  if (hall) {
    parts.push(
      `<rect x="${hall.x.toFixed(1)}" y="${hall.y.toFixed(1)}" width="${hall.w.toFixed(1)}" height="${hall.h.toFixed(1)}" fill="#f7f3ee" stroke="#98918a" stroke-width="2" stroke-dasharray="8 8"/>`
    );
    parts.push(
      `<text x="${(hall.x + hall.w / 2).toFixed(1)}" y="${(hall.y + hall.h / 2 + 6).toFixed(1)}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="18" letter-spacing="1.2" fill="#7a736c">PASSAGE</text>`
    );
  }

  for (let layout of layouts) {
    const x = layout.x;
    const y = layout.y;
    const rectW = layout.w;
    const rectH = layout.h;
    const room = layout.room;
    const labels = roomLabel(room);

    parts.push(
      `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${rectW.toFixed(1)}" height="${rectH.toFixed(1)}" fill="${roomFill(room.type)}" stroke="#191919" stroke-width="6"/>`
    );
    parts.push(
      `<rect x="${(x + 10).toFixed(1)}" y="${(y + 10).toFixed(1)}" width="${Math.max(rectW - 20, 0).toFixed(1)}" height="${Math.max(rectH - 20, 0).toFixed(1)}" fill="none" stroke="#ffffff" stroke-width="1.2" opacity="0.8"/>`
    );
    addWindowMarks(parts, x, y, rectW, rectH);
    addFurniture(parts, room.type, x, y, rectW, rectH);

    const centerX = x + (rectW / 2.0);
    const centerY = y + (rectH / 2.0);
    const baseY = centerY - (12 * (labels.length - 1));
    for (let labelIndex = 0; labelIndex < labels.length; labelIndex++) {
      const labelText = labels[labelIndex];
      parts.push(
        `<text x="${centerX.toFixed(1)}" y="${(baseY + (labelIndex * 24)).toFixed(1)}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="${labelIndex === 0 ? 20 : 15}" font-weight="${labelIndex === 0 ? 700 : 500}" fill="#111111">${escapeHtml(labelText)}</text>`
      );
    }

    parts.push(
      `<line x1="${(x + 18).toFixed(1)}" y1="${(y + rectH - 24).toFixed(1)}" x2="${(x + rectW - 18).toFixed(1)}" y2="${(y + rectH - 24).toFixed(1)}" stroke="#7a756c" stroke-width="1.8" stroke-dasharray="7 7"/>`
    );
    parts.push(
      `<text x="${(x + (rectW / 2)).toFixed(1)}" y="${(y + rectH - 30).toFixed(1)}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="14" fill="#444444">${room.width_ft.toFixed(0)} ft</text>`
    );
  }

  for (let seg of doorSegs) {
    const [orientation, anchor, start, end] = seg;
    if (orientation === "vertical") {
      parts.push(`<rect x="${(anchor - 4).toFixed(1)}" y="${start.toFixed(1)}" width="8" height="${(end - start).toFixed(1)}" fill="#ffffff"/>`);
      parts.push(`<path d="M ${anchor.toFixed(1)} ${start.toFixed(1)} A ${(end - start).toFixed(1)} ${(end - start).toFixed(1)} 0 0 1 ${(anchor + (end - start)).toFixed(1)} ${((start + end) / 2).toFixed(1)}" fill="none" stroke="#191919" stroke-width="2.8"/>`);
    } else {
      parts.push(`<rect x="${start.toFixed(1)}" y="${(anchor - 4).toFixed(1)}" width="${(end - start).toFixed(1)}" height="8" fill="#ffffff"/>`);
      parts.push(`<path d="M ${start.toFixed(1)} ${anchor.toFixed(1)} A ${(end - start).toFixed(1)} ${(end - start).toFixed(1)} 0 0 1 ${((start + end) / 2).toFixed(1)} ${(anchor + (end - start)).toFixed(1)}" fill="none" stroke="#191919" stroke-width="2.8"/>`);
    }
  }

  const entranceW = Math.max(planW * 0.12, 72);
  const entranceX = (planW - entranceW) / 2.0;
  parts.push(`<rect x="${entranceX.toFixed(1)}" y="${(planH - 5).toFixed(1)}" width="${entranceW.toFixed(1)}" height="10" fill="#ffffff"/>`);
  parts.push(`<path d="M ${entranceX.toFixed(1)} ${planH.toFixed(1)} A ${entranceW.toFixed(1)} ${entranceW.toFixed(1)} 0 0 1 ${(entranceX + entranceW).toFixed(1)} ${(planH - entranceW).toFixed(1)}" fill="none" stroke="#191919" stroke-width="3"/>`);

  scaleBar(parts, 0, planH + 22, houseWFt, planW);
  parts.push("</g>");
  parts.push("</g>");

  parts.push(
    '<g transform="translate(1116,916)">' +
    '<rect x="0" y="0" width="288" height="64" rx="12" fill="#f3efe8" stroke="#b9b0a5" stroke-width="1.2"/>' +
    '<text x="16" y="24" font-family="Arial, Helvetica, sans-serif" font-size="13" font-weight="700" fill="#262626">DRAWING NOTES</text>' +
    '<text x="16" y="44" font-family="Arial, Helvetica, sans-serif" font-size="12" fill="#555555">Conceptual layout based on user-entered rooms and dimensions.</text>' +
    '</g>'
  );
  parts.push("</svg>");
  return parts.join("");
}

module.exports = {
  renderFloorplanSvg
};
