export function downloadJson(dataObject, filename = "nus_floorplan_graph.json") {
  // 1. Convert the JavaScript object to a formatted JSON string
  const jsonString = JSON.stringify(dataObject, null, 2);
  
  // 2. Create a "Blob" (a file-like object of immutable, raw data)
  const blob = new Blob([jsonString], { type: "application/json" });
  
  // 3. Create a temporary URL for the Blob
  const url = URL.createObjectURL(blob);
  
  // 4. Create an invisible anchor tag, attach the URL, and force a click
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link); // Required for some browsers
  link.click();
  
  // 5. Clean up
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
