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

const EDGE_FLAGS = [
  { key: 'isBus', legacyKey: 'is_bus', label: 'Bus' },
  { key: 'isSheltered', legacyKey: 'is_sheltered', label: 'Sheltered' },
  { key: 'isKeycard', legacyKey: 'is_keycard', label: 'Keycard' },
  { key: 'isStair', legacyKey: 'is_stair', label: 'Stair' },
  { key: 'isRamp', legacyKey: 'is_ramp', label: 'Ramp' },
  { key: 'isElevator', legacyKey: 'is_elevator', label: 'Elevator' },
];

const toolbarPanelStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '5px',
  background: '#fff',
  padding: '6px 8px',
  borderRadius: '6px',
  border: '1px solid #ccc',
  fontSize: '13px',
};

const compactButtonStyle = {
  padding: '5px 8px',
  borderRadius: '4px',
  fontSize: '13px',
};

function escapeSql(value) {
  return String(value).replaceAll("'", "''");
}

function parseCoordinateInput(value) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function legacyEdgeTypeFlags(edgeType) {
  return {
    isBus: edgeType === 'Bus',
    isSheltered: edgeType === 'Bus' || edgeType === 'Sheltered',
    isKeycard: edgeType === 'Keycard',
    isStair: edgeType === 'Stair',
    isRamp: edgeType === 'Ramp',
    isElevator: edgeType === 'Elevator',
  };
}

function normalizeEdgeFlags(edge = {}) {
  const legacyFlags = legacyEdgeTypeFlags(edge.edge_type ?? edge.edgeType ?? 'walkway');

  return EDGE_FLAGS.reduce((flags, { key, legacyKey }) => ({
    ...flags,
    [key]: Boolean(edge[key] ?? edge[legacyKey] ?? legacyFlags[key]),
  }), {});
}

