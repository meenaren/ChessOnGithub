# P2P Chess Application Architecture (Revised)

This document outlines the revised architecture for the Peer-to-Peer (P2P) Chess application, incorporating modern development practices and leveraging established libraries to accelerate development and enhance reliability. This revision is based on valuable feedback and aims to create a robust, maintainable, and developer-friendly foundation.

## 1. Core Principles & Goals

*   **Modularity:** Clear separation of concerns between UI, game logic, and P2P communication.
*   **Leverage Libraries:** Utilize well-tested libraries like `chess.js` for core game logic and `react-chessboard` for UI rendering to reduce custom code and improve reliability.
*   **Modern Tooling:** Employ a build tool like Vite for an optimized development experience and efficient production builds.
*   **Developer Experience:** Emphasize practices like TypeScript and clear documentation to improve maintainability and AI agent compatibility.
*   **Client-Side Focus:** Adhere to the GitHub Pages hosting constraint by ensuring all logic runs client-side.

## 2. Core Components

The application will be structured into three main client-side modules:

1.  **UI Module (View & Controller - React-based):**
    *   **Responsibilities:**
        *   Rendering the main application shell and views using React.
        *   Displaying the chessboard and pieces using the `react-chessboard` component.
        *   Handling user interactions with the board (piece selection, moves) via `react-chessboard`'s callbacks.
        *   Managing UI state (e.g., selected piece, connection status display, notifications).
        *   Rendering game status information (current turn, check, checkmate, stalemate).
        *   Providing UI elements for game creation (hosting) and joining.
        *   Ensuring responsive design and handling touch events for mobile usability.
    *   **Interacts with:** Game Logic Module (to get game state, send move attempts), P2P Communication Module (for connection setup UI and status).
    *   **Key Technology:** React, `react-chessboard`.

2.  **Game Logic Module (Model & Service):**
    *   **Responsibilities:**
        *   Managing the authoritative game state using an instance of `chess.js`.
        *   Providing an interface to `chess.js` for making moves, validating moves, getting legal moves, and checking game status (check, checkmate, stalemate, draw conditions).
        *   Translating actions from the UI or P2P module into `chess.js` operations.
        *   Emitting events or updating shared state when the game state changes (e.g., after a local or remote move).
    *   **Interacts with:** UI Module, P2P Communication Module.
    *   **Key Technology:** `chess.js`.

3.  **P2P Communication Module (Service):**
    *   **Responsibilities:**
        *   Initializing and managing the P2P connection using a WebRTC library (e.g., Trystero or PeerJS).
        *   Handling the creation of a game session (Host role) and generating/displaying a Game ID.
        *   Handling joining an existing game session using a Game ID (Joiner role).
        *   Serializing and deserializing game messages (e.g., moves, game state updates, control messages).
        *   Notifying other modules (likely via a pub/sub mechanism or state updates) of connection status changes (connected, disconnected, error) and received data.
    *   **Interacts with:** UI Module (for connection setup and status), Game Logic Module (to send/receive game data).
    *   **Key Technology:** Trystero (recommended) or PeerJS.

## 3. High-Level System Diagram

```mermaid
flowchart TD
    subgraph Player A (Client - Browser)
        A_UI[UI Module (React + react-chessboard)]
        A_GL[Game Logic Module (chess.js wrapper)]
        A_P2P[P2P Comm Module (Trystero/PeerJS)]
        A_State[(Shared State / EventBus)]
    end

    subgraph Player B (Client - Browser)
        B_UI[UI Module (React + react-chessboard)]
        B_GL[Game Logic Module (chess.js wrapper)]
        B_P2P[P2P Comm Module (Trystero/PeerJS)]
        B_State[(Shared State / EventBus)]
    end

    A_UI -- User Input (Move) --> A_GL
    A_GL -- Validate & Update chess.js instance --> A_GL
    A_GL -- Publish GameState Change --> A_State
    A_State -- Notify --> A_UI
    A_UI -- Re-render based on new GameState --> A_UI

    A_GL -- Send Move Data --> A_P2P
    A_P2P -- Transmit via WebRTC --> SignalingNetwork{Signaling Network (e.g., WebTorrent Trackers for Trystero / PeerJS Server)}
    SignalingNetwork -- Facilitate Connection/Data --> B_P2P

    B_P2P -- Receive Move Data --> B_GL
    B_GL -- Apply Opponent Move to chess.js instance --> B_GL
    B_GL -- Publish GameState Change --> B_State
    B_State -- Notify --> B_UI
    B_UI -- Re-render based on new GameState --> B_UI

    %% Connection UI Flow
    A_UI -- Host/Join Action --> A_P2P
    B_UI -- Host/Join Action --> B_P2P
    A_P2P -- Publish Connection Status --> A_State
    B_P2P -- Publish Connection Status --> B_State
    A_State -- Notify --> A_UI
    B_State -- Notify --> B_UI
```

