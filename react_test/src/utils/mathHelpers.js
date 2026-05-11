export function calculateDistance(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  // Returns the distance rounded to 2 decimal places
  return Math.round(Math.sqrt(dx * dx + dy * dy) * 100) / 100; 
}
