# Game Activity Tracker

A client-side web app for discovering popular Steam games, building a personal library, and planning what to play and what to buy. Built with React, Vite, and Tailwind CSS. All data is stored locally in the browser.

## Features

- **Browse top games on Steam** — the Dashboard pulls the 50 most-played titles right now from the SteamSpy API, with a bundled fallback list if the API is unreachable
- **Live cover art** — each tile shows the official Steam header image and links straight to the store page
- **Free / paid badge** — free-to-play games are highlighted with a green FREE badge; paid games show their price
- **Add to library** — quick action from the ⋮ menu on any game tile; the same tile stays on the Dashboard but its menu now reads "✓ In your library"
- **Plan to play** — schedule a game from your library for a specific date and time
- **Plan to buy** — wishlist paid games you want to pick up later (the option is hidden for free-to-play titles)
- **Persistent state** — your library, planner, and wishlist are saved to `localStorage` and survive page reloads
- **Custom theme** — Tailwind color tokens are driven by CSS variables, so the entire palette is themable
- **Light / Dark mode** — toggle from the header; the choice is saved to `localStorage` and applied before paint to avoid flashes
- **Steam store integration** — clicking any cover opens the official Steam store page in a new tab
- **Loading + offline-friendly** — skeleton placeholders while loading; automatic fallback to a bundled JSON list of 50 popular games when the API fails

## User Flows

### Discovering games
1. Open the **Dashboard**
2. Browse the grid of top 50 games sorted by current concurrent players
3. The label in the top-right shows whether the data is live (`Source: SteamSpy`) or from the bundled fallback
4. Click any cover to open the game's official Steam store page in a new tab

### Adding a game to your library
1. On any Dashboard tile, click the ⋮ button in the bottom-right
2. Choose **Add to library**
3. You are redirected to the **Library** page where the game now appears
4. Returning to the Dashboard, the same tile remains visible — its menu now shows "✓ In your library"

### Planning when to play a game
1. Open the **Library** page
2. Click the **Plan play** badge on any saved game card
3. Pick a date and time in the modal
4. Tap **Save to Planner** — the game is moved/updated in your planner with that scheduled time

### Wishlisting a paid game
1. On the Dashboard, click ⋮ on a paid game
2. Choose **Plan to buy**
3. The game is added to your wishlist; the menu now shows "✓ Plan to buy"
4. Free games never show this option

### Switching theme
1. Tap the **☾ Dark / ☀ Light** button in the top-right of the header
2. The preference is stored in `localStorage` under `gat-theme`
3. On next launch, your last theme is applied immediately, before the first paint

### Removing entries
1. Open the **Library** page
2. Tap **Remove** under any game card
3. The game is removed from your library; it is still visible on the Dashboard and can be re-added

## Storage Format

All persisted data lives in `localStorage` under the key `gat-lists-v1`:

```json
{
  "library":  [{ "appid": 730, "name": "Counter-Strike 2", "developer": "Valve", "addedAt": 1730000000000 }],
  "planner":  [{ "appid": 730, "name": "Counter-Strike 2", "developer": "Valve", "addedAt": 1730000000000, "notificationDateTime": "2025-01-10T15:00" }],
  "wishlist": [{ "appid": 1086940, "name": "Baldur's Gate 3", "developer": "Larian Studios", "addedAt": 1730000000000 }],
  "history":  []
}
```

The theme preference is stored separately under `gat-theme` (`"light"` or `"dark"`).

## Data Source

- **Live**: [SteamSpy](https://steamspy.com/) — `?request=top100in2weeks`, sliced to 50, sorted by current concurrent users
- **Fallback**: a bundled list of 50 popular Steam appids in [`src/data/fallbackTopGames.js`](src/data/fallbackTopGames.js) — used automatically if the API fails (CORS, network, etc.)
- **Cover art**: served from Steam's CDN at `https://cdn.cloudflare.steamstatic.com/steam/apps/{appid}/header.jpg`
- **Store links**: `https://store.steampowered.com/app/{appid}`

No API key is required; the app is fully client-side.

## Stack

- **React 18** + **Vite 5**
- **Tailwind CSS 3** with a custom CSS-variable color system for theming
- **React Router 6** for client-side routing (Dashboard / Library / Planner / Calendar)
- **date-fns** for date math
- **localStorage** for persistence (no backend)
- **gh-pages** for one-command deploy to GitHub Pages

## Running Locally

```bash
npm install
npm run dev
```

The app runs at `http://localhost:5173/Web6/`.

## Deploying to GitHub Pages

```bash
npm run deploy
```

This builds the app and pushes the `dist/` folder to the `gh-pages` branch. Make sure `base` in [`vite.config.js`](vite.config.js), `basename` in [`src/main.jsx`](src/main.jsx), and `homepage` in [`package.json`](package.json) all match your repository name.
