import React, { useState } from 'react';
import SvgCanvas from './components/SvgCanvas';
import { downloadJson } from './utils/exportHelpers'


// EXPORT DEFAULT FUNCTION App() {
export default function App(){
  // --- STATE DECLARATIONS ---
  // 1. Create state for 'imageUrl' (default: null)
  const [imageUrl, setImageUrl] = useState(null);

  // 2. Create state for 'mode' (default: 'ADD_NODE') -> toggles between ADD_NODE and ADD_EDGE
  const [mode, setMode] = useState('ADD_NODE');

  // 3. Create state for 'vertices' (default: empty array [])
  const [vertices, setVertices] = useState([]);

  // 4. Create state for 'edges' (default: empty array [])
  const [edges, setEdges] = useState([]);
  
  // --- HANDLERS ---
  // FUNCTION handleImageUpload(event):
  const handleImageUpload = (event) => {
    //    Get the file from event.target.files[0]
    const file = event.target.files[0];
    //    If file exists, generate a URL using URL.createObjectURL(file)
    if (file) {
      const url = URL.createObjectURL(file);
    }
    //    Set 'imageUrl' state to this new URL
    setImageUrl(url);
  }

  // FUNCTION handleExport():
  const handleExport = () => {
  //    Create an object: { vertices: currentVerticesState, edges: currentEdgesState }
  const dataObject = { vertices, edges };
  //    Call downloadJson(thatObject)
  downloadJson(dataObject, "nus_floorplan_graph.json");
  }

  // --- RENDER ---
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: 'sans-serif' }}>
      
      {/* SECTION: Toolbar */}
      <div style={{ padding: '15px', background: '#2c3e50', color: 'white', display: 'flex', gap: '15px', alignItems: 'center' }}>
        
        {/* The Image Uploader */}
        <input 
          type="file" 
          accept="image/*" 
          onChange={handleImageUpload} 
          style={{ cursor: 'pointer' }}
        />

        {/* Mode Buttons */}
        <button 
          onClick={() => setMode('ADD_NODE')}
          style={{ 
            background: mode === 'ADD_NODE' ? '#3498db' : '#ecf0f1', 
            color: mode === 'ADD_NODE' ? 'white' : 'black',
            padding: '8px 16px', border: 'none', borderRadius: '4px', cursor: 'pointer'
          }}
        >
          Mode: Add Nodes
        </button>

        <button 
          onClick={() => setMode('ADD_EDGE')}
          style={{ 
            background: mode === 'ADD_EDGE' ? '#2ecc71' : '#ecf0f1', 
            color: mode === 'ADD_EDGE' ? 'white' : 'black',
            padding: '8px 16px', border: 'none', borderRadius: '4px', cursor: 'pointer'
          }}
        >
          Mode: Draw Edges
        </button>

        {/* Export Button (Pushed to the far right using marginLeft: auto) */}
        <button 
          onClick={handleExport} 
          style={{ 
            marginLeft: 'auto', background: '#e74c3c', color: 'white', 
            padding: '8px 16px', border: 'none', borderRadius: '4px', cursor: 'pointer' 
          }}
        >
          Export JSON
        </button>

      </div>

      {/* SECTION: Workspace */}
      <div style={{ flex: 1, overflow: 'auto', background: '#ecf0f1', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '20px' }}>
        
        {/* Conditional Rendering: Only show the canvas if an image is uploaded */}
        {imageUrl ? (
          <SvgCanvas 
            imageUrl={imageUrl} 
            mode={mode} 
            vertices={vertices} 
            setVertices={setVertices} 
            edges={edges} 
            setEdges={setEdges} 
          />
        ) : (
          <div style={{ marginTop: '100px', color: '#7f8c8d', fontSize: '1.2rem' }}>
            Please upload a floorplan image to begin.
          </div>
        )}

      </div>
    </div>
  );



}