## 4. Component Interfaces (Conceptual)

Actual interfaces will be refined, especially with React components and `chess.js`.

### 4.1. UI Module (Conceptual Hooks/Props for React Components)
*   `useGameConnection()`: Hook to interact with P2P module (host, join, send messages, get connection status).
*   `useGameState()`: Hook to get current game state from Game Logic Module (board FEN, turn, status).
*   `BoardComponent (react-chessboard)`:
    *   Props: `position` (FEN string), `onDrop` (callback for move attempt), `orientation`, `arePiecesDraggable`, etc.
*   `GameControlsComponent`: Buttons for host, join, input for Game ID.
*   `StatusDisplayComponent`: Shows current turn, check/mate status, connection info.

### 4.2. Game Logic Module (Service Interface)
*   `initializeGame(options)`: Creates/resets a `chess.js` instance.
*   `makeMove(moveObject)`: Attempts a move (e.g., `{ from: 'e2', to: 'e4' }`). Returns success/failure and new game state.
*   `getGameState()`: Returns current game state (FEN, turn, isCheck, isCheckmate, isStalemate, etc.).
*   `loadFEN(fenString)`: Loads a game state from FEN.
*   `onGameStateUpdate(callback)`: Subscribes to game state changes.

### 4.3. P2P Communication Module (Service Interface)
*   `initialize(callbacks)`:
    *   `callbacks.onPeerOpen(localPeerId)`
    *   `callbacks.onConnectionEstablished(remotePeerId)`
    *   `callbacks.onDataReceived(data)`
    *   `callbacks.onConnectionClosed()`
    *   `callbacks.onError(error)`
*   `hostGame()`: Returns local Peer ID (Game ID).
*   `joinGame(gameId)`
*   `sendMessage(data)`
*   `closeConnection()`

**P2P Message Types (Example):**
*   `{ type: "MOVE", payload: { from: 'e2', to: 'e4', promotion: 'q' } }`
*   `{ type: "GAME_INIT", payload: { hostColor: 'white', gameId: 'xyz' } }` (Joiner to Host on connect)
*   `{ type: "GAME_START", payload: { startingFEN: '...', opponentPeerId: 'abc' } }` (Host to Joiner)
*   `{ type: "RESIGN" }`

## 5. Technology Stack

*   **Core Language:** **TypeScript** (Recommended for type safety and AI agent compatibility).
*   **UI Framework:** **React**.
*   **Chessboard Component:** **`react-chessboard`**.
*   **Game Logic Library:** **`chess.js`**.
*   **P2P Communication Library:** **Trystero** (Recommended for modern features and robust connection via WebTorrent trackers) or **PeerJS**.
*   **Build Tool:** **Vite** (Recommended for fast development and optimized builds).
*   **Styling:** CSS3 / CSS Modules / Styled-components (developer choice, compatible with React).
*   **Markup:** HTML5 (managed by React and Vite).

## 6. State Management

