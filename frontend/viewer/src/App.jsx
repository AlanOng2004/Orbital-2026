import { useState } from "react";
import { campusConfig } from "./mapData";

export default function App() {
  // --- CONFIG & STATE ---
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(0.4);
  const [offset, setOffset] = useState({ x: 50, y: 50 }); // Start slightly offset from top-left
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });

  const buildingKeys = Object.keys(campusConfig?.buildings || {});
  const [activeBuilding, setActiveBuilding] = useState(buildingKeys[0] || "");
  const [currentHeight, setCurrentHeight] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");

  // --- FLY TO LOGIC (THE FIX) ---
  const flyToBuilding = (key) => {
    const b = campusConfig.buildings[key];
    if (!b) return;

    const targetZoom = 1.0;
    const vW = window.innerWidth;
    const vH = window.innerHeight;

    // We calculate the exact pixels needed to put the center of the
    // building anchor in the center of the viewport.
    setOffset({
      x: vW / 2 / targetZoom - (b.anchor.x + b.anchor.width / 2),
      y: vH / 2 / targetZoom - (b.anchor.y + b.anchor.height / 2),
    });

    setZoom(targetZoom);
    setActiveBuilding(key);
    setSearchQuery("");
  };

  // --- PANNING LOGIC ---
  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const dx = e.clientX - lastMousePos.x;
    const dy = e.clientY - lastMousePos.y;
    const rad = (rotation * Math.PI) / 180;

    // Screen-to-World conversion (keeps movement natural while rotated)
    const worldDX = (dx * Math.cos(rad) + dy * Math.sin(rad)) / zoom;
    const worldDY = (dy * Math.cos(rad) - dx * Math.sin(rad)) / zoom;

    setOffset((prev) => ({ x: prev.x + worldDX, y: prev.y + worldDY }));
    setLastMousePos({ x: e.clientX, y: e.clientY });
  };

  const results =
    searchQuery.length > 1
      ? Object.entries(campusConfig.buildings).filter(([, b]) =>
          b.name.toLowerCase().includes(searchQuery.toLowerCase()),
        )
      : [];

  return (
    <div style={s.viewport}>
      {/* LAYER 1: UI (Highest Z-Index) */}
      <div style={s.uiLayer}>
        {/* Search Bar */}
        <div style={s.searchContainer}>
          <div style={s.searchWrapper}>
            <input
              style={s.searchInput}
              placeholder="Search Buildings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {results.length > 0 && (
            <div style={s.resultsPanel}>
              {results.map(([key, b]) => (
                <div
                  key={key}
                  style={s.resultItem}
                  onClick={() => flyToBuilding(key)}
                >
                  <strong>{b.name}</strong>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Controls */}
        <div style={s.controlsContainer}>
          <div style={s.dialBox}>
            <div
              style={{ fontSize: "10px", color: "#888", fontWeight: "bold" }}
            >
              ORIENTATION
            </div>
            <input
              type="range"
              min="0"
              max="360"
              value={rotation}
              onChange={(e) => setRotation(parseInt(e.target.value))}
              style={{ width: 100 }}
            />
            <div style={{ fontWeight: "bold", color: "#007AFF" }}>
              {rotation}°
            </div>
          </div>
          <div style={s.levelStack}>
            {(campusConfig.buildings[activeBuilding]?.floors || [])
              .slice()
              .reverse()
              .map((f) => (
                <button
                  key={f.id}
                  onClick={() => setCurrentHeight(f.height)}
                  style={{
                    ...s.levelBtn,
                    background:
                      currentHeight === f.height ? "#007AFF" : "white",
                    color: currentHeight === f.height ? "white" : "#333",
                  }}
                >
                  {f.id}
                </button>
              ))}
          </div>
        </div>
      </div>

      {/* LAYER 2: THE WORLD (Rotation Wrapper) */}
      <div
        onMouseDown={(e) => {
          setIsDragging(true);
          setLastMousePos({ x: e.clientX, y: e.clientY });
        }}
        onMouseMove={handleMouseMove}
        onMouseUp={() => setIsDragging(false)}
        onMouseLeave={() => setIsDragging(false)}
        onWheel={(e) =>
          setZoom((prev) =>
            Math.min(Math.max(e.deltaY < 0 ? prev * 1.1 : prev * 0.9, 0.05), 4),
          )
        }
        style={{
          ...s.mapRotator,
          transform: `rotate(${rotation}deg)`,
        }}
      >
        {/* LAYER 3: ZOOM & PAN (Offset Wrapper) */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            transform: `scale(${zoom}) translate(${offset.x}px, ${offset.y}px)`,
            transformOrigin: "0 0", // CRITICAL: Keeps coordinates matched to image pixels
            transition: isDragging ? "none" : "transform 0.2s ease-out",
          }}
        >
          {/* Base Campus Map */}
          <img
            src="campus_map_full_version.jpg"
            style={{ display: "block", maxWidth: "none", userSelect: "none" }}
            draggable="false"
          />

          {/* Building Floorplan Overlays */}
          {Object.entries(campusConfig.buildings).map(([key, b]) => (
            <div
              key={key}
              style={{
                position: "absolute",
                left: b.anchor.x,
                top: b.anchor.y,
                width: b.anchor.width,
                height: b.anchor.height,
                transform: `rotate(${b.rotation || 0}deg)`,
                transformOrigin: "center center",
                pointerEvents: "none",
              }}
            >
              <img
                src={
                  b.floors.find((f) => f.height === currentHeight)?.img ||
                  b.floors[0]?.img
                }
                style={{
                  width: "100%",
                  height: "100%",
                  opacity: zoom > 0.4 ? 1 : 0,
                  transition: "opacity 0.3s",
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const s = {
  viewport: {
    width: "100vw",
    height: "100vh",
    position: "relative",
    overflow: "hidden",
    background: "#111",
  },
  uiLayer: {
    position: "absolute",
    width: "100%",
    height: "100%",
    zIndex: 1000,
    pointerEvents: "none",
  },
  searchContainer: {
    position: "absolute",
    top: 20,
    left: 20,
    pointerEvents: "auto",
  },
  searchWrapper: {
    background: "white",
    padding: "12px 25px",
    borderRadius: "50px",
    width: "280px",
    boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
  },
  searchInput: {
    border: "none",
    outline: "none",
    width: "100%",
    fontSize: "16px",
  },
  resultsPanel: {
    background: "white",
    borderRadius: "15px",
    marginTop: "10px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
    overflow: "hidden",
  },
  resultItem: {
    padding: "15px 25px",
    borderBottom: "1px solid #eee",
    cursor: "pointer",
  },
  controlsContainer: {
    position: "absolute",
    bottom: 30,
    right: 30,
    display: "flex",
    flexDirection: "column",
    gap: "20px",
    pointerEvents: "auto",
    alignItems: "center",
  },
  dialBox: {
    background: "white",
    padding: "15px",
    borderRadius: "25px",
    textAlign: "center",
    boxShadow: "0 4px 15px rgba(0,0,0,0.2)",
  },
  levelStack: { display: "flex", flexDirection: "column", gap: "10px" },
  levelBtn: {
    width: "55px",
    height: "55px",
    borderRadius: "15px",
    border: "none",
    fontWeight: "bold",
    cursor: "pointer",
    boxShadow: "0 4px 10px rgba(0,0,0,0.3)",
  },
  mapRotator: {
    width: "100%",
    height: "100%",
    position: "absolute",
    top: 0,
    left: 0,
    cursor: "grab",
  },
};
