import React, { useState } from 'react';
import { calculateDistance } from '../utils/mathHelpers'

// EXPORT DEFAULT FUNCTION SvgCanvas(props) {
export default function SvgCanvas({ imageUrl, mode, vertices, setVertices, edges, setEdges }){
  // --- LOCAL STATE ---
  // Create state 'draftEdge' (default: null). 
  const [draftEdge, setDraftEdge] = useState(null); 
  // This tracks the edge currently being dragged. 
  // Shape when active: { sourceId: "v1", startX: 10, startY: 20, currentX: 50, currentY: 60 }


  // --- EVENT HANDLERS ---

  // FUNCTION handleSvgClick(event):
  //    (This fires when clicking the empty background)
  //    IF mode is NOT 'ADD_NODE', exit function early.
  //    Get X and Y from event.nativeEvent.offsetX and offsetY
  //    Create a new node object: { id: Date.now().toString(), x: X, y: Y }
  //    Update 'vertices' state by appending this new node.
}





  // FUNCTION handleNodeMouseDown(event, clickedNode):
  //    (This fires when the user clicks and holds on an existing node)
  //    event.stopPropagation() // Prevents handleSvgClick from firing at the same time
  //    IF mode is NOT 'ADD_EDGE', exit early.
  //    Set 'draftEdge' state to start at clickedNode's x/y, and set sourceId to clickedNode.id.

  // FUNCTION handleSvgMouseMove(event):
  //    IF 'draftEdge' is null, exit early (we aren't dragging anything).
  //    Get current X and Y from event.nativeEvent.offsetX and offsetY
  //    Update 'draftEdge' state so its currentX and currentY match the mouse.

  // FUNCTION handleNodeMouseUp(event, targetNode):
  //    (This fires when the user lets go of the mouse OVER a node)
  //    event.stopPropagation()
  //    IF 'draftEdge' is null, exit early.
  //    IF targetNode.id is the same as draftEdge.sourceId, exit early (can't connect to itself).
  //    
  //    Calculate weight = calculateDistance(draftEdge.startX, draftEdge.startY, targetNode.x, targetNode.y)
  //    Create new edge object: { source: draftEdge.sourceId, target: targetNode.id, weight: weight }
  //    Update 'edges' state by appending this new edge.
  //    Set 'draftEdge' to null (drag is over).

  // FUNCTION handleSvgMouseUp(event):
  //    (This fires if the user lets go of the mouse over the empty background, missing a node)
  //    Set 'draftEdge' to null to cancel the drawing.

  // --- RENDER (RETURN JSX) ---
  // RETURN a relative-positioned wrapper <div>
  
      // Render the floorplan <img>:
      // set src={imageUrl}, style to width: '100%', userDrag: 'none' (prevents browser from ghost-dragging the image)

      // Render the <svg> overlay:
      // set style to position: 'absolute', top: 0, left: 0, width: '100%', height: '100%'
      // attach onClick={handleSvgClick}
      // attach onMouseMove={handleSvgMouseMove}
      // attach onMouseUp={handleSvgMouseUp}

          // INSIDE SVG: Render Saved Edges
          // Map through 'edges' array:
          //    Find source node in 'vertices' using edge.source
          //    Find target node in 'vertices' using edge.target
          //    Render an SVG <line> from source x/y to target x/y.

          // INSIDE SVG: Render Draft Edge (if user is dragging)
          // IF 'draftEdge' is not null:
          //    Render an SVG <line> from draftEdge.startX/startY to draftEdge.currentX/currentY

          // INSIDE SVG: Render Vertices
          // Map through 'vertices' array:
          //    Render an SVG <circle> at cx={vertex.x} and cy={vertex.y}.
          //    Attach onMouseDown={(e) => handleNodeMouseDown(e, vertex)}
          //    Attach onMouseUp={(e) => handleNodeMouseUp(e, vertex)}
// }
