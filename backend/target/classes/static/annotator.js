(function () {
  const svgNs = "http://www.w3.org/2000/svg";

  function redirectToLogin() {
    window.location.replace("/login.html");
  }

  function getStoredSession() {
    try {
      const rawSession = localStorage.getItem("points_app_session");
      return rawSession ? JSON.parse(rawSession) : null;
    } catch (error) {
      console.error("Failed to parse stored session.", error);
      return null;
    }
  }

  const session = getStoredSession();
  const jwtToken = localStorage.getItem("jwt_token");

  if (!jwtToken || !session || session.isAdmin !== true) {
    redirectToLogin();
    return;
  }

  const state = {
    imageUrl: null,
    nodes: [],
    edges: [],
    mode: "ADD_NODE",
    nextNodeId: 1,
    nextEdgeId: 1,
    selectedNodeId: null,
    zoom: 1,
    history: [],
    hoveredNodeId: null,
    hoveredEdgeId: null,
    currentNodeName: "Corridor",
    currentNodeType: "Joints",
    currentFloorplanId: 1,
    currentIsAccessible: true,
    currentEdgeType: "walkway",
  };

  let hideEdgeMenuTimer = null;
  let uploadedImageObjectUrl = null;

  const elements = {
    imageUpload: document.getElementById("imageUpload"),
    addNodeBtn: document.getElementById("addNodeBtn"),
    addEdgeBtn: document.getElementById("addEdgeBtn"),
    undoBtn: document.getElementById("undoBtn"),
    clearBtn: document.getElementById("clearBtn"),
    generateSqlBtn: document.getElementById("generateSqlBtn"),
    nextNodeId: document.getElementById("nextNodeId"),
    floorplanId: document.getElementById("floorplanId"),
    nodeName: document.getElementById("nodeName"),
    nodeType: document.getElementById("nodeType"),
    edgeType: document.getElementById("edgeType"),
    edgeAccessible: document.getElementById("edgeAccessible"),
    zoomPanel: document.getElementById("zoomPanel"),
    zoomLabel: document.getElementById("zoomLabel"),
    zoomRange: document.getElementById("zoomRange"),
    canvasArea: document.getElementById("canvasArea"),
    emptyState: document.getElementById("emptyState"),
    canvasStage: document.getElementById("canvasStage"),
    floorplanImage: document.getElementById("floorplanImage"),
    edgeLayer: document.getElementById("edgeLayer"),
    nodeLayer: document.getElementById("nodeLayer"),
    edgeMenuLayer: document.getElementById("edgeMenuLayer"),
  };

  function setState(partial) {
    Object.assign(state, partial);
    render();
  }

  function getEdgeColor(edge) {
    if (edge.is_accessible_fwd && edge.is_accessible_bwd) {
      return "rgba(46, 204, 113, 0.8)";
    }
    if (!edge.is_accessible_fwd && !edge.is_accessible_bwd) {
      return "rgba(231, 76, 60, 0.8)";
    }
    return "rgba(243, 156, 18, 0.9)";
  }

  function getNodeColor(node) {
    if (state.selectedNodeId === node.id) {
      return "#f1c40f";
    }
    if (node.type === "Door") {
      return "#2ecc71";
    }
    if (node.type === "Staircase") {
      return "#9b59b6";
    }
    return "#e74c3c";
  }

  function resetImageUrl(url) {
    if (uploadedImageObjectUrl) {
      URL.revokeObjectURL(uploadedImageObjectUrl);
      uploadedImageObjectUrl = null;
    }
    uploadedImageObjectUrl = url;
  }

  function handleImageUpload(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) {
      return;
    }

    const nextUrl = URL.createObjectURL(file);
    resetImageUrl(nextUrl);
    setState({
      imageUrl: nextUrl,
      zoom: 1,
      hoveredNodeId: null,
      hoveredEdgeId: null,
      selectedNodeId: null,
    });
  }

  function handleCanvasClick(event) {
    if (!state.imageUrl || state.mode !== "ADD_NODE") {
      return;
    }

    const rect = elements.floorplanImage.getBoundingClientRect();
    const x = Math.round((event.clientX - rect.left) / state.zoom);
    const y = Math.round((event.clientY - rect.top) / state.zoom);

    const newNode = {
      id: state.nextNodeId,
      x,
      y,
      name: state.currentNodeName,
      type: state.currentNodeType,
      floorplan_id: state.currentFloorplanId,
    };

    setState({
      nodes: [...state.nodes, newNode],
      nextNodeId: state.nextNodeId + 1,
      history: [...state.history, "NODE"],
    });
  }

  function handleNodeClick(event, nodeId) {
    event.stopPropagation();

    if (state.mode !== "ADD_EDGE") {
      return;
    }

    const node = state.nodes.find((entry) => entry.id === nodeId);
    if (!node) {
      return;
    }

    if (state.selectedNodeId === null) {
      setState({ selectedNodeId: node.id });
      return;
    }

    if (state.selectedNodeId === node.id) {
      setState({ selectedNodeId: null });
      return;
    }

    const sourceNode = state.nodes.find((entry) => entry.id === state.selectedNodeId);
    if (!sourceNode) {
      setState({ selectedNodeId: null });
      return;
    }

    const dx = node.x - sourceNode.x;
    const dy = node.y - sourceNode.y;
    const weight = Math.sqrt(dx * dx + dy * dy);

    const newEdge = {
      id: state.nextEdgeId,
      source: sourceNode.id,
      target: node.id,
      weight,
      is_accessible_fwd: state.currentIsAccessible,
      is_accessible_bwd: state.currentIsAccessible,
      edge_type: state.currentEdgeType,
    };

    setState({
      edges: [...state.edges, newEdge],
      nextEdgeId: state.nextEdgeId + 1,
      selectedNodeId: null,
      history: [...state.history, "EDGE"],
    });
  }

  function handleUndo() {
    if (state.history.length === 0) {
      return;
    }

    const lastAction = state.history[state.history.length - 1];
    const nextHistory = state.history.slice(0, -1);

    if (lastAction === "NODE") {
      setState({
        nodes: state.nodes.slice(0, -1),
        nextNodeId: Math.max(1, state.nextNodeId - 1),
        selectedNodeId: null,
        history: nextHistory,
      });
      return;
    }

    if (lastAction === "EDGE") {
      setState({
        edges: state.edges.slice(0, -1),
        nextEdgeId: Math.max(1, state.nextEdgeId - 1),
        history: nextHistory,
      });
    }
  }

  function handleClearAll() {
    if (state.nodes.length === 0) {
      return;
    }

    if (!window.confirm("Are you sure you want to clear the entire map? This cannot be undone.")) {
      return;
    }

    setState({
      nodes: [],
      edges: [],
      history: [],
      nextNodeId: 1,
      nextEdgeId: 1,
      selectedNodeId: null,
      hoveredNodeId: null,
      hoveredEdgeId: null,
    });
  }

  function toggleEdgeAccess(edgeId, direction) {
    const edges = state.edges.map((edge) => {
      if (edge.id !== edgeId) {
        return edge;
      }

      return {
        ...edge,
        is_accessible_fwd:
          direction === "fwd" ? !edge.is_accessible_fwd : edge.is_accessible_fwd,
        is_accessible_bwd:
          direction === "bwd" ? !edge.is_accessible_bwd : edge.is_accessible_bwd,
      };
    });

    setState({ edges });
  }

  function generateSql() {
    if (state.nodes.length === 0) {
      window.alert("No nodes added yet.");
      return;
    }

    const nodeValues = state.nodes
      .map((node) => {
        const escapedName = node.name.replaceAll("'", "''");
        const escapedType = node.type.replaceAll("'", "''");
        return `(${node.id}, '${escapedName}', '${escapedType}', ${node.floorplan_id}, ${node.x}, ${node.y})`;
      })
      .join(",\n");

    const edgeValues = [];
    state.edges.forEach((edge) => {
      const escapedEdgeType = edge.edge_type.replaceAll("'", "''");
      edgeValues.push(
        `(${edge.source}, ${edge.target}, ${edge.weight.toFixed(2)}, ${edge.is_accessible_fwd ? "TRUE" : "FALSE"}, '${escapedEdgeType}')`,
      );
      edgeValues.push(
        `(${edge.target}, ${edge.source}, ${edge.weight.toFixed(2)}, ${edge.is_accessible_bwd ? "TRUE" : "FALSE"}, '${escapedEdgeType}')`,
      );
    });

    let sql = `-- Insert Nodes\nINSERT INTO nodes (node_id, node_name, node_type, floorplan_id, x_coord, y_coord) VALUES\n${nodeValues};\n`;

    if (edgeValues.length > 0) {
      sql += `\n-- Insert Edges (Two directed rows per connection)\nINSERT INTO edges (source, target, weight, is_accessible, edge_type) VALUES\n${edgeValues.join(",\n")};`;
    }

    console.log(sql);
    window.alert("SQL generated in browser console!");
  }

  function clearEdgeMenuTimer() {
    if (hideEdgeMenuTimer) {
      window.clearTimeout(hideEdgeMenuTimer);
      hideEdgeMenuTimer = null;
    }
  }

  function scheduleEdgeMenuHide() {
    clearEdgeMenuTimer();
    hideEdgeMenuTimer = window.setTimeout(() => {
      setState({ hoveredEdgeId: null });
    }, 120);
  }

  function showEdgeMenu(edgeId) {
    clearEdgeMenuTimer();
    setState({ hoveredEdgeId: edgeId });
  }

  function renderControls() {
    elements.addNodeBtn.classList.toggle("is-active", state.mode === "ADD_NODE");
    elements.addEdgeBtn.classList.toggle("is-active", state.mode === "ADD_EDGE");
    elements.undoBtn.disabled = state.history.length === 0;
    elements.clearBtn.disabled = state.nodes.length === 0;
    elements.nextNodeId.value = String(state.nextNodeId);
    elements.floorplanId.value = String(state.currentFloorplanId);
    elements.nodeName.value = state.currentNodeName;
    elements.nodeType.value = state.currentNodeType;
    elements.edgeType.value = state.currentEdgeType;
    elements.edgeAccessible.checked = state.currentIsAccessible;
    elements.zoomRange.value = String(state.zoom);
    elements.zoomLabel.textContent = `Zoom: ${Math.round(state.zoom * 100)}%`;
    elements.zoomPanel.classList.toggle("is-hidden", !state.imageUrl);
  }

  function renderCanvas() {
    const hasImage = Boolean(state.imageUrl);

    elements.emptyState.classList.toggle("is-hidden", hasImage);
    elements.canvasStage.classList.toggle("is-hidden", !hasImage);

    if (!hasImage) {
      elements.edgeLayer.innerHTML = "";
      elements.nodeLayer.innerHTML = "";
      elements.edgeMenuLayer.innerHTML = "";
      return;
    }

    elements.floorplanImage.src = state.imageUrl;
    elements.canvasStage.style.transform = `scale(${state.zoom})`;
    elements.canvasStage.classList.toggle("add-node-mode", state.mode === "ADD_NODE");

    const naturalWidth = elements.floorplanImage.naturalWidth || elements.floorplanImage.width || 0;
    const naturalHeight = elements.floorplanImage.naturalHeight || elements.floorplanImage.height || 0;

    if (naturalWidth > 0 && naturalHeight > 0) {
      elements.canvasStage.style.width = `${naturalWidth}px`;
      elements.canvasStage.style.height = `${naturalHeight}px`;
      elements.edgeLayer.setAttribute("viewBox", `0 0 ${naturalWidth} ${naturalHeight}`);
      elements.edgeLayer.setAttribute("width", String(naturalWidth));
      elements.edgeLayer.setAttribute("height", String(naturalHeight));
    }

    renderEdges();
    renderNodes();
    renderEdgeMenu();
  }

  function renderEdges() {
    elements.edgeLayer.innerHTML = "";

    state.edges.forEach((edge) => {
      const sourceNode = state.nodes.find((node) => node.id === edge.source);
      const targetNode = state.nodes.find((node) => node.id === edge.target);
      if (!sourceNode || !targetNode) {
        return;
      }

      const group = document.createElementNS(svgNs, "g");

      const visibleLine = document.createElementNS(svgNs, "line");
      visibleLine.setAttribute("x1", String(sourceNode.x));
      visibleLine.setAttribute("y1", String(sourceNode.y));
      visibleLine.setAttribute("x2", String(targetNode.x));
      visibleLine.setAttribute("y2", String(targetNode.y));
      visibleLine.setAttribute("stroke", getEdgeColor(edge));
      visibleLine.setAttribute("stroke-width", "4");
      group.appendChild(visibleLine);

      const hitboxLine = document.createElementNS(svgNs, "line");
      hitboxLine.setAttribute("x1", String(sourceNode.x));
      hitboxLine.setAttribute("y1", String(sourceNode.y));
      hitboxLine.setAttribute("x2", String(targetNode.x));
      hitboxLine.setAttribute("y2", String(targetNode.y));
      hitboxLine.setAttribute("stroke", "transparent");
      hitboxLine.setAttribute("stroke-width", "25");
      hitboxLine.setAttribute("class", "edge-hitbox");
      hitboxLine.addEventListener("mouseenter", () => showEdgeMenu(edge.id));
      hitboxLine.addEventListener("mouseleave", scheduleEdgeMenuHide);
      group.appendChild(hitboxLine);

      elements.edgeLayer.appendChild(group);
    });
  }

  function renderNodes() {
    elements.nodeLayer.innerHTML = "";

    state.nodes.forEach((node) => {
      const nodeElement = document.createElement("button");
      nodeElement.type = "button";
      nodeElement.className = "node";
      nodeElement.classList.toggle("is-selectable", state.mode === "ADD_EDGE");
      nodeElement.style.left = `${node.x - 8}px`;
      nodeElement.style.top = `${node.y - 8}px`;
      nodeElement.style.background = getNodeColor(node);
      nodeElement.style.zIndex = state.hoveredNodeId === node.id ? "50" : "10";

      nodeElement.addEventListener("click", (event) => handleNodeClick(event, node.id));
      nodeElement.addEventListener("mouseenter", () => setState({ hoveredNodeId: node.id }));
      nodeElement.addEventListener("mouseleave", () => setState({ hoveredNodeId: null }));

      if (state.hoveredNodeId === node.id) {
        const label = document.createElement("span");
        label.className = "node-label";
        label.textContent = `${node.id}: ${node.name}`;
        nodeElement.appendChild(label);
      }

      elements.nodeLayer.appendChild(nodeElement);
    });
  }

  function renderEdgeMenu() {
    elements.edgeMenuLayer.innerHTML = "";

    if (state.hoveredEdgeId === null) {
      return;
    }

    const edge = state.edges.find((entry) => entry.id === state.hoveredEdgeId);
    if (!edge) {
      return;
    }

    const sourceNode = state.nodes.find((node) => node.id === edge.source);
    const targetNode = state.nodes.find((node) => node.id === edge.target);
    if (!sourceNode || !targetNode) {
      return;
    }

    const menu = document.createElement("div");
    menu.className = "edge-menu";
    menu.style.left = `${(sourceNode.x + targetNode.x) / 2}px`;
    menu.style.top = `${(sourceNode.y + targetNode.y) / 2}px`;
    menu.addEventListener("mouseenter", clearEdgeMenuTimer);
    menu.addEventListener("mouseleave", scheduleEdgeMenuHide);

    const forwardLabel = document.createElement("label");
    const forwardInput = document.createElement("input");
    forwardInput.type = "checkbox";
    forwardInput.checked = edge.is_accessible_fwd;
    forwardInput.addEventListener("change", () => toggleEdgeAccess(edge.id, "fwd"));
    forwardLabel.appendChild(forwardInput);
    forwardLabel.append(`Fwd: Node ${edge.source} -> ${edge.target}`);

    const backwardLabel = document.createElement("label");
    const backwardInput = document.createElement("input");
    backwardInput.type = "checkbox";
    backwardInput.checked = edge.is_accessible_bwd;
    backwardInput.addEventListener("change", () => toggleEdgeAccess(edge.id, "bwd"));
    backwardLabel.appendChild(backwardInput);
    backwardLabel.append(`Bwd: Node ${edge.target} -> ${edge.source}`);

    menu.appendChild(forwardLabel);
    menu.appendChild(backwardLabel);
    elements.edgeMenuLayer.appendChild(menu);
  }

  function bindEvents() {
    elements.imageUpload.addEventListener("change", handleImageUpload);

    elements.addNodeBtn.addEventListener("click", () => {
      setState({ mode: "ADD_NODE", selectedNodeId: null });
    });

    elements.addEdgeBtn.addEventListener("click", () => {
      setState({ mode: "ADD_EDGE" });
    });

    elements.undoBtn.addEventListener("click", handleUndo);
    elements.clearBtn.addEventListener("click", handleClearAll);
    elements.generateSqlBtn.addEventListener("click", generateSql);

    elements.nextNodeId.addEventListener("input", (event) => {
      setState({ nextNodeId: Number.parseInt(event.target.value, 10) || 1 });
    });

    elements.floorplanId.addEventListener("input", (event) => {
      setState({ currentFloorplanId: Number.parseInt(event.target.value, 10) || 1 });
    });

    elements.nodeName.addEventListener("input", (event) => {
      setState({ currentNodeName: event.target.value });
    });

    elements.nodeType.addEventListener("change", (event) => {
      setState({ currentNodeType: event.target.value });
    });

    elements.edgeType.addEventListener("change", (event) => {
      setState({ currentEdgeType: event.target.value });
    });

    elements.edgeAccessible.addEventListener("change", (event) => {
      setState({ currentIsAccessible: event.target.checked });
    });

    elements.zoomRange.addEventListener("input", (event) => {
      setState({ zoom: Number.parseFloat(event.target.value) || 1 });
    });

    elements.floorplanImage.addEventListener("click", handleCanvasClick);
    elements.floorplanImage.addEventListener("load", render);

    window.addEventListener("beforeunload", () => {
      if (uploadedImageObjectUrl) {
        URL.revokeObjectURL(uploadedImageObjectUrl);
      }
    });
  }

  function render() {
    renderControls();
    renderCanvas();
  }

  bindEvents();
  render();
})();
