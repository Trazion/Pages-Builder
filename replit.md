# Perfume Landing Page Builder

## Overview
A professional perfume-focused Landing Page Builder system that allows creating, managing, and customizing luxury perfume landing pages.

## Features
- **Theme Engine**: 10+ perfume-themed templates with JSON-based configuration
- **Page Generation**: Create landing pages with brand name, logo, and custom content
- **Logo Upload**: Support for PNG, JPG, SVG, WebP images
- **AI Assistance**: Theme suggestions and copy generation based on perfume type
- **Pages Management**: View, edit, duplicate, and delete pages
- **Live Preview**: Preview generated pages in real-time

## Project Structure
```
/
├── app.js                    # Express server with API routes
├── public/
│   ├── dashboard.html        # Main dashboard UI
│   ├── css/
│   │   └── dashboard.css     # Dashboard styles
│   └── js/
│       └── dashboard.js      # Dashboard logic
├── src/
│   ├── themes/
│   │   └── themes.json       # Theme library (10 themes)
│   ├── pages/
│   │   ├── pages.json        # Pages database
│   │   └── generated/        # Generated HTML pages
│   └── uploads/              # Uploaded logo files
```

## Available Themes
1. Luxury Oud - Dark, Arabic, Oriental
2. Floral Soft - Feminine, Romantic
3. Fresh Citrus - Energetic, Summer
4. Sensual Night - Mysterious, Seductive
5. Minimal White - Clean, Modern
6. Dark Masculine - Bold, Powerful
7. Feminine Rose - Elegant, Romantic
8. Modern Luxury - Sophisticated, Premium
9. Oriental Gold - Rich, Exotic
10. Clean Fresh - Aquatic, Light

## API Endpoints
- `GET /api/themes` - List all themes
- `GET /api/pages` - List all pages
- `POST /api/pages` - Create new page
- `PUT /api/pages/:id` - Update page
- `POST /api/pages/:id/duplicate` - Duplicate page
- `DELETE /api/pages/:id` - Delete page
- `POST /api/upload-logo` - Upload logo image
- `POST /api/ai/suggest-theme` - AI theme suggestion
- `POST /api/ai/generate-copy` - AI copy generation

## Tech Stack
- Node.js + Express
- Vanilla JavaScript
- HTML/CSS
- Multer (file uploads)

## Running the Project
The server runs on port 5000. Access the dashboard at the root URL.
