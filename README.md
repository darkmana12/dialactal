<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1G2CW-SabgcaSuAySN4xpK_8EMSUQJylK

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Run the app:
   `npm run dev`

**Note:** Aucune clé d'API n'est nécessaire pour lancer le jeu. Le contenu provient uniquement de Wikipédia (APIs publiques) et fonctionne tel quel en local.

## Online Coop (beta)

We now support a simple online coop mode backed by a tiny WebSocket relay server.

### Start the relay server (local dev)

1. Start the relay server:

    - Ensure Node.js is installed.
    - From the repo root, run:
       - Windows PowerShell:
          - `node server/server.js`

It listens on ws://localhost:8787 by default.

### Use coop in the app

- Open the app (Vite dev or built site).
- In the left panel "Mode Coop", create a room or join with a code.
- Share the URL (contains `#room=CODE`). Participants in other browsers/machines can join if they can reach your WS server.

### Notes

- Minimal relay: no auth/persistence/NAT traversal. For production, deploy on a public host and adjust the WS URL in `App.tsx` (constructor of WebSocketSyncService).
- Synced events: guesses, reveal, new-game + article payload from the host.
- Broadcast loop prevention is handled on the client.
