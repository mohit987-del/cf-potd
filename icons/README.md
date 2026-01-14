# Icon Placeholder Files

The extension uses SVG icons. For production use, you should convert these to PNG files:

## Required sizes:
- icon16.png (16x16)
- icon48.png (48x48)  
- icon128.png (128x128)

## To convert:
1. Open icon128.svg in a browser or graphics editor
2. Export/save as PNG at the required sizes
3. Replace the .png references in manifest.json

Alternatively, you can use online tools like:
- https://cloudconvert.com/svg-to-png
- https://svgtopng.com/

For now, the extension will work with the SVG file as a placeholder, but Chrome prefers PNG icons for better compatibility.
