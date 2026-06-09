import { useState, useRef } from 'react';

const COORDINATE_NODE_TYPE = 'Coordinate';

const NODE_TYPES = [
  'Food',
  'Room',
  'Bus_stop',
  'Toilet',
  'Junction',
  'Stair',
  'Corridor',
  COORDINATE_NODE_TYPE,
];

const EDGE_TAGS = [
  { value: 'walkway', label: 'Walkway' },
  { value: 'Bus', label: 'Bus' },
  { value: 'Sheltered', label: 'Sheltered' },
  { value: 'Keycard', label: 'Keycard' },
  { value: 'Stair', label: 'Stair' },
  { value: 'Ramp', label: 'Ramp' },
  { value: 'Elevator', label: 'Elevator' },
];

function escapeSql(value) {
  return String(value).replaceAll("'", "''");
}

function parseCoordinateInput(value) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function edgeFlags(edgeType) {
  return {
    is_bus: edgeType === 'Bus',
    is_sheltered: edgeType === 'Bus' || edgeType === 'Sheltered',
    is_keycard: edgeType === 'Keycard',
    is_stair: edgeType === 'Stair',
    is_ramp: edgeType === 'Ramp',
    is_elevator: edgeType === 'Elevator',
  };
}

function sqlBoolean(value) {
  return value ? 'TRUE' : 'FALSE';
}

function getCoordinateCorners(nodes) {
  const coordinateNodes = nodes.filter((node) => node.type === COORDINATE_NODE_TYPE);

  if (coordinateNodes.length !== 4) {
    return {
      error: `Add exactly 4 Coordinate nodes before generating SQL. Found ${coordinateNodes.length}.`,
    };
  }

  const invalidCoordinate = coordinateNodes.find(
    (node) => !Number.isFinite(node.longitude) || !Number.isFinite(node.latitude),
  );

  if (invalidCoordinate) {
    return {
      error: `Coordinate node ${invalidCoordinate.id} is missing a valid longitude or latitude.`,
    };
  }

  const sortedByY = [...coordinateNodes].sort((a, b) => a.y - b.y);
  const top = sortedByY.slice(0, 2).sort((a, b) => a.x - b.x);
  const bottom = sortedByY.slice(2).sort((a, b) => a.x - b.x);
  const corners = {
    topLeft: top[0],
    topRight: top[1],
    bottomLeft: bottom[0],
    bottomRight: bottom[1],
  };

  const width = Math.max(corners.topRight.x, corners.bottomRight.x) -
    Math.min(corners.topLeft.x, corners.bottomLeft.x);
  const height = Math.max(corners.bottomLeft.y, corners.bottomRight.y) -
    Math.min(corners.topLeft.y, corners.topRight.y);

  if (width === 0 || height === 0) {
    return {
      error: 'Coordinate nodes must define a non-zero floorplan width and height.',
    };
  }

  return { corners };
}

function interpolateGeoPosition(node, corners) {
  const leftX = (corners.topLeft.x + corners.bottomLeft.x) / 2;
  const rightX = (corners.topRight.x + corners.bottomRight.x) / 2;
  const topY = (corners.topLeft.y + corners.topRight.y) / 2;
  const bottomY = (corners.bottomLeft.y + corners.bottomRight.y) / 2;
  const u = (node.x - leftX) / (rightX - leftX);
  const v = (node.y - topY) / (bottomY - topY);

  const longitudeTop = corners.topLeft.longitude +
    u * (corners.topRight.longitude - corners.topLeft.longitude);
  const longitudeBottom = corners.bottomLeft.longitude +
    u * (corners.bottomRight.longitude - corners.bottomLeft.longitude);
  const latitudeTop = corners.topLeft.latitude +
    u * (corners.topRight.latitude - corners.topLeft.latitude);
  const latitudeBottom = corners.bottomLeft.latitude +
    u * (corners.bottomRight.latitude - corners.bottomLeft.latitude);

  return {
    longitude: longitudeTop + v * (longitudeBottom - longitudeTop),
    latitude: latitudeTop + v * (latitudeBottom - latitudeTop),
  };
}

