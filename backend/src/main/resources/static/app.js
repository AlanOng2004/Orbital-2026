const MAP = {
  src: "img/Kent-Ridge-Campus-Map.jpg",
  sourceWidth: 3308,
  sourceHeight: 2339,
  cropX: 90,
  cropY: 84,
  width: 3114,
  height: 2197,
};

const SIDE_MENU_WIDTH = 320;
const COM1_FLOORS = [
  { id: "B1", img: "img/COMBLK1_B1.jpg", width: 997, height: 580 },
  { id: "L1", img: "img/COMBLK1_01.jpg", width: 2566, height: 1712 },
  { id: "L2", img: "img/COMBLK1_02.jpg", width: 2736, height: 1734 },
  { id: "L3", img: "img/COMBLK1_03.jpg", width: 997, height: 580 },
];

const MENU_LISTS = {
  recentPlaces: [
    "COM1",
    "COM4",
    "School of Computing",
    "LT15",
    "Central Library",
    "University Hall",
    "UTown",
    "Faculty of Science",
    "NUS Business School",
    "Yusof Ishak House",
    "Kent Ridge MRT",
    "Ventus",
  ],
  recentRoutes: [
    "COM1 to LT15",
    "COM1 to Central Library",
    "COM1 to UTown",
    "Kent Ridge MRT to COM1",
    "COM4 to COM1",
    "COM1 to Business School",
    "COM1 to YIH",
    "COM1 to Faculty of Science",
    "COM1 to University Hall",
    "COM1 to Ventus",
    "COM1 to Prince George's Park",
  ],
  bookmarkPlaces: [
    "COM1 Database Labs",
    "COM1 SR 1",
    "School of Computing",
    "Central Library",
    "UTown Food",
    "Kent Ridge MRT",
    "Techno Edge",
    "Frontier",
    "Yusof Ishak House",
    "University Hall",
    "Medicine",
  ],
  bookmarkRoutes: [
    "Home to COM1",
    "COM1 to Central Library",
    "COM1 to LT15",
    "COM1 to UTown",
    "COM1 to Kent Ridge MRT",
    "COM1 to YIH",
    "COM1 to Science",
    "COM1 to Business",
    "COM1 to Medicine",
    "COM1 to PGP",
    "COM1 to Ventus",
  ],
};

const LEGEND_ITEMS = [
  ["Academic", "#397dac"],
  ["Housing", "#f5ae2f"],
  ["Infrastructure", "#cbbda3"],
  ["LT", "#9b735f"],
  ["Research", "#df6d81"],
  ["Staff Housing", "#d9db9d"],
  ["Support", "#9ac867"],
];

const imageBox = ({ x, y, width, height }) => ({
  x: x - MAP.cropX,
  y: y - MAP.cropY,
  width,
  height,
});

const SEARCH_ITEMS = [
  {
    id: "soc",
    type: "faculty",
    label: "School of Computing",
    aliases: ["faculty of computing", "soc", "computing"],
    box: imageBox({ x: 760, y: 1240, width: 560, height: 360 }),
  },
  {
    id: "com1",
    type: "building",
    label: "COM1",
    aliases: ["computing 1", "com 1", "school of computing"],
    box: imageBox({ x: 941, y: 1331, width: 173, height: 149 }),
    floor: "L1",
  },
  {
    id: "com4",
    type: "building",
    label: "COM4",
    aliases: ["computing 4", "com 4"],
    box: imageBox({ x: 1170, y: 1330, width: 85, height: 70 }),
  },
  {
    id: "lt15",
    type: "building",
    label: "LT15",
    aliases: ["lecture theatre 15"],
    box: imageBox({ x: 988, y: 1580, width: 86, height: 66 }),
  },
  {
    id: "com1-01-07-08",
    type: "room",
    label: "Database Labs 01-07 / 01-08",
    aliases: ["01-07", "01-08", "database", "database 1", "database 3"],
    buildingId: "com1",
    floor: "L1",
    roomBox: { x: 1548, y: 16, width: 718, height: 172 },
  },
  {
    id: "com1-02-06",
    type: "room",
    label: "SR 1 02-06",
    aliases: ["02-06", "sr1", "sr 1"],
    buildingId: "com1",
    floor: "L2",
    roomBox: { x: 1224, y: 152, width: 70, height: 87 },
  },
];

const QUICK_ACTIONS = ["🍴 Food", "📖 Empty Rooms", "🚻 Toilets", "🚌 Bus Stop"];
const ROUTE_OPTIONS = ["Less walking", "Walking only", "Sheltered Paths", "No keycard"];

