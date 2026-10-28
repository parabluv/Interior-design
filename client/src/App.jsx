import React, { useState, useEffect, useRef } from 'react';
import { GoogleAuthProvider, getRedirectResult, signInWithPopup, signInWithRedirect } from 'firebase/auth';
import { firebaseAuth } from './firebase';
import './App.css';

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function HouseLogoIcon({ size = 24, className = '', style = {} }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className} style={{ flexShrink: 0, ...style }}>
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

export default function App() {
  // --- AUTH STATE ---
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoginView, setIsLoginView] = useState(true);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authUsername, setAuthUsername] = useState('');
  const [authFirst, setAuthFirst] = useState('');
  const [authLast, setAuthLast] = useState('');
  const [authError, setAuthError] = useState('');
  const [isProfileEditorOpen, setIsProfileEditorOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({ username: '', first_name: '', last_name: '', avatar: '' });
  const [profileError, setProfileError] = useState('');
  const [apiError, setApiError] = useState('');

  // --- WORKSPACE PROJECTS ---
  const [projectName, setProjectName] = useState('Untitled Project');
  const [projectFilename, setProjectFilename] = useState(null);
  const [projectHistory, setProjectHistory] = useState([]);
  const [isSplashOpen, setIsSplashOpen] = useState(true);
  const [newProjectNameInput, setNewProjectNameInput] = useState('');
  const [showNewProjectNameField, setShowNewProjectNameField] = useState(false);

  // --- DESIGN STATE ---
  const [floors, setFloors] = useState([]);
  const [activeFloorIndex, setActiveFloorIndex] = useState(null);
  const [activeRoomIndex, setActiveRoomIndex] = useState(null);
  const [isAddingRoom, setIsAddingRoom] = useState(false); // true when adding a new room
  const [editingFloorIndex, setEditingFloorIndex] = useState(null); // inline floor name edit
  const [editingFloorName, setEditingFloorName] = useState('');
  const [activeMainTab, setActiveMainTab] = useState('interior'); // 'interior' | 'floorplan' | 'exterior'

  // --- ROOM CONFIG FORM STATE ---
  const [roomConfigView, setRoomConfigView] = useState('config'); // 'config' | 'display'
  const [formRoomName, setFormRoomName] = useState('');
  const [formRoomType, setFormRoomType] = useState('Living Room');
  const [formCustomRoomType, setFormCustomRoomType] = useState('');
  const [formStyle, setFormStyle] = useState('Modern');
  const [formCustomStyle, setFormCustomStyle] = useState('');
  const [formInputMode, setFormInputMode] = useState('Use Dimensions'); // 'Use Dimensions' | 'Use Layout Image'
  const [formWidth, setFormWidth] = useState('');
  const [formLength, setFormLength] = useState('');
  const [formHeight, setFormHeight] = useState('');
  const [formUploadedLayoutImage, setFormUploadedLayoutImage] = useState(null); // base64
  const [formColors, setFormColors] = useState(['White']);
  const [formCustomColors, setFormCustomColors] = useState('');
  const [formFurniture, setFormFurniture] = useState(['Modern Sofa']);
  const [formCustomFurniture, setFormCustomFurniture] = useState('');
  const [formAdditionalElements, setFormAdditionalElements] = useState('');

  // --- 2D FLOORPLAN STATE ---
  const [floorplanMode, setFloorplanMode] = useState('Manual'); // 'Manual' | 'Auto'
  const [floorplanWidth, setFloorplanWidth] = useState('60');
  const [floorplanLength, setFloorplanLength] = useState('40');
  const [floorplanHeight, setFloorplanHeight] = useState('10');
  const [floorplanTotalFloors, setFloorplanTotalFloors] = useState('1');
  const [autoFloorPlanRows, setAutoFloorPlanRows] = useState([]); // rows inferred
  const [floorplanManualFloors, setFloorplanManualFloors] = useState([]); // list of manual SVG floors
  const [floorplanPreviewHtml, setFloorplanPreviewHtml] = useState(''); // SVG content
  const [blueprintImage, setBlueprintImage] = useState(null); // base64 uploaded blueprint
  const [isRecognizingBlueprint, setIsRecognizingBlueprint] = useState(false);

  // --- EXTERIOR STATE ---
  const [exteriorStyle, setExteriorStyle] = useState('Modern');
  const [exteriorTheme, setExteriorTheme] = useState('Contemporary');
  const [houseRegion, setHouseRegion] = useState('Indian');
  const [exteriorColors, setExteriorColors] = useState(['White']);
  const [exteriorExtraElements, setExteriorExtraElements] = useState('');
  const [exteriorRenderedImages, setExteriorRenderedImages] = useState([]); // generated URLs

  // --- LOADER ---
  const [isLoading, setIsLoading] = useState(false);
  const [loaderText, setLoaderText] = useState('Processing...');
  const [loaderSubtitle, setLoaderSubtitle] = useState('');

  // --- RESULT VIEW MODAL ---
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);

  // --- REFERENCES ---
  const fileInputRef = useRef(null);
  const blueprintInputRef = useRef(null);
  const floorNameInputRef = useRef(null);

  // Auto-Save Debounce Timer
  const saveTimeoutRef = useRef(null);

  // --- INITIAL CHECK ---
  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Trigger auto-save when floors or setup properties change
  useEffect(() => {
    if (isAuthenticated && !isSplashOpen && floors.length > 0) {
      triggerAutoSave();
    }
  }, [floors, floorplanManualFloors, floorplanMode, floorplanWidth, floorplanLength, floorplanHeight, floorplanTotalFloors, autoFloorPlanRows]);

  // Focus floor name input when editing
  useEffect(() => {
    if (editingFloorIndex !== null && floorNameInputRef.current) {
      floorNameInputRef.current.focus();
      floorNameInputRef.current.select();
    }
  }, [editingFloorIndex]);

  // --- API CALLS ---
  const normalizeProjectFloors = (inputFloors = []) => {
    if (!Array.isArray(inputFloors)) return [];

    return inputFloors.map((floor, floorIdx) => ({
      name: floor?.name || (floorIdx === 0 ? 'Ground Floor' : `${floorIdx} Floor`),
      rooms: Array.isArray(floor?.rooms)
        ? floor.rooms.map(room => ({
            name: room?.name || room?.type || 'Room',
            type: room?.type || room?.name || 'Room',
            customType: room?.customType || '',
            styles: Array.isArray(room?.styles) && room.styles.length ? room.styles : [room?.style || 'Modern'],
            customStyle: room?.customStyle || '',
            inputMode: room?.inputMode || (room?.image ? 'Use Layout Image' : 'Use Dimensions'),
            dimensions: room?.dimensions || { w: '', l: '', h: '' },
            image: room?.image || null,
            refImages: [],
            colors: Array.isArray(room?.colors) ? room.colors : [],
            customColors: room?.customColors || '',
            furniture: Array.isArray(room?.furniture) ? room.furniture : [],
            customFurniture: room?.customFurniture || '',
            additionalElements: room?.additionalElements || '',
            generatedImage: room?.generatedImage || room?.image_url || ''
          }))
        : []
    }));
  };

  const syncGoogleUserToServer = async (firebaseUser) => {
    const res = await fetch('/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Google User',
        avatar: firebaseUser.photoURL || ''
      })
    });
    const data = await res.json();
    if (!res.ok || !data.user) {
      throw new Error(data.error || 'Google session sync failed');
    }
    setIsAuthenticated(true);
    setCurrentUser(data.user);
    setIsSplashOpen(true);
    fetchHistory();
  };

  const checkAuthStatus = async () => {
    try {
      const redirectResult = await getRedirectResult(firebaseAuth);
      if (redirectResult?.user) {
        await syncGoogleUserToServer(redirectResult.user);
        return;
      }

      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (res.ok && data.user) {
        setIsAuthenticated(true);
        setCurrentUser(data.user);
        fetchHistory();
      }
    } catch (e) {}
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    const endpoint = isLoginView ? '/api/auth/login' : '/api/auth/signup';
    const payload = isLoginView 
      ? { email: authEmail, password: authPassword }
      : { username: authUsername, email: authEmail, first: authFirst, last: authLast, password: authPassword };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok && data.user) {
        setIsAuthenticated(true);
        setCurrentUser(data.user);
        setIsSplashOpen(true);
        fetchHistory();
      } else {
        setAuthError(data.error || 'Authentication failed');
      }
    } catch (err) {
      setAuthError('Network error occurred');
    }
  };

  const handleGoogleLogin = async () => {
    setAuthError('');
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    try {
      const result = await signInWithPopup(firebaseAuth, provider);
      await syncGoogleUserToServer(result.user);
    } catch (err) {
      if (err?.code === 'auth/popup-blocked' || err?.code === 'auth/popup-closed-by-user') {
        try {
          await signInWithRedirect(firebaseAuth, provider);
        } catch (redirectErr) {
          setAuthError(redirectErr.message || 'Google sign-in failed');
        }
      } else {
        setAuthError(err.message || 'Google sign-in failed');
      }
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setIsAuthenticated(false);
      setCurrentUser(null);
      setIsSplashOpen(true);
      setFloors([]);
      setProjectFilename(null);
    } catch (e) {}
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/projects/history');
      const data = await res.json();
      if (res.ok) {
        setProjectHistory(data);
      }
    } catch (e) {}
  };

  const triggerAutoSave = () => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const payload = {
          name: projectName,
          filename: projectFilename,
          floors,
          floorplan_mode: floorplanMode,
          floorplan_manual_floors: floorplanManualFloors,
          auto_floor_hierarchy: autoFloorPlanRows,
          floorplan_house_dimensions: { w: floorplanWidth, l: floorplanLength, h: floorplanHeight }
        };
        const res = await fetch('/api/projects/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok && data.filename) {
          setProjectFilename(data.filename);
        }
      } catch (e) {
        console.error("Auto-save failed:", e);
      }
    }, 1500);
  };

  const loadProject = async (filename) => {
    showLoader('Loading project...', 'Fetching floorplan and room hierarchy');
    try {
      const res = await fetch(`/api/projects/load/${filename}`);
      const data = await res.json();
      if (res.ok) {
        setProjectName(data.name || 'Untitled Project');
        setProjectFilename(data.filename);
        setFloors(normalizeProjectFloors(data.floors));
        setFloorplanMode(data.floorplan_mode || 'Manual');
        setFloorplanManualFloors(data.floorplan_manual_floors || []);
        setAutoFloorPlanRows(data.auto_floor_hierarchy || []);
        
        const dims = data.floorplan_house_dimensions || {};
        setFloorplanWidth(dims.w || '60');
        setFloorplanLength(dims.l || '40');
        setFloorplanHeight(dims.h || '10');

        setActiveFloorIndex(null);
        setActiveRoomIndex(null);
        setIsAddingRoom(false);
        setIsSplashOpen(false);
      }
    } catch (e) {
      setApiError('Failed to load project');
    } finally {
      hideLoader();
    }
  };

  const startNewProject = () => {
    if (!newProjectNameInput.trim()) {
      alert('Please enter a project name');
      return;
    }
    setProjectName(newProjectNameInput);
    setProjectFilename(null);
    setFloors([]);
    setFloorplanManualFloors([]);
    setAutoFloorPlanRows([]);
    setActiveFloorIndex(null);
    setActiveRoomIndex(null);
    setIsAddingRoom(false);
    setIsSplashOpen(false);
    setShowNewProjectNameField(false);
    setNewProjectNameInput('');
  };

  const openProfileEditor = () => {
    setProfileForm({
      username: currentUser?.username || currentUser?.name || '',
      first_name: currentUser?.first_name || '',
      last_name: currentUser?.last_name || '',
      avatar: currentUser?.avatar || ''
    });
    setProfileError('');
    setIsProfileEditorOpen(true);
  };

  const saveProfile = async () => {
    setProfileError('');
    try {
      const displayName = profileForm.username.trim();
      const res = await fetch('/api/auth/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: displayName,
          name: displayName,
          first_name: profileForm.first_name,
          last_name: profileForm.last_name,
          avatar: profileForm.avatar
        })
      });
      const data = await res.json();
      if (!res.ok || !data.user) {
        setProfileError(data.error || 'Failed to update profile');
        return;
      }
      setCurrentUser(data.user);
      setIsProfileEditorOpen(false);
    } catch (err) {
      setProfileError('Network error while updating profile');
    }
  };

  // --- FLOORS & ROOM MANAGER ---
  const addFloor = () => {
    let name = "Ground Floor";
    if (floors.length === 1) name = "1st Floor";
    else if (floors.length === 2) name = "2nd Floor";
    else if (floors.length === 3) name = "3rd Floor";
    else if (floors.length > 3) name = `${floors.length}th Floor`;

    setFloors([...floors, { name, rooms: [] }]);
  };

  const startEditFloorName = (fIdx, currentName, e) => {
    e.stopPropagation();
    setEditingFloorIndex(fIdx);
    setEditingFloorName(currentName);
  };

  const commitFloorNameEdit = () => {
    if (editingFloorIndex === null) return;
    const newName = editingFloorName.trim();
    if (newName) {
      const updated = [...floors];
      updated[editingFloorIndex] = { ...updated[editingFloorIndex], name: newName };
      setFloors(updated);
    }
    setEditingFloorIndex(null);
    setEditingFloorName('');
  };

  const onFloorNameKeyDown = (e) => {
    if (e.key === 'Enter') commitFloorNameEdit();
    if (e.key === 'Escape') {
      setEditingFloorIndex(null);
      setEditingFloorName('');
    }
  };

  const initRoomAdd = (floorIndex) => {
    setActiveFloorIndex(floorIndex);
    setActiveRoomIndex(null);
    setIsAddingRoom(true);
    setRoomConfigView('config');
    // Reset form fields
    setFormRoomName('');
    setFormRoomType('Living Room');
    setFormCustomRoomType('');
    setFormStyle('Modern');
    setFormCustomStyle('');
    setFormInputMode('Use Dimensions');
    setFormWidth('');
    setFormLength('');
    setFormHeight('');
    setFormUploadedLayoutImage(null);
    setFormColors(['White']);
    setFormCustomColors('');
    setFormFurniture(['Modern Sofa']);
    setFormCustomFurniture('');
    setFormAdditionalElements('');
    // Switch to interior tab so the form is visible
    setActiveMainTab('interior');
  };

  const editRoom = (floorIndex, roomIndex) => {
    setActiveFloorIndex(floorIndex);
    setActiveRoomIndex(roomIndex);
    setIsAddingRoom(false);
    const room = floors[floorIndex].rooms[roomIndex];
    
    // Populate form fields
    setFormRoomName(room.name || '');
    setFormRoomType(room.type || 'Living Room');
    setFormCustomRoomType(room.customType || '');
    setFormStyle(room.styles?.[0] || 'Modern');
    setFormCustomStyle(room.customStyle || '');
    setFormInputMode(room.inputMode || 'Use Dimensions');
    
    const dims = room.dimensions || {};
    setFormWidth(dims.w || '');
    setFormLength(dims.l || '');
    setFormHeight(dims.h || '');
    
    setFormUploadedLayoutImage(room.image || null);
    setFormColors(room.colors || ['White']);
    setFormCustomColors(room.customColors || '');
    setFormFurniture(room.furniture || ['Modern Sofa']);
    setFormCustomFurniture(room.customFurniture || '');
    setFormAdditionalElements(room.additionalElements || '');

    if (room.generatedImage) {
      setRoomConfigView('display');
    } else {
      setRoomConfigView('config');
    }
  };

  const saveRoom = () => {
    if (activeFloorIndex === null) return;
    
    const currentFloors = [...floors];
    const newRoom = {
      name: formRoomName.trim() || formRoomType,
      type: formRoomType,
      customType: formCustomRoomType,
      styles: [formStyle],
      customStyle: formCustomStyle,
      inputMode: formInputMode,
      dimensions: {
        w: formWidth,
        l: formLength,
        h: formHeight
      },
      image: formUploadedLayoutImage,
      refImages: [],
      colors: formColors,
      customColors: formCustomColors,
      furniture: formFurniture,
      customFurniture: formCustomFurniture,
      additionalElements: formAdditionalElements
    };

    if (isAddingRoom || activeRoomIndex === null) {
      // Append new room
      currentFloors[activeFloorIndex].rooms.push(newRoom);
      const newRoomIndex = currentFloors[activeFloorIndex].rooms.length - 1;
      setFloors(currentFloors);
      setActiveRoomIndex(newRoomIndex);
      setIsAddingRoom(false);
    } else {
      // Update existing room
      const existing = currentFloors[activeFloorIndex].rooms[activeRoomIndex];
      currentFloors[activeFloorIndex].rooms[activeRoomIndex] = {
        ...existing,
        ...newRoom
      };
      setFloors(currentFloors);
    }
    setRoomConfigView('config');
  };

  const deleteRoom = (floorIndex, roomIndex, e) => {
    e.stopPropagation();
    if (confirm("Delete this room?")) {
      const currentFloors = [...floors];
      currentFloors[floorIndex].rooms.splice(roomIndex, 1);
      setFloors(currentFloors);
      if (activeFloorIndex === floorIndex && activeRoomIndex === roomIndex) {
        setActiveFloorIndex(null);
        setActiveRoomIndex(null);
        setIsAddingRoom(false);
      }
    }
  };

  // --- LOADER CONTROLS ---
  const showLoader = (text, subtitle = '') => {
    setLoaderText(text);
    setLoaderSubtitle(subtitle);
    setIsLoading(true);
  };

  const hideLoader = () => {
    setIsLoading(false);
  };

  // --- UTILITIES FOR FILE READS ---
  const readImageAsBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(file);
    });
  };

  const handleLayoutUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const b64 = await readImageAsBase64(file);
        setFormUploadedLayoutImage(b64);
      } catch (err) {
        setApiError("Failed to read image");
      }
    }
  };

  // --- PILLS MULTI SELECT HELPERS ---
  const toggleSelection = (val, list, setList, single = false) => {
    if (single) {
      setList([val]);
    } else {
      if (list.includes(val)) {
        setList(list.filter(item => item !== val));
      } else {
        setList([...list, val]);
      }
    }
  };

  // --- CORE GENERATION TASKS ---

  const generateActiveRoom = async () => {
    if (activeFloorIndex === null || (activeRoomIndex === null && !isAddingRoom)) return;
    saveRoom(); // Ensure all updates saved locally first

    // Re-read from updated floors state after saveRoom
    const roomIdx = isAddingRoom
      ? (floors[activeFloorIndex]?.rooms?.length ?? 0) - 1
      : activeRoomIndex;

    const room = floors[activeFloorIndex]?.rooms?.[roomIdx];
    if (!room) return;

    showLoader('Rendering room interior...', 'Calculating lighting models and materials');
    setApiError('');

    try {
      const payload = {
        type: room.type,
        name: room.name,
        floor: floors[activeFloorIndex].name,
        styles: room.styles,
        colors: room.colors,
        furniture: room.furniture,
        dimensions: room.dimensions,
        image: room.image,
        additionalElements: room.additionalElements
      };

      const res = await fetch('/api/generate/interior', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok && data.image_url) {
        const currentFloors = [...floors];
        const targetIdx = activeRoomIndex ?? (currentFloors[activeFloorIndex].rooms.length - 1);
        currentFloors[activeFloorIndex].rooms[targetIdx].generatedImage = data.image_url;
        setFloors(currentFloors);
        setActiveRoomIndex(targetIdx);
        setIsAddingRoom(false);
        setRoomConfigView('display');
      } else {
        setApiError(data.error || 'Interior generation failed. Please try again.');
      }
    } catch (error) {
      setApiError('Network error occurred during interior generation.');
    } finally {
      hideLoader();
    }
  };

  const generateInteriorBatch = async () => {
    showLoader('Generating batch interior renders...', 'Processing all configured rooms sequentially');
    setApiError('');
    const currentFloors = [...floors];
    
    for (let fIdx = 0; fIdx < currentFloors.length; fIdx++) {
      const floor = currentFloors[fIdx];
      for (let rIdx = 0; rIdx < floor.rooms.length; rIdx++) {
        const room = floor.rooms[rIdx];
        if (!room.generatedImage) {
          try {
            setLoaderSubtitle(`Processing ${room.name} (${floor.name})`);
            const payload = {
              type: room.type,
              name: room.name,
              floor: floor.name,
              styles: room.styles,
              colors: room.colors,
              furniture: room.furniture,
              dimensions: room.dimensions,
              image: room.image,
              additionalElements: room.additionalElements
            };

            const res = await fetch('/api/generate/interior', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (res.ok && data.image_url) {
              currentFloors[fIdx].rooms[rIdx].generatedImage = data.image_url;
              setFloors([...currentFloors]);
            } else if (!res.ok) {
              setApiError(`Error on ${room.name}: ${data.error || 'Generation failed'}`);
            }
          } catch (e) {
            console.error(`Batch item failed: ${room.name}`, e);
            setApiError(`Network error on ${room.name}`);
          }
        }
      }
    }
    hideLoader();
  };

  const generateFloorplan = async () => {
    showLoader('Generating 2D blueprint layout...', 'Structuring floor configurations and spacing');
    setApiError('');
    try {
      const payload = {
        floors,
        plan_mode: floorplanMode,
        house_dimensions: {
          w: floorplanWidth,
          l: floorplanLength,
          h: floorplanHeight
        },
        auto_requirements: {
          total_floors: floorplanTotalFloors,
          total_rooms: autoFloorPlanRows.reduce((acc, row) => acc + (parseInt(row.rooms) || 0), 0),
          floor_room_plan: autoFloorPlanRows
        }
      };

      const res = await fetch('/api/generate/floorplan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok && data.image_urls) {
        const resultUrl = data.image_urls[0];
        if (resultUrl.startsWith('data:image/svg+xml;base64,')) {
          const rawSvg = atob(resultUrl.split('base64,')[1]);
          setFloorplanPreviewHtml(rawSvg);
        } else {
          setFloorplanPreviewHtml(`<img src="${resultUrl}" style="max-width:100%; border-radius:10px;" />`);
        }
      } else {
        setApiError(data.error || 'Blueprint generation failed. Please try again.');
      }
    } catch (e) {
      setApiError('Network error occurred during floorplan generation.');
    } finally {
      hideLoader();
    }
  };

  const handleBlueprintUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const b64 = await readImageAsBase64(file);
        setBlueprintImage(b64);
        // Auto-trigger recognition after upload
        await recognizePlanWithImage(b64);
      } catch (err) {
        setApiError("Failed to upload blueprint image.");
      }
    }
  };

  const recognizePlanWithImage = async (imageData) => {
    if (!imageData) {
      setApiError("Please upload a blueprint layout image first");
      return;
    }

    showLoader('Recognizing blueprint rooms...', 'Running architectural computer vision model');
    setApiError('');
    try {
      const res = await fetch('/api/generate/recognize_2d_plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageData })
      });
      const data = await res.json();
      if (res.ok && data.floors) {
        setFloors(data.floors);
        setActiveFloorIndex(null);
        setActiveRoomIndex(null);
        setIsAddingRoom(false);
        setActiveMainTab('interior');
      } else {
        setApiError(data.error || 'Blueprint recognition failed. Please try again.');
      }
    } catch (e) {
      setApiError('Network error occurred during blueprint recognition.');
    } finally {
      hideLoader();
    }
  };

  const recognizePlan = async () => {
    await recognizePlanWithImage(blueprintImage);
  };

  const generateExterior = async () => {
    showLoader('Rendering residential exterior...', 'Compiling styling and theme models');
    setApiError('');
    try {
      const payload = {
        floors,
        style: exteriorStyle,
        theme: exteriorTheme,
        region: houseRegion,
        colors: exteriorColors,
        extra_elements: exteriorExtraElements,
        house_dimensions: { w: floorplanWidth, l: floorplanLength, h: floorplanHeight }
      };

      const res = await fetch('/api/generate/exterior', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok && data.image_urls) {
        setExteriorRenderedImages(data.image_urls);
      } else {
        setApiError(data.error || 'Exterior render failed. Please try again.');
      }
    } catch (e) {
      setApiError('Network error occurred during exterior render.');
    } finally {
      hideLoader();
    }
  };

  // --- RENDER PARTS ---
  const profileName = currentUser?.name || currentUser?.username || currentUser?.email?.split('@')[0] || 'Designer';
  const profileEmail = currentUser?.email || '';
  const profileProvider = currentUser?.provider === 'google' ? 'Google' : 'Email';
  const profileInitial = profileName.trim().charAt(0).toUpperCase() || 'D';

  if (!isAuthenticated) {
    return (
      <div className="auth-wrapper">
        <div className="auth-card">
          <div className="status-bar" />
          <div className="auth-header">
            <div className="auth-wordmark" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <HouseLogoIcon size={14} style={{ color: 'var(--accent)' }} />
              <span>SYSTEM / AI DESIGN</span>
            </div>
            <h2>{isLoginView ? 'Sign in.' : 'Create account.'}</h2>
            <p>{isLoginView ? 'No theatrics. Just credentials.' : 'Sharp tools for residential design.'}</p>
          </div>
          <form onSubmit={handleAuthSubmit}>
            {!isLoginView && (
              <>
                <div className="form-group">
                  <label>Username</label>
                  <input type="text" value={authUsername} onChange={e => setAuthUsername(e.target.value)} required />
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>First Name</label>
                    <input type="text" value={authFirst} onChange={e => setAuthFirst(e.target.value)} />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Last Name</label>
                    <input type="text" value={authLast} onChange={e => setAuthLast(e.target.value)} />
                  </div>
                </div>
              </>
            )}
            <div className="form-group">
              <label>Email Address</label>
              <input type="email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input type="password" value={authPassword} onChange={e => setAuthPassword(e.target.value)} required />
            </div>
            {authError && <p style={{ color: '#c00000', fontSize: '13px', marginBottom: '15px' }}>{authError}</p>}
            <button type="submit" className="auth-btn">
              {isLoginView ? 'ENTER' : 'CREATE ACCOUNT'}
            </button>
          </form>
          {isLoginView && (
            <>
              <div className="auth-divider">
                <span />
                <p>or</p>
                <span />
              </div>
              <button type="button" className="google-auth-btn" onClick={handleGoogleLogin}>
                <GoogleIcon />
                Continue with Google
              </button>
            </>
          )}
          <div className="auth-switch">
            {isLoginView ? (
              <p>Don't have an account? <span onClick={() => setIsLoginView(false)}>Sign up</span></p>
            ) : (
              <p>Already have an account? <span onClick={() => setIsLoginView(true)}>Log in</span></p>
            )}
            <p style={{ marginTop: '15px', fontSize: '12px' }}>
              Need help? <a href="https://rutujdhodapkar.tech/contact.html" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}>Contact Owner</a>
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isSplashOpen) {
    return (
      <div className="splash-wrapper">
        <div className="splash-content">
          <div className="status-bar" />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '40px' }}>
            <HouseLogoIcon size={44} style={{ color: 'var(--accent)' }} />
            <h1 style={{ margin: 0 }}>AI DESIGN</h1>
          </div>
          <div className="profile-card">
            {currentUser?.avatar ? (
              <img src={currentUser.avatar} alt="" className="profile-avatar" />
            ) : (
              <div className="profile-avatar">{profileInitial}</div>
            )}
            <div>
              <p className="profile-kicker">Authenticated / {profileProvider}</p>
              <h2>{profileName}</h2>
              {profileEmail && <p>{profileEmail}</p>}
            </div>
            <div className="profile-actions">
              <button type="button" onClick={openProfileEditor}>Edit Profile</button>
              <button type="button" onClick={() => window.open('https://rutujdhodapkar.tech/contact.html', '_blank')}>Contact Owner</button>
              <button type="button" onClick={handleLogout}>Logout</button>
            </div>
          </div>
          <div className="splash-card">
            {!showNewProjectNameField ? (
              <button className="splash-new-btn" onClick={() => setShowNewProjectNameField(true)}>
                + New Design
              </button>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <input 
                  type="text" 
                  placeholder="Project Name (e.g. Dream House)"
                  value={newProjectNameInput}
                  onChange={e => setNewProjectNameInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && startNewProject()}
                  style={{ width: '100%', padding: '12px', fontSize: '15px', boxSizing: 'border-box' }}
                />
                <button className="splash-new-btn" onClick={startNewProject}>
                  Start Designing
                </button>
              </div>
            )}
          </div>
          {projectHistory.length > 0 && (
            <div className="splash-history-section">
              <div className="splash-history-title">Or Continue Recent Work</div>
              <div className="splash-history-list">
                {projectHistory.map((proj, idx) => (
                  <div key={idx} className="history-card" onClick={() => loadProject(proj.filename)}>
                    <div>
                      <h4>{proj.name}</h4>
                      <span>{new Date(proj.timestamp).toLocaleDateString()}</span>
                    </div>
                    <span style={{ color: 'var(--accent)', fontWeight: 600 }}>Open →</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {isProfileEditorOpen && (
            <div className="profile-modal-overlay">
              <div className="profile-modal">
                <div className="status-bar" />
                <div className="auth-header">
                  <div className="auth-wordmark">PROFILE / EDIT</div>
                  <h2>Profile.</h2>
                  <p>Update the identity shown across the design workspace.</p>
                </div>
                <div className="form-group">
                  <label>Display Name</label>
                  <input type="text" value={profileForm.username} onChange={e => setProfileForm({ ...profileForm, username: e.target.value })} />
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>First Name</label>
                    <input type="text" value={profileForm.first_name} onChange={e => setProfileForm({ ...profileForm, first_name: e.target.value })} />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Last Name</label>
                    <input type="text" value={profileForm.last_name} onChange={e => setProfileForm({ ...profileForm, last_name: e.target.value })} />
                  </div>
                </div>
                <div className="form-group">
                  <label>Avatar URL</label>
                  <input type="text" value={profileForm.avatar} onChange={e => setProfileForm({ ...profileForm, avatar: e.target.value })} placeholder="https://..." />
                </div>
                {profileError && <p className="profile-error">{profileError}</p>}
                <div className="profile-modal-actions">
                  <button type="button" className="google-auth-btn" onClick={() => setIsProfileEditorOpen(false)}>Cancel</button>
                  <button type="button" className="auth-btn" onClick={saveProfile}>Save Profile</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Helper variables
  const activeRoom =
    activeFloorIndex !== null && activeRoomIndex !== null && floors[activeFloorIndex]?.rooms?.[activeRoomIndex]
      ? floors[activeFloorIndex].rooms[activeRoomIndex]
      : null;

  const showRoomPanel = isAddingRoom || activeRoom !== null;

  return (
    <div className="app-viewport">
      {/* --- SIDEBAR --- */}
      <div className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <HouseLogoIcon size={20} style={{ color: 'var(--accent)' }} />
              <h2 style={{ margin: 0 }}>AI DESIGN</h2>
            </div>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span className="project-tag">{projectName}</span>
              <button className="logout-btn" onClick={handleLogout}>Log out</button>
            </div>
          </div>
          <div className="sidebar-profile">
            {currentUser?.avatar ? (
              <img src={currentUser.avatar} alt="" className="sidebar-avatar" />
            ) : (
              <div className="sidebar-avatar">{profileInitial}</div>
            )}
            <div style={{ minWidth: 0, flex: 1 }}>
              <p>{profileName}</p>
              <span>{profileEmail || profileProvider}</span>
            </div>
            <button type="button" className="profile-edit-btn" onClick={openProfileEditor}>Edit</button>
          </div>
        </div>

        <div className="sidebar-scroll">
          <button className="add-floor-btn" onClick={addFloor}>
            + Add Floor
          </button>

          {floors.map((floor, fIdx) => (
            <div key={fIdx} className="floor-section">
              <div className="floor-section-header">
                {editingFloorIndex === fIdx ? (
                  <input
                    ref={floorNameInputRef}
                    className="floor-name-input"
                    value={editingFloorName}
                    onChange={e => setEditingFloorName(e.target.value)}
                    onBlur={commitFloorNameEdit}
                    onKeyDown={onFloorNameKeyDown}
                  />
                ) : (
                  <h3
                    className="floor-name-label"
                    title="Click to rename"
                    onClick={(e) => startEditFloorName(fIdx, floor.name, e)}
                  >
                    {floor.name}
                  </h3>
                )}
                <button
                  className="add-room-btn"
                  onClick={() => initRoomAdd(fIdx)}
                >
                  + Room
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {floor.rooms.map((room, rIdx) => {
                  const isActive = activeFloorIndex === fIdx && activeRoomIndex === rIdx && !isAddingRoom;
                  return (
                    <div 
                      key={rIdx} 
                      className={`room-sidebar-item ${isActive ? 'active' : ''}`}
                      onClick={() => editRoom(fIdx, rIdx)}
                    >
                      <div className="room-sidebar-info">
                        <h4>{room.name || room.type}</h4>
                        <p>{room.type || 'Room'} / {room.styles?.[0] || 'Modern'}</p>
                      </div>
                      <div className="room-sidebar-actions">
                        <button
                          className="room-action-btn edit"
                          onClick={(e) => { e.stopPropagation(); editRoom(fIdx, rIdx); }}
                        >
                          Edit
                        </button>
                        <button
                          className="room-action-btn delete"
                          onClick={(e) => deleteRoom(fIdx, rIdx, e)}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="sidebar-footer">
          {floors.some(f => f.rooms.length > 0) && (
            <button className="generate-btn-main" onClick={generateInteriorBatch}>
              GENERATE ALL ROOMS
            </button>
          )}
        </div>
      </div>

      {/* --- MAIN WORKSPACE --- */}
      <div className="main-workspace">
        <div className="navbar">
          <div className="navbar-tabs">
            <button 
              className={`nav-tab-btn ${activeMainTab === 'interior' ? 'active' : ''}`}
              onClick={() => setActiveMainTab('interior')}
            >
              Interior
            </button>
            <button 
              className={`nav-tab-btn ${activeMainTab === 'floorplan' ? 'active' : ''}`}
              onClick={() => setActiveMainTab('floorplan')}
            >
              2D Plan
            </button>
            <button 
              className={`nav-tab-btn ${activeMainTab === 'exterior' ? 'active' : ''}`}
              onClick={() => setActiveMainTab('exterior')}
            >
              Exterior
            </button>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="logout-btn" onClick={() => window.open('https://rutujdhodapkar.tech/contact.html', '_blank')}>
              Contact Owner
            </button>
            <button className="logout-btn" onClick={() => setIsSplashOpen(true)}>
              Dashboard
            </button>
          </div>
        </div>

        {/* --- API ERROR BANNER --- */}
        {apiError && (
          <div className="api-error-banner">
            <span>⚠ {apiError}</span>
            <button onClick={() => setApiError('')}>✕</button>
          </div>
        )}

        <div className="workspace-scroll">
          
          {/* --- INTERIOR TAB --- */}
          {activeMainTab === 'interior' && (
            <div className="animate-fade-in">
              {!showRoomPanel ? (
                <div className="welcome-panel">
                  <span className="sparkle">+</span>
                  <h2>Start Your Design Journey</h2>
                  <p>Select a room in the sidebar or add a floor and rooms to begin rendering.</p>
                  
                  {floors.length === 0 && (
                    <div className="welcome-card-guide">
                      <div>
                        <h4>Quick start</h4>
                        <p>1) Add a floor / 2) Add rooms with dimensions / 3) Generate designs.</p>
                      </div>
                      <button onClick={addFloor}>Add Floor</button>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <div className="section-title-row">
                    <span className="section-label">
                      {isAddingRoom
                        ? `NEW ROOM — ${floors[activeFloorIndex]?.name}`
                        : `ROOM: ${activeRoom?.name} (${floors[activeFloorIndex]?.name})`}
                    </span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        className={`nav-tab-btn ${roomConfigView === 'config' ? 'active' : ''}`}
                        onClick={() => setRoomConfigView('config')}
                      >
                        Config
                      </button>
                      {!isAddingRoom && activeRoom?.generatedImage && (
                        <button 
                          className={`nav-tab-btn ${roomConfigView === 'display' ? 'active' : ''}`}
                          onClick={() => setRoomConfigView('display')}
                        >
                          Preview
                        </button>
                      )}
                    </div>
                  </div>

                  {roomConfigView === 'config' || isAddingRoom ? (
                    <div className="panel-card">
                      <div className="form-group">
                        <label>Room Name</label>
                        <input 
                          type="text" 
                          placeholder="e.g. Master Bedroom" 
                          value={formRoomName}
                          onChange={e => setFormRoomName(e.target.value)}
                        />
                      </div>

                      <div className="form-group">
                        <label>Room Type</label>
                        <div className="pill-group">
                          {['Living Room', 'Bedroom', 'Kitchen', 'Office', 'Bathroom', 'Dining'].map(t => (
                            <div 
                              key={t}
                              className={`pill-item ${formRoomType === t ? 'active' : ''}`}
                              onClick={() => setFormRoomType(t)}
                            >
                              {t}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="form-group">
                        <label>Interior Style</label>
                        <div className="pill-group">
                          {['Modern', 'Minimalist', 'Luxury', 'Scandinavian', 'Industrial', 'Bohemian'].map(s => (
                            <div 
                              key={s}
                              className={`pill-item ${formStyle === s ? 'active' : ''}`}
                              onClick={() => setFormStyle(s)}
                            >
                              {s}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="form-group" style={{ marginTop: '20px' }}>
                        <label>Space Input Mode</label>
                        <div className="pill-group">
                          {['Use Dimensions', 'Use Layout Image'].map(m => (
                            <div 
                              key={m}
                              className={`pill-item ${formInputMode === m ? 'active' : ''}`}
                              onClick={() => setFormInputMode(m)}
                            >
                              {m}
                            </div>
                          ))}
                        </div>
                      </div>

                      {formInputMode === 'Use Dimensions' ? (
                        <div className="dims-row">
                          <div className="form-group">
                            <label>Width (ft)</label>
                            <input type="number" placeholder="W" value={formWidth} onChange={e => setFormWidth(e.target.value)} />
                          </div>
                          <div className="form-group">
                            <label>Length (ft)</label>
                            <input type="number" placeholder="L" value={formLength} onChange={e => setFormLength(e.target.value)} />
                          </div>
                          <div className="form-group">
                            <label>Height (ft)</label>
                            <input type="number" placeholder="H" value={formHeight} onChange={e => setFormHeight(e.target.value)} />
                          </div>
                        </div>
                      ) : (
                        <div style={{ marginTop: '12px' }}>
                          <div className="upload-dashed" onClick={() => fileInputRef.current.click()}>
                            <span className="upload-dashed-text">
                              {formUploadedLayoutImage ? 'Layout image uploaded. Click to replace.' : 'Click to upload layout image'}
                            </span>
                            <input 
                              type="file" 
                              ref={fileInputRef} 
                              accept="image/*" 
                              onChange={handleLayoutUpload} 
                              style={{ display: 'none' }} 
                            />
                          </div>
                          {formUploadedLayoutImage && (
                            <img src={formUploadedLayoutImage} className="preview-img-small" alt="Layout" />
                          )}
                        </div>
                      )}

                      <div className="form-group" style={{ marginTop: '20px' }}>
                        <label>Colors</label>
                        <div className="pill-group">
                          {['White', 'Beige', 'Grey', 'Charcoal', 'Wood', 'Navy', 'Sage'].map(c => {
                            const active = formColors.includes(c);
                            return (
                              <div 
                                key={c}
                                className={`pill-item ${active ? 'active' : ''}`}
                                onClick={() => toggleSelection(c, formColors, setFormColors)}
                              >
                                {c}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="form-group">
                        <label>Furniture Selection</label>
                        <div className="pill-group">
                          {['Modern Sofa', 'Ambient Lighting', 'Indoor Plants', 'Minimal Desk', 'Bookshelf', 'Dining Table'].map(f => {
                            const active = formFurniture.includes(f);
                            return (
                              <div 
                                key={f}
                                className={`pill-item ${active ? 'active' : ''}`}
                                onClick={() => toggleSelection(f, formFurniture, setFormFurniture)}
                              >
                                {f}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="form-group">
                        <label>Additional Required Elements</label>
                        <input 
                          type="text" 
                          placeholder="e.g. false ceiling, pooja unit, wall painting"
                          value={formAdditionalElements}
                          onChange={e => setFormAdditionalElements(e.target.value)}
                        />
                      </div>

                      <div className="room-form-actions">
                        <button className="btn-save" onClick={saveRoom}>
                          {isAddingRoom ? 'Add Room' : 'Save Details'}
                        </button>
                        <button className="btn-generate" onClick={generateActiveRoom}>
                          Generate Render
                        </button>
                      </div>

                    </div>
                  ) : (
                    <div className="image-frame">
                      {activeRoom?.generatedImage ? (
                        <img src={activeRoom.generatedImage} alt="Room Render" />
                      ) : (
                        <p style={{ color: 'var(--text-dim)' }}>No render generated yet. Go to Config and click Generate Render.</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* --- 2D FLOORPLAN TAB --- */}
          {activeMainTab === 'floorplan' && (
            <div className="animate-fade-in">
              <div className="panel-card">
                <div className="form-group">
                  <label>Floor Plan Mode</label>
                  <div className="pill-group">
                    {['Manual', 'Auto'].map(m => (
                      <div 
                        key={m}
                        className={`pill-item ${floorplanMode === m ? 'active' : ''}`}
                        onClick={() => setFloorplanMode(m)}
                      >
                        {m}
                      </div>
                    ))}
                  </div>
                </div>

                {floorplanMode === 'Auto' ? (
                  <div style={{ marginTop: '20px' }}>
                    <div className="dims-row">
                      <div className="form-group">
                        <label>Plot Width (ft)</label>
                        <input type="number" value={floorplanWidth} onChange={e => setFloorplanWidth(e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label>Plot Length (ft)</label>
                        <input type="number" value={floorplanLength} onChange={e => setFloorplanLength(e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label>Total Floors</label>
                        <input type="number" value={floorplanTotalFloors} onChange={e => setFloorplanTotalFloors(e.target.value)} />
                      </div>
                    </div>

                    {autoFloorPlanRows.length > 0 && (
                      <div style={{ marginTop: '20px', overflowX: 'auto' }}>
                        <table className="floor-table">
                          <thead>
                            <tr>
                              <th>Floor</th>
                              <th>Rooms</th>
                              <th>Room Types</th>
                            </tr>
                          </thead>
                          <tbody>
                            {autoFloorPlanRows.map((row, idx) => (
                              <tr key={idx}>
                                <td>{row.floor}</td>
                                <td>{row.rooms}</td>
                                <td>{row.room_types}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ marginTop: '20px' }}>
                    <div className="dims-row">
                      <div className="form-group">
                        <label>Plot Width (ft)</label>
                        <input type="number" value={floorplanWidth} onChange={e => setFloorplanWidth(e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label>Plot Length (ft)</label>
                        <input type="number" value={floorplanLength} onChange={e => setFloorplanLength(e.target.value)} />
                      </div>
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '8px' }}>
                      Floor list in the sidebar drives the 2D SVG rendering algorithm.
                    </p>
                  </div>
                )}
              </div>

              {/* Blueprint Recognition Module */}
              <div className="panel-card">
                <div className="panel-card-title">Blueprint AI Recognition</div>
                <div className="blueprint-upload-area">
                  <div
                    className="upload-dashed"
                    style={{ flex: 1 }}
                    onClick={() => blueprintInputRef.current.click()}
                  >
                    <span className="upload-dashed-text">
                      {blueprintImage
                        ? '✓ Blueprint uploaded — auto-processing...'
                        : 'Click to upload blueprint image (auto-extracts rooms)'}
                    </span>
                    <input 
                      type="file" 
                      ref={blueprintInputRef} 
                      accept="image/*" 
                      onChange={handleBlueprintUpload} 
                      style={{ display: 'none' }} 
                    />
                  </div>
                  {blueprintImage && (
                    <div className="blueprint-preview-wrapper">
                      <img src={blueprintImage} className="blueprint-thumb" alt="Blueprint preview" />
                      <button className="btn-outline-sm" onClick={recognizePlan}>
                        Re-extract
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="panel-card">
                <div className="panel-card-title">Floor Plan Preview</div>
                <div className="image-frame">
                  {floorplanPreviewHtml ? (
                    <div 
                      className="image-frame-svg-container" 
                      dangerouslySetInnerHTML={{ __html: floorplanPreviewHtml }} 
                    />
                  ) : (
                    <p style={{ color: 'var(--text-dim)' }}>Click 'Generate 2D Plan' to see layout.</p>
                  )}
                </div>
              </div>

              <button className="generate-btn-main" style={{ width: '100%', padding: '16px' }} onClick={generateFloorplan}>
                GENERATE 2D PLAN
              </button>
            </div>
          )}

          {/* --- EXTERIOR TAB --- */}
          {activeMainTab === 'exterior' && (
            <div className="animate-fade-in">
              <div className="panel-card">
                {/* Region Selector */}
                <div className="form-group">
                  <label>Region / Architecture Style</label>
                  <div className="pill-group">
                    {['Indian', 'Mediterranean', 'American', 'European', 'Japanese', 'Middle Eastern', 'Tropical', 'Colonial'].map(r => (
                      <div 
                        key={r}
                        className={`pill-item ${houseRegion === r ? 'active' : ''}`}
                        onClick={() => setHouseRegion(r)}
                      >
                        {r}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label>Exterior Style</label>
                  <div className="pill-group">
                    {['Modern', 'Minimalist', 'Classic', 'Industrial', 'Coastal', 'Vernacular'].map(s => (
                      <div 
                        key={s}
                        className={`pill-item ${exteriorStyle === s ? 'active' : ''}`}
                        onClick={() => setExteriorStyle(s)}
                      >
                        {s}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label>Theme & Palette</label>
                  <div className="pill-group" style={{ marginBottom: '10px' }}>
                    {['Contemporary', 'Resort', 'Urban', 'Traditional', 'Heritage'].map(t => (
                      <div 
                        key={t}
                        className={`pill-item ${exteriorTheme === t ? 'active' : ''}`}
                        onClick={() => setExteriorTheme(t)}
                      >
                        {t}
                      </div>
                    ))}
                  </div>
                  <div className="pill-group">
                    {['White', 'Stone Gray', 'Graphite', 'Wood Accent', 'Terracotta', 'Sand'].map(c => {
                      const active = exteriorColors.includes(c);
                      return (
                        <div 
                          key={c}
                          className={`pill-item ${active ? 'active' : ''}`}
                          onClick={() => toggleSelection(c, exteriorColors, setExteriorColors)}
                        >
                          {c}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="form-group">
                  <label>Additional Elements</label>
                  <input 
                    type="text" 
                    placeholder="e.g. swimming pool, driveway, front garden, boundary wall"
                    value={exteriorExtraElements}
                    onChange={e => setExteriorExtraElements(e.target.value)}
                  />
                </div>
              </div>

              <div className="panel-card">
                <div className="panel-card-title">Render Previews</div>
                <div className="image-frame" style={{ minHeight: '260px' }}>
                  {exteriorRenderedImages.length > 0 ? (
                    <img src={exteriorRenderedImages[0]} alt="Exterior render" />
                  ) : (
                    <p style={{ color: 'var(--text-dim)' }}>No exterior renders generated yet.</p>
                  )}
                </div>
              </div>

              <button className="generate-btn-main" style={{ width: '100%', padding: '16px' }} onClick={generateExterior}>
                GENERATE EXTERIOR RENDER
              </button>
            </div>
          )}

        </div>
      </div>

      {/* --- LOADER ELEMENT --- */}
      {isLoading && (
        <div className="loader-overlay">
          <div className="loader-bars">
            <div className="loader-bar" style={{ animationDelay: '0s' }}></div>
            <div className="loader-bar" style={{ animationDelay: '0.1s' }}></div>
            <div className="loader-bar" style={{ animationDelay: '0.2s' }}></div>
            <div className="loader-bar" style={{ animationDelay: '0.3s' }}></div>
            <div className="loader-bar" style={{ animationDelay: '0.4s' }}></div>
          </div>
          <div className="loader-title">{loaderText}</div>
          {loaderSubtitle && <div className="loader-subtitle">{loaderSubtitle}</div>}
        </div>
      )}

      {isProfileEditorOpen && (
        <div className="profile-modal-overlay">
          <div className="profile-modal">
            <div className="status-bar" />
            <div className="auth-header">
              <div className="auth-wordmark">PROFILE / EDIT</div>
              <h2>Profile.</h2>
              <p>Update the identity shown across the design workspace.</p>
            </div>
            <div className="form-group">
              <label>Display Name</label>
              <input
                type="text"
                value={profileForm.username}
                onChange={e => setProfileForm({ ...profileForm, username: e.target.value })}
              />
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label>First Name</label>
                <input
                  type="text"
                  value={profileForm.first_name}
                  onChange={e => setProfileForm({ ...profileForm, first_name: e.target.value })}
                />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Last Name</label>
                <input
                  type="text"
                  value={profileForm.last_name}
                  onChange={e => setProfileForm({ ...profileForm, last_name: e.target.value })}
                />
              </div>
            </div>
            <div className="form-group">
              <label>Avatar URL</label>
              <input
                type="text"
                value={profileForm.avatar}
                onChange={e => setProfileForm({ ...profileForm, avatar: e.target.value })}
                placeholder="https://..."
              />
            </div>
            {profileError && <p className="profile-error">{profileError}</p>}
            <div className="profile-modal-actions">
              <button type="button" className="google-auth-btn" onClick={() => setIsProfileEditorOpen(false)}>Cancel</button>
              <button type="button" className="auth-btn" onClick={saveProfile}>Save Profile</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
