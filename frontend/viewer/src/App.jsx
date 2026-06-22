import { useEffect, useMemo, useState } from "react";
import { campusConfig } from "./mapData";

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function floorLabel(level) {
  if (level === 0) {
    return "B1";
  }
  return `L${level}`;
}

function routeSummary(route) {
  if (!route?.pathNodes?.length) {
    return "No path data";
  }

  const floors = [...new Set(route.pathNodes.map((node) => floorLabel(node.floorLevel)))];
  return `${route.pathNodes.length} nodes • ${floors.join(" / ")}`;
}

function getAliases(option) {
  return Array.isArray(option?.aliases) ? option.aliases : [];
}

function getNodeSearchTerms(option) {
  return [option?.label, option?.dualLabel, option?.secondaryLabel, ...getAliases(option)];
}

function getNodeDisplayTitle(option) {
  return option?.dualLabel || option?.label || "";
}

function getNodeDisplaySubtitle(option) {
  const primary = option?.label && option?.dualLabel && option.label !== option.dualLabel
    ? option.label
    : null;
  return [primary, option?.secondaryLabel].filter(Boolean).join(" • ");
}

function compareNodeSuggestions(a, b, term) {
  const aTitle = normalize(getNodeDisplayTitle(a));
  const bTitle = normalize(getNodeDisplayTitle(b));
  const aLabel = normalize(a?.label);
  const bLabel = normalize(b?.label);
  const aIsRoom = a?.nodeType === "Room";
  const bIsRoom = b?.nodeType === "Room";
  const aExact = aTitle === term || aLabel === term;
  const bExact = bTitle === term || bLabel === term;
  const aStarts = aTitle.startsWith(term) || aLabel.startsWith(term);
  const bStarts = bTitle.startsWith(term) || bLabel.startsWith(term);

  if (aExact !== bExact) {
    return aExact ? -1 : 1;
  }
  if (aStarts !== bStarts) {
    return aStarts ? -1 : 1;
  }
  if (aIsRoom !== bIsRoom) {
    return aIsRoom ? -1 : 1;
  }
  return aTitle.localeCompare(bTitle);
}

