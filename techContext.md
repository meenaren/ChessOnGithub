# Tech Context: ChessOnGithub

## 1. Technologies Used

- **Programming Language:** TypeScript
- **Frontend Framework:** React (version inferred from project setup, likely 17+ or 18+)
- **Chess Logic Library:** `chess.js`
- **Chessboard UI Library:** `react-chessboard`
- **P2P Communication:** Custom implementation (details in `p2pService.ts`, likely using WebRTC or a similar browser-based P2P API).
- **Build Tool/Bundler:** Vite (inferred from `vite.config.ts`, `index.html` structure)
- **Package Manager:** npm (inferred from `package.json` and `package-lock.json`)
- **Linting/Formatting:** ESLint (inferred from `eslint.config.js`), Prettier (commonly used with ESLint, though not explicitly listed as a file).
- **Styling:** CSS (standard CSS files like `App.css`, `index.css`, `src/styles/main.css`)

## 2. Development Setup

- **Node.js and npm:** Required to install dependencies and run scripts.
- **Code Editor:** VS Code (implied by the environment).
- **Development Server:** `npm run dev` (starts Vite's dev server).
- **Build Process:** `npm run build` (likely, standard Vite command).

## 3. Technical Constraints

- **Browser Compatibility:** Must work in modern web browsers that support the P2P technology being used (e.g., WebRTC).
- **No Backend Server (for core gameplay):** The game logic and communication are designed to be P2P, minimizing server-side dependencies for the game itself. A signaling server might be used by `p2pService.ts` for initial connection establishment, but this is an implementation detail of the P2P service.
- **Real-time Communication:** Requires low-latency communication for a good user experience.

## 4. Dependencies (Key Libraries)

- `react`
- `react-dom`
- `typescript`
- `vite`
- `chess.js`
- `react-chessboard`
- `@types/react`
- `@types/react-dom`
- `eslint`

(A more exhaustive list can be found in [`package.json`](package.json))

## 5. Tool Usage Patterns

- **Vite:** Used for development server, HMR (Hot Module Replacement), and production builds.
- **npm:** Used for managing project dependencies and running scripts defined in [`package.json`](package.json).
- **ESLint:** Used for static code analysis to find problems and enforce coding standards.
- **TypeScript Compiler (tsc):** Used for type checking and compiling TypeScript to JavaScript (though Vite handles much of the build process).