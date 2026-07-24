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

const TOUR_STORAGE_KEY = "points_app_tour_seen";
const RECENT_ROUTES_STORAGE_KEY = "points_app_recent_routes";
const RECENT_PLACES_STORAGE_KEY = "points_app_recent_places";
const BOOKMARKS_STORAGE_KEY = "points_app_bookmarks";
const MAX_RECENT_ROUTES = 10;
const MAX_RECENT_PLACES = 10;

let activeTour = null;
const DEFAULT_CAMERA = {
  centerX: MAP.width / 2,
  centerY: MAP.height / 2,
  zoom: 0.42,
  bearing: 0,
};

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

function getRecentRoutesStore() {
  try {
    const parsed = JSON.parse(localStorage.getItem(RECENT_ROUTES_STORAGE_KEY) || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function getRecentRoutes() {
  const routes = getRecentRoutesStore()[getAccountState().username];
  return Array.isArray(routes)
    ? routes
        .filter(
          (route) =>
            route &&
            typeof route === "object" &&
            typeof route.label === "string" &&
            route.label.trim() &&
            route.source &&
            route.destination,
        )
        .slice(0, MAX_RECENT_ROUTES)
    : [];
}

function recordRecentRoute(source, destination) {
  const storedSource = serializeSearchItem(source);
  const storedDestination = serializeSearchItem(destination);
  if (!getRouteNodeId(storedSource) || !getRouteNodeId(storedDestination)) return;

  const account = getAccountState();
  const store = getRecentRoutesStore();
  const existingRoutes = Array.isArray(store[account.username]) ? store[account.username] : [];
  const key = getRouteKey(storedSource, storedDestination);
  const route = {
    key,
    label: `${getDisplayLabel(storedSource)} → ${getDisplayLabel(storedDestination)}`,
    source: storedSource,
    destination: storedDestination,
  };
  store[account.username] = [
    route,
    ...existingRoutes.filter((existingRoute) => existingRoute?.key !== key),
  ].slice(0, MAX_RECENT_ROUTES);

  try {
    localStorage.setItem(RECENT_ROUTES_STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Route history is best-effort when storage is unavailable.
  }
}

function serializeSearchItem(item) {
  if (!item) return null;
  return {
    id: item.id,
    type: item.type,
    label: item.label,
    displayLabel: item.displayLabel,
    secondaryLabel: item.secondaryLabel,
    aliases: Array.isArray(item.aliases) ? item.aliases : [],
    buildingId: item.buildingId,
    floor: item.floor,
    roomBox: item.roomBox,
    nodePoint: item.nodePoint,
    routeNodeId: item.routeNodeId,
    box: item.box,
    floorData: item.floorData,
  };
}

function getRecentPlacesStore() {
  try {
    const parsed = JSON.parse(localStorage.getItem(RECENT_PLACES_STORAGE_KEY) || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function getRecentPlaces() {
  const places = getRecentPlacesStore()[getAccountState().username];
  return Array.isArray(places)
    ? places.filter((place) => place && typeof place === "object").slice(0, MAX_RECENT_PLACES)
    : [];
}

function getPlaceKey(item) {
  return `${item?.type || "place"}:${normalize(getDisplayLabel(item || { label: "" }))}`;
}

function recordRecentPlace(item) {
  const storedItem = serializeSearchItem(item);
  if (!storedItem?.label) return;

  const account = getAccountState();
  const store = getRecentPlacesStore();
  const existingPlaces = Array.isArray(store[account.username]) ? store[account.username] : [];
  const key = getPlaceKey(storedItem);
  store[account.username] = [
    storedItem,
    ...existingPlaces.filter((place) => getPlaceKey(place) !== key),
  ].slice(0, MAX_RECENT_PLACES);

  try {
    localStorage.setItem(RECENT_PLACES_STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Place history is best-effort when storage is unavailable.
  }
}

function getBookmarksStore() {
  try {
    const parsed = JSON.parse(localStorage.getItem(BOOKMARKS_STORAGE_KEY) || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function getBookmarks() {
  const accountBookmarks = getBookmarksStore()[getAccountState().username];
  return {
    places: Array.isArray(accountBookmarks?.places) ? accountBookmarks.places : [],
    routes: Array.isArray(accountBookmarks?.routes) ? accountBookmarks.routes : [],
  };
}

function saveBookmarks(bookmarks) {
  const account = getAccountState();
  const store = getBookmarksStore();
  store[account.username] = {
    places: bookmarks.places.slice(0, 30),
    routes: bookmarks.routes.slice(0, 30),
  };
  try {
    localStorage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Bookmark persistence is best-effort when storage is unavailable.
  }
}

function getRouteKey(source, destination) {
  const sourceKey = getRouteNodeId(source) || normalize(getDisplayLabel(source || { label: "" }));
  const destinationKey =
    getRouteNodeId(destination) || normalize(getDisplayLabel(destination || { label: "" }));
  return `${sourceKey}->${destinationKey}`;
}

function isPlaceBookmarked(item) {
  if (!item) return false;
  const key = getPlaceKey(item);
  return getBookmarks().places.some((bookmark) => bookmark.key === key);
}

function isRouteBookmarked(source, destination) {
  if (!source || !destination) return false;
  const key = getRouteKey(source, destination);
  return getBookmarks().routes.some((bookmark) => bookmark.key === key);
}

function togglePlaceBookmark(item) {
  const storedItem = serializeSearchItem(item);
  if (!storedItem?.label) return;
  const bookmarks = getBookmarks();
  const key = getPlaceKey(storedItem);
  const existingIndex = bookmarks.places.findIndex((bookmark) => bookmark.key === key);
  if (existingIndex >= 0) {
    bookmarks.places.splice(existingIndex, 1);
  } else {
    bookmarks.places.unshift({
      key,
      label: getDisplayLabel(storedItem),
      item: storedItem,
    });
  }
  saveBookmarks(bookmarks);
  render();
}

function toggleRouteBookmark(source, destination) {
  if (!source || !destination) return;
  const bookmarks = getBookmarks();
  const key = getRouteKey(source, destination);
  const existingIndex = bookmarks.routes.findIndex((bookmark) => bookmark.key === key);
  if (existingIndex >= 0) {
    bookmarks.routes.splice(existingIndex, 1);
  } else {
    bookmarks.routes.unshift({
      key,
      label: `${getDisplayLabel(source)} → ${getDisplayLabel(destination)}`,
      source: serializeSearchItem(source),
      destination: serializeSearchItem(destination),
    });
  }
  saveBookmarks(bookmarks);
  render();
}

function removeBookmark(type, key) {
  const bookmarks = getBookmarks();
  if (type === "place") {
    bookmarks.places = bookmarks.places.filter((bookmark) => bookmark.key !== key);
  } else if (type === "route") {
    bookmarks.routes = bookmarks.routes.filter((bookmark) => bookmark.key !== key);
  }
  saveBookmarks(bookmarks);
  render();
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
    route: null,
    loading: false,
    error: "",
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
  floorView: {
    scale: 1,
    x: 0,
    y: 0,
  },
  floorGesture: null,
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

function parsePolygonBox(polygon) {
  if (!polygon || typeof polygon !== "string") return null;
  const numbers = polygon
    .match(/-?\d+(?:\.\d+)?/g)
    ?.map(Number)
    .filter(Number.isFinite);

  if (!numbers || numbers.length < 4) return null;

  const points = [];
  for (let index = 0; index + 1 < numbers.length; index += 2) {
    points.push({ x: numbers[index], y: numbers[index + 1] });
  }

  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  if (!Number.isFinite(minX) || !Number.isFinite(maxX) || !Number.isFinite(minY) || !Number.isFinite(maxY)) {
    return null;
  }

  return {
    x: minX,
    y: minY,
    width: Math.max(24, maxX - minX),
    height: Math.max(24, maxY - minY),
  };
}

function floorDataFromResult(result) {
  const floor = floorIdFromData(result.floorLevel, result.floorImageUrl);
  const knownFloor = COM1_FLOORS.find(
    (entry) => entry.id === floor || entry.img === result.floorImageUrl || result.floorImageUrl?.endsWith(entry.img),
  );

  return {
    id: floor,
    img: result.floorImageUrl || knownFloor?.img || COM1_FLOORS[1].img,
    width: knownFloor?.width || COM1_FLOORS[1].width,
    height: knownFloor?.height || COM1_FLOORS[1].height,
  };
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

function findStaticSearchItem(item) {
  if (!item) return null;
  const terms = getSearchTerms(item).map((value) => normalize(String(value)));
  return SEARCH_ITEMS.find((entry) => {
    if (entry.type !== item.type) return false;
    return getSearchTerms(entry).some((value) => terms.includes(normalize(String(value))));
  }) || null;
}

function getBuildingQueryForItem(item) {
  if (!item) return null;
  if (item.type === "building") return item.label;
  if (item.buildingId) {
    return SEARCH_ITEMS.find((entry) => entry.id === item.buildingId)?.label || item.backendResult?.buildingName || null;
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
  return state.routePlanner.route || null;
}

function getRouteNodesForFloor(route, floorId) {
  if (!route || !Array.isArray(route.pathNodes) || !floorId) return [];
  return route.pathNodes
    .filter((node) => floorIdFromData(node.floorLevel, node.floorImageUrl) === floorId)
    .map((node) => {
      if (String(node.nodeType || "").toLowerCase() !== "room") return node;
      const roomBox = parsePolygonBox(node.polygon);
      if (!roomBox) return node;
      return {
        ...node,
        x: roomBox.x + roomBox.width / 2,
        y: roomBox.y + roomBox.height / 2,
      };
    });
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
  resetFloorView();
  state.mode = "map";
}

function resetFloorView() {
  state.floorView = { scale: 1, x: 0, y: 0 };
  state.floorGesture = null;
}

function clampFloorView(view, floorViewport) {
  const scale = Math.min(4, Math.max(1, view.scale));
  const rect = floorViewport?.getBoundingClientRect();
  if (!rect) {
    return { scale, x: view.x, y: view.y };
  }

  const maxX = Math.max(0, (rect.width * (scale - 1)) / 2);
  const maxY = Math.max(0, (rect.height * (scale - 1)) / 2);
  return {
    scale,
    x: Math.min(maxX, Math.max(-maxX, view.x)),
    y: Math.min(maxY, Math.max(-maxY, view.y)),
  };
}

function zoomFloorViewAt(nextScale, point, floorViewport) {
  const rect = floorViewport.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const current = state.floorView;
  const boundedScale = Math.min(4, Math.max(1, nextScale));
  const localX = (point.x - centerX - current.x) / current.scale;
  const localY = (point.y - centerY - current.y) / current.scale;
  state.floorView = clampFloorView(
    {
      scale: boundedScale,
      x: point.x - centerX - localX * boundedScale,
      y: point.y - centerY - localY * boundedScale,
    },
    floorViewport,
  );
}

function applyFloorView(floorContent) {
  if (!floorContent) return;
  const { scale, x, y } = state.floorView;
  floorContent.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
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

function toTypedSearchItem(result) {
  const type = String(result.type || "").toUpperCase();
  const box = parsePolygonBox(result.polygon);

  if (type === "FACULTY") {
    return {
      id: `faculty-${result.id}`,
      type: "faculty",
      label: result.label,
      secondaryLabel: result.secondaryLabel || "Faculty",
      aliases: result.aliases || [],
      box,
      backendResult: result,
    };
  }

  if (type === "BUILDING") {
    return {
      id: `building-${result.id}`,
      type: "building",
      label: result.label,
      secondaryLabel: result.secondaryLabel || "Building",
      aliases: result.aliases || [],
      box,
      floor: "L1",
      backendResult: result,
    };
  }

  if (type === "NODE") {
    const displayLabel = result.dualLabel || result.label;
    const secondaryParts = [];
    if (result.label && result.dualLabel && result.label !== result.dualLabel) {
      secondaryParts.push(result.label);
    }
    if (result.secondaryLabel) {
      secondaryParts.push(result.secondaryLabel);
    }

    const floorData = floorDataFromResult(result);
    const roomBox = parsePolygonBox(result.polygon);

    return {
      id: `node-${result.nodeId}`,
      type: "room",
      label: result.label,
      displayLabel,
      secondaryLabel: secondaryParts.join(" • "),
      aliases: uniqueBy(
        [result.dualLabel, ...(result.aliases || [])].filter(Boolean),
        (value) => normalize(String(value)),
      ),
      buildingId: result.buildingId ? `building-${result.buildingId}` : null,
      floor: floorData.id,
      floorData,
      roomBox,
      nodePoint: Number.isFinite(result.x) && Number.isFinite(result.y) ? { x: result.x, y: result.y } : null,
      routeNodeId: result.nodeId,
      backendResult: result,
    };
  }

  return null;
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

async function fetchGeneralSearch(query) {
  const params = new URLSearchParams({ query });
  const response = await fetch(`/api/search?${params.toString()}`);
  const payload = await response.json().catch(() => []);
  if (!response.ok) {
    throw new Error(payload?.error || payload?.message || "Unable to search.");
  }
  return Array.isArray(payload) ? payload.map(toTypedSearchItem).filter(Boolean) : [];
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

  fetchGeneralSearch(state.query.trim())
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
  const staticMatch = findStaticSearchItem(item);
  const resolvedItem = staticMatch
    ? { ...staticMatch, ...item, box: staticMatch.box || item.box }
    : item;
  const buildingItem = resolvedItem.type === "room"
    ? SEARCH_ITEMS.find((entry) => entry.id === resolvedItem.buildingId)
    : resolvedItem;
  resetFloorView();
  state.activeResult = buildingItem || resolvedItem;
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
    dst: getDisplayLabel(resolvedItem),
    dstConfirmed: true,
    dstSuggestions: [],
    dstRequestId: 0,
    dstSelection: resolvedItem,
    route: null,
    loading: false,
    error: "",
  };
  if (!activeTour) {
    recordRecentPlace(resolvedItem);
  }

  if (resolvedItem.type === "faculty") {
    state.mode = "home";
    state.activeRoom = null;
    if (resolvedItem.box) {
      setCamera(cameraForBox(resolvedItem.box, getBoundsViewport(), getVisibleCamera().bearing, 120));
    }
    render();
    return;
  }

  if (resolvedItem.type === "building") {
    state.mode = "home";
    state.activeRoom = null;
    state.activeFloor = resolvedItem.floor || "L1";
    if (resolvedItem.box) {
      setCamera(cameraForBox(resolvedItem.box, getBoundsViewport(), 0, 180));
    }
    render();
    return;
  }

  state.mode = "map";
  state.activeFloor = resolvedItem.floor || "L1";
  state.activeRoom = resolvedItem;
  const building = SEARCH_ITEMS.find((candidate) => candidate.id === resolvedItem.buildingId);
  if (building && building.box) {
    setCamera(cameraForBox(building.box, getBoundsViewport(), 0, 180));
  } else if (resolvedItem.box) {
    setCamera(cameraForBox(resolvedItem.box, getBoundsViewport(), 0, 180));
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

      state.routePlanner.route = payload?.route || null;
      state.routePlanner.stage = "results";
      state.routePlanner.loading = false;
      if (state.routePlanner.route) {
        recordRecentRoute(
          state.routePlanner.srcSelection,
          state.routePlanner.dstSelection,
        );
        openSelectedRouteFloor(state.routePlanner.route);
      }
      render();
    })
    .catch((error) => {
      state.routePlanner.loading = false;
      state.routePlanner.error = error.message || "Unable to compute route.";
      state.routePlanner.route = null;
      render();
    });
}

function openStoredPlace(item) {
  if (!item) return;
  state.sideMenuOpen = false;
  selectResult(item);
}

function openStoredRoute(bookmark) {
  const source = bookmark?.source;
  const destination = bookmark?.destination;
  if (!getRouteNodeId(source) || !getRouteNodeId(destination)) return;

  const buildingId = source.buildingId || destination.buildingId;
  const building = SEARCH_ITEMS.find((item) => item.id === buildingId) || getCom1Item();
  state.sideMenuOpen = false;
  if (building) {
    selectResult(building);
  }
  state.routePlanner = {
    stage: "input",
    src: getDisplayLabel(source),
    srcConfirmed: true,
    srcSuggestions: [],
    srcRequestId: 0,
    srcSelection: source,
    dst: getDisplayLabel(destination),
    dstConfirmed: true,
    dstSuggestions: [],
    dstRequestId: 0,
    dstSelection: destination,
    route: null,
    loading: false,
    error: "",
  };
  submitRoutePlanner();
}

function setRoutePlannerSrc(value) {
  state.routePlanner.src = value;
  state.routePlanner.srcConfirmed = false;
  state.routePlanner.srcSelection = null;
  state.routePlanner.stage = "input";
  state.routePlanner.route = null;
  state.routePlanner.error = "";
  refreshRouteSrcSuggestions();
}

function setRoutePlannerDst(value) {
  state.routePlanner.dst = value;
  state.routePlanner.dstConfirmed = false;
  state.routePlanner.dstSelection = null;
  state.routePlanner.stage = "input";
  state.routePlanner.route = null;
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

function getCom1Item() {
  return SEARCH_ITEMS.find((item) => item.id === "com1") || null;
}

function snapshotTourState() {
  return {
    camera: state.camera ? { ...state.camera } : null,
    query: state.query,
    searchResults: [...state.searchResults],
    searchCommitted: state.searchCommitted,
    activeResult: state.activeResult,
    mode: state.mode,
    activeFloor: state.activeFloor,
    activeRoom: state.activeRoom,
    sideMenuOpen: state.sideMenuOpen,
    routePlanner: {
      ...state.routePlanner,
      srcSuggestions: [...state.routePlanner.srcSuggestions],
      dstSuggestions: [...state.routePlanner.dstSuggestions],
    },
    hideOptions: { ...state.hideOptions },
    floorView: { ...state.floorView },
  };
}

function restoreTourState(snapshot) {
  if (!snapshot) return;
  state.camera = snapshot.camera ? { ...snapshot.camera } : state.camera;
  state.query = snapshot.query;
  state.searchResults = [...snapshot.searchResults];
  state.searchCommitted = snapshot.searchCommitted;
  state.activeResult = snapshot.activeResult;
  state.mode = snapshot.mode;
  state.activeFloor = snapshot.activeFloor;
  state.activeRoom = snapshot.activeRoom;
  state.sideMenuOpen = snapshot.sideMenuOpen;
  state.routePlanner = {
    ...snapshot.routePlanner,
    srcSuggestions: [...snapshot.routePlanner.srcSuggestions],
    dstSuggestions: [...snapshot.routePlanner.dstSuggestions],
  };
  state.hideOptions = { ...snapshot.hideOptions };
  state.floorView = snapshot.floorView ? { ...snapshot.floorView } : { scale: 1, x: 0, y: 0 };
  state.floorGesture = null;
}

function resetRoutePlannerState() {
  state.routePlanner = {
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
    route: null,
    loading: false,
    error: "",
  };
}

function resetToDefaultMap() {
  state.hideOptions.ui = false;
  state.sideMenuOpen = false;
  state.mode = "home";
  state.activeResult = null;
  state.activeRoom = null;
  state.activeFloor = "L1";
  state.query = "";
  state.searchResults = [];
  state.searchCommitted = false;
  resetFloorView();
  resetRoutePlannerState();
  setCamera(DEFAULT_CAMERA);
}

function renderForTourStep() {
  render();
}

function prepareTourStep(stepId) {
  const com1 = getCom1Item();

  if (stepId === "search") {
    resetToDefaultMap();
    renderForTourStep();
    return;
  }

  if (
    stepId === "route-overview" ||
    stepId === "route-source" ||
    stepId === "route-destination" ||
    stepId === "route-go"
  ) {
    resetToDefaultMap();
    if (com1?.box) {
      selectResult(com1);
      state.query = com1.label;
      state.searchCommitted = true;
      state.activeResult = com1;
    }
    state.mode = "home";
    state.sideMenuOpen = false;
    resetRoutePlannerState();
    renderForTourStep();
    return;
  }

  if (stepId === "route-map" || stepId === "route-floors") {
    resetToDefaultMap();
    if (com1?.box) {
      selectResult(com1);
      state.activeResult = com1;
    }
    state.mode = "map";
    state.activeFloor = stepId === "route-floors" ? "L2" : "L1";
    state.sideMenuOpen = false;
    resetRoutePlannerState();
    renderForTourStep();
  }
}

function startTutorial(force = false) {
  if (activeTour) return;

  activeTour = {
    force,
    index: 0,
    restoreSnapshot: snapshotTourState(),
    steps: [
      {
        id: "search",
        element: "#searchInput",
        title: "Search anything fast",
        description:
          "Welcome to NUS Maps. Start here by typing a faculty, building, or room, then press Enter or select a suggestion.",
      },
      {
        id: "route-overview",
        element: "#routePlannerPanel",
        title: "Open the route planner",
        description:
          "Choose a COM1 building or room from search. The route planner appears beside the map and finds indoor paths within the selected building.",
      },
      {
        id: "route-source",
        element: "#routeSrcInput",
        title: "Choose where you are starting",
        description:
          "Type the name or room number of your starting point. Select the matching location from the suggestions so the route finder can identify the exact map point.",
      },
      {
        id: "route-destination",
        element: "#routeDstInput",
        title: "Choose your destination",
        description:
          "Enter a destination in the same building, then select it from the suggestions. Both fields must be selected suggestions, not only typed text.",
      },
      {
        id: "route-go",
        element: "#routePlannerGo",
        title: "Find the path",
        description:
          "Select Go after choosing both locations. NUS Maps calculates the indoor route, opens the first floor of the path, and lists turn-by-turn directions.",
      },
      {
        id: "route-map",
        element: "#tourFloorplanSpotlight",
        title: "Follow the highlighted path",
        description:
          "The route is drawn over the indoor floorplan. Drag to pan, scroll or pinch to zoom, and follow the directions shown in the route planner.",
      },
      {
        id: "route-floors",
        element: "#tourFloorButtonsSpotlight",
        title: "Continue across floors",
        description:
          "If a route changes levels, use the floor buttons to view the next section. Route floors are marked, and the upcoming floor is highlighted when applicable.",
      },
    ],
  };

  prepareTourStep(activeTour.steps[0].id);
}

function finishTutorial() {
  if (!activeTour) return;
  const { force, restoreSnapshot } = activeTour;
  activeTour = null;
  restoreTourState(restoreSnapshot);
  if (!force) {
    localStorage.setItem(TOUR_STORAGE_KEY, "true");
  }
  render();
}

function moveTutorial(direction) {
  if (!activeTour) return;
  const nextIndex = activeTour.index + direction;
  if (nextIndex >= activeTour.steps.length) {
    finishTutorial();
    return;
  }
  activeTour.index = Math.max(0, nextIndex);
  prepareTourStep(activeTour.steps[activeTour.index].id);
}

function renderTutorialOverlay() {
  document.getElementById("tutorialOverlayRoot")?.remove();
  if (!activeTour) return;

  const step = activeTour.steps[activeTour.index];
  const target = document.querySelector(step.element);
  const rect = target?.getBoundingClientRect();
  const padding = 8;
  const overlay = document.createElement("div");
  overlay.id = "tutorialOverlayRoot";
  overlay.innerHTML = `
    <div class="tutorialShield" aria-hidden="true"></div>
    ${
      rect
        ? `<div
            class="tutorialSpotlight"
            style="left:${Math.max(4, rect.left - padding)}px;top:${Math.max(
              4,
              rect.top - padding,
            )}px;width:${Math.max(24, rect.width + padding * 2)}px;height:${Math.max(
              24,
              rect.height + padding * 2,
            )}px;"
          ></div>`
        : ""
    }
    <section class="tutorialDialog" role="dialog" aria-modal="true" aria-labelledby="tutorialTitle">
      <button class="tutorialClose" type="button" aria-label="Close tutorial">×</button>
      <span class="tutorialProgress">${activeTour.index + 1} of ${activeTour.steps.length}</span>
      <h2 id="tutorialTitle">${escapeHtml(step.title)}</h2>
      <p>${escapeHtml(step.description)}</p>
      <div class="tutorialActions">
        ${
          activeTour.index > 0
            ? `<button type="button" data-tutorial-action="back">Back</button>`
            : `<span></span>`
        }
        <button type="button" class="tutorialNext" data-tutorial-action="next">${
          activeTour.index === activeTour.steps.length - 1 ? "Done" : "Next"
        }</button>
      </div>
    </section>
  `;
  document.body.appendChild(overlay);

  overlay.querySelector(".tutorialClose")?.addEventListener("click", finishTutorial);
  overlay.querySelector("[data-tutorial-action=\"back\"]")?.addEventListener("click", () => {
    moveTutorial(-1);
  });
  overlay.querySelector("[data-tutorial-action=\"next\"]")?.addEventListener("click", () => {
    moveTutorial(1);
  });
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
  const showActiveRoomHighlight =
    !!state.activeRoom &&
    state.activeRoom.floor === state.activeFloor &&
    !state.routePlanner.loading &&
    !selectedRoute;
  const upcomingRouteFloor = getUpcomingRouteFloor(selectedRoute, state.activeFloor);
  const transitionNodeIsStair = isTransitionNode(floorRouteEndNode, selectedRoute, state.activeFloor);
  const activeFloorData =
    state.activeRoom?.floorData && state.activeRoom.floor === state.activeFloor
      ? state.activeRoom.floorData
      : COM1_FLOORS.find((floor) => floor.id === state.activeFloor) || COM1_FLOORS[1];
  const account = getAccountState();
  const recentPlaces = getRecentPlaces();
  const recentRoutes = getRecentRoutes();
  const bookmarks = getBookmarks();
  const currentPlace = state.activeRoom || state.activeResult;
  const currentPlaceIsBookmarked = isPlaceBookmarked(currentPlace);
  const currentRouteIsBookmarked = isRouteBookmarked(
    state.routePlanner.srcSelection,
    state.routePlanner.dstSelection,
  );
  const visibleUi = !state.hideOptions.ui;
  const showRoutePlanner =
    !!state.activeResult && (state.mode === "map" || visibleCamera.zoom >= 0.85);
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
              ${
                currentPlace
                  ? `<button
                      id="bookmarkPlaceButton"
                      type="button"
                      class="bookmarkPlaceButton ${currentPlaceIsBookmarked ? "isSaved" : ""}"
                      aria-label="${currentPlaceIsBookmarked ? "Remove place bookmark" : "Bookmark place"}"
                      aria-pressed="${currentPlaceIsBookmarked}"
                      title="${currentPlaceIsBookmarked ? "Remove place bookmark" : "Bookmark place"}"
                    >${currentPlaceIsBookmarked ? "Saved place" : "Save place"}</button>`
                  : ""
              }
              <button id="tourButton" type="button" class="tourButton">How to use</button>
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
            ${
              showRoutePlanner
                ? `<section id="routePlannerPanel" class="routePlannerPanel">
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
                    ${
                      state.routePlanner.stage === "results"
                        ? state.routePlanner.route
                          ? `<div class="routePlannerResults">
                              <article class="routePlannerSummary">
                                <strong>${escapeHtml(state.routePlanner.route.label)}</strong>
                                <span>${escapeHtml(String(state.routePlanner.route.estimatedTimeMinutes))} min</span>
                                <p>${escapeHtml(getRouteDescription(state.routePlanner.route))}</p>
                                <button
                                  id="bookmarkRouteButton"
                                  type="button"
                                  class="bookmarkRouteButton ${currentRouteIsBookmarked ? "isSaved" : ""}"
                                  aria-pressed="${currentRouteIsBookmarked}"
                                >${currentRouteIsBookmarked ? "Saved route" : "Save route"}</button>
                              </article>
                              <section class="routePlannerDirections">
                                <div class="routePlannerDirections__title">Directions</div>
                                ${renderRouteInstructions(state.routePlanner.route)}
                              </section>
                            </div>`
                          : ""
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
              <div class="sideMenuGroup">
                <h3>Places</h3>
                ${
                  recentPlaces.length > 0
                    ? `<ul class="sideMenuItemList">
                        ${recentPlaces
                          .map(
                            (place, index) => `<li>
                              <button type="button" data-recent-place-index="${index}">
                                ${escapeHtml(getDisplayLabel(place))}
                              </button>
                            </li>`,
                          )
                          .join("")}
                      </ul>`
                    : `<p class="sideMenuEmpty">No recent places yet.</p>`
                }
              </div>
              <div class="sideMenuGroup">
                <h3>Routes</h3>
                ${
                  recentRoutes.length > 0
                    ? `<ul class="sideMenuItemList">
                        ${recentRoutes
                          .map(
                            (route, index) => `<li>
                              <button type="button" data-recent-route-index="${index}">
                                ${escapeHtml(route.label)}
                              </button>
                            </li>`,
                          )
                          .join("")}
                      </ul>`
                    : `<p class="sideMenuEmpty">No recent routes yet.</p>`
                }
              </div>
            </section>
            <section class="bookmarksBlock">
              <h2>Bookmarks</h2>
              <div class="sideMenuGroup">
                <h3>Places</h3>
                ${
                  bookmarks.places.length > 0
                    ? `<ul class="sideMenuItemList">
                        ${bookmarks.places
                          .map(
                            (bookmark, index) => `<li>
                              <button type="button" data-bookmark-place-index="${index}">
                                ${escapeHtml(bookmark.label)}
                              </button>
                              <button
                                type="button"
                                class="removeBookmarkButton"
                                data-remove-bookmark-type="place"
                                data-remove-bookmark-key="${escapeHtml(bookmark.key)}"
                                aria-label="Remove ${escapeHtml(bookmark.label)} bookmark"
                              >×</button>
                            </li>`,
                          )
                          .join("")}
                      </ul>`
                    : `<p class="sideMenuEmpty">No bookmarked places yet.</p>`
                }
              </div>
              <div class="sideMenuGroup">
                <h3>Routes</h3>
                ${
                  bookmarks.routes.length > 0
                    ? `<ul class="sideMenuItemList">
                        ${bookmarks.routes
                          .map(
                            (bookmark, index) => `<li>
                              <button type="button" data-bookmark-route-index="${index}">
                                ${escapeHtml(bookmark.label)}
                              </button>
                              <button
                                type="button"
                                class="removeBookmarkButton"
                                data-remove-bookmark-type="route"
                                data-remove-bookmark-key="${escapeHtml(bookmark.key)}"
                                aria-label="Remove ${escapeHtml(bookmark.label)} bookmark"
                              >×</button>
                            </li>`,
                          )
                          .join("")}
                      </ul>`
                    : `<p class="sideMenuEmpty">No bookmarked routes yet.</p>`
                }
              </div>
            </section>
            <section class="hideBlock">
              <h2>Hide</h2>
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
        ? `<div
            id="tourMenuHandleSpotlight"
            class="tourSpotlightAnchor"
            aria-hidden="true"
            style="left:${cameraViewport.outerX}px;top:${
            cameraViewport.y + cameraViewport.height / 2 - 110
          }px;width:108px;height:240px;"
          ></div>`
        : ""
    }
    ${
      visibleUi
        ? `<div
            id="tourSideMenuSpotlight"
            class="tourSpotlightAnchor"
            aria-hidden="true"
            style="left:${cameraViewport.outerX}px;top:${cameraViewport.outerY}px;width:${
            cameraViewport.menuWidth || SIDE_MENU_WIDTH
          }px;height:${cameraViewport.outerHeight}px;"
          ></div>`
        : ""
    }
    ${
      visibleUi
        ? `<div
            id="tourSearchSpotlight"
            class="tourSpotlightAnchor"
            aria-hidden="true"
            style="left:${cameraViewport.x + 18}px;top:${cameraViewport.y + 10}px;width:370px;height:92px;"
          ></div>`
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
                <div
                  class="floorContent"
                  style="transform:translate(${state.floorView.x}px, ${state.floorView.y}px) scale(${state.floorView.scale});"
                >
                <img src="${activeFloorData.img}" draggable="false" alt="" />
                ${
                  showActiveRoomHighlight
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
            </div>
          </section>`
        : ""
    }
    ${
      state.mode === "map"
        ? `<div
            id="tourFloorplanSpotlight"
            class="tourSpotlightAnchor"
            aria-hidden="true"
            style="left:${cameraViewport.x + Math.max(120, cameraViewport.width * 0.21)}px;top:${
            cameraViewport.y + 86
          }px;width:${Math.min(760, cameraViewport.width * 0.58)}px;height:${Math.min(
            520,
            cameraViewport.height * 0.72,
          )}px;"
          ></div>
          <div
            id="tourFloorButtonsSpotlight"
            class="tourSpotlightAnchor"
            aria-hidden="true"
            style="left:${cameraViewport.x + 18}px;top:${cameraViewport.y + 158}px;width:352px;height:470px;"
          ></div>`
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

  renderTutorialOverlay();
}

function renderHideCheckbox(key, label) {
  return `<label><input type="checkbox" data-hide-key="${key}" ${
    state.hideOptions[key] ? "checked" : ""
  } /><span>${escapeHtml(label)}</span></label>`;
}

function renderRouteInstructions(route) {
  if (!route || !Array.isArray(route.instructions) || route.instructions.length === 0) {
    return "";
  }

  return `<div class="routePlannerDirections__body">
    <ol class="routeInstructionList">
      ${route.instructions
        .map(
          (step) => `<li>
            <strong>${escapeHtml(step.instruction)}</strong>
            ${
              Number.isFinite(step.distanceMeters)
                ? `<span>${escapeHtml(String(step.distanceMeters))} m</span>`
                : ""
            }
          </li>`,
        )
        .join("")}
    </ol>
  </div>`;
}

function bindEvents(root, cameraViewport, visibleCamera) {
  const mapStage = root.querySelector(".mapStage");
  const floorOverlay = root.querySelector("#floorOverlay");
  const floorSheet = root.querySelector(".floorSheet");
  const floorViewport = root.querySelector(".floorViewport");
  const floorContent = root.querySelector(".floorContent");
  const searchInput = root.querySelector("#searchInput");
  const routeSrcInput = root.querySelector("#routeSrcInput");
  const routeDstInput = root.querySelector("#routeDstInput");
  const routePlannerGo = root.querySelector("#routePlannerGo");
  const bookmarkPlaceButton = root.querySelector("#bookmarkPlaceButton");
  const bookmarkRouteButton = root.querySelector("#bookmarkRouteButton");
  const tourButton = root.querySelector("#tourButton");
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

  root.querySelectorAll("[data-recent-place-index]").forEach((button) => {
    button.addEventListener("click", () => {
      const place = getRecentPlaces()[Number(button.dataset.recentPlaceIndex)];
      if (place) openStoredPlace(place);
    });
  });

  root.querySelectorAll("[data-recent-route-index]").forEach((button) => {
    button.addEventListener("click", () => {
      const route = getRecentRoutes()[Number(button.dataset.recentRouteIndex)];
      if (route) openStoredRoute(route);
    });
  });

  root.querySelectorAll("[data-bookmark-place-index]").forEach((button) => {
    button.addEventListener("click", () => {
      const bookmark = getBookmarks().places[Number(button.dataset.bookmarkPlaceIndex)];
      if (bookmark?.item) openStoredPlace(bookmark.item);
    });
  });

  root.querySelectorAll("[data-bookmark-route-index]").forEach((button) => {
    button.addEventListener("click", () => {
      const bookmark = getBookmarks().routes[Number(button.dataset.bookmarkRouteIndex)];
      if (bookmark) openStoredRoute(bookmark);
    });
  });

  root.querySelectorAll("[data-remove-bookmark-type]").forEach((button) => {
    button.addEventListener("click", () => {
      removeBookmark(button.dataset.removeBookmarkType, button.dataset.removeBookmarkKey);
    });
  });

  root.querySelectorAll("[data-hide-key]").forEach((checkbox) => {
    checkbox.addEventListener("change", () => toggleHideOption(checkbox.dataset.hideKey));
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

  if (bookmarkPlaceButton) {
    bookmarkPlaceButton.addEventListener("click", () => {
      togglePlaceBookmark(state.activeRoom || state.activeResult);
    });
  }

  if (bookmarkRouteButton) {
    bookmarkRouteButton.addEventListener("click", () => {
      toggleRouteBookmark(state.routePlanner.srcSelection, state.routePlanner.dstSelection);
    });
  }

  if (tourButton) {
    tourButton.addEventListener("click", () => startTutorial(true));
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
      resetFloorView();
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
      resetFloorView();
      render();
    });
  }

  if (floorSheet) {
    floorSheet.addEventListener("click", (event) => event.stopPropagation());
  }

  if (floorViewport && floorContent) {
    const floorPointers = new Map();
    const pointerList = () => Array.from(floorPointers.values());
    const midpoint = (left, right) => ({
      x: (left.x + right.x) / 2,
      y: (left.y + right.y) / 2,
    });
    const distance = (left, right) => Math.hypot(left.x - right.x, left.y - right.y);
    const startPanGesture = (point) => {
      state.floorGesture = {
        type: "pan",
        point,
        view: { ...state.floorView },
      };
    };
    const startPinchGesture = (points) => {
      const [left, right] = points;
      state.floorGesture = {
        type: "pinch",
        distance: Math.max(1, distance(left, right)),
        midpoint: midpoint(left, right),
        view: { ...state.floorView },
      };
    };

    floorViewport.addEventListener("pointerdown", (event) => {
      if (event.button !== undefined && event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      floorViewport.setPointerCapture(event.pointerId);
      floorPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      const points = pointerList();
      if (points.length >= 2) {
        startPinchGesture(points);
      } else {
        startPanGesture(points[0]);
      }
    });

    floorViewport.addEventListener("pointermove", (event) => {
      if (!floorPointers.has(event.pointerId)) return;
      event.preventDefault();
      event.stopPropagation();
      floorPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      const points = pointerList();

      if (points.length >= 2) {
        if (!state.floorGesture || state.floorGesture.type !== "pinch") {
          startPinchGesture(points);
        }
        const gesture = state.floorGesture;
        const currentMidpoint = midpoint(points[0], points[1]);
        const nextScale = gesture.view.scale * (distance(points[0], points[1]) / gesture.distance);
        const boundedScale = Math.min(4, Math.max(1, nextScale));
        const rect = floorViewport.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const localX = (gesture.midpoint.x - centerX - gesture.view.x) / gesture.view.scale;
        const localY = (gesture.midpoint.y - centerY - gesture.view.y) / gesture.view.scale;
        state.floorView = clampFloorView(
          {
            scale: boundedScale,
            x: currentMidpoint.x - centerX - localX * boundedScale,
            y: currentMidpoint.y - centerY - localY * boundedScale,
          },
          floorViewport,
        );
      } else if (points.length === 1) {
        if (!state.floorGesture || state.floorGesture.type !== "pan") {
          startPanGesture(points[0]);
        }
        const gesture = state.floorGesture;
        state.floorView = clampFloorView(
          {
            ...gesture.view,
            x: gesture.view.x + points[0].x - gesture.point.x,
            y: gesture.view.y + points[0].y - gesture.point.y,
          },
          floorViewport,
        );
      }

      applyFloorView(floorContent);
    });

    const endFloorGesture = (event) => {
      if (!floorPointers.has(event.pointerId)) return;
      event.preventDefault();
      event.stopPropagation();
      floorPointers.delete(event.pointerId);
      const points = pointerList();
      if (points.length >= 2) {
        startPinchGesture(points);
      } else if (points.length === 1) {
        startPanGesture(points[0]);
      } else {
        state.floorGesture = null;
      }
    };

    floorViewport.addEventListener("pointerup", endFloorGesture);
    floorViewport.addEventListener("pointercancel", endFloorGesture);
    floorViewport.addEventListener(
      "wheel",
      (event) => {
        event.preventDefault();
        event.stopPropagation();
        const factor = event.deltaY < 0 ? 1.14 : 0.88;
        zoomFloorViewAt(
          state.floorView.scale * factor,
          { x: event.clientX, y: event.clientY },
          floorViewport,
        );
        applyFloorView(floorContent);
      },
      { passive: false },
    );
    floorViewport.addEventListener("dblclick", (event) => {
      event.preventDefault();
      event.stopPropagation();
      resetFloorView();
      applyFloorView(floorContent);
    });
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
    if (activeTour) {
      finishTutorial();
      return;
    }
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
  DEFAULT_CAMERA,
  { width: window.innerWidth, height: window.innerHeight },
);

render();

if (!localStorage.getItem(TOUR_STORAGE_KEY)) {
  window.setTimeout(() => startTutorial(false), 450);
}
