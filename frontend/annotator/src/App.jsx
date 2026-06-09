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

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function getNodeX(node) {
  return toNumber(node.xCoordinate ?? node.x_coordinate ?? node.x);
}

function getNodeY(node) {
  return toNumber(node.yCoordinate ?? node.y_coordinate ?? node.y);
}

function getNodeType(node) {
  return node.nodeType ?? node.type;
}

function getCoordinateNodes(nodes) {
  const coordinateNodes = nodes
    .filter((node) => getNodeType(node) === COORDINATE_NODE_TYPE)
    .map((node) => ({
      ...node,
      x: getNodeX(node),
      y: getNodeY(node),
      longitude: toNumber(node.longitude),
      latitude: toNumber(node.latitude),
    }));

  if (coordinateNodes.length < 3) {
    return {
      error: `Add at least 3 Coordinate nodes before generating SQL. Found ${coordinateNodes.length}.`,
    };
  }

  const invalidCoordinate = coordinateNodes.find(
    (node) =>
      !Number.isFinite(node.x) ||
      !Number.isFinite(node.y) ||
      !Number.isFinite(node.longitude) ||
      !Number.isFinite(node.latitude),
  );

  if (invalidCoordinate) {
    return {
      error: `Coordinate node ${invalidCoordinate.id} is missing valid x, y, longitude, or latitude.`,
    };
  }

  return { coordinateNodes: sortCoordinateBoundary(coordinateNodes) };
}

function sortCoordinateBoundary(coordinateNodes) {
  const center = coordinateNodes.reduce((acc, node) => ({
    x: acc.x + node.x / coordinateNodes.length,
    y: acc.y + node.y / coordinateNodes.length,
  }), { x: 0, y: 0 });

  return [...coordinateNodes].sort((a, b) =>
    Math.atan2(a.y - center.y, a.x - center.x) -
    Math.atan2(b.y - center.y, b.x - center.x)
  );
}

function isPointOnSegment(point, a, b) {
  const cross = (point.y - a.y) * (b.x - a.x) - (point.x - a.x) * (b.y - a.y);
  if (Math.abs(cross) > 0.000001) return false;

  const dot = (point.x - a.x) * (b.x - a.x) + (point.y - a.y) * (b.y - a.y);
  if (dot < 0) return false;

  const segmentLengthSquared = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
  return dot <= segmentLengthSquared;
}

