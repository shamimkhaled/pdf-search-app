# Bengali PDF Voter Search System

A fast, efficient, and user-friendly web-based Bengali PDF search system for searching across multiple voter list PDFs. Similar to Google Drive or desktop PDF viewers, but optimized for preview, navigation, and highlighting.

## Features

- ⚡ **Ultra-Fast Search**: O(1) lookup complexity using inverted index - search 200 PDFs in <100ms
- 🔍 **Smart Indexing**: Progressive background indexing with real-time progress tracking
- 📄 **PDF Preview**: Modern embedded browser preview with smooth navigation
- 🎯 **Auto-Navigation**: Automatically navigates to pages containing search results
- ✨ **Text Highlighting**: Beautiful gradient highlighting for matched Bengali text
- 📊 **Voter Information Modal**: Click highlighted text to see detailed voter information
- 🎨 **Modern UI/UX**: Gradient designs, smooth animations, and intuitive interface
- 🔄 **Debounced Search**: Auto-searches as you type with 300ms debounce
- 💾 **Persistent Caching**: IndexedDB caching for instant subsequent searches
- 📱 **Fully Responsive**: Beautiful design on desktop, tablet, and mobile

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn

## Installation

1. Install dependencies:
```bash
npm install
```

2. Copy your PDF files to the `public/` directory:
```bash
# Example: Copy all PDFs to public folder
cp /path/to/your/pdfs/*.pdf public/
```

3. Update the PDF list in `src/utils/pdfDiscovery.js` or create a `public/pdf-manifest.json` file (see below)

## Running the Application

1. Start the development server:
```bash
npm start
```

2. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Adding More PDFs

### Method 1: Update the Discovery File (Recommended for < 50 PDFs)

Edit `src/utils/pdfDiscovery.js` and add your PDFs to the default list:

```javascript
return [
  { 
    filename: 'your-pdf-1.pdf', 
    path: '/your-pdf-1.pdf',
    displayName: 'Center Name'
  },
  // Add more PDFs here...
];
```

### Method 2: Use Manifest File (Recommended for 50+ PDFs)

Create a `public/pdf-manifest.json` file:

```json
{
  "version": "1.0",
  "pdfs": [
    {
      "filename": "261229_com_2_hijra_without_photo_1_2025-11-24.pdf",
      "path": "/261229_com_2_hijra_without_photo_1_2025-11-24.pdf",
      "displayName": "Center 261229 - Hijra"
    },
    {
      "filename": "261225_com_1235_male_without_photo_70_2025-11-24.pdf",
      "path": "/261225_com_1235_male_without_photo_70_2025-11-24.pdf",
      "displayName": "Center 261225 - Male"
    }
  ]
}
```

The application will automatically load PDFs from this manifest file.

## How to Use

1. **Search**: Enter a Bengali voter name, voter ID, or any keyword in the search box
2. **View Results**: See all PDFs containing matches in the left panel
3. **Select PDF**: Click on a PDF result to open it in the viewer
4. **Navigate**: Use Previous/Next buttons to navigate through search results
5. **View Details**: Click on highlighted text to see detailed voter information in a modal

## Technical Details

### Architecture

- **React 18**: Modern React with hooks
- **react-pdf**: PDF rendering in the browser
- **pdfjs-dist**: PDF text extraction and search
- **IndexedDB**: Caching for fast repeated searches

### Performance Optimizations

1. **Inverted Index**: Hash-based O(1) lookup per word - search 200 PDFs in milliseconds
2. **Progressive Indexing**: Background indexing with progress tracking - doesn't block UI
3. **IndexedDB Caching**: Persistent storage - index survives browser restarts
4. **Debounced Search**: 300ms debounce reduces unnecessary searches while typing
5. **Smart Tokenization**: Handles Bengali and English with n-gram matching
6. **Relevance Scoring**: Results sorted by frequency and multi-word matches
7. **Lazy Loading**: Only loads full page text when needed for highlighting

See [OPTIMIZATION.md](./OPTIMIZATION.md) for detailed performance metrics.

### Search Mechanism

- Uses basic text search (no AI, OCR, or NLP)
- Case-insensitive Bengali text matching
- Regex-based pattern matching
- Works with Unicode Bengali text

## Project Structure

```
src/
├── components/
│   ├── PDFViewer.js          # PDF viewer with search and highlighting
│   ├── PDFList.js            # List of search results
│   ├── VoterInfoModal.js     # Modal for displaying voter information
│   └── *.css                 # Component styles
├── services/
│   ├── pdfIndexService.js    # PDF indexing and search service
│   └── pdfFileService.js     # PDF file management
├── utils/
│   └── pdfDiscovery.js       # PDF file discovery utility
├── App.js                     # Main application component
└── index.js                   # Entry point
```

## Notes

- The application requires text-based PDFs (not scanned images)
- PDF.js worker is loaded from CDN
- Search works by extracting text from PDF pages and matching patterns
- Highlighting is done by modifying the text layer of rendered PDF pages
- IndexedDB cache persists across browser sessions

## Building for Production

```bash
npm run build
```

This creates an optimized production build in the `build/` directory.

## Troubleshooting

### PDFs not loading
- Ensure PDFs are in the `public/` directory
- Check that PDF paths in the manifest or discovery file are correct
- Verify PDFs are text-based (not scanned images)

### Search not working
- Clear IndexedDB cache: Open browser DevTools > Application > IndexedDB > Delete
- Check browser console for errors
- Ensure PDFs contain searchable text

### Performance issues
- Clear IndexedDB cache to rebuild indices
- Reduce number of PDFs if searching is too slow
- Consider using a server-side API for PDF indexing in production

## License

This project is for internal use.