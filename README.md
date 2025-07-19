# PDF Generation API

Simple Node.js API that generates PDF reports with dynamic data.

## Features ✅

1. **Backend API** - Express.js server
2. **Header with logos** - Left and right logo placeholders  
3. **Sections** - Dynamic sections with headings and details
4. **Borderless tables** - Key-value pairs, handles text overflow
5. **Line charts** - Multiple data series with colors and legends
6. **Page numbers** - Footer pagination
7. **Person details** - Different fields on first vs subsequent pages

## Quick Start

```bash
# Install dependencies
npm install

# Start server
npm start
```

Server runs on: http://localhost:3000

## Generate PDF

```bash
# Generate PDF with sample data
curl -X POST http://localhost:3000/generate-pdf -o report.pdf
```

## Files

- `app.js` - Complete implementation (single file)
- `package.json` - Dependencies  
- `LOGOBRAINWAVE.jpeg` - Logo image used in headers
- `final-corrected-report.pdf` - Sample generated PDF

## Show to Recruiter

1. Run `npm start` 
2. Run the curl command above
3. Open the generated PDF to see:
   - **Professional multi-page layout** (2 pages with content)
   - **Header with BrainWave logos** (left and right)
   - **Person details section** (4 fields on page 1, 8 fields on page 2)
   - **Dynamic sections with borderless tables**
   - **Line charts** with multiple data series and legends
   - **Correct page numbering** at bottom

✅ **Fixed Issues:**
- Second page now has proper content (Skills & Experience)
- Page numbering appears correctly on each page
- Headers with actual logos on both pages

All requirements implemented in clean, simple code! 