export default function App() {
  const [imageUrl, setImageUrl] = useState(null);
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [mode, setMode] = useState('ADD_NODE');
  const [nextNodeId, setNextNodeId] = useState(1);
  const [nextEdgeId, setNextEdgeId] = useState(1);
  const [selectedNode, setSelectedNode] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [history, setHistory] = useState([]);

  const [hoveredNodeId, setHoveredNodeId] = useState(null);
  const [hoveredEdgeId, setHoveredEdgeId] = useState(null);

  const imgRef = useRef(null);

  const [currentNodeName, setCurrentNodeName] = useState('Corridor');
  const [currentNodeType, setCurrentNodeType] = useState('Corridor');
  const [currentFloorplanId, setCurrentFloorplanId] = useState(1);
  const [currentLongitude, setCurrentLongitude] = useState('');
  const [currentLatitude, setCurrentLatitude] = useState('');

  const [currentIsAccessible, setCurrentIsAccessible] = useState(true);
  const [currentEdgeType, setCurrentEdgeType] = useState('walkway');

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setImageUrl(URL.createObjectURL(file));
    }
  };

  const handleNodeTypeChange = (event) => {
    const nextType = event.target.value;
    setCurrentNodeType(nextType);

    if (nextType === COORDINATE_NODE_TYPE && currentNodeName === 'Corridor') {
      setCurrentNodeName(COORDINATE_NODE_TYPE);
    } else if (currentNodeName === COORDINATE_NODE_TYPE && nextType !== COORDINATE_NODE_TYPE) {
      setCurrentNodeName(nextType);
    }
  };

  const handleCanvasClick = (e) => {
    if (!imgRef.current) return;

    const rect = imgRef.current.getBoundingClientRect();
    const x = Math.round((e.clientX - rect.left) / zoom);
    const y = Math.round((e.clientY - rect.top) / zoom);

    if (mode === 'ADD_NODE') {
      const isCoordinateNode = currentNodeType === COORDINATE_NODE_TYPE;
      const longitude = parseCoordinateInput(currentLongitude);
      const latitude = parseCoordinateInput(currentLatitude);

      if (isCoordinateNode && (longitude === null || latitude === null)) {
        alert('Enter valid longitude and latitude before placing a Coordinate node.');
        return;
      }

      const newNode = {
        id: nextNodeId,
        x,
        y,
        name: currentNodeName,
        type: currentNodeType,
        floorplan_id: currentFloorplanId,
        longitude: isCoordinateNode ? longitude : null,
        latitude: isCoordinateNode ? latitude : null,
      };

      setNodes([...nodes, newNode]);
      setNextNodeId(nextNodeId + 1);
      setHistory([...history, 'NODE']);
    }
  };

  const handleNodeClick = (e, node) => {
    e.stopPropagation();
    if (mode === 'ADD_EDGE') {
      if (node.type === COORDINATE_NODE_TYPE) {
        setSelectedNode(null);
        return;
      }

      if (!selectedNode) {
        setSelectedNode(node);
      } else {
        if (selectedNode.id !== node.id) {
          const dx = node.x - selectedNode.x;
          const dy = node.y - selectedNode.y;
          const weight = Math.sqrt(dx * dx + dy * dy);

          const newEdge = {
            id: nextEdgeId,
            source: selectedNode.id,
            target: node.id,
            weight: weight,
            is_accessible_fwd: currentIsAccessible,
            is_accessible_bwd: currentIsAccessible,
            edge_type: currentEdgeType,
          };

          setEdges([...edges, newEdge]);
          setNextEdgeId(nextEdgeId + 1);
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
      setNextEdgeId(prev => Math.max(1, prev - 1));
    }
    setHistory(history.slice(0, -1));
  };

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to clear the entire map? This cannot be undone.')) {
      setNodes([]);
      setEdges([]);
      setHistory([]);
      setNextNodeId(1);
      setNextEdgeId(1);
      setSelectedNode(null);
    }
  };

  const toggleEdgeAccess = (e, edgeId, direction) => {
    e.stopPropagation();
    setEdges(edges.map(edge => {
      if (edge.id === edgeId) {
        return {
          ...edge,
          is_accessible_fwd: direction === 'fwd' ? !edge.is_accessible_fwd : edge.is_accessible_fwd,
          is_accessible_bwd: direction === 'bwd' ? !edge.is_accessible_bwd : edge.is_accessible_bwd,
        };
      }
      return edge;
    }));
  };

  const generateSQL = () => {
    const realNodes = nodes.filter(n => n.type !== COORDINATE_NODE_TYPE);
    if (realNodes.length === 0) {
      alert('No non-coordinate nodes added yet.');
      return;
    }

    const { corners, error } = getCoordinateCorners(nodes);
    if (error) {
      alert(error);
      return;
    }

    const nodeValues = realNodes.map(n => {
      const { longitude, latitude } = interpolateGeoPosition(n, corners);
      return `(${n.id}, '${escapeSql(n.name)}', '${escapeSql(n.type)}', ${n.floorplan_id}, ${n.x}, ${n.y}, ${longitude.toFixed(8)}, ${latitude.toFixed(8)})`;
    }).join(',\n');

    const realNodeIds = new Set(realNodes.map(n => n.id));
    const edgeValuesArray = [];
    edges.forEach(e => {
      if (!realNodeIds.has(e.source) || !realNodeIds.has(e.target)) {
        return;
      }

      const flags = edgeFlags(e.edge_type);
      const flagValues = `${sqlBoolean(flags.is_bus)}, ${sqlBoolean(flags.is_sheltered)}, ${sqlBoolean(flags.is_keycard)}, ${sqlBoolean(flags.is_stair)}, ${sqlBoolean(flags.is_ramp)}, ${sqlBoolean(flags.is_elevator)}`;

      if (e.is_accessible_fwd) {
        edgeValuesArray.push(
          `(${e.source}, ${e.target}, ${e.weight.toFixed(2)}, ${flagValues})`
        );
      }

      if (e.is_accessible_bwd) {
        edgeValuesArray.push(
          `(${e.target}, ${e.source}, ${e.weight.toFixed(2)}, ${flagValues})`
        );
      }
    });

    let sql = `-- Insert Nodes\nINSERT INTO nodes (node_id, node_name, node_type, floorplan_id, x_coordinate, y_coordinate, longitude, latitude) VALUES\n${nodeValues};\n`;

    if (edgeValuesArray.length > 0) {
      sql += `\n-- Insert Edges (Only enabled directions are generated)\nINSERT INTO edges (source_node_id, target_node_id, weight, is_bus, is_sheltered, is_keycard, is_stair, is_ramp, is_elevator) VALUES\n${edgeValuesArray.join(',\n')};`;
    }

    console.log(sql);
    alert('SQL generated in browser console!');
  };

  const getEdgeColor = (edge) => {
    if (edge.is_accessible_fwd && edge.is_accessible_bwd) return 'rgba(46, 204, 113, 0.8)';
    if (!edge.is_accessible_fwd && !edge.is_accessible_bwd) return 'rgba(231, 76, 60, 0.8)';
    return 'rgba(243, 156, 18, 0.9)';
  };

  const getNodeColor = (node) => {
    if (selectedNode?.id === node.id) return '#f1c40f';
    if (node.type === COORDINATE_NODE_TYPE) return '#111827';
    if (node.type === 'Room') return '#2ecc71';
    if (node.type === 'Stair') return '#9b59b6';
    if (node.type === 'Food') return '#f39c12';
    if (node.type === 'Bus_stop') return '#3498db';
    if (node.type === 'Toilet') return '#16a085';
    return '#e74c3c';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: 'sans-serif' }}>
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
            <select value={currentNodeType} onChange={handleNodeTypeChange} style={{ marginLeft: '5px' }}>
              {NODE_TYPES.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </label>
          {currentNodeType === COORDINATE_NODE_TYPE && (
            <>
              <label>Longitude: <input type="number" step="any" value={currentLongitude} onChange={(e) => setCurrentLongitude(e.target.value)} style={{ width: '140px' }} /></label>
              <label>Latitude: <input type="number" step="any" value={currentLatitude} onChange={(e) => setCurrentLatitude(e.target.value)} style={{ width: '140px' }} /></label>
            </>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: '#fff', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}>
          <strong>3. Default Edge Settings</strong>
          <label>Tag:
            <select value={currentEdgeType} onChange={(e) => setCurrentEdgeType(e.target.value)} style={{ marginLeft: '5px' }}>
              {EDGE_TAGS.map((tag) => (
                <option key={tag.value} value={tag.value}>{tag.label}</option>
              ))}
            </select>
          </label>
          <label><input type="checkbox" checked={currentIsAccessible} onChange={(e) => setCurrentIsAccessible(e.target.checked)} /> Default Enabled (2-Way)</label>
        </div>

        {imageUrl && (
          <div style={{ marginLeft: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <strong>Zoom: {Math.round(zoom * 100)}%</strong>
            <input type="range" min="0.2" max="3" step="0.1" value={zoom} onChange={(e) => setZoom(parseFloat(e.target.value))} />
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflow: 'auto', background: '#95a5a6', position: 'relative' }}>
        {imageUrl && (
          <div style={{ position: 'relative', transform: `scale(${zoom})`, transformOrigin: 'top left', display: 'inline-block' }}>
            <img ref={imgRef} src={imageUrl} alt="Floorplan" onClick={handleCanvasClick} style={{ cursor: mode === 'ADD_NODE' ? 'crosshair' : 'default', display: 'block' }} />

            <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
              {edges.map((edge) => {
                const sourceNode = nodes.find(n => n.id === edge.source);
                const targetNode = nodes.find(n => n.id === edge.target);
                if (!sourceNode || !targetNode) return null;

                return (
                  <g key={edge.id} style={{ pointerEvents: 'stroke' }}>
                    <line x1={sourceNode.x} y1={sourceNode.y} x2={targetNode.x} y2={targetNode.y} stroke={getEdgeColor(edge)} strokeWidth="4" />
                    <line
                      x1={sourceNode.x} y1={sourceNode.y} x2={targetNode.x} y2={targetNode.y}
                      stroke="transparent" strokeWidth="25"
                      onMouseEnter={() => setHoveredEdgeId(edge.id)}
                      onMouseLeave={() => setHoveredEdgeId(null)}
                    />
                  </g>
                );
              })}
            </svg>

            {edges.map((edge) => {
              if (hoveredEdgeId !== edge.id) return null;

              const sourceNode = nodes.find(n => n.id === edge.source);
              const targetNode = nodes.find(n => n.id === edge.target);
              if (!sourceNode || !targetNode) return null;

              const midX = (sourceNode.x + targetNode.x) / 2;
              const midY = (sourceNode.y + targetNode.y) / 2;

              return (
                <div
                  key={`menu-${edge.id}`}
                  onMouseEnter={() => setHoveredEdgeId(edge.id)}
                  onMouseLeave={() => setHoveredEdgeId(null)}
                  style={{
                    position: 'absolute',
                    left: midX,
                    top: midY,
                    transform: 'translate(-50%, -50%)',
                    background: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #34495e',
                    borderRadius: '6px',
                    padding: '8px',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
                    zIndex: 60,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    pointerEvents: 'all'
                  }}
                >
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={edge.is_accessible_fwd} onChange={(e) => toggleEdgeAccess(e, edge.id, 'fwd')} />
                    Fwd: Node {edge.source} ➔ {edge.target}
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={edge.is_accessible_bwd} onChange={(e) => toggleEdgeAccess(e, edge.id, 'bwd')} />
                    Bwd: Node {edge.target} ➔ {edge.source}
                  </label>
                </div>
              );
            })}

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
                  background: getNodeColor(node),
                  borderRadius: node.type === COORDINATE_NODE_TYPE ? '2px' : '50%',
                  cursor: mode === 'ADD_EDGE' && node.type !== COORDINATE_NODE_TYPE ? 'pointer' : 'default',
                  border: '2px solid white',
                  boxShadow: '0 0 4px rgba(0,0,0,0.5)',
                  zIndex: hoveredNodeId === node.id ? 50 : 10
                }}
              >
                {hoveredNodeId === node.id && (
                  <span style={{
                    position: 'absolute',
                    top: '-28px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'rgba(255,255,255,0.95)',
                    padding: '4px 8px',
                    fontSize: '12px',
                    borderRadius: '4px',
                    whiteSpace: 'nowrap',
                    fontWeight: 'bold',
                    border: '1px solid #ccc',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                    pointerEvents: 'none'
                  }}>
                    {node.id}: {node.name}
                    {node.type === COORDINATE_NODE_TYPE && ` (${node.longitude}, ${node.latitude})`}
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