export default function App() {
  const buildingKeys = Object.keys(campusConfig?.buildings || {});
  const [activeBuilding, setActiveBuilding] = useState(buildingKeys[0] || "");
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(0.4);
  const [offset, setOffset] = useState({ x: 50, y: 50 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [currentHeight, setCurrentHeight] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchNodeResults, setSearchNodeResults] = useState([]);
  const [buildingNodes, setBuildingNodes] = useState([]);
  const [nodesLoading, setNodesLoading] = useState(false);
  const [nodesError, setNodesError] = useState("");
  const [srcQuery, setSrcQuery] = useState("");
  const [srcNodeResults, setSrcNodeResults] = useState([]);
  const [dstQuery, setDstQuery] = useState("");
  const [dstNodeResults, setDstNodeResults] = useState([]);
  const [srcNode, setSrcNode] = useState(null);
  const [dstNode, setDstNode] = useState(null);
  const [routeOptions, setRouteOptions] = useState([]);
  const [activeRouteId, setActiveRouteId] = useState("");
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState("");
  const [imageSizes, setImageSizes] = useState({});

  const activeBuildingConfig = campusConfig.buildings[activeBuilding];

  const flyToBuilding = (key) => {
    const building = campusConfig.buildings[key];
    if (!building) {
      return;
    }

    const targetZoom = 1.0;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    setOffset({
      x: viewportWidth / 2 / targetZoom - (building.anchor.x + building.anchor.width / 2),
      y: viewportHeight / 2 / targetZoom - (building.anchor.y + building.anchor.height / 2),
    });

    setZoom(targetZoom);
    setActiveBuilding(key);
    setCurrentHeight(building.floors.find((floor) => floor.height === 1)?.height ?? building.floors[0]?.height ?? 0);
    setSearchQuery("");
  };

  useEffect(() => {
    if (!activeBuildingConfig) {
      return;
    }

    let isCancelled = false;
    const controller = new AbortController();

    async function loadNodes() {
      setNodesLoading(true);
      setNodesError("");
      setRouteError("");
      setRouteOptions([]);
      setActiveRouteId("");
      setSrcNode(null);
      setDstNode(null);
      setSrcQuery("");
      setDstQuery("");

      try {
        const response = await fetch(
          `/api/routes/buildings/${encodeURIComponent(activeBuildingConfig.apiBuildingQuery || activeBuilding)}/nodes`,
          { signal: controller.signal },
        );
        const payload = await response.json().catch(() => []);

        if (!response.ok) {
          throw new Error(payload?.error || "Unable to load building nodes.");
        }

        if (!isCancelled) {
          setBuildingNodes(Array.isArray(payload) ? payload : []);
        }
      } catch (error) {
        if (!isCancelled && error.name !== "AbortError") {
          setBuildingNodes([]);
          setNodesError(error.message || "Unable to load building nodes.");
        }
      } finally {
        if (!isCancelled) {
          setNodesLoading(false);
        }
      }
    }

    loadNodes();

    return () => {
      isCancelled = true;
      controller.abort();
    };
  }, [activeBuilding, activeBuildingConfig]);

  useEffect(() => {
    const term = searchQuery.trim();
    if (term.length < 2) {
      setSearchNodeResults([]);
      return;
    }

    const controller = new AbortController();
    const buildingQuery = activeBuildingConfig?.apiBuildingQuery || activeBuilding;

    async function loadSearchNodes() {
      try {
        const response = await fetch(
          `/api/routes/nodes/search?query=${encodeURIComponent(term)}&buildingQuery=${encodeURIComponent(buildingQuery)}`,
          { signal: controller.signal },
        );
        const payload = await response.json().catch(() => []);
        if (!response.ok) {
          throw new Error("Unable to search nodes.");
        }
        setSearchNodeResults(Array.isArray(payload) ? payload : []);
      } catch (error) {
        if (error.name !== "AbortError") {
          setSearchNodeResults([]);
        }
      }
    }

    loadSearchNodes();
    return () => controller.abort();
  }, [activeBuilding, activeBuildingConfig, searchQuery]);

  useEffect(() => {
    const term = srcQuery.trim();
    if (term.length < 1 || srcNode) {
      setSrcNodeResults([]);
      return;
    }

    const controller = new AbortController();
    const buildingQuery = activeBuildingConfig?.apiBuildingQuery || activeBuilding;

    async function loadSourceSuggestions() {
      try {
        const response = await fetch(
          `/api/routes/nodes/search?query=${encodeURIComponent(term)}&buildingQuery=${encodeURIComponent(buildingQuery)}`,
          { signal: controller.signal },
        );
        const payload = await response.json().catch(() => []);
        if (!response.ok) {
          throw new Error("Unable to search source nodes.");
        }
        setSrcNodeResults(Array.isArray(payload) ? payload : []);
      } catch (error) {
        if (error.name !== "AbortError") {
          setSrcNodeResults([]);
        }
      }
    }

    loadSourceSuggestions();
    return () => controller.abort();
  }, [activeBuilding, activeBuildingConfig, srcNode, srcQuery]);

  useEffect(() => {
    const term = dstQuery.trim();
    if (term.length < 1 || dstNode) {
      setDstNodeResults([]);
      return;
    }

    const controller = new AbortController();
    const buildingQuery = activeBuildingConfig?.apiBuildingQuery || activeBuilding;

    async function loadDestinationSuggestions() {
      try {
        const response = await fetch(
          `/api/routes/nodes/search?query=${encodeURIComponent(term)}&buildingQuery=${encodeURIComponent(buildingQuery)}`,
          { signal: controller.signal },
        );
        const payload = await response.json().catch(() => []);
        if (!response.ok) {
          throw new Error("Unable to search destination nodes.");
        }
        setDstNodeResults(Array.isArray(payload) ? payload : []);
      } catch (error) {
        if (error.name !== "AbortError") {
          setDstNodeResults([]);
        }
      }
    }

    loadDestinationSuggestions();
    return () => controller.abort();
  }, [activeBuilding, activeBuildingConfig, dstNode, dstQuery]);

  const handleMouseMove = (event) => {
    if (!isDragging) {
      return;
    }

    const dx = event.clientX - lastMousePos.x;
    const dy = event.clientY - lastMousePos.y;
    const radians = (rotation * Math.PI) / 180;

    const worldDx = (dx * Math.cos(radians) + dy * Math.sin(radians)) / zoom;
    const worldDy = (dy * Math.cos(radians) - dx * Math.sin(radians)) / zoom;

    setOffset((previous) => ({ x: previous.x + worldDx, y: previous.y + worldDy }));
    setLastMousePos({ x: event.clientX, y: event.clientY });
  };

  const searchResults = useMemo(() => {
    const term = normalize(searchQuery);
    if (term.length < 2) {
      return [];
    }

    const buildingMatches = Object.entries(campusConfig.buildings)
      .filter(([, building]) => normalize(building.name).includes(term) || normalize(building.apiBuildingQuery).includes(term))
      .map(([key, building]) => ({
        id: `building-${key}`,
        kind: "building",
        key,
        label: building.name,
        secondaryLabel: building.apiBuildingQuery || key,
      }));

    const nodeMatches = searchNodeResults
      .filter((option) =>
        getNodeSearchTerms(option).some((value) =>
          normalize(value).includes(term),
        ),
      )
      .sort((a, b) => compareNodeSuggestions(a, b, term))
      .slice(0, 8)
      .map((option) => ({
        id: `node-${option.nodeId}`,
        kind: "node",
        node: option,
        label: getNodeDisplayTitle(option),
        secondaryLabel: getNodeDisplaySubtitle(option),
      }));

    return [...buildingMatches, ...nodeMatches];
  }, [searchNodeResults, searchQuery]);

  const srcSuggestions = useMemo(() => {
    const term = normalize(srcQuery);
    if (!term) {
      return [];
    }

    return srcNodeResults
      .filter((option) => {
        if (dstNode && option.nodeId === dstNode.nodeId) {
          return false;
        }

        return [option.label, option.secondaryLabel, ...getAliases(option)].some((value) =>
          normalize(value).includes(term),
        ) || getNodeSearchTerms(option).some((value) => normalize(value).includes(term));
      })
      .sort((a, b) => compareNodeSuggestions(a, b, term))
      .slice(0, 6);
  }, [dstNode, srcNodeResults, srcQuery]);

  const dstSuggestions = useMemo(() => {
    const term = normalize(dstQuery);
    if (!term) {
      return [];
    }

    return dstNodeResults
      .filter((option) => {
        if (srcNode && option.nodeId === srcNode.nodeId) {
          return false;
        }

        return [option.label, option.secondaryLabel, ...getAliases(option)].some((value) =>
          normalize(value).includes(term),
        ) || getNodeSearchTerms(option).some((value) => normalize(value).includes(term));
      })
      .sort((a, b) => compareNodeSuggestions(a, b, term))
      .slice(0, 6);
  }, [dstNodeResults, dstQuery, srcNode]);

  const activeRoute = routeOptions.find((route) => route.routeId === activeRouteId) || routeOptions[0] || null;
  const currentFloor = activeBuildingConfig?.floors.find((floor) => floor.height === currentHeight) || null;
  const currentImageSize = currentFloor ? imageSizes[currentFloor.img] : null;
  const currentFloorPathNodes = activeRoute?.pathNodes?.filter(
    (node) =>
      node.floorLevel === currentHeight &&
      Number.isFinite(node.x) &&
      Number.isFinite(node.y),
  ) || [];

  const sourceMarker =
    srcNode && srcNode.floorLevel === currentHeight && Number.isFinite(srcNode.x) && Number.isFinite(srcNode.y)
      ? srcNode
      : null;
  const targetMarker =
    dstNode && dstNode.floorLevel === currentHeight && Number.isFinite(dstNode.x) && Number.isFinite(dstNode.y)
      ? dstNode
      : null;

  async function planRoute() {
    if (!srcNode || !dstNode) {
      setRouteError("Select both source and destination first.");
      return;
    }

    setRouteLoading(true);
    setRouteError("");

    try {
      const response = await fetch("/api/routes/same-building", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceNodeId: srcNode.nodeId,
          targetNodeId: dstNode.nodeId,
        }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.error || payload?.message || "Unable to compute route.");
      }

      const routes = Array.isArray(payload.routes) ? payload.routes : [];
      setRouteOptions(routes);
      setActiveRouteId(routes[0]?.routeId || "");

      const firstFloor = routes[0]?.pathNodes?.[0]?.floorLevel;
      if (Number.isFinite(firstFloor)) {
        setCurrentHeight(firstFloor);
      }
    } catch (error) {
      setRouteOptions([]);
      setActiveRouteId("");
      setRouteError(error.message || "Unable to compute route.");
    } finally {
      setRouteLoading(false);
    }
  }

  function handleImageLoad(src, event) {
    const { naturalWidth, naturalHeight } = event.currentTarget;
    if (!naturalWidth || !naturalHeight) {
      return;
    }

    setImageSizes((previous) => {
      const existing = previous[src];
      if (existing?.width === naturalWidth && existing?.height === naturalHeight) {
        return previous;
      }

      return {
        ...previous,
        [src]: { width: naturalWidth, height: naturalHeight },
      };
    });
  }

  return (
    <div style={styles.viewport}>
      <div style={styles.uiLayer}>
        <div style={styles.leftRail}>
          <div style={styles.panel}>
            <div style={styles.panelTitle}>Find Building</div>
            <div style={styles.searchWrapper}>
              <input
                style={styles.searchInput}
                placeholder="Search buildings..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </div>
            {searchResults.length > 0 && (
              <div style={styles.resultsPanel}>
                {searchResults.map((result) => {
                  if (result.kind === "building") {
                    return (
                      <button
                        key={result.id}
                        type="button"
                        style={styles.resultItem}
                        onClick={() => flyToBuilding(result.key)}
                      >
                        <strong>{result.label}</strong>
                        <small style={styles.resultMeta}>{result.secondaryLabel}</small>
                      </button>
                    );
                  }

                  return (
                    <button
                      key={result.id}
                      type="button"
                      style={styles.resultItem}
                      onClick={() => {
                        setCurrentHeight(result.node.floorLevel);
                        setDstNode(result.node);
                        setDstQuery(getNodeDisplayTitle(result.node));
                        setSearchQuery(getNodeDisplayTitle(result.node));
                        setRouteOptions([]);
                        setActiveRouteId("");
                        setRouteError("");
                      }}
                    >
                      <strong>{result.label}</strong>
                      <small style={styles.resultMeta}>{result.secondaryLabel}</small>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div style={{ ...styles.panel, width: 320 }}>
            <div style={styles.panelTitle}>Same-Building Route</div>
            <div style={styles.routeMeta}>
              <strong>{activeBuildingConfig?.name || "No building selected"}</strong>
              <span>{nodesLoading ? "Loading nodes..." : `${buildingNodes.length} searchable nodes`}</span>
            </div>

            <label style={styles.fieldLabel}>
              <span>Source</span>
              <input
                style={styles.fieldInput}
                value={srcQuery}
                placeholder="Search room, toilet, food..."
                onChange={(event) => {
                  setSrcQuery(event.target.value);
                  setSrcNode(null);
                  setRouteOptions([]);
                  setActiveRouteId("");
                  setRouteError("");
                }}
              />
            </label>
            {!srcNode && srcSuggestions.length > 0 && (
              <div style={styles.suggestionsPanel}>
                {srcSuggestions.map((option) => (
                  <button
                    key={option.nodeId}
                    type="button"
                    style={styles.suggestionItem}
                    onClick={() => {
                      setSrcNode(option);
                      setSrcQuery(getNodeDisplayTitle(option));
                    }}
                  >
                    <strong>{getNodeDisplayTitle(option)}</strong>
                    <small>{getNodeDisplaySubtitle(option)}</small>
                  </button>
                ))}
              </div>
            )}

            <label style={styles.fieldLabel}>
              <span>Destination</span>
              <input
                style={styles.fieldInput}
                value={dstQuery}
                placeholder="Search destination..."
                onChange={(event) => {
                  setDstQuery(event.target.value);
                  setDstNode(null);
                  setRouteOptions([]);
                  setActiveRouteId("");
                  setRouteError("");
                }}
              />
            </label>
            {!dstNode && dstSuggestions.length > 0 && (
              <div style={styles.suggestionsPanel}>
                {dstSuggestions.map((option) => (
                  <button
                    key={option.nodeId}
                    type="button"
                    style={styles.suggestionItem}
                    onClick={() => {
                      setDstNode(option);
                      setDstQuery(getNodeDisplayTitle(option));
                    }}
                  >
                    <strong>{getNodeDisplayTitle(option)}</strong>
                    <small>{getNodeDisplaySubtitle(option)}</small>
                  </button>
                ))}
              </div>
            )}

            <button
              type="button"
              style={{
                ...styles.routeButton,
                opacity: routeLoading || !srcNode || !dstNode ? 0.6 : 1,
                cursor: routeLoading || !srcNode || !dstNode ? "not-allowed" : "pointer",
              }}
              onClick={planRoute}
              disabled={routeLoading || !srcNode || !dstNode}
            >
              {routeLoading ? "Finding routes..." : "Show 3 routes"}
            </button>

            {nodesError ? <div style={styles.errorText}>{nodesError}</div> : null}
            {routeError ? <div style={styles.errorText}>{routeError}</div> : null}

            {routeOptions.length > 0 && (
              <div style={styles.routeCards}>
                {routeOptions.map((route) => {
                  const isActive = route.routeId === activeRoute?.routeId;
                  return (
                    <button
                      key={route.routeId}
                      type="button"
                      style={{
                        ...styles.routeCard,
                        borderColor: isActive ? "#0a84ff" : "rgba(15, 23, 42, 0.08)",
                        boxShadow: isActive ? "0 10px 24px rgba(10,132,255,0.18)" : "none",
                      }}
                      onClick={() => {
                        setActiveRouteId(route.routeId);
                        const firstFloor = route.pathNodes?.[0]?.floorLevel;
                        if (Number.isFinite(firstFloor)) {
                          setCurrentHeight(firstFloor);
                        }
                      }}
                    >
                      <div style={styles.routeCardHeader}>
                        <strong>{route.label}</strong>
                        <span>{route.estimatedTimeMinutes.toFixed(1)} min</span>
                      </div>
                      <small>{routeSummary(route)}</small>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div style={styles.controlsContainer}>
          <div style={styles.dialBox}>
            <div style={styles.controlCaption}>ORIENTATION</div>
            <input
              type="range"
              min="0"
              max="360"
              value={rotation}
              onChange={(event) => setRotation(Number.parseInt(event.target.value, 10))}
              style={{ width: 100 }}
            />
            <div style={styles.controlValue}>{rotation}°</div>
          </div>
          <div style={styles.levelStack}>
            {(activeBuildingConfig?.floors || [])
              .slice()
              .reverse()
              .map((floor) => (
                <button
                  key={floor.id}
                  type="button"
                  onClick={() => setCurrentHeight(floor.height)}
                  style={{
                    ...styles.levelButton,
                    background: currentHeight === floor.height ? "#0a84ff" : "white",
                    color: currentHeight === floor.height ? "white" : "#334155",
                  }}
                >
                  {floor.id}
                </button>
              ))}
          </div>
        </div>
      </div>

      <div
        onMouseDown={(event) => {
          setIsDragging(true);
          setLastMousePos({ x: event.clientX, y: event.clientY });
        }}
        onMouseMove={handleMouseMove}
        onMouseUp={() => setIsDragging(false)}
        onMouseLeave={() => setIsDragging(false)}
        onWheel={(event) =>
          setZoom((previous) =>
            Math.min(Math.max(event.deltaY < 0 ? previous * 1.1 : previous * 0.9, 0.05), 4),
          )
        }
        style={{
          ...styles.mapRotator,
          transform: `rotate(${rotation}deg)`,
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            transform: `scale(${zoom}) translate(${offset.x}px, ${offset.y}px)`,
            transformOrigin: "0 0",
            transition: isDragging ? "none" : "transform 0.2s ease-out",
          }}
        >
          <img
            src="campus_map_full_version.jpg"
            style={{ display: "block", maxWidth: "none", userSelect: "none" }}
            draggable="false"
          />

          {Object.entries(campusConfig.buildings).map(([key, building]) => {
            const floor = building.floors.find((item) => item.height === currentHeight) || building.floors[0];
            const isActiveBuilding = key === activeBuilding;
            const viewBox = currentImageSize ? `0 0 ${currentImageSize.width} ${currentImageSize.height}` : undefined;
            const polylinePoints = currentFloorPathNodes.map((node) => `${node.x},${node.y}`).join(" ");

            return (
              <div
                key={key}
                style={{
                  position: "absolute",
                  left: building.anchor.x,
                  top: building.anchor.y,
                  width: building.anchor.width,
                  height: building.anchor.height,
                  transform: `rotate(${building.rotation || 0}deg)`,
                  transformOrigin: "center center",
                  pointerEvents: "none",
                }}
              >
                <img
                  src={floor.img}
                  onLoad={(event) => handleImageLoad(floor.img, event)}
                  style={{
                    width: "100%",
                    height: "100%",
                    opacity: zoom > 0.4 ? 1 : 0,
                    transition: "opacity 0.3s",
                    display: "block",
                  }}
                  draggable="false"
                />

                {isActiveBuilding && currentImageSize ? (
                  <svg
                    viewBox={viewBox}
                    style={styles.routeSvg}
                    preserveAspectRatio="none"
                  >
                    {polylinePoints ? (
                      <polyline
                        points={polylinePoints}
                        fill="none"
                        stroke="#0a84ff"
                        strokeWidth={24}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity={0.9}
                      />
                    ) : null}
                    {sourceMarker ? (
                      <circle
                        cx={sourceMarker.x}
                        cy={sourceMarker.y}
                        r={20}
                        fill="#0f172a"
                        stroke="#ffffff"
                        strokeWidth={8}
                      />
                    ) : null}
                    {targetMarker ? (
                      <circle
                        cx={targetMarker.x}
                        cy={targetMarker.y}
                        r={20}
                        fill="#0a84ff"
                        stroke="#ffffff"
                        strokeWidth={8}
                      />
                    ) : null}
                  </svg>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const styles = {
  viewport: {
    width: "100vw",
    height: "100vh",
    position: "relative",
    overflow: "hidden",
    background:
      "radial-gradient(circle at top left, rgba(10,132,255,0.24), transparent 28%), #08111f",
  },
  uiLayer: {
    position: "absolute",
    width: "100%",
    height: "100%",
    zIndex: 1000,
    pointerEvents: "none",
  },
  leftRail: {
    position: "absolute",
    top: 20,
    left: 20,
    display: "flex",
    flexDirection: "column",
    gap: 16,
    pointerEvents: "auto",
  },
  panel: {
    width: 300,
    padding: 16,
    borderRadius: 20,
    background: "rgba(255,255,255,0.94)",
    boxShadow: "0 24px 60px rgba(0,0,0,0.28)",
    backdropFilter: "blur(18px)",
  },
  panelTitle: {
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.12em",
    color: "#64748b",
    marginBottom: 12,
  },
  searchWrapper: {
    background: "#f8fafc",
    padding: "12px 14px",
    borderRadius: 14,
    border: "1px solid rgba(15, 23, 42, 0.08)",
  },
  searchInput: {
    border: "none",
    outline: "none",
    width: "100%",
    fontSize: 15,
    background: "transparent",
  },
  resultsPanel: {
    background: "white",
    borderRadius: 16,
    marginTop: 10,
    boxShadow: "0 16px 30px rgba(15, 23, 42, 0.12)",
    overflow: "hidden",
    border: "1px solid rgba(15, 23, 42, 0.06)",
  },
  resultItem: {
    width: "100%",
    padding: "14px 16px",
    border: "none",
    borderBottom: "1px solid rgba(15, 23, 42, 0.06)",
    textAlign: "left",
    background: "white",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  resultMeta: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: 600,
  },
  routeMeta: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    marginBottom: 12,
    color: "#334155",
    fontSize: 13,
  },
  fieldLabel: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    marginTop: 10,
    fontSize: 13,
    color: "#475569",
    fontWeight: 700,
  },
  fieldInput: {
    border: "1px solid rgba(15, 23, 42, 0.12)",
    outline: "none",
    borderRadius: 12,
    background: "#f8fafc",
    padding: "11px 12px",
    fontSize: 14,
  },
  suggestionsPanel: {
    marginTop: 8,
    borderRadius: 14,
    overflow: "hidden",
    border: "1px solid rgba(15, 23, 42, 0.08)",
    background: "white",
  },
  suggestionItem: {
    width: "100%",
    padding: "12px 14px",
    display: "flex",
    flexDirection: "column",
    gap: 2,
    border: "none",
    borderBottom: "1px solid rgba(15, 23, 42, 0.06)",
    textAlign: "left",
    background: "white",
    cursor: "pointer",
  },
  routeButton: {
    width: "100%",
    marginTop: 14,
    padding: "12px 14px",
    border: "none",
    borderRadius: 14,
    background: "#0a84ff",
    color: "white",
    fontWeight: 800,
    fontSize: 14,
  },
  routeCards: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    marginTop: 14,
  },
  routeCard: {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 14,
    border: "2px solid transparent",
    background: "#ffffff",
    cursor: "pointer",
    textAlign: "left",
  },
  routeCardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
    color: "#0f172a",
  },
  errorText: {
    marginTop: 10,
    color: "#b91c1c",
    fontSize: 13,
    fontWeight: 700,
  },
  controlsContainer: {
    position: "absolute",
    bottom: 30,
    right: 30,
    display: "flex",
    flexDirection: "column",
    gap: 20,
    pointerEvents: "auto",
    alignItems: "center",
  },
  dialBox: {
    background: "rgba(255,255,255,0.94)",
    padding: "14px 16px",
    borderRadius: 18,
    boxShadow: "0 18px 40px rgba(0,0,0,0.22)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 6,
  },
  controlCaption: {
    fontSize: 10,
    color: "#64748b",
    fontWeight: 800,
    letterSpacing: "0.12em",
  },
  controlValue: {
    fontWeight: 800,
    color: "#0a84ff",
  },
  levelStack: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  levelButton: {
    border: "none",
    borderRadius: 14,
    width: 56,
    height: 56,
    boxShadow: "0 14px 30px rgba(0,0,0,0.2)",
    fontWeight: 800,
    cursor: "pointer",
  },
  mapRotator: {
    width: "100%",
    height: "100%",
    position: "relative",
    transformOrigin: "center center",
    cursor: "grab",
  },
  routeSvg: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    overflow: "visible",
  },
};