function isPointInCoordinateBounds(point, coordinateNodes) {
  let inside = false;

  for (let i = 0, j = coordinateNodes.length - 1; i < coordinateNodes.length; j = i++) {
    const current = coordinateNodes[i];
    const previous = coordinateNodes[j];

    if (isPointOnSegment(point, previous, current)) {
      return true;
    }

    const intersects = ((current.y > point.y) !== (previous.y > point.y)) &&
      point.x < ((previous.x - current.x) * (point.y - current.y)) / (previous.y - current.y) + current.x;

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}

function interpolateGeoPosition(node, coordinateNodes) {
  const nodeX = getNodeX(node);
  const nodeY = getNodeY(node);
  const exactCoordinate = coordinateNodes.find((coordinateNode) =>
    coordinateNode.x === nodeX && coordinateNode.y === nodeY
  );

  if (exactCoordinate) {
    return {
      longitude: exactCoordinate.longitude,
      latitude: exactCoordinate.latitude,
    };
  }

  const weighted = coordinateNodes.reduce((acc, coordinateNode) => {
    const dx = nodeX - coordinateNode.x;
    const dy = nodeY - coordinateNode.y;
    const distanceSquared = dx * dx + dy * dy;
    const weight = 1 / Math.max(distanceSquared, 0.000001);

    return {
      weightSum: acc.weightSum + weight,
      longitudeSum: acc.longitudeSum + coordinateNode.longitude * weight,
      latitudeSum: acc.latitudeSum + coordinateNode.latitude * weight,
    };
  }, {
    weightSum: 0,
    longitudeSum: 0,
    latitudeSum: 0,
  });

  return {
    longitude: weighted.longitudeSum / weighted.weightSum,
    latitude: weighted.latitudeSum / weighted.weightSum,
  };
}

function getNodesWithCalculatedCoordinates(nodes) {
  const realNodes = nodes.filter((node) => getNodeType(node) !== COORDINATE_NODE_TYPE);
  const { coordinateNodes, error } = getCoordinateNodes(nodes);

  if (error) {
    return { error };
  }

  const outsideNode = realNodes.find((node) => {
    const point = { x: getNodeX(node), y: getNodeY(node) };
    return !Number.isFinite(point.x) ||
      !Number.isFinite(point.y) ||
      !isPointInCoordinateBounds(point, coordinateNodes);
  });

  if (outsideNode) {
    return {
      error: `Node ${outsideNode.id ?? outsideNode.tempId} is outside the Coordinate node boundary.`,
    };
  }

  return {
    nodesWithCoordinates: realNodes.map((node) => {
      const { longitude, latitude } = interpolateGeoPosition(node, coordinateNodes);
      return {
        ...node,
        longitude,
        latitude,
      };
    }),
    coordinateNodes,
  };
}

function getNodeImportFields(node, coordinateNodes = [], defaultFloorplanId = null) {
  const nodeType = node.nodeType ?? node.type;
  const xCoordinate = getNodeX(node);
  const yCoordinate = getNodeY(node);
  let longitude = toNumber(node.longitude);
  let latitude = toNumber(node.latitude);

  if ((longitude === null || latitude === null) && coordinateNodes.length > 0) {
    const interpolated = interpolateGeoPosition(
      { ...node, x: xCoordinate, y: yCoordinate },
      coordinateNodes,
    );
    longitude = interpolated.longitude;
    latitude = interpolated.latitude;
  }

  return {
    tempId: toNumber(node.tempId ?? node.id),
    nodeName: node.nodeName ?? node.name,
    dualName: node.dualName ?? node.dual_name ?? null,
    nodeType,
    floorplanId: toNumber(node.floorplanId ?? node.floorplan_id) ?? defaultFloorplanId,
    roomPolygon: node.roomPolygon ?? node.room_polygon ?? null,
    xCoordinate,
    yCoordinate,
    longitude,
    latitude,
  };
}

function getEdgeImportFields(edge, sourceTempId, targetTempId) {
  const flags = edgeFlags(edge.edge_type ?? edge.edgeType ?? 'walkway');

  return {
    sourceTempId,
    targetTempId,
    weight: toNumber(edge.weight),
    isBus: Boolean(edge.isBus ?? edge.is_bus ?? flags.is_bus),
    isSheltered: Boolean(edge.isSheltered ?? edge.is_sheltered ?? flags.is_sheltered),
    isKeycard: Boolean(edge.isKeycard ?? edge.is_keycard ?? flags.is_keycard),
    isStair: Boolean(edge.isStair ?? edge.is_stair ?? flags.is_stair),
    isRamp: Boolean(edge.isRamp ?? edge.is_ramp ?? flags.is_ramp),
    isElevator: Boolean(edge.isElevator ?? edge.is_elevator ?? flags.is_elevator),
  };
}

function buildImportPayload(graph, defaultFloorplanId = null) {
  if (!graph || !Array.isArray(graph.nodes)) {
    throw new Error('JSON import requires a top-level nodes array.');
  }

  const inputNodes = graph.nodes;
  const realNodes = inputNodes.filter((node) => getNodeType(node) !== COORDINATE_NODE_TYPE);
  const needsInterpolation = realNodes.some((node) =>
    toNumber(node.longitude) === null || toNumber(node.latitude) === null
  );
  let nodesForImport = realNodes;
  let coordinateNodes = [];

  if (needsInterpolation) {
    const { nodesWithCoordinates, coordinateNodes: validatedCoordinateNodes, error } =
      getNodesWithCalculatedCoordinates(inputNodes);
    if (error) {
      throw new Error(error);
    }
    nodesForImport = nodesWithCoordinates;
    coordinateNodes = validatedCoordinateNodes;
  }

  const nodes = nodesForImport.map((node) =>
    getNodeImportFields(node, coordinateNodes, defaultFloorplanId)
  );
  const rawEdges = Array.isArray(graph.edges) ? graph.edges : [];
  const edges = rawEdges.flatMap((edge) => {
    if (edge.sourceTempId != null || edge.targetTempId != null) {
      return [getEdgeImportFields(edge, toNumber(edge.sourceTempId), toNumber(edge.targetTempId))];
    }

    const sourceTempId = toNumber(edge.source);
    const targetTempId = toNumber(edge.target);
    const expandedEdges = [];

    if (edge.is_accessible_fwd !== false) {
      expandedEdges.push(getEdgeImportFields(edge, sourceTempId, targetTempId));
    }
    if (edge.is_accessible_bwd === true) {
      expandedEdges.push(getEdgeImportFields(edge, targetTempId, sourceTempId));
    }

    return expandedEdges;
  });

  return { nodes, edges };
}

function downloadJson(filename, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
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
  const jsonImportInputRef = useRef(null);

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

  const handleJsonImport = async (event) => {
    const file = event.target.files[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    try {
      const importedGraph = JSON.parse(await file.text());
      const payload = buildImportPayload(importedGraph, currentFloorplanId);
      const token = localStorage.getItem('jwt_token');

      if (!token) {
        throw new Error('You must be logged in as an admin before importing JSON.');
      }

      const response = await fetch('/api/admin/annotator/import', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const responseBody = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(responseBody.error || 'JSON import failed.');
      }

      alert(`Imported ${responseBody.importedNodes} nodes and ${responseBody.importedEdges} edges.`);
    } catch (error) {
      console.error('JSON import failed:', error);
      alert(error.message || 'JSON import failed.');
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

  const handleFloorplanIdChange = (event) => {
    setCurrentFloorplanId(parseInt(event.target.value, 10) || 1);
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
    const { nodesWithCoordinates, error } = getNodesWithCalculatedCoordinates(nodes);
    if (error) {
      alert(error);
      return;
    }

    if (nodesWithCoordinates.length === 0) {
      alert('No non-coordinate nodes added yet.');
      return;
    }

    const nodeValues = nodesWithCoordinates.map(n =>
      `(${n.id}, '${escapeSql(n.name)}', '${escapeSql(n.type)}', ${n.floorplan_id}, ${n.x}, ${n.y}, ${n.longitude.toFixed(8)}, ${n.latitude.toFixed(8)})`
    ).join(',\n');

    const realNodeIds = new Set(nodesWithCoordinates.map(n => n.id));
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

  const exportJson = () => {
    const { nodesWithCoordinates, error } = getNodesWithCalculatedCoordinates(nodes);
    if (error) {
      alert(error);
      return;
    }

    downloadJson(`annotator-floorplan-${currentFloorplanId}.json`, {
      version: 1,
      exportedAt: new Date().toISOString(),
      nodes: [
        ...nodes.filter(node => getNodeType(node) === COORDINATE_NODE_TYPE),
        ...nodesWithCoordinates,
      ],
      edges,
    });
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: '#fff', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}>
          <strong>0. Active Floorplan</strong>
          <label>ID: <input type="number" value={currentFloorplanId} onChange={handleFloorplanIdChange} style={{ width: '80px' }} /></label>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <strong>1. Core Tools</strong>
          <input type="file" onChange={handleImageUpload} />
          <input
            ref={jsonImportInputRef}
            type="file"
            accept="application/json,.json"
            onChange={handleJsonImport}
            style={{ display: 'none' }}
          />

          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => { setMode('ADD_NODE'); setSelectedNode(null); }} style={{ padding: '8px', cursor: 'pointer', background: mode === 'ADD_NODE' ? '#3498db' : '#fff', color: mode === 'ADD_NODE' ? 'white' : 'black', border: '1px solid #ccc', borderRadius: '4px' }}>Add Nodes</button>
            <button onClick={() => setMode('ADD_EDGE')} style={{ padding: '8px', cursor: 'pointer', background: mode === 'ADD_EDGE' ? '#2ecc71' : '#fff', color: mode === 'ADD_EDGE' ? 'white' : 'black', border: '1px solid #ccc', borderRadius: '4px' }}>Connect Edges</button>
          </div>

          <button onClick={() => jsonImportInputRef.current?.click()} style={{ padding: '8px', cursor: 'pointer', background: '#34495e', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold' }}>Import JSON</button>
          <button onClick={exportJson} disabled={nodes.length === 0} style={{ padding: '8px', cursor: nodes.length === 0 ? 'not-allowed' : 'pointer', background: '#2c3e50', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold', opacity: nodes.length === 0 ? 0.5 : 1 }}>Export JSON</button>

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
