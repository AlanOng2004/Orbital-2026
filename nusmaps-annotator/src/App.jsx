import React, { useState, useRef } from 'react';

export default function App() {
  const [imageUrl, setImageUrl] = useState(null);
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [mode, setMode] = useState('ADD_NODE');
  const [nextNodeId, setNextNodeId] = useState(1);
  const [selectedNode, setSelectedNode] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [history, setHistory] = useState([]);

  // --- NEW: Hover State ---
  const [hoveredNodeId, setHoveredNodeId] = useState(null);

  const imgRef = useRef(null);

  const [currentNodeName, setCurrentNodeName] = useState("Corridor");
  const [currentNodeType, setCurrentNodeType] = useState("Joints");
  const [currentFloorplanId, setCurrentFloorplanId] = useState(1);

  const [currentIsAccessible, setCurrentIsAccessible] = useState(true);
  const [currentEdgeType, setCurrentEdgeType] = useState("walkway");

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setImageUrl(URL.createObjectURL(file));
    }
  };

  const handleCanvasClick = (e) => {
    if (!imgRef.current) return;

    const rect = imgRef.current.getBoundingClientRect();
    const x = Math.round((e.clientX - rect.left) / zoom);
    const y = Math.round((e.clientY - rect.top) / zoom);

    if (mode === 'ADD_NODE') {
      const newNode = {
        id: nextNodeId,
        x,
        y,
        name: currentNodeName,
        type: currentNodeType,
        floorplan_id: currentFloorplanId
      };
      setNodes([...nodes, newNode]);
      setNextNodeId(nextNodeId + 1);
      setHistory([...history, 'NODE']);
    }
  };

  const handleNodeClick = (e, node) => {
    e.stopPropagation();
    if (mode === 'ADD_EDGE') {
      if (!selectedNode) {
        setSelectedNode(node);
      } else {
        if (selectedNode.id !== node.id) {
          const dx = node.x - selectedNode.x;
          const dy = node.y - selectedNode.y;
          const weight = Math.sqrt(dx * dx + dy * dy);

          const newEdge = {
            source: selectedNode.id,
            target: node.id,
            weight: weight,
            is_accessible: currentIsAccessible,
            edge_type: currentEdgeType
          };
          setEdges([...edges, newEdge]);
          setHistory([...history, 'EDGE']);
        }
        setSelectedNode(null);
      }
    }
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const lastAction = history[history.length - 1];

    if (lastAction === 'NODE') {
      setNodes(nodes.slice(0, -1));
      setNextNodeId(prev => Math.max(1, prev - 1));
      setSelectedNode(null);
    } else if (lastAction === 'EDGE') {
      setEdges(edges.slice(0, -1));
    }
    setHistory(history.slice(0, -1));
  };

  const handleClearAll = () => {
    if (window.confirm("Are you sure you want to clear the entire map? This cannot be undone.")) {
      setNodes([]);
      setEdges([]);
      setHistory([]);
      setNextNodeId(1);
      setSelectedNode(null);
    }
  };

  const generateSQL = () => {
    if (nodes.length === 0) return "No nodes added yet.";

    const nodeValues = nodes.map(n =>
      `(${n.id}, '${n.name}', '${n.type}', ${n.floorplan_id}, ${n.x}, ${n.y})`
    ).join(",\n");

    const edgeValues = edges.map(e =>
      `(${e.source}, ${e.target}, ${e.weight.toFixed(2)}, ${e.is_accessible ? 'TRUE' : 'FALSE'}, '${e.edge_type}')`
    ).join(",\n");

    let sql = `-- Insert Nodes\nINSERT INTO nodes (node_id, node_name, node_type, floorplan_id, x_coord, y_coord) VALUES\n${nodeValues};\n`;

    if (edges.length > 0) {
      sql += `\n-- Insert Edges\nINSERT INTO edges (source, target, weight, is_accessible, edge_type) VALUES\n${edgeValues};`;
    }

    console.log(sql);
    alert("SQL generated in browser console!");
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: 'sans-serif' }}>

      {/* TOOLBAR */}
      <div style={{ padding: '15px', background: '#ecf0f1', display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'flex-start', borderBottom: '2px solid #bdc3c7', zIndex: 100 }}>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <strong>1. Core Tools</strong>
          <input type="file" onChange={handleImageUpload} />

          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => { setMode('ADD_NODE'); setSelectedNode(null); }} style={{ padding: '8px', cursor: 'pointer', background: mode === 'ADD_NODE' ? '#3498db' : '#fff', color: mode === 'ADD_NODE' ? 'white' : 'black', border: '1px solid #ccc', borderRadius: '4px' }}>Add Nodes</button>
            <button onClick={() => setMode('ADD_EDGE')} style={{ padding: '8px', cursor: 'pointer', background: mode === 'ADD_EDGE' ? '#2ecc71' : '#fff', color: mode === 'ADD_EDGE' ? 'white' : 'black', border: '1px solid #ccc', borderRadius: '4px' }}>Connect Edges</button>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={handleUndo} disabled={history.length === 0} style={{ flex: 1, padding: '8px', cursor: history.length === 0 ? 'not-allowed' : 'pointer', background: '#f39c12', color: 'white', border: 'none', borderRadius: '4px', opacity: history.length === 0 ? 0.5 : 1 }}>
              Undo Last
            </button>
            <button onClick={handleClearAll} disabled={nodes.length === 0} style={{ flex: 1, padding: '8px', cursor: nodes.length === 0 ? 'not-allowed' : 'pointer', background: '#c0392b', color: 'white', border: 'none', borderRadius: '4px', opacity: nodes.length === 0 ? 0.5 : 1 }}>
              Clear All
            </button>
          </div>

          <button onClick={generateSQL} style={{ padding: '8px', cursor: 'pointer', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold' }}>Generate SQL</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: '#fff', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}>
          <strong>2. Next Node Settings</strong>
          <label>ID: <input type="number" value={nextNodeId} onChange={(e) => setNextNodeId(parseInt(e.target.value, 10) || 1)} style={{ width: '60px' }} /></label>
          <label>Floorplan: <input type="number" value={currentFloorplanId} onChange={(e) => setCurrentFloorplanId(parseInt(e.target.value, 10) || 1)} style={{ width: '60px' }} /></label>
          <label>Name: <input type="text" value={currentNodeName} onChange={(e) => setCurrentNodeName(e.target.value)} /></label>
          <label>Type:
            <select value={currentNodeType} onChange={(e) => setCurrentNodeType(e.target.value)} style={{ marginLeft: '5px' }}>
              <option value="Door">Door</option>
              <option value="Joints">Joints</option>
              <option value="Staircase">Staircase</option>
            </select>
          </label>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: '#fff', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}>
          <strong>3. Next Edge Settings</strong>
          <label>Type:
            <select value={currentEdgeType} onChange={(e) => setCurrentEdgeType(e.target.value)} style={{ marginLeft: '5px' }}>
              <option value="walkway">Walkway</option>
              <option value="staircase">Staircase</option>
            </select>
          </label>
          <label><input type="checkbox" checked={currentIsAccessible} onChange={(e) => setCurrentIsAccessible(e.target.checked)} /> is_accessible</label>
        </div>

        {imageUrl && (
          <div style={{ marginLeft: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <strong>Zoom: {Math.round(zoom * 100)}%</strong>
            <input type="range" min="0.2" max="3" step="0.1" value={zoom} onChange={(e) => setZoom(parseFloat(e.target.value))} />
          </div>
        )}
      </div>

      {/* CANVAS AREA */}
      <div style={{ flex: 1, overflow: 'auto', background: '#95a5a6', position: 'relative' }}>
        {imageUrl && (
          <div style={{ position: 'relative', transform: `scale(${zoom})`, transformOrigin: 'top left', display: 'inline-block' }}>

            <img ref={imgRef} src={imageUrl} alt="Floorplan" onClick={handleCanvasClick} style={{ cursor: mode === 'ADD_NODE' ? 'crosshair' : 'default', display: 'block' }} />

            <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
              {edges.map((edge, index) => {
                const sourceNode = nodes.find(n => n.id === edge.source);
                const targetNode = nodes.find(n => n.id === edge.target);
                if (!sourceNode || !targetNode) return null;
                const edgeColor = edge.is_accessible ? 'rgba(46, 204, 113, 0.8)' : 'rgba(231, 76, 60, 0.8)';
                return (
                  <line key={index} x1={sourceNode.x} y1={sourceNode.y} x2={targetNode.x} y2={targetNode.y} stroke={edgeColor} strokeWidth="4" />
                );
              })}
            </svg>

            {nodes.map((node) => (
              <div
                key={node.id}
                onClick={(e) => handleNodeClick(e, node)}
                onMouseEnter={() => setHoveredNodeId(node.id)}
                onMouseLeave={() => setHoveredNodeId(null)}
                style={{
                  position: 'absolute',
                  left: node.x - 8,
                  top: node.y - 8,
                  width: '16px',
                  height: '16px',
                  background: selectedNode?.id === node.id ? '#f1c40f' :
                    (node.type === 'Door' ? '#2ecc71' :
                      (node.type === 'Staircase' ? '#9b59b6' : '#e74c3c')),
                  borderRadius: '50%',
                  cursor: mode === 'ADD_EDGE' ? 'pointer' : 'default',
                  border: '2px solid white',
                  boxShadow: '0 0 4px rgba(0,0,0,0.5)',
                  zIndex: hoveredNodeId === node.id ? 50 : 10
                }}
              >
                {/* CONDITIONAL RENDER: Only show label if this exact node is hovered */}
                {hoveredNodeId === node.id && (
                  <span style={{
                    position: 'absolute',
                    top: '-28px',
                    left: '50%',
                    transform: 'translateX(-50%)', // Centers the label directly above the dot
                    background: 'rgba(255,255,255,0.95)',
                    padding: '4px 8px',
                    fontSize: '12px',
                    borderRadius: '4px',
                    whiteSpace: 'nowrap',
                    fontWeight: 'bold',
                    border: '1px solid #ccc',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                    pointerEvents: 'none' // Prevents the label from interrupting mouse clicks
                  }}>
                    {node.id}: {node.name}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}