import React, { useState } from 'react';

// TODO: TRY MAKING INPUT VARIABLE FOR NODE & EDGE ID
// trying a global variable to determine unique node id
const startNode = 10;

// Math helper for pgRouting "cost"
const calculateDistance = (x1, y1, x2, y2) => {
  return Math.round(Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2)) * 100) / 100;
};

export default function App() {
  const [imageUrl, setImageUrl] = useState(null);
  const [mode, setMode] = useState('ADD_NODE'); 
  const [zoom, setZoom] = useState(1); 
  const [nextNodeId, setNextNodeId] = useState(startNode); // starting id is startNode
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [draftEdge, setDraftEdge] = useState(null);
  const [generatedSQL, setGeneratedSQL] = useState("");

  const handleImageUpload = (e) => {
    if (e.target.files[0]) {
      setImageUrl(URL.createObjectURL(e.target.files[0]));
      setZoom(1); 
    }
  };

  const handleSvgClick = (e) => {
    if (mode !== 'ADD_NODE') return;
    const newNode = {
      id: nextNodeId,
      x: e.nativeEvent.offsetX,
      y: e.nativeEvent.offsetY,
    };
    setNodes([...nodes, newNode]);
    setNextNodeId(nextNodeId + 1);
  };

  const startEdge = (e, node) => {
    e.stopPropagation();
    if (mode !== 'ADD_EDGE') return;
    setDraftEdge({ sourceId: node.id, startX: node.x, startY: node.y, currentX: node.x, currentY: node.y });
  };

  const updateEdge = (e) => {
    if (!draftEdge) return;
    setDraftEdge({ ...draftEdge, currentX: e.nativeEvent.offsetX, currentY: e.nativeEvent.offsetY });
  };

  const finishEdge = (e, targetNode) => {
    e.stopPropagation();
    if (!draftEdge || draftEdge.sourceId === targetNode.id) {
      setDraftEdge(null);
      return;
    }
    const cost = calculateDistance(draftEdge.startX, draftEdge.startY, targetNode.x, targetNode.y);
    setEdges([...edges, { source: draftEdge.sourceId, target: targetNode.id, cost }]);
    setDraftEdge(null);
  };

  const generateSQL = () => {
    let sql = `-- Run this in DBeaver/pgAdmin\n\n`;
    if (nodes.length > 0) {
      sql += `INSERT INTO nodes (id, floorplan_id, x_coord, y_coord) VALUES\n`;
      const nodeValues = nodes.map(n => `(${n.id}, 1, ${n.x}, ${n.y})`).join(",\n");
      sql += nodeValues + `;\n\n`;
    }
    if (edges.length > 0) {
      sql += `INSERT INTO edges (source, target, cost) VALUES\n`;
      const edgeValues = edges.map(e => `(${e.source}, ${e.target}, ${e.cost})`).join(",\n");
      sql += edgeValues + `;\n`;
    }
    setGeneratedSQL(sql);
  };

  return (
    // FIXED: Forced width to 100vw and overflow to hidden so the whole page never scrolls horizontally
    <div style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden', fontFamily: 'sans-serif' }}>
      
      {/* LEFT PANEL: The Map */}
      {/* FIXED: Added minWidth: 0 to prevent the flex item from blowing out */}
      <div style={{ flex: 1, minWidth: 0, background: '#ecf0f1', display: 'flex', flexDirection: 'column' }}>
        
        {/* TOOLBAR */}
        <div style={{ padding: '15px', background: '#bdc3c7', display: 'flex', gap: '15px', alignItems: 'center' }}>
          <input type="file" onChange={handleImageUpload} />
          <button onClick={() => setMode('ADD_NODE')} style={{ padding: '8px', cursor: 'pointer', background: mode === 'ADD_NODE' ? '#3498db' : '#ecf0f1', color: mode === 'ADD_NODE' ? 'white' : 'black', border: 'none', borderRadius: '4px' }}>Add Nodes</button>
          <button onClick={() => setMode('ADD_EDGE')} style={{ padding: '8px', cursor: 'pointer', background: mode === 'ADD_EDGE' ? '#2ecc71' : '#ecf0f1', color: mode === 'ADD_EDGE' ? 'white' : 'black', border: 'none', borderRadius: '4px' }}>Connect Edges</button>
          
          {imageUrl && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: 'auto', background: '#fff', padding: '5px 15px', borderRadius: '20px' }}>
              <span style={{ fontSize: '14px', fontWeight: 'bold' }}>Zoom: {Math.round(zoom * 100)}%</span>
              <input 
                type="range" 
                min="0.1" 
                max="2" 
                step="0.05" 
                value={zoom} 
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                style={{ cursor: 'pointer' }}
              />
            </div>
          )}
        </div>

        {/* WORKSPACE (Scrollable Area) */}
        {/* FIXED: The overflow: auto now ONLY applies to the map area, safely contained inside the left panel */}
        <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
          {imageUrl && (
            <div style={{ 
              position: 'relative', 
              display: 'inline-block', 
              border: '2px solid black',
              transform: `scale(${zoom})`,
              transformOrigin: 'top left' 
            }}>
              
              <img src={imageUrl} alt="map" draggable={false} style={{ display: 'block' }} />
              
              <svg
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', cursor: mode === 'ADD_NODE' ? 'crosshair' : 'default' }}
                onClick={handleSvgClick} onMouseMove={updateEdge} onMouseUp={() => setDraftEdge(null)} onMouseLeave={() => setDraftEdge(null)}
              >
                {edges.map((e, i) => {
                  const s = nodes.find(n => n.id === e.source);
                  const t = nodes.find(n => n.id === e.target);
                  return s && t && <line key={i} x1={s.x} y1={s.y} x2={t.x} y2={t.y} stroke="blue" strokeWidth={3 / zoom} />;
                })}
                {draftEdge && <line x1={draftEdge.startX} y1={draftEdge.startY} x2={draftEdge.currentX} y2={draftEdge.currentY} stroke="red" strokeWidth={3 / zoom} strokeDasharray={`${5/zoom},${5/zoom}`} />}
                {nodes.map(n => (
                  <circle key={n.id} cx={n.x} cy={n.y} r={6 / zoom} fill={mode === 'ADD_NODE' ? 'green' : 'orange'} 
                    onMouseDown={(e) => startEdge(e, n)} onMouseUp={(e) => finishEdge(e, n)} style={{ cursor: 'pointer' }}
                  >
                    <title>Node {n.id}</title>
                  </circle>
                ))}
              </svg>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT PANEL: The Database Bridge */}
      {/* FIXED: Hardcoded width to 350px and added flexShrink: 0 so it refuses to get squished by the left panel */}
      <div style={{ width: '350px', flexShrink: 0, background: '#2c3e50', color: 'white', padding: '20px', display: 'flex', flexDirection: 'column' }}>
        <h2>PostgreSQL Output</h2>
        <button onClick={generateSQL} style={{ padding: '10px', background: '#e74c3c', color: 'white', border: 'none', cursor: 'pointer' }}>
          Generate SQL Scripts
        </button>
        <textarea 
          readOnly 
          value={generatedSQL} 
          style={{ flex: 1, marginTop: '15px', padding: '10px', background: '#34495e', color: '#ecf0f1', fontFamily: 'monospace', resize: 'none' }}
          placeholder="Your SQL will appear here..."
        />
      </div>
    </div>
  );
}