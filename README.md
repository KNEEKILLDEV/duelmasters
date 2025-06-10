# Duel Masters Card Viewer

## Setup

1. Install dependencies:
   ```
   npm install
   ```
2. Generate card data:
   ```
   npm run generate
   ```
3. Deploy:
   ```
   firebase deploy --only hosting
   ```

## Structure

- `scripts/` – Data generation scripts
- `public/` – Static site served by Firebase Hosting
