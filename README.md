# CleanPDF — Local-First, Zero-Knowledge PDF Engine

> **A fast, minimal, 100% client-side PDF utility. Zero uploads, zero tracking, zero limits.**

![CleanPDF Banner](https://raw.githubusercontent.com/serhattunaatalay1/clean-pdf/main/preview.png)

## Why CleanPDF?

Most popular PDF tools (iLovePDF, Smallpdf, etc.):
1. Upload sensitive documents, contracts, and ID scans to their private remote servers.
2. Impose arbitrary daily limits and paywalls after 2 or 3 operations.
3. Clutter the screen with intrusive pop-up ads and subscription nagging.

**CleanPDF solves this at the browser engine level:**
- **100% Local & Private:** Runs entirely inside your browser's memory (`Uint8Array`) using `pdf-lib` and Mozilla's `PDF.js`. Files **never** leave your device. Works completely offline.
- **Zero Paywalls or Limits:** Process 2 pages or 500 pages with zero restrictions.
- **Zero Friction:** No signup, no passwords, no email collection. Just drag, select, and save.

---

## Core Capabilities

1. **✂️ Visual Split & Extract:**
   - Visual page thumbnail previews for instant inspection.
   - 1-click quick selection (All, Odd pages, Even pages, Clear) or manual range input (`1-3, 5`).
   - Download selected pages as a **Single PDF** or export every page as separate files in a **.ZIP archive**.
2. **📑 PDF Merge:**
   - Combine multiple PDF documents into a single organized file with drag & re-order controls.
3. **🔄 Organize, Rotate & Delete:**
   - View live page thumbnails, rotate skewed pages 90°, delete unwanted pages, and export cleaned documents.
4. **🖼️ Image to PDF:**
   - Convert collections of JPG, PNG, and WebP images into standardized A4 or native-resolution PDF documents.

---

## Quick Start

### Option 1: Direct in Browser (No installation)
Simply open `index.html` in any modern web browser (Chrome, Edge, Firefox, Safari).

### Option 2: Local Server (Windows / Mac / Linux)
```bash
# Run with Node.js
node server.js
```
Open `http://localhost:3940` in your browser.

Or on Windows, double click `start.bat`.

---

## License

MIT License — free for personal and commercial use.
