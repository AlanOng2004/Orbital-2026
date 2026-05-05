import cv2
import numpy as np
import argparse
import sys

# 1. Setup terminal arguments
parser = argparse.ArgumentParser(description="Interactive NavMesh Mask Generator")
parser.add_argument("image_path", help="Path to the floorplan image file")
args = parser.parse_args()

img = cv2.imread(args.image_path)

if img is None:
    print(f"Error: Could not load image at '{args.image_path}'")
    sys.exit(1)

# 2. Strict Color Masking (Isolate pure white)
lower_white = np.array([240, 240, 240]) 
upper_white = np.array([255, 255, 255])
binary_mask = cv2.inRange(img, lower_white, upper_white)

print("Opening Map. Please CLICK YOUR MOUSE anywhere inside the main white corridor.")

# 3. The Interactive Flood Fill Function
def fill_corridor(event, x, y, flags, param):
    # Listen for a Left Mouse Button Click
    if event == cv2.EVENT_LBUTTONDOWN:
        
        # Check if the user actually clicked on a white pixel
        if binary_mask[y, x] == 255:
            print(f"Corridor clicked at coordinates ({x}, {y}). Flooding...")
            
            # FloodFill requires a temporary mask that is exactly 2 pixels larger
            h, w = binary_mask.shape
            flood_mask = np.zeros((h+2, w+2), np.uint8)
            
            # Create a copy so we don't destroy our original binary mask
            filled_image = binary_mask.copy()
            
            # Flood fill outwards from the click! 
            # We fill it with Gray (127) so we can distinguish it from the rest of the white map.
            cv2.floodFill(filled_image, flood_mask, (x, y), 127)
            
            # Extract ONLY the area that turned Gray
            final_corridor = cv2.inRange(filled_image, 127, 127)
            
            # Display the result
            cv2.namedWindow('SUCCESS - Final Corridor', cv2.WINDOW_NORMAL)
            cv2.resizeWindow('SUCCESS - Final Corridor', 800, 600)
            cv2.imshow('SUCCESS - Final Corridor', final_corridor)
            
            print("Corridor isolated! Press any key to close the windows and exit.")
            
        else:
            print("Oops! You clicked a dark pixel (wall/room). Please click on the white hallway.")

# 4. Initialize the UI
cv2.namedWindow('Map - CLICK THE CORRIDOR', cv2.WINDOW_NORMAL)
cv2.resizeWindow('Map - CLICK THE CORRIDOR', 800, 600)

# Bind our mouse-click function to the window
cv2.setMouseCallback('Map - CLICK THE CORRIDOR', fill_corridor)

# Show the image and wait for the user
cv2.imshow('Map - CLICK THE CORRIDOR', img)
cv2.waitKey(0)
cv2.destroyAllWindows()