function sqlBoolean(value) {
  return value ? 'TRUE' : 'FALSE';
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isZeroGeo(longitude, latitude) {
  return longitude === 0 && latitude === 0;
}

function normalizeGeoPosition(longitude, latitude) {
  if (longitude === null || latitude === null) {
    return { longitude, latitude };
  }

  // Singapore-style coordinates are easy to swap accidentally:
  // longitude should be around 103.x, latitude around 1.x.
  if (Math.abs(longitude) <= 90 && Math.abs(latitude) > 90 && Math.abs(latitude) <= 180) {
    return { longitude: latitude, latitude: longitude };
  }

  return { longitude, latitude };
}

function hasValidGeoPosition(longitude, latitude) {
  return longitude !== null &&
    latitude !== null &&
    !isZeroGeo(longitude, latitude) &&
    Math.abs(longitude) <= 180 &&
    Math.abs(latitude) <= 90;
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

function getNodeTempId(node) {
  return toNumber(node.tempId ?? node.id);
}

function getEdgeSourceTempId(edge) {
  return toNumber(edge.sourceTempId ?? edge.source_temp_id ?? edge.source);
}

function getEdgeTargetTempId(edge) {
  return toNumber(edge.targetTempId ?? edge.target_temp_id ?? edge.target);
}

function getCoordinateNodes(nodes) {
  const coordinateNodes = nodes
    .filter((node) => getNodeType(node) === COORDINATE_NODE_TYPE)
    .map((node) => {
      const { longitude, latitude } = normalizeGeoPosition(
        toNumber(node.longitude),
        toNumber(node.latitude),
      );

      return {
        ...node,
        x: getNodeX(node),
        y: getNodeY(node),
        longitude,
        latitude,
      };
    });

  if (coordinateNodes.length < 3) {
    return {
      error: `Add at least 3 Coordinate nodes before generating SQL. Found ${coordinateNodes.length}.`,
    };
  }

  const invalidCoordinate = coordinateNodes.find(
    (node) =>
      !Number.isFinite(node.x) ||
      !Number.isFinite(node.y) ||
      !hasValidGeoPosition(node.longitude, node.latitude),
  );

  if (invalidCoordinate) {
    return {
      error: `Coordinate node ${invalidCoordinate.id} is missing valid x, y, longitude, or latitude. Longitude should look like 103.x and latitude should look like 1.x for NUS.`,
    };
  }

  return { coordinateNodes };
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

  const invalidNode = realNodes.find((node) =>
    !Number.isFinite(getNodeX(node)) || !Number.isFinite(getNodeY(node))
  );

  if (invalidNode) {
    return {
      error: `Node ${invalidNode.id ?? invalidNode.tempId} is missing valid x or y coordinates.`,
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
  let { longitude, latitude } = normalizeGeoPosition(
    toNumber(node.longitude),
    toNumber(node.latitude),
  );

  if (!hasValidGeoPosition(longitude, latitude) && coordinateNodes.length > 0) {
    const interpolated = interpolateGeoPosition(
      { ...node, x: xCoordinate, y: yCoordinate },
      coordinateNodes,
    );
    longitude = interpolated.longitude;
    latitude = interpolated.latitude;
  }

  return {
    tempId: getNodeTempId(node),
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
  const flags = normalizeEdgeFlags(edge);

  return {
    sourceTempId,
    targetTempId,
    weight: toNumber(edge.weight),
    ...flags,
  };
}

function buildImportPayload(graph, defaultFloorplanId = null) {
  if (!graph || !Array.isArray(graph.nodes)) {
    throw new Error('JSON import requires a top-level nodes array.');
  }

  const inputNodes = graph.nodes;
  const realNodes = inputNodes.filter((node) => getNodeType(node) !== COORDINATE_NODE_TYPE);
  const needsInterpolation = realNodes.some((node) =>
    !hasValidGeoPosition(
      normalizeGeoPosition(toNumber(node.longitude), toNumber(node.latitude)).longitude,
      normalizeGeoPosition(toNumber(node.longitude), toNumber(node.latitude)).latitude,
    )
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
  const invalidNode = nodes.find((node) =>
    node.tempId === null ||
    !node.nodeName ||
    !node.nodeType ||
    node.floorplanId === null ||
    node.xCoordinate === null ||
    node.yCoordinate === null ||
    !hasValidGeoPosition(node.longitude, node.latitude)
  );

  if (invalidNode) {
    throw new Error(`Node ${invalidNode.tempId ?? '(missing tempId)'} is missing required database fields.`);
  }

  const realNodeTempIds = new Set(nodes.map((node) => node.tempId));
  const rawEdges = Array.isArray(graph.edges) ? graph.edges : [];
  const edges = rawEdges.flatMap((edge) => {
    const sourceTempId = getEdgeSourceTempId(edge);
    const targetTempId = getEdgeTargetTempId(edge);
    const expandedEdges = [];

    if (!realNodeTempIds.has(sourceTempId) || !realNodeTempIds.has(targetTempId)) {
      throw new Error(`Edge references unknown or coordinate node IDs: ${sourceTempId} -> ${targetTempId}.`);
    }

    if (edge.is_accessible_fwd !== undefined || edge.is_accessible_bwd !== undefined) {
      if (edge.is_accessible_fwd !== false) {
        expandedEdges.push(getEdgeImportFields(edge, sourceTempId, targetTempId));
      }
      if (edge.is_accessible_bwd === true) {
        expandedEdges.push(getEdgeImportFields(edge, targetTempId, sourceTempId));
      }
      return expandedEdges;
    }

    if (sourceTempId !== null && targetTempId !== null) {
      expandedEdges.push(getEdgeImportFields(edge, sourceTempId, targetTempId));
    }

    return expandedEdges;
  });
  const invalidEdge = edges.find((edge) =>
    edge.sourceTempId === null ||
    edge.targetTempId === null ||
    edge.weight === null ||
    edge.weight < 0
  );

  if (invalidEdge) {
    throw new Error(`Edge ${invalidEdge.sourceTempId ?? '?'} -> ${invalidEdge.targetTempId ?? '?'} is missing required database fields.`);
  }

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

  const [createReverseEdge, setCreateReverseEdge] = useState(true);
  const [defaultEdgeFlags, setDefaultEdgeFlags] = useState({
    isBus: false,
    isSheltered: false,
    isKeycard: false,
    isStair: false,
    isRamp: false,
    isElevator: false,
  });

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
      const { longitude, latitude } = normalizeGeoPosition(
        parseCoordinateInput(currentLongitude),
        parseCoordinateInput(currentLatitude),
      );

      if (isCoordinateNode && !hasValidGeoPosition(longitude, latitude)) {
        alert('Enter valid longitude and latitude before placing a Coordinate node. For NUS, longitude should look like 103.x and latitude should look like 1.x.');
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

          const edgeBase = {
            id: nextEdgeId,
            sourceTempId: selectedNode.id,
            targetTempId: node.id,
            weight,
            ...defaultEdgeFlags,
          };
          const newEdges = [edgeBase];

          if (createReverseEdge) {
            newEdges.push({
              ...edgeBase,
              id: nextEdgeId + 1,
              sourceTempId: node.id,
              targetTempId: selectedNode.id,
            });
          }

          setEdges([...edges, ...newEdges]);
          setNextEdgeId(nextEdgeId + newEdges.length);
          setHistory([...history, { type: 'EDGE', count: newEdges.length }]);
        }
        setSelectedNode(null);
      }
    }
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const lastAction = history[history.length - 1];
    const actionType = typeof lastAction === 'string' ? lastAction : lastAction.type;
    const actionCount = typeof lastAction === 'string' ? 1 : lastAction.count;

    if (actionType === 'NODE') {
      setNodes(nodes.slice(0, -1));
      setNextNodeId(prev => Math.max(1, prev - 1));
      setSelectedNode(null);
    } else if (actionType === 'EDGE') {
      setEdges(edges.slice(0, -actionCount));
      setNextEdgeId(prev => Math.max(1, prev - actionCount));
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

  const toggleDefaultEdgeFlag = (key) => {
    setDefaultEdgeFlags((flags) => ({
      ...flags,
      [key]: !flags[key],
    }));
  };

  const toggleEdgeFlag = (e, edgeId, key) => {
    e.stopPropagation();
    setEdges(edges.map(edge => {
      if (edge.id === edgeId) {
        return {
          ...edge,
          [key]: !edge[key],
        };
      }
      return edge;
    }));
  };

  const generateSQL = () => {
    let payload;
    try {
      payload = buildImportPayload({ nodes, edges }, currentFloorplanId);
    } catch (error) {
      alert(error.message);
      return;
    }

    if (payload.nodes.length === 0) {
      alert('No non-coordinate nodes added yet.');
      return;
    }

    const nodeValues = payload.nodes.map(n =>
      `(${n.tempId}, '${escapeSql(n.nodeName)}', '${escapeSql(n.nodeType)}', ${n.floorplanId}, ${n.xCoordinate}, ${n.yCoordinate}, ${n.longitude.toFixed(8)}, ${n.latitude.toFixed(8)})`
    ).join(',\n');

    const edgeValuesArray = payload.edges.map(e => {
      const flagValues = `${sqlBoolean(e.isBus)}, ${sqlBoolean(e.isSheltered)}, ${sqlBoolean(e.isKeycard)}, ${sqlBoolean(e.isStair)}, ${sqlBoolean(e.isRamp)}, ${sqlBoolean(e.isElevator)}`;
      return `(${e.sourceTempId}, ${e.targetTempId}, ${e.weight.toFixed(2)}, ${flagValues})`;
    });

    let sql = `-- Insert Nodes\nINSERT INTO nodes (node_id, node_name, node_type, floorplan_id, x_coordinate, y_coordinate, longitude, latitude) VALUES\n${nodeValues};\n`;

    if (edgeValuesArray.length > 0) {
      sql += `\n-- Insert Edges (Only enabled directions are generated)\nINSERT INTO edges (source_node_id, target_node_id, weight, is_bus, is_sheltered, is_keycard, is_stair, is_ramp, is_elevator) VALUES\n${edgeValuesArray.join(',\n')};`;
    }

    console.log(sql);
    alert('SQL generated in browser console!');
  };

  const exportJson = () => {
    let payload;
    try {
      payload = buildImportPayload({ nodes, edges }, currentFloorplanId);
    } catch (error) {
      alert(error.message);
      return;
    }

    downloadJson(`annotator-floorplan-${currentFloorplanId}-db-import.json`, payload);
  };

  const getEdgeColor = (edge) => {
    const flags = normalizeEdgeFlags(edge);

    if (flags.isBus) return 'rgba(52, 152, 219, 0.9)';
    if (flags.isElevator) return 'rgba(155, 89, 182, 0.9)';
    if (flags.isStair) return 'rgba(142, 68, 173, 0.9)';
    if (flags.isRamp) return 'rgba(230, 126, 34, 0.9)';
    if (flags.isKeycard) return 'rgba(231, 76, 60, 0.9)';
    if (flags.isSheltered) return 'rgba(22, 160, 133, 0.9)';
    return 'rgba(46, 204, 113, 0.8)';
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
      <div style={{ padding: '8px 10px', background: '#ecf0f1', display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'flex-start', borderBottom: '2px solid #bdc3c7', zIndex: 100 }}>
        <div style={toolbarPanelStyle}>
          <strong>0. Active Floorplan</strong>
          <label>ID: <input type="number" value={currentFloorplanId} onChange={handleFloorplanIdChange} style={{ width: '80px' }} /></label>
        </div>

        <div style={{ ...toolbarPanelStyle, minWidth: '360px' }}>
          <strong>1. Core Tools</strong>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>Image:</span>
            <input type="file" onChange={handleImageUpload} style={{ maxWidth: '230px' }} />
          </div>
          <input
            ref={jsonImportInputRef}
            type="file"
            accept="application/json,.json"
            onChange={handleJsonImport}
            style={{ display: 'none' }}
          />

          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <button onClick={() => { setMode('ADD_NODE'); setSelectedNode(null); }} style={{ ...compactButtonStyle, cursor: 'pointer', background: mode === 'ADD_NODE' ? '#3498db' : '#fff', color: mode === 'ADD_NODE' ? 'white' : 'black', border: '1px solid #ccc' }}>Add Nodes</button>
            <button onClick={() => setMode('ADD_EDGE')} style={{ ...compactButtonStyle, cursor: 'pointer', background: mode === 'ADD_EDGE' ? '#2ecc71' : '#fff', color: mode === 'ADD_EDGE' ? 'white' : 'black', border: '1px solid #ccc' }}>Connect Edges</button>
            <button onClick={() => jsonImportInputRef.current?.click()} style={{ ...compactButtonStyle, cursor: 'pointer', background: '#34495e', color: 'white', border: 'none', fontWeight: 'bold' }}>Import JSON</button>
            <button onClick={exportJson} disabled={nodes.length === 0} style={{ ...compactButtonStyle, cursor: nodes.length === 0 ? 'not-allowed' : 'pointer', background: '#2c3e50', color: 'white', border: 'none', fontWeight: 'bold', opacity: nodes.length === 0 ? 0.5 : 1 }}>Export JSON</button>
            <button onClick={handleUndo} disabled={history.length === 0} style={{ ...compactButtonStyle, cursor: history.length === 0 ? 'not-allowed' : 'pointer', background: '#f39c12', color: 'white', border: 'none', opacity: history.length === 0 ? 0.5 : 1 }}>
              Undo Last
            </button>
            <button onClick={handleClearAll} disabled={nodes.length === 0} style={{ ...compactButtonStyle, cursor: nodes.length === 0 ? 'not-allowed' : 'pointer', background: '#c0392b', color: 'white', border: 'none', opacity: nodes.length === 0 ? 0.5 : 1 }}>
              Clear All
            </button>
            <button onClick={generateSQL} style={{ ...compactButtonStyle, cursor: 'pointer', background: '#e74c3c', color: 'white', border: 'none', fontWeight: 'bold' }}>Generate SQL</button>
          </div>
        </div>

        <div style={toolbarPanelStyle}>
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
              <label>Longitude (103.x): <input type="number" step="any" value={currentLongitude} onChange={(e) => setCurrentLongitude(e.target.value)} style={{ width: '140px' }} /></label>
              <label>Latitude (1.x): <input type="number" step="any" value={currentLatitude} onChange={(e) => setCurrentLatitude(e.target.value)} style={{ width: '140px' }} /></label>
            </>
          )}
        </div>

        <div style={toolbarPanelStyle}>
          <strong>3. Edge Defaults</strong>
          <label><input type="checkbox" checked={createReverseEdge} onChange={(e) => setCreateReverseEdge(e.target.checked)} /> Also create reverse edge</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(95px, 1fr))', gap: '3px 8px' }}>
            {EDGE_FLAGS.map(({ key, label }) => (
              <label key={key}>
                <input
                  type="checkbox"
                  checked={defaultEdgeFlags[key]}
                  onChange={() => toggleDefaultEdgeFlag(key)}
                /> {label}
              </label>
            ))}
          </div>
        </div>

        {imageUrl && (
          <div style={{ ...toolbarPanelStyle, marginLeft: 'auto', alignItems: 'flex-end' }}>
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
              <defs>
                <marker id="edge-arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth">
                  <path d="M0,0 L0,6 L9,3 z" fill="currentColor" />
                </marker>
              </defs>
              {edges.map((edge) => {
                const sourceTempId = getEdgeSourceTempId(edge);
                const targetTempId = getEdgeTargetTempId(edge);
                const sourceNode = nodes.find(n => n.id === sourceTempId);
                const targetNode = nodes.find(n => n.id === targetTempId);
                if (!sourceNode || !targetNode) return null;
                const edgeColor = getEdgeColor(edge);

                return (
                  <g key={edge.id} style={{ pointerEvents: 'stroke' }}>
                    <line
                      x1={sourceNode.x}
                      y1={sourceNode.y}
                      x2={targetNode.x}
                      y2={targetNode.y}
                      stroke={edgeColor}
                      strokeWidth="4"
                      markerEnd="url(#edge-arrow)"
                      style={{ color: edgeColor }}
                    />
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

              const sourceTempId = getEdgeSourceTempId(edge);
              const targetTempId = getEdgeTargetTempId(edge);
              const sourceNode = nodes.find(n => n.id === sourceTempId);
              const targetNode = nodes.find(n => n.id === targetTempId);
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
                  <strong>Node {sourceTempId} to {targetTempId}</strong>
                  {EDGE_FLAGS.map(({ key, label }) => (
                    <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                      <input type="checkbox" checked={Boolean(edge[key])} onChange={(event) => toggleEdgeFlag(event, edge.id, key)} />
                      {label}
                    </label>
                  ))}
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