function getStoredSession() {
  try {
    const raw = localStorage.getItem("points_app_session");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function getAccountState() {
  const session = getStoredSession();
  const username =
    typeof session?.username === "string" && session.username.trim()
      ? session.username.trim()
      : "guest";

  return {
    username,
    isGuest: username === "guest",
  };
}

const state = {
  windowSize: { width: window.innerWidth, height: window.innerHeight },
  camera: null,
  isInteracting: false,
  isDialDragging: false,
  query: "",
  searchResults: [],
  searchRequestId: 0,
  searchCommitted: false,
  activeResult: null,
  mode: "home",
  activeFloor: "L1",
  activeRoom: null,
  sideMenuOpen: false,
  expandedMenus: {},
  routePlanner: {
    stage: "input",
    src: "",
    srcConfirmed: false,
    srcSuggestions: [],
    srcRequestId: 0,
    srcSelection: null,
    dst: "",
    dstConfirmed: false,
    dstSuggestions: [],
    dstRequestId: 0,
    dstSelection: null,
    routes: [],
    selectedRouteId: null,
    loading: false,
    error: "",
  },
  routeOptions: {
    "Less walking": false,
    "Walking only": false,
    "Sheltered Paths": false,
    "No keycard": false,
  },
  hideOptions: {
    distance: false,
    legend: false,
    compass: false,
    ui: false,
  },
  locationStatus: "disabled",
  drag: null,
  dialDrag: null,
};

function normalize(value) {
  return value.trim().toLowerCase();
}

function uniqueBy(items, keyFn) {
  const seen = new Set();
  return items.filter((item) => {
    const key = keyFn(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function floorIdFromData(level, imageUrl = "") {
  const normalizedImageUrl = String(imageUrl || "").toUpperCase();
  if (normalizedImageUrl.includes("_B1")) return "B1";
  if (normalizedImageUrl.includes("_01")) return "L1";
  if (normalizedImageUrl.includes("_02")) return "L2";
  if (normalizedImageUrl.includes("_03")) return "L3";

  const numericLevel = Number(level);
  if (Number.isFinite(numericLevel)) {
    if (numericLevel <= 0) return "B1";
    return `L${numericLevel}`;
  }

  return "L1";
}

function getDisplayLabel(item) {
  return item.displayLabel || item.label;
}

function getSearchTerms(item) {
  return uniqueBy(
    [
      item.label,
      item.displayLabel,
      item.secondaryLabel,
      ...(item.aliases || []),
    ].filter(Boolean),
    (value) => normalize(String(value)),
  );
}

function findBuildingItemForName(buildingName) {
  const normalized = normalize(buildingName || "");
  return SEARCH_ITEMS.find(
    (item) =>
      item.type === "building" &&
      [item.label, ...(item.aliases || [])].some((value) => normalize(value) === normalized),
  );
}

function getBuildingQueryForItem(item) {
  if (!item) return null;
  if (item.type === "building") return item.label;
  if (item.buildingId) {
    return SEARCH_ITEMS.find((entry) => entry.id === item.buildingId)?.label || null;
  }
  return null;
}

function getRouteNodeId(item) {
  return item && Number.isFinite(Number(item.routeNodeId)) ? Number(item.routeNodeId) : null;
}

function getRouteDescription(route) {
  if (!route || !Array.isArray(route.pathNodes) || route.pathNodes.length === 0) {
    return "No path available.";
  }
  const floors = uniqueBy(
    route.pathNodes
      .map((node) => floorIdFromData(node.floorLevel, node.floorImageUrl))
      .filter(Boolean),
    (value) => value,
  );
  return `${route.pathNodes.length} nodes across ${floors.join(" / ")}`;
}

function getSelectedRoute() {
  return state.routePlanner.routes.find((route) => route.routeId === state.routePlanner.selectedRouteId) || null;
}

function getRouteNodesForFloor(route, floorId) {
  if (!route || !Array.isArray(route.pathNodes) || !floorId) return [];
  return route.pathNodes.filter(
    (node) => floorIdFromData(node.floorLevel, node.floorImageUrl) === floorId,
  );
}

function getRouteFloorSequence(route) {
  if (!route || !Array.isArray(route.pathNodes)) return [];
  return uniqueBy(
    route.pathNodes
      .map((node) => floorIdFromData(node.floorLevel, node.floorImageUrl))
      .filter(Boolean),
    (value) => value,
  );
}

function getNextRouteFloor(route, activeFloor) {
  const floors = getRouteFloorSequence(route);
  if (floors.length === 0) return null;
  const currentIndex = floors.indexOf(activeFloor);
  if (currentIndex === -1) return floors[0];
  return floors[(currentIndex + 1) % floors.length];
}

function getUpcomingRouteFloor(route, activeFloor) {
  const floors = getRouteFloorSequence(route);
  if (floors.length < 2) return null;
  const currentIndex = floors.indexOf(activeFloor);
  if (currentIndex === -1) return floors[0];
  if (currentIndex >= floors.length - 1) return null;
  return floors[currentIndex + 1];
}

function isTransitionNode(node, route, activeFloor) {
  if (!node || !route) return false;
  const floors = getRouteFloorSequence(route);
  if (floors.length < 2) return false;
  const currentIndex = floors.indexOf(activeFloor);
  if (currentIndex === -1 || currentIndex >= floors.length - 1) return false;
  return node === getRouteNodesForFloor(route, activeFloor).at(-1);
}

function openSelectedRouteFloor(route) {
  if (!route || !Array.isArray(route.pathNodes) || route.pathNodes.length === 0) return;
  const firstFloor = floorIdFromData(route.pathNodes[0].floorLevel, route.pathNodes[0].floorImageUrl);
  if (firstFloor) {
    state.activeFloor = firstFloor;
  }
  state.mode = "map";
}

function toDynamicSearchItem(node) {
  const buildingItem = findBuildingItemForName(node.buildingName);
  const displayLabel = node.dualLabel || node.label;
  const secondaryParts = [];
  if (node.label && node.dualLabel && node.label !== node.dualLabel) {
    secondaryParts.push(node.label);
  }
  if (node.secondaryLabel) {
    secondaryParts.push(node.secondaryLabel);
  }

  return {
    id: `route-node-${node.nodeId}`,
    type: (node.nodeType || "room").toLowerCase(),
    label: node.label,
    displayLabel,
    secondaryLabel: secondaryParts.join(" • "),
    aliases: uniqueBy(
      [node.dualLabel, ...(node.aliases || [])].filter(Boolean),
      (value) => normalize(String(value)),
    ),
    buildingId: buildingItem?.id || null,
    floor: floorIdFromData(node.floorLevel, node.floorImageUrl),
    roomBox: null,
    nodePoint: Number.isFinite(node.x) && Number.isFinite(node.y) ? { x: node.x, y: node.y } : null,
    routeNodeId: node.nodeId,
  };
}

function rankSearchItem(item, term) {
  const searchTerms = getSearchTerms(item).map(normalize);
  const displayLabel = normalize(getDisplayLabel(item));
  const typeRank = item.type === "room" ? 0 : item.type === "building" ? 1 : 2;
  const exact = searchTerms.some((value) => value === term) ? 0 : 1;
  const prefix = exact === 0 || searchTerms.some((value) => value.startsWith(term)) ? 0 : 1;
  return [exact, prefix, typeRank, displayLabel];
}

function compareSearchItems(left, right, term) {
  const leftRank = rankSearchItem(left, term);
  const rightRank = rankSearchItem(right, term);
  for (let index = 0; index < leftRank.length; index += 1) {
    if (leftRank[index] < rightRank[index]) return -1;
    if (leftRank[index] > rightRank[index]) return 1;
  }
  return 0;
}

function mergeSearchResults(staticItems, dynamicItems, term, limit) {
  return uniqueBy([...dynamicItems, ...staticItems], (item) => `${item.type}:${normalize(getDisplayLabel(item))}`)
    .sort((left, right) => compareSearchItems(left, right, term))
    .slice(0, limit);
}

async function fetchRouteNodeSearch(query, buildingQuery) {
  const params = new URLSearchParams({ query });
  if (buildingQuery) {
    params.set("buildingQuery", buildingQuery);
  }

  const response = await fetch(`/api/routes/nodes/search?${params.toString()}`);
  const payload = await response.json().catch(() => []);
  if (!response.ok) {
    throw new Error(payload?.error || payload?.message || "Unable to search nodes.");
  }
  return Array.isArray(payload) ? payload.map(toDynamicSearchItem) : [];
}

function refreshSearchResults() {
  const term = normalize(state.query);
  const staticMatches =
    state.searchCommitted || term.length < 2
      ? []
      : SEARCH_ITEMS.filter((item) =>
          getSearchTerms(item).some((value) => normalize(value).includes(term)),
        );

  if (state.searchCommitted || term.length < 2) {
    state.searchResults = [];
    render();
    return;
  }

  const requestId = ++state.searchRequestId;
  state.searchResults = staticMatches.slice(0, 7);
  render();

  fetchRouteNodeSearch(state.query.trim())
    .then((dynamicItems) => {
      if (requestId !== state.searchRequestId) return;
      state.searchResults = mergeSearchResults(staticMatches, dynamicItems, term, 7);
      render();
    })
    .catch(() => {
      if (requestId !== state.searchRequestId) return;
      state.searchResults = staticMatches.slice(0, 7);
      render();
    });
}

function refreshRouteSrcSuggestions() {
  const raw = state.routePlanner.src.trim();
  const term = normalize(raw);
  if (!raw || state.routePlanner.srcConfirmed) {
    state.routePlanner.srcSuggestions = [];
    render();
    return;
  }

  const buildingQuery = state.activeResult?.buildingId
    ? SEARCH_ITEMS.find((item) => item.id === state.activeResult.buildingId)?.label
    : state.activeResult?.type === "building"
    ? state.activeResult.label
    : null;

  const staticMatches = SEARCH_ITEMS.filter((item) =>
    getSearchTerms(item).some((value) => normalize(value).includes(term)),
  );
  const requestId = ++state.routePlanner.srcRequestId;
  state.routePlanner.srcSuggestions = staticMatches.slice(0, 6);
  render();

  fetchRouteNodeSearch(raw, buildingQuery)
    .then((dynamicItems) => {
      if (requestId !== state.routePlanner.srcRequestId) return;
      state.routePlanner.srcSuggestions = mergeSearchResults(staticMatches, dynamicItems, term, 6);
      render();
    })
    .catch(() => {
      if (requestId !== state.routePlanner.srcRequestId) return;
      state.routePlanner.srcSuggestions = staticMatches.slice(0, 6);
      render();
    });
}

function refreshRouteDstSuggestions() {
  const raw = state.routePlanner.dst.trim();
  const term = normalize(raw);
  if (!raw || state.routePlanner.dstConfirmed) {
    state.routePlanner.dstSuggestions = [];
    render();
    return;
  }

  const buildingQuery = getBuildingQueryForItem(state.activeResult);
  const staticMatches = SEARCH_ITEMS.filter((item) =>
    getSearchTerms(item).some((value) => normalize(value).includes(term)),
  );
  const requestId = ++state.routePlanner.dstRequestId;
  state.routePlanner.dstSuggestions = staticMatches.slice(0, 6);
  render();

  fetchRouteNodeSearch(raw, buildingQuery)
    .then((dynamicItems) => {
      if (requestId !== state.routePlanner.dstRequestId) return;
      state.routePlanner.dstSuggestions = mergeSearchResults(staticMatches, dynamicItems, term, 6);
      render();
    })
    .catch(() => {
      if (requestId !== state.routePlanner.dstRequestId) return;
      state.routePlanner.dstSuggestions = staticMatches.slice(0, 6);
      render();
    });
}

function normalizeBearing(value) {
  return ((value % 360) + 360) % 360;
}

function shortestDelta(from, to) {
  const delta = normalizeBearing(to) - normalizeBearing(from);
  return ((delta + 540) % 360) - 180;
}

function getCameraViewport(windowSize, sideMenuOpen) {
  const menuWidth =
    sideMenuOpen && windowSize.width > 760
      ? Math.min(SIDE_MENU_WIDTH, Math.round(windowSize.width * 0.32))
      : 0;

  return {
    x: menuWidth,
    y: 0,
    width: Math.max(320, windowSize.width - menuWidth),
    height: windowSize.height,
    menuWidth,
    outerX: 0,
    outerY: 0,
    outerWidth: windowSize.width,
    outerHeight: windowSize.height,
  };
}

function localCameraViewport(cameraViewport) {
  return { ...cameraViewport, x: 0, y: 0 };
}

function rotatedTerms(cameraViewport, bearing, zoom) {
  const cx = cameraViewport.width / 2;
  const cy = cameraViewport.height / 2;
  const rad = (-bearing * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const corners = [
    [0, 0],
    [cameraViewport.width, 0],
    [cameraViewport.width, cameraViewport.height],
    [0, cameraViewport.height],
  ];

  return corners.map(([x, y]) => {
    const dx = (x - cx) / zoom;
    const dy = (y - cy) / zoom;
    return {
      x: dx * cos - dy * sin,
      y: dx * sin + dy * cos,
    };
  });
}

function minZoomFor(cameraViewport, bearing) {
  const rad = (bearing * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));
  return Math.max(
    (cameraViewport.width * cos + cameraViewport.height * sin) / MAP.width,
    (cameraViewport.width * sin + cameraViewport.height * cos) / MAP.height,
  );
}

function elasticLimit(value, min, max) {
  if (value < min) {
    const distance = min - value;
    return min - 72 * (1 - Math.exp(-distance / 190));
  }
  if (value > max) {
    const distance = value - max;
    return max + 72 * (1 - Math.exp(-distance / 190));
  }
  return value;
}

function constrainCamera(camera, cameraViewport, elastic = false) {
  const minZoom = minZoomFor(cameraViewport, camera.bearing);
  const zoom = Math.max(camera.zoom, minZoom);
  const terms = rotatedTerms(cameraViewport, camera.bearing, zoom);
  const xs = terms.map((term) => term.x);
  const ys = terms.map((term) => term.y);
  const minX = -Math.min(...xs);
  const maxX = MAP.width - Math.max(...xs);
  const minY = -Math.min(...ys);
  const maxY = MAP.height - Math.max(...ys);

  return {
    ...camera,
    zoom,
    centerX: elastic
      ? elasticLimit(camera.centerX, minX, maxX)
      : Math.min(Math.max(camera.centerX, minX), maxX),
    centerY: elastic
      ? elasticLimit(camera.centerY, minY, maxY)
      : Math.min(Math.max(camera.centerY, minY), maxY),
  };
}

function screenDeltaToMap(deltaX, deltaY, bearing, zoom) {
  const rad = (-bearing * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    x: (deltaX * cos - deltaY * sin) / zoom,
    y: (deltaX * sin + deltaY * cos) / zoom,
  };
}

function screenToMap(point, camera, cameraViewport) {
  const dx = point.x - (cameraViewport.x + cameraViewport.width / 2);
  const dy = point.y - (cameraViewport.y + cameraViewport.height / 2);
  const delta = screenDeltaToMap(dx, dy, camera.bearing, camera.zoom);
  return {
    x: camera.centerX + delta.x,
    y: camera.centerY + delta.y,
  };
}

function cameraForBox(box, cameraViewport, bearing, padding = 140) {
  const zoom = Math.min(
    3.2,
    Math.max(
      minZoomFor(cameraViewport, bearing),
      Math.min(
        (cameraViewport.width - padding) / box.width,
        (cameraViewport.height - padding) / box.height,
      ),
    ),
  );

  return constrainCamera(
    {
      centerX: box.x + box.width / 2,
      centerY: box.y + box.height / 2,
      zoom,
      bearing,
    },
    cameraViewport,
  );
}

function getCameraViewportState() {
  return getCameraViewport(state.windowSize, state.sideMenuOpen);
}

function getBoundsViewport() {
  return localCameraViewport(getCameraViewportState());
}

function getVisibleCamera() {
  return constrainCamera(state.camera, getBoundsViewport());
}

function getResults() {
  const term = normalize(state.query);
  if (state.searchCommitted || term.length < 2) return [];
  return state.searchResults;
}

function setCamera(nextCamera, elastic = false) {
  state.camera = constrainCamera(nextCamera, getBoundsViewport(), elastic);
}

function setCameraFromUpdater(updater, elastic = false) {
  setCamera(updater(state.camera), elastic);
}

function selectResult(item) {
  const buildingItem = item.type === "room" ? SEARCH_ITEMS.find((entry) => entry.id === item.buildingId) : item;
  state.activeResult = buildingItem || item;
  state.query = getDisplayLabel(item);
  state.searchResults = [];
  state.searchCommitted = true;
  state.routePlanner = {
    stage: "input",
    src: "",
    srcConfirmed: false,
    srcSuggestions: [],
    srcRequestId: 0,
    srcSelection: null,
    dst: getDisplayLabel(item),
    dstConfirmed: true,
    dstSuggestions: [],
    dstRequestId: 0,
    dstSelection: item,
    routes: [],
    selectedRouteId: null,
    loading: false,
    error: "",
  };

  if (item.type === "faculty") {
    state.mode = "home";
    state.activeRoom = null;
    setCamera(cameraForBox(item.box, getBoundsViewport(), getVisibleCamera().bearing, 120));
    render();
    return;
  }

  if (item.type === "building") {
    state.mode = "home";
    state.activeRoom = null;
    state.activeFloor = item.floor || "L1";
    setCamera(cameraForBox(item.box, getBoundsViewport(), 0, 180));
    render();
    return;
  }

  state.mode = "home";
  state.activeFloor = item.floor || "L1";
  state.activeRoom = item;
  const building = SEARCH_ITEMS.find((candidate) => candidate.id === item.buildingId);
  if (building && building.box) {
    setCamera(cameraForBox(building.box, getBoundsViewport(), 0, 180));
  }
  render();
}

function openRoutePlanner() {
  if (!state.activeResult) return;
  state.routePlanner.stage = "input";
  render();
}

function submitRoutePlanner() {
  const sourceNodeId = getRouteNodeId(state.routePlanner.srcSelection);
  const targetNodeId = getRouteNodeId(state.routePlanner.dstSelection);
  if (!sourceNodeId || !targetNodeId) {
    state.routePlanner.error = "Select both source and destination from the suggestions.";
    render();
    return;
  }

  state.routePlanner.loading = true;
  state.routePlanner.error = "";
  render();

  fetch("/api/routes/same-building", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sourceNodeId, targetNodeId }),
  })
    .then((response) =>
      response.json().catch(() => ({})).then((payload) => ({ ok: response.ok, payload })),
    )
    .then(({ ok, payload }) => {
      if (!ok) {
        throw new Error(payload?.error || payload?.message || "Unable to compute route.");
      }

      state.routePlanner.routes = Array.isArray(payload.routes) ? payload.routes : [];
      state.routePlanner.selectedRouteId = state.routePlanner.routes[0]?.routeId || null;
      state.routePlanner.stage = "results";
      state.routePlanner.loading = false;
      if (state.routePlanner.routes[0]) {
        openSelectedRouteFloor(state.routePlanner.routes[0]);
      }
      render();
    })
    .catch((error) => {
      state.routePlanner.loading = false;
      state.routePlanner.error = error.message || "Unable to compute route.";
      state.routePlanner.routes = [];
      state.routePlanner.selectedRouteId = null;
      render();
    });
}

function setRoutePlannerSrc(value) {
  state.routePlanner.src = value;
  state.routePlanner.srcConfirmed = false;
  state.routePlanner.srcSelection = null;
  state.routePlanner.stage = "input";
  state.routePlanner.routes = [];
  state.routePlanner.selectedRouteId = null;
  state.routePlanner.error = "";
  refreshRouteSrcSuggestions();
}

function setRoutePlannerDst(value) {
  state.routePlanner.dst = value;
  state.routePlanner.dstConfirmed = false;
  state.routePlanner.dstSelection = null;
  state.routePlanner.stage = "input";
  state.routePlanner.routes = [];
  state.routePlanner.selectedRouteId = null;
  state.routePlanner.error = "";
  refreshRouteDstSuggestions();
}

function angleFromDial(event, dialRef) {
  const rect = dialRef.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  return (Math.atan2(event.clientY - cy, event.clientX - cx) * 180) / Math.PI;
}

function showCurrentLocation() {
  if (!navigator.geolocation) {
    state.locationStatus = "disabled";
    render();
    return;
  }
  navigator.geolocation.getCurrentPosition(
    () => {
      state.locationStatus = "enabled";
      render();
    },
    () => {
      state.locationStatus = "disabled";
      render();
    },
    { enableHighAccuracy: true, timeout: 6000 },
  );
}

function toggleHideOption(key) {
  state.hideOptions[key] = !state.hideOptions[key];
  if (key === "ui" && state.hideOptions.ui) {
    state.sideMenuOpen = false;
  }
  render();
}

function toggleMenu(key) {
  state.expandedMenus[key] = !state.expandedMenus[key];
  render();
}

function signOut() {
  localStorage.removeItem("jwt_token");
  localStorage.removeItem("points_app_session");
  render();
}

function restoreUi() {
  if (state.hideOptions.ui) {
    state.hideOptions.ui = false;
    render();
  }
}

function render() {
  const root = document.getElementById("appRoot");
  const activeElement = document.activeElement;
  const priorFocus =
    activeElement && ["searchInput", "routeSrcInput", "routeDstInput"].includes(activeElement.id)
      ? {
          id: activeElement.id,
          selectionStart: activeElement.selectionStart,
          selectionEnd: activeElement.selectionEnd,
        }
      : null;
  const cameraViewport = getCameraViewportState();
  const boundsViewport = getBoundsViewport();
  const visibleCamera = getVisibleCamera();
  const results = getResults();
  const routeSrcSuggestions = state.routePlanner.src.trim() && !state.routePlanner.srcConfirmed
    ? state.routePlanner.srcSuggestions
    : [];
  const routeDstSuggestions = state.routePlanner.dst.trim() && !state.routePlanner.dstConfirmed
    ? state.routePlanner.dstSuggestions
    : [];
  const selectedRoute = getSelectedRoute();
  const routeFloorSequence = getRouteFloorSequence(selectedRoute);
  const floorRouteNodes = state.mode === "map" ? getRouteNodesForFloor(selectedRoute, state.activeFloor) : [];
  const floorRouteStartNode = floorRouteNodes[0] || null;
  const floorRouteEndNode = floorRouteNodes[floorRouteNodes.length - 1] || null;
  const upcomingRouteFloor = getUpcomingRouteFloor(selectedRoute, state.activeFloor);
  const transitionNodeIsStair = isTransitionNode(floorRouteEndNode, selectedRoute, state.activeFloor);
  const activeFloorData =
    COM1_FLOORS.find((floor) => floor.id === state.activeFloor) || COM1_FLOORS[1];
  const account = getAccountState();
  const visibleUi = !state.hideOptions.ui;
  const showRoutePlanner = !!state.activeResult && visibleCamera.zoom >= 0.85;
  const floorShift = visibleUi && showRoutePlanner && state.windowSize.width > 960 ? 210 : 0;
  const bearing = normalizeBearing(visibleCamera.bearing);
  const mapTransform =
    `translate(${boundsViewport.width / 2}px, ${boundsViewport.height / 2}px) ` +
    `rotate(${visibleCamera.bearing}deg) scale(${visibleCamera.zoom}) ` +
    `translate(${-visibleCamera.centerX}px, ${-visibleCamera.centerY}px)`;
  const markerAngle = ((bearing - 90) * Math.PI) / 180;
  const dialMarker =
    `transform: translate(${Math.cos(markerAngle) * 18}px, ${Math.sin(markerAngle) * 18}px);`;
  const scaleMeters = visibleCamera.zoom > 2.2 ? 125 : visibleCamera.zoom > 1.15 ? 250 : 500;
  const scaleWidth = Math.round(
    Math.min(520, Math.max(190, scaleMeters * 1.42 * visibleCamera.zoom)),
  );
  const scaleLabels = [
    0,
    scaleMeters / 8,
    scaleMeters / 4,
    scaleMeters / 2,
    (scaleMeters * 3) / 4,
    scaleMeters,
  ];
  const clickableBuildings = SEARCH_ITEMS.filter(
    (item) => item.type === "building" && item.id === "com1",
  );

  root.className = `viewer ${state.mode === "map" ? "viewer--map-page" : ""} ${
    state.sideMenuOpen ? "viewer--menu-open" : ""
  }`;

  root.innerHTML = `
    <section
      class="mapStage"
      style="left:${cameraViewport.x}px;top:${cameraViewport.y}px;width:${cameraViewport.width}px;height:${cameraViewport.height}px;"
    >
      <div
        class="mapPlane ${state.isInteracting ? "mapPlane--active" : ""}"
        style="width:${MAP.width}px;height:${MAP.height}px;transform:${mapTransform};"
      >
        <img
          class="campusMap"
          src="${MAP.src}"
          draggable="false"
          alt=""
          style="left:${-MAP.cropX}px;top:${-MAP.cropY}px;width:${MAP.sourceWidth}px;height:${MAP.sourceHeight}px;"
        />
        ${
          state.activeResult && state.activeResult.box && state.mode === "home"
            ? `<div
                class="mapHighlight mapHighlight--${state.activeResult.type}"
                style="left:${state.activeResult.box.x}px;top:${state.activeResult.box.y}px;width:${state.activeResult.box.width}px;height:${state.activeResult.box.height}px;"
              ></div>`
            : ""
        }
        ${
          state.mode === "home"
            ? clickableBuildings
                .map(
                  (building) => `<button
                  class="buildingHotspot"
                  type="button"
                  data-building-id="${building.id}"
                  aria-label="Open ${building.label} map page"
                  style="left:${building.box.x}px;top:${building.box.y}px;width:${building.box.width}px;height:${building.box.height}px;"
                ></button>`,
                )
                .join("")
            : ""
        }
      </div>
    </section>
    ${
      visibleUi
        ? `<section class="topChrome" style="left:${cameraViewport.x + 28}px;top:${
            cameraViewport.y + 18
          }px;">
            <div class="searchShell">
              <div class="searchIcon" aria-hidden="true"></div>
              <input
                id="searchInput"
                value="${escapeHtml(state.query)}"
                placeholder="Search for: Faculty, Building, Room..."
                aria-label="Search for faculty, building, or room"
              />
            </div>
            ${
              results.length > 0
                ? `<div class="resultList">
                    ${results
                      .map(
                        (item) => `<button type="button" data-result-id="${item.id}">
                          <span>${escapeHtml(getDisplayLabel(item))}</span>
                          <small>${escapeHtml(item.secondaryLabel || item.type)}</small>
                        </button>`,
                      )
                      .join("")}
                  </div>`
                : ""
            }
            <div class="quickActions">
              ${QUICK_ACTIONS.map((label) => `<button type="button">${label}</button>`).join("")}
            </div>
            ${
              showRoutePlanner
                ? `<section class="routePlannerPanel">
                    <div class="routePlannerPanel__title">Plan route</div>
                    <label class="routePlannerField">
                      <span>Src:</span>
                      <input
                        id="routeSrcInput"
                        type="text"
                        value="${escapeHtml(state.routePlanner.src)}"
                        placeholder="Enter source"
                        autocomplete="off"
                      />
                    </label>
                    ${
                      routeSrcSuggestions.length > 0
                        ? `<div class="routePlannerSuggestions">
                            ${routeSrcSuggestions
                              .map(
                                (item) => `<button type="button" data-route-src-suggestion="${item.id}">
                                  <span>${escapeHtml(getDisplayLabel(item))}</span>
                                  <small>${escapeHtml(item.secondaryLabel || item.type)}</small>
                                </button>`,
                              )
                              .join("")}
                          </div>`
                        : ""
                    }
                    <label class="routePlannerField">
                      <span>Dst:</span>
                      <input
                        id="routeDstInput"
                        type="text"
                        value="${escapeHtml(state.routePlanner.dst)}"
                        placeholder="Enter destination"
                        autocomplete="off"
                      />
                    </label>
                    ${
                      routeDstSuggestions.length > 0
                        ? `<div class="routePlannerSuggestions">
                            ${routeDstSuggestions
                              .map(
                                (item) => `<button type="button" data-route-dst-suggestion="${item.id}">
                                  <span>${escapeHtml(getDisplayLabel(item))}</span>
                                  <small>${escapeHtml(item.secondaryLabel || item.type)}</small>
                                </button>`,
                              )
                              .join("")}
                          </div>`
                        : ""
                    }
                    <button id="routePlannerGo" type="button" class="routePlannerGo">Go</button>
                    ${
                      state.routePlanner.error
                        ? `<div class="routePlannerError">${escapeHtml(state.routePlanner.error)}</div>`
                        : ""
                    }
                    ${
                      state.routePlanner.loading
                        ? `<div class="routePlannerLoading">Finding routes...</div>`
                        : ""
                    }
                    ${
                      state.routePlanner.stage === "results"
                        ? `<div class="routePlannerResults">
                            ${state.routePlanner.routes
                              .map(
                                (route) => `<button
                                  type="button"
                                  class="routePlannerResultCard ${
                                    route.routeId === state.routePlanner.selectedRouteId ? "isActive" : ""
                                  }"
                                  data-route-id="${escapeHtml(route.routeId)}"
                                >
                                  <strong>${escapeHtml(route.label)}</strong>
                                  <span>${escapeHtml(String(route.estimatedTimeMinutes))} min</span>
                                  <p>${escapeHtml(getRouteDescription(route))}</p>
                                </button>`,
                              )
                              .join("")}
                          </div>`
                        : ""
                    }
                    ${
                      state.mode === "map"
                        ? `<div class="routePlannerFloors" aria-label="Floor selector">
                            ${COM1_FLOORS.slice()
                              .reverse()
                              .map(
                                (floor) =>
                                  `<button
                                    type="button"
                                    data-floor-id="${floor.id}"
                                    class="${
                                      floor.id === state.activeFloor
                                        ? "isActive"
                                        : floor.id === upcomingRouteFloor
                                          ? "isUpcoming"
                                          : routeFloorSequence.includes(floor.id)
                                            ? "isOnRoute"
                                            : ""
                                    }"
                                  >${floor.id}</button>`,
                              )
                              .join("")}
                          </div>`
                        : ""
                    }
                  </section>`
                : ""
            }
          </section>`
        : ""
    }
    ${
      visibleUi
        ? `<aside
            class="sideMenu ${state.sideMenuOpen ? "isOpen" : ""}"
            style="left:${cameraViewport.outerX}px;top:${cameraViewport.outerY}px;width:${
            cameraViewport.menuWidth || SIDE_MENU_WIDTH
          }px;height:${cameraViewport.outerHeight}px;"
          >
            <header>
              <strong>${escapeHtml(account.username)}</strong>
              ${
                account.isGuest
                  ? `<a class="accountAction" href="/login.html">sign in</a>`
                  : `<button class="accountAction" type="button" data-account-action="sign-out">sign out</button>`
              }
            </header>
            <section class="historyBlock">
              <h2>Recent</h2>
              ${renderMenuDropdown("recentPlaces", "Places", MENU_LISTS.recentPlaces)}
              ${renderMenuDropdown("recentRoutes", "Routes", MENU_LISTS.recentRoutes)}
            </section>
            <section class="historyBlock">
              <h2>Bookmarks</h2>
              ${renderMenuDropdown("bookmarkPlaces", "Places", MENU_LISTS.bookmarkPlaces)}
              ${renderMenuDropdown("bookmarkRoutes", "Routes", MENU_LISTS.bookmarkRoutes)}
            </section>
            <section><h2>Settings</h2></section>
            <section>
              <h2>Route Options:</h2>
              ${ROUTE_OPTIONS.map(renderRouteOption).join("")}
            </section>
            <section>
              <h2>Hide:</h2>
              ${renderHideCheckbox("distance", "Distance Marker")}
              ${renderHideCheckbox("legend", "Building Legend")}
              ${renderHideCheckbox("compass", "Compass")}
              ${renderHideCheckbox("ui", "UI")}
              <p class="escHint">(Press Esc to exit)</p>
            </section>
          </aside>`
        : ""
    }
    ${
      visibleUi
        ? `<button
            id="menuHandle"
            class="menuHandle"
            type="button"
            aria-label="${state.sideMenuOpen ? "Close side menu" : "Open side menu"}"
            style="left:${state.sideMenuOpen ? cameraViewport.x - 1 : cameraViewport.outerX}px;top:${
            cameraViewport.y + cameraViewport.height / 2 - 28
          }px;"
          >${state.sideMenuOpen ? "<<" : ">>"}</button>`
        : ""
    }
    ${
      visibleUi
        ? `<button
            id="locateButton"
            class="locateButton locateButton--${state.locationStatus}"
            style="left:${cameraViewport.x + cameraViewport.width - 52}px;top:${
            cameraViewport.y + cameraViewport.height - 58
          }px;"
            type="button"
            aria-label="Use current location"
          ><span></span></button>`
        : ""
    }
    ${
      visibleUi && !state.hideOptions.compass
        ? `<button
            id="compassButton"
            class="compassButton"
            type="button"
            aria-label="Rotate to true north"
            style="left:${cameraViewport.x + cameraViewport.width - 62}px;top:${
            cameraViewport.y + 24
          }px;"
          >
            <span class="compassNeedle" style="transform:rotate(${-bearing}deg);">^</span>
            <strong>N</strong>
          </button>
          <div
            id="rotationDial"
            class="rotationDial"
            style="left:${cameraViewport.x + cameraViewport.width - 52}px;top:${
            cameraViewport.y + cameraViewport.height - 104
          }px;"
            role="slider"
            aria-label="Rotate map"
            aria-valuemin="0"
            aria-valuemax="360"
            aria-valuenow="${Math.round(bearing)}"
          >
            <span class="torusRing"></span>
            <span class="dialMarker" style="${dialMarker}"></span>
          </div>`
        : ""
    }
    ${
      visibleUi && !state.hideOptions.distance
        ? `<div
            class="scaleOverlay"
            style="left:${cameraViewport.x + 34}px;top:${
            cameraViewport.y + cameraViewport.height - 68
          }px;width:${scaleWidth}px;"
          >
            <div class="scaleLine">
              ${scaleLabels
                .map(
                  (label) =>
                    `<span style="left:${(label / scaleMeters) * 100}%"></span>`,
                )
                .join("")}
            </div>
            <div class="scaleLabels">
              ${scaleLabels
                .map(
                  (label) =>
                    `<span style="left:${(label / scaleMeters) * 100}%">${
                      Number.isInteger(label) ? label : label.toFixed(1)
                    }</span>`,
                )
                .join("")}
              <strong>Meters</strong>
            </div>
          </div>`
        : ""
    }
    ${
      visibleUi && !state.hideOptions.legend
        ? `<div
            class="legendOverlay"
            style="left:${cameraViewport.x + cameraViewport.width - 274}px;top:${
            cameraViewport.y + cameraViewport.height - 174
          }px;"
          >
            ${LEGEND_ITEMS.map(
              ([label, color]) =>
                `<div><span style="background:${color}"></span><p>${escapeHtml(label)}</p></div>`,
            ).join("")}
          </div>`
        : ""
    }
    ${
      !visibleUi
        ? `<div class="uiHiddenPrompt">Press Esc to show UI. On mobile, double tap the screen to show UI.</div>`
        : ""
    }
    ${
      state.mode === "map"
        ? `<section
            id="floorOverlay"
            class="floorOverlay"
            style="left:${cameraViewport.x}px;top:${cameraViewport.y}px;width:${cameraViewport.width}px;height:${cameraViewport.height}px;--floor-shift:${floorShift}px;"
          >
            <div class="floorSheet">
              <div class="floorViewport">
                <img src="${activeFloorData.img}" draggable="false" alt="" />
                ${
                  state.activeRoom &&
                  state.activeRoom.floor === state.activeFloor
                    ? state.activeRoom.roomBox
                      ? `<div
                          class="roomHighlight"
                          style="left:${(state.activeRoom.roomBox.x / activeFloorData.width) * 100}%;top:${
                          (state.activeRoom.roomBox.y / activeFloorData.height) * 100
                        }%;width:${(state.activeRoom.roomBox.width / activeFloorData.width) * 100}%;height:${
                          (state.activeRoom.roomBox.height / activeFloorData.height) * 100
                        }%;"
                        ></div>`
                      : state.activeRoom.nodePoint
                        ? `<div
                            class="roomHighlight"
                            style="left:calc(${(state.activeRoom.nodePoint.x / activeFloorData.width) * 100}% - 16px);top:calc(${
                            (state.activeRoom.nodePoint.y / activeFloorData.height) * 100
                          }% - 16px);width:32px;height:32px;border-radius:999px;"
                          ></div>`
                        : ""
                    : ""
                }
                ${
                  floorRouteNodes.length > 0
                    ? `<svg class="floorRouteOverlay" viewBox="0 0 ${activeFloorData.width} ${activeFloorData.height}" preserveAspectRatio="none">
                        ${
                          floorRouteNodes.length > 1
                            ? `<polyline
                                points="${floorRouteNodes.map((node) => `${node.x},${node.y}`).join(" ")}"
                                fill="none"
                                stroke="#1277d4"
                                stroke-width="18"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                opacity="0.95"
                              />`
                            : ""
                        }
                        ${
                          floorRouteStartNode
                            ? `<circle
                                cx="${floorRouteStartNode.x}"
                                cy="${floorRouteStartNode.y}"
                                r="18"
                                fill="#facc15"
                                stroke="#ffffff"
                                stroke-width="8"
                              />
                              <g transform="translate(${floorRouteStartNode.x}, ${floorRouteStartNode.y - 44})">
                                <rect
                                  x="-82"
                                  y="-22"
                                  width="164"
                                  height="28"
                                  rx="8"
                                  fill="rgba(15, 23, 42, 0.92)"
                                />
                                <text
                                  x="0"
                                  y="-4"
                                  text-anchor="middle"
                                  fill="#ffffff"
                                  font-size="14"
                                  font-weight="700"
                                >${escapeHtml(floorRouteStartNode.label || "Start")}</text>
                              </g>`
                            : ""
                        }
                        ${
                          floorRouteEndNode && floorRouteEndNode !== floorRouteStartNode
                            ? transitionNodeIsStair
                              ? `<circle
                                  cx="${floorRouteEndNode.x}"
                                  cy="${floorRouteEndNode.y}"
                                  r="18"
                                  fill="#facc15"
                                  stroke="#ffffff"
                                  stroke-width="8"
                                />
                                <g transform="translate(${floorRouteEndNode.x}, ${floorRouteEndNode.y - 44})">
                                  <rect
                                    x="-86"
                                    y="-22"
                                    width="172"
                                    height="28"
                                    rx="8"
                                    fill="rgba(15, 23, 42, 0.92)"
                                  />
                                  <text
                                    x="0"
                                    y="-4"
                                    text-anchor="middle"
                                    fill="#ffffff"
                                    font-size="14"
                                    font-weight="700"
                                  >${escapeHtml(`Go to ${upcomingRouteFloor}`)}</text>
                                </g>`
                              : `<circle
                                  cx="${floorRouteEndNode.x}"
                                  cy="${floorRouteEndNode.y}"
                                  r="18"
                                  fill="#22c55e"
                                  stroke="#ffffff"
                                  stroke-width="8"
                                />`
                            : ""
                        }
                      </svg>`
                    : ""
                }
              </div>
            </div>
          </section>`
        : ""
    }
  `;

  bindEvents(root, cameraViewport, visibleCamera);

  if (priorFocus) {
    const nextFocus = root.querySelector(`#${priorFocus.id}`);
    if (nextFocus) {
      nextFocus.focus();
      nextFocus.setSelectionRange(priorFocus.selectionStart, priorFocus.selectionEnd);
    }
  }
}