*   **Local Component State:** Managed by React's `useState` and `useReducer` hooks within components.
*   **Shared Global State / Inter-Module Communication:**
    *   **React Context API:** For simple global state needed by various components (e.g., connection status, game ID).
    *   **Lightweight Pub/Sub Event Bus:** For decoupled communication between modules (e.g., P2P module signaling a new message to the Game Logic module). Example:
        ```typescript
        // utils/eventBus.ts
        type EventCallback = (data?: any) => void;
        interface Events { [key: string]: EventCallback[]; }

        export const eventBus = {
          events: {} as Events,
          subscribe(event: string, callback: EventCallback) { /* ... */ },
          publish(event: string, data?: any) { /* ... */ },
          unsubscribe(event: string, callback: EventCallback) { /* ... */ }
        };
        ```

## 7. Directory Structure (with Vite and TypeScript)

```
/chess-on-github/
├── index.html                 # Entry point for Vite
├── package.json
├── tsconfig.json
├── vite.config.ts
├── README.md
├── architecture.md            # This file
├── specifications/
├── public/                    # Static assets copied to dist
│   └── favicon.ico
└── src/
    ├── main.tsx               # React app entry point
    ├── App.tsx                # Main React application component
    ├── components/            # Reusable React UI components
    │   ├── Board.tsx          # Wrapper around react-chessboard if needed
    │   ├── ConnectionManager.tsx
    │   └── StatusDisplay.tsx
    ├── modules/
    │   ├── gameLogic.ts       # Wrapper for chess.js, game state management
    │   └── p2pService.ts      # P2P connection logic (Trystero/PeerJS)
    ├── hooks/                 # Custom React hooks
    │   └── useGameConnection.ts
    ├── styles/
    │   └── main.css
    ├── utils/
    │   ├── eventBus.ts
    │   └── types.ts           # TypeScript type definitions
    └── assets/                # Images, etc., imported by components
```

## 8. Mobile Responsiveness & Accessibility

*   **Viewport Meta Tag:** Include `<meta name="viewport" content="width=device-width, initial-scale=1.0">` in `index.html`.
*   **Responsive CSS:** Use flexible layouts (Flexbox, Grid), relative units, and media queries. `react-chessboard` offers some responsiveness.
*   **Touch Events:** Ensure `react-chessboard` and custom interactive elements handle touch events correctly for intuitive mobile interaction.
*   **Accessibility:** `react-chessboard` provides some accessibility features. Strive for ARIA attributes and keyboard navigation where appropriate.

## 9. Development Best Practices / AI Agent Compatibility

*   **TypeScript:** Use static typing for all code to improve clarity, catch errors early, and make interfaces explicit.
*   **JSDoc/TSDoc:** Write clear, concise documentation for functions, classes, types, and modules.
*   **Modularity:** Design small, single-responsibility functions and modules.
*   **Consistent Naming & Formatting:** Use a code formatter (e.g., Prettier) and linter (e.g., ESLint) integrated with Vite.
*   **Clear Interfaces:** Define clear data structures and API contracts between modules.

## 10. GitHub Pages Hosting & Deployment

*   **Build Process:** Vite will produce an optimized static build in the `dist/` directory.
*   **Base Path:** Configure `vite.config.ts` with the correct `base` path for GitHub Pages (e.g., `base: '/repository-name/'`).
*   **Deployment:**
    *   Manual: Push the contents of `dist/` to the `gh-pages` branch.
    *   Automated: Implement a GitHub Actions workflow to build and deploy to GitHub Pages on pushes to the main branch.
        ```yaml
        # .github/workflows/deploy.yml
        name: Deploy to GitHub Pages
        on:
          push:
            branches: [ main ] # Or your default branch
        jobs:
          build-and-deploy:
            runs-on: ubuntu-latest
            steps:
              - uses: actions/checkout@v3
              - name: Set up Node.js
                uses: actions/setup-node@v3
                with:
                  node-version: '18' # Or your preferred LTS version
              - name: Install dependencies
                run: npm ci
              - name: Build
                run: npm run build # Assumes 'build' script in package.json runs Vite build
              - name: Deploy
                uses: JamesIves/github-pages-deploy-action@v4
                with:
                  branch: gh-pages # The branch the action should deploy to
                  folder: dist     # The folder the action should deploy
        ```

This revised architecture aims to provide a more robust and modern foundation for the P2P Chess application.