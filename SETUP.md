# Quick Setup Guide

## Adding Your 130 PDF Files

### Step 1: Copy PDFs to Public Folder

```bash
# Copy all your PDF files to the public directory
cp /path/to/your/pdfs/*.pdf /home/shamimkhaled/pdf-search-website/public/
```

### Step 2: Create PDF Manifest (Recommended)

Create a file `public/pdf-manifest.json` with all your PDFs:

```json
{
  "version": "1.0",
  "pdfs": [
    {
      "filename": "your-pdf-1.pdf",
      "path": "/your-pdf-1.pdf",
      "displayName": "Center Name 1"
    },
    {
      "filename": "your-pdf-2.pdf",
      "path": "/your-pdf-2.pdf",
      "displayName": "Center Name 2"
    }
  ]
}
```

**Quick Script to Generate Manifest:**

You can use this Node.js script to auto-generate the manifest:

```javascript
// generate-manifest.js
const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, 'public');
const pdfFiles = fs.readdirSync(publicDir)
  .filter(file => file.endsWith('.pdf'))
  .map(file => ({
    filename: file,
    path: `/${file}`,
    displayName: file.replace('.pdf', '')
  }));

const manifest = {
  version: '1.0',
  generatedAt: new Date().toISOString(),
  pdfs: pdfFiles
};

fs.writeFileSync(
  path.join(publicDir, 'pdf-manifest.json'),
  JSON.stringify(manifest, null, 2)
);

console.log(`Generated manifest with ${pdfFiles.length} PDFs`);
```

Run it with:
```bash
node generate-manifest.js
```

### Step 3: Alternative - Update Discovery File

If you prefer not to use a manifest, edit `src/utils/pdfDiscovery.js` and update the default list.

## Performance Tips

1. **First Search**: The first search will index all PDFs (this may take a few minutes for 130 PDFs)
2. **Subsequent Searches**: Will be much faster due to IndexedDB caching
3. **Clear Cache**: If PDFs are updated, clear IndexedDB cache in browser DevTools

## Testing

1. Start the app: `npm start`
2. Search for a known voter name or ID
3. Verify results appear in the left panel
4. Click a result to open the PDF
5. Click highlighted text to see voter info modal

## Troubleshooting

- **PDFs not appearing**: Check that PDFs are in `public/` folder and manifest is correct
- **Slow first search**: Normal for 130 PDFs - subsequent searches will be faster
- **No results**: Ensure PDFs contain searchable text (not scanned images)
