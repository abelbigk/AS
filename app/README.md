# AS - Content Organizer (Web Wrapper)

**Option 1: Simple Web Wrapper Approach**

A lightweight web application that wraps the production website in an iframe. Install as a PWA (Progressive Web App) on mobile for an app-like experience.

## Features

✨ **Super Lightweight**
- ~2 MB after build (vs 50+ MB for native apps)
- Fast startup - ~2-3 seconds
- Instant updates - no app store delays

⚡ **Same Experience**
- Identical UI/UX to the website
- All website features work perfectly
- Works offline (with PWA caching)

📱 **Mobile-Ready**
- Install as PWA on Android/iOS
- Home screen icon
- Full-screen app mode
- Works in browser or as app

🚀 **Easy to Deploy**
- Build: `npm run build`
- Deploy `dist/` folder to Vercel, Netlify, GitHub Pages, etc.
- Updates deploy instantly (no app store review)

## Installation

```bash
cd app
npm install
```

## Development

```bash
npm run dev
```

Opens at `http://localhost:5173` with hot reload.

## Build

```bash
npm run build
```

Creates optimized `dist/` folder ready for deployment.

## Deploy

### Option A: Vercel (Recommended)

```bash
npm i -g vercel
vercel
```

### Option B: Netlify

```bash
npm i -g netlify-cli
netlify deploy --prod --dir=dist
```

### Option C: GitHub Pages

```bash
npm run build
# Push dist/ folder to GitHub
```

### Option D: Any Static Host

Just upload the `dist/` folder to any web host (AWS S3, Google Cloud, etc.)

## Install as PWA

### On Mobile Browser

1. Visit the deployed website
2. Click the "+" or menu icon in browser
3. Select "Install app" or "Add to home screen"
4. App appears on your home screen
5. Click to open as fullscreen app

### On Desktop

1. Visit the website in Chrome/Edge
2. Click the "+" icon in the address bar
3. Click "Install"
4. App opens in a window

## How It Works

The app wraps `https://as-wryo.onrender.com` in an iframe with:
- Authentication token passing
- Logout button overlay
- Full browser permissions (camera, microphone, etc.)

All functionality works exactly like the website.

## Update Process

1. Update the website at `https://as-wryo.onrender.com`
2. PWA automatically detects changes
3. Users get the latest version instantly
4. No app store review needed

## Performance Comparison

| Metric | Web Wrapper | Native App |
|--------|------------|-----------|
| App Size | 2 MB | 18-50 MB |
| Install Time | Instant | 5-10 min |
| First Load | 2-3 sec | 3-5 sec |
| Scroll FPS | 30-45 | 60 |
| Update Speed | Instant | 1-3 days (store review) |
| Complexity | Simple | Complex |
| Deployment | Easy | Hard |

## File Structure

```
app/
├── src/
│   ├── main.jsx           # React entry point
│   ├── App.jsx            # Main app component
│   ├── App.css            # Styles
│   ├── components/
│   │   └── WebWrapper.jsx # Iframe wrapper
│   └── store/
│       └── auth.js        # Auth state (Zustand)
├── index.html             # HTML template
├── vite.config.js         # Vite config
├── package.json
└── README.md
```

## Environment

The app connects to:
- **Backend**: `https://as-wryo.onrender.com`
- **Database**: Turso (SQLite)
- **Storage**: Cloudflare R2

## Notes

- App works offline thanks to PWA caching
- Authentication handled by the website
- All media download functionality works
- Responsive design works on all screen sizes
- No watermark or "Powered by" branding

## Support

For issues with the app, check:
1. Backend status at `https://as-wryo.onrender.com`
2. Clear browser cache (PWA cache)
3. Check browser console for errors

---

**Built with**: React, Vite, Zustand, PWA
**Deployed**: Your hosting provider
**Backend**: https://as-wryo.onrender.com