function renderMenuDropdown(id, label, items) {
  const expanded = !!state.expandedMenus[id];
  return `
    <div class="menuDropdown ${expanded ? "isExpanded" : ""}">
      <button type="button" data-toggle-menu="${id}">
        <span>${expanded ? "▼" : "➤"}</span>${label}
      </button>
      ${
        expanded
          ? `<div class="menuDropdownList ${items.length > 10 ? "isScrollable" : ""}">
              ${items.map((item) => `<button type="button">${escapeHtml(item)}</button>`).join("")}
            </div>`
          : ""
      }
    </div>
  `;
}

function renderRouteOption(label) {
  return `<label><input type="checkbox" data-route-option="${escapeHtml(label)}" ${
    state.routeOptions[label] ? "checked" : ""
  } /><span>${escapeHtml(label)}</span></label>`;
}

function renderHideCheckbox(key, label) {
  return `<label><input type="checkbox" data-hide-key="${key}" ${
    state.hideOptions[key] ? "checked" : ""
  } /><span>${escapeHtml(label)}</span></label>`;
}

function bindEvents(root, cameraViewport, visibleCamera) {
  const mapStage = root.querySelector(".mapStage");
  const floorOverlay = root.querySelector("#floorOverlay");
  const floorSheet = root.querySelector(".floorSheet");
  const searchInput = root.querySelector("#searchInput");
  const routeSrcInput = root.querySelector("#routeSrcInput");
  const routeDstInput = root.querySelector("#routeDstInput");
  const routePlannerGo = root.querySelector("#routePlannerGo");
  const menuHandle = root.querySelector("#menuHandle");
  const locateButton = root.querySelector("#locateButton");
  const compassButton = root.querySelector("#compassButton");
  const rotationDial = root.querySelector("#rotationDial");

  root.ondblclick = restoreUi;

  if (searchInput) {
    searchInput.addEventListener("input", (event) => {
      state.query = event.target.value;
      state.searchCommitted = false;
      state.activeResult = null;
      state.routePlanner.stage = "input";
      state.routePlanner.srcConfirmed = false;
      refreshSearchResults();
    });

    searchInput.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      const normalized = normalize(state.query);
      const exact = getResults().find((item) =>
        getSearchTerms(item).some((value) => normalize(value) === normalized),
      );
      if (exact) {
        selectResult(exact);
        return;
      }
      const first = getResults()[0];
      if (first) selectResult(first);
    });
  }

  root.querySelectorAll("[data-result-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const item = getResults().find((entry) => entry.id === button.dataset.resultId);
      if (item) selectResult(item);
    });
  });

  root.querySelectorAll("[data-route-src-suggestion]").forEach((button) => {
    button.addEventListener("click", () => {
      const item = state.routePlanner.srcSuggestions.find(
        (entry) => entry.id === button.dataset.routeSrcSuggestion,
      );
      if (!item) return;
      state.routePlanner.src = getDisplayLabel(item);
      state.routePlanner.srcConfirmed = true;
      state.routePlanner.srcSelection = item;
      state.routePlanner.srcSuggestions = [];
      render();
    });
  });

  root.querySelectorAll("[data-route-dst-suggestion]").forEach((button) => {
    button.addEventListener("click", () => {
      const item = state.routePlanner.dstSuggestions.find(
        (entry) => entry.id === button.dataset.routeDstSuggestion,
      );
      if (!item) return;
      state.routePlanner.dst = getDisplayLabel(item);
      state.routePlanner.dstConfirmed = true;
      state.routePlanner.dstSelection = item;
      state.routePlanner.dstSuggestions = [];
      render();
    });
  });

  root.querySelectorAll("[data-route-id]").forEach((button) => {
    button.addEventListener("click", () => {
      state.routePlanner.selectedRouteId = button.dataset.routeId;
      openSelectedRouteFloor(getSelectedRoute());
      render();
    });
  });

  root.querySelectorAll("[data-building-id]").forEach((button) => {
    button.addEventListener("pointerdown", (event) => event.stopPropagation());
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const item = SEARCH_ITEMS.find((entry) => entry.id === button.dataset.buildingId);
      if (!item) return;
      selectResult(item);
      state.mode = "map";
      state.activeFloor = "L1";
      render();
    });
  });

  root.querySelectorAll("[data-toggle-menu]").forEach((button) => {
    button.addEventListener("click", () => toggleMenu(button.dataset.toggleMenu));
  });

  root.querySelectorAll("[data-hide-key]").forEach((checkbox) => {
    checkbox.addEventListener("change", () => toggleHideOption(checkbox.dataset.hideKey));
  });

  root.querySelectorAll("[data-route-option]").forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      state.routeOptions[checkbox.dataset.routeOption] = checkbox.checked;
    });
  });

  root.querySelectorAll("[data-account-action=\"sign-out\"]").forEach((button) => {
    button.addEventListener("click", signOut);
  });

  if (routeSrcInput) {
    routeSrcInput.addEventListener("input", (event) => {
      setRoutePlannerSrc(event.target.value);
    });
    routeSrcInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        state.routePlanner.srcConfirmed = true;
        submitRoutePlanner();
      }
    });
  }

  if (routeDstInput) {
    routeDstInput.addEventListener("input", (event) => {
      setRoutePlannerDst(event.target.value);
    });
    routeDstInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        state.routePlanner.dstConfirmed = true;
        submitRoutePlanner();
      }
    });
  }

  if (routePlannerGo) {
    routePlannerGo.addEventListener("click", () => {
      state.routePlanner.srcConfirmed = true;
      submitRoutePlanner();
    });
  }

  root.querySelectorAll("[data-floor-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const requestedFloor = button.dataset.floorId;
      const selectedRoute = getSelectedRoute();
      if (selectedRoute && requestedFloor === state.activeFloor) {
        state.activeFloor = getNextRouteFloor(selectedRoute, state.activeFloor) || requestedFloor;
      } else {
        state.activeFloor = requestedFloor;
      }
      render();
    });
  });

  if (menuHandle) {
    menuHandle.addEventListener("click", () => {
      state.sideMenuOpen = !state.sideMenuOpen;
      render();
    });
  }

  if (locateButton) {
    locateButton.addEventListener("click", showCurrentLocation);
  }

  if (compassButton) {
    compassButton.addEventListener("click", () => {
      state.isInteracting = false;
      setCameraFromUpdater(
        (current) => ({
          ...current,
          bearing: current.bearing + shortestDelta(current.bearing, 0),
        }),
        false,
      );
      render();
    });
  }

  if (rotationDial) {
    rotationDial.addEventListener("pointerdown", (event) => {
      rotationDial.setPointerCapture(event.pointerId);
      state.dialDrag = {
        pointerId: event.pointerId,
        angle: angleFromDial(event, rotationDial),
        bearing: visibleCamera.bearing,
      };
      state.isInteracting = true;
      state.isDialDragging = true;
      render();
    });

    rotationDial.addEventListener("pointermove", (event) => {
      const drag = state.dialDrag;
      if (!drag || drag.pointerId !== event.pointerId) return;
      const nextBearing = drag.bearing + angleFromDial(event, rotationDial) - drag.angle;
      setCameraFromUpdater((current) => ({ ...current, bearing: nextBearing }), true);
      render();
    });

    const endDial = () => {
      if (!state.dialDrag) return;
      state.dialDrag = null;
      state.isInteracting = false;
      state.isDialDragging = false;
      setCamera(state.camera);
      render();
    };

    rotationDial.addEventListener("pointerup", endDial);
    rotationDial.addEventListener("pointercancel", endDial);
  }

  if (mapStage) {
    mapStage.addEventListener("pointerdown", (event) => {
      if (event.button !== undefined && event.button !== 0) return;
      mapStage.setPointerCapture(event.pointerId);
      state.drag = {
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        camera: visibleCamera,
      };
      state.isInteracting = true;
      render();
    });

    mapStage.addEventListener("pointermove", (event) => {
      const drag = state.drag;
      if (!drag || drag.pointerId !== event.pointerId) return;
      const delta = screenDeltaToMap(
        event.clientX - drag.x,
        event.clientY - drag.y,
        drag.camera.bearing,
        drag.camera.zoom,
      );
      setCamera(
        {
          ...drag.camera,
          centerX: drag.camera.centerX - delta.x,
          centerY: drag.camera.centerY - delta.y,
        },
        true,
      );
      render();
    });

    const endPan = () => {
      if (!state.drag) return;
      state.drag = null;
      state.isInteracting = false;
      setCamera(state.camera);
      render();
    };

    mapStage.addEventListener("pointerup", endPan);
    mapStage.addEventListener("pointercancel", endPan);

    mapStage.addEventListener(
      "wheel",
      (event) => {
        event.preventDefault();
        const pointer = { x: event.clientX, y: event.clientY };
        const before = screenToMap(pointer, visibleCamera, cameraViewport);
        const minZoom = minZoomFor(getBoundsViewport(), visibleCamera.bearing);
        const nextZoom = Math.min(
          4.8,
          Math.max(minZoom, visibleCamera.zoom * (event.deltaY < 0 ? 1.16 : 0.86)),
        );
        const afterDelta = screenDeltaToMap(
          pointer.x - (cameraViewport.x + cameraViewport.width / 2),
          pointer.y - (cameraViewport.y + cameraViewport.height / 2),
          visibleCamera.bearing,
          nextZoom,
        );
        setCamera({
          ...visibleCamera,
          zoom: nextZoom,
          centerX: before.x - afterDelta.x,
          centerY: before.y - afterDelta.y,
        });
        render();
      },
      { passive: false },
    );
  }

  if (floorOverlay) {
    floorOverlay.addEventListener("click", () => {
      state.mode = "home";
      render();
    });
  }

  if (floorSheet) {
    floorSheet.addEventListener("click", (event) => event.stopPropagation());
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

window.addEventListener("resize", () => {
  state.windowSize = { width: window.innerWidth, height: window.innerHeight };
  setCamera(state.camera);
  render();
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    state.hideOptions.ui = false;
    render();
  }
});

window.addEventListener("storage", (event) => {
  if (event.key === "jwt_token" || event.key === "points_app_session") {
    render();
  }
});

state.camera = constrainCamera(
  {
    centerX: MAP.width / 2,
    centerY: MAP.height / 2,
    zoom: 0.42,
    bearing: 0,
  },
  { width: window.innerWidth, height: window.innerHeight },
);

render();
