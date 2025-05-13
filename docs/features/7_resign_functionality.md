# Resign Functionality

This document outlines the user-facing and technical details of the resign functionality in the chess application.

## 1. User Guide

This section explains how a player can resign from a game, the confirmation process, and the outcome.

### 1.1. How to Resign

A player can resign from an ongoing game by clicking the "Resign" button located in the navigation bar. This button is generally active as long as the game is in progress and not yet over.

### 1.2. Confirmation Process

To prevent accidental resignations, a confirmation dialog appears after clicking the "Resign" button.
-   The dialog title is "Confirm Resignation".
-   The message displayed is: "Are you sure you want to resign? This will result in a loss."
-   Players have two options:
    -   **Confirm:** Proceeds with the resignation.
    -   **Cancel:** Closes the dialog, and the game continues as normal.

### 1.3. Outcome of Resigning

If a player confirms their resignation:
-   The resigning player immediately loses the game.
-   The opponent immediately wins the game.
-   The game is marked as over.
-   Game controls (like moving pieces) will be disabled for both players.
-   The UI will update to reflect the game's outcome (see [UI Reflection of Resignation](#25-ui-reflection-of-resignation)).

## 2. Technical Details

This section provides an overview for developers and maintainers regarding the implementation of the resign functionality.

### 2.1. Overview of Resignation Flow

The resignation process can be summarized as follows:

1.  **Player Initiates Resignation:**
    *   The player clicks the "Resign" button in the [`NavBar.tsx`](src/components/NavBar.tsx:1) component.
2.  **Confirmation:**
    *   A confirmation dialog is displayed.
    *   If the player confirms, the `onResignConfirm` callback (which is [`handleConfirmResign()`](src/App.tsx:413) in [`App.tsx`](src/App.tsx:1)) is triggered.
3.  **Local State Update & P2P Message Sending (Resigning Player):**
    *   [`handleConfirmResign()`](src/App.tsx:413) in [`App.tsx`](src/App.tsx:1):
        *   Calls [`p2pService.createResignMessage()`](src/modules/p2pService.ts:113) to construct the resignation message.
        *   Sends this message to the opponent via the P2P connection (`sendGameData`).
        *   Calls [`gameLogic.handleResignation()`](src/modules/gameLogic.ts:157) to update the local game state immediately.
        *   Updates the React state (`gameState`) to reflect the resignation.
4.  **P2P Message Reception (Opponent):**
    *   The opponent's [`App.tsx`](src/App.tsx:1) receives the `RESIGN` message in its `useEffect` hook that processes `receivedData`.
    *   The `RESIGN` message case calls [`gameLogic.handleResignation()`](src/modules/gameLogic.ts:157) using the `resigningPlayerColor` from the message payload.
    *   Updates the opponent's React state (`gameState`) to reflect the resignation.
5.  **UI Update (Both Players):**
    *   The UI components ([`NavBar.tsx`](src/components/NavBar.tsx:1), [`StatusDisplay.tsx`](src/components/StatusDisplay.tsx:1)) re-render based on the updated `gameState`, displaying the resignation outcome.
    *   Game controls (e.g., piece movement on the [`Board.tsx`](src/components/Board.tsx:1)) are disabled as `isGameOver` becomes `true`.

### 2.2. Key Functions and Components

Several key functions and components are involved in the resignation process:

#### 2.2.1. UI Interaction & Confirmation ([`src/components/NavBar.tsx`](src/components/NavBar.tsx:1))

*   **Resign Button:**
    *   Located in the `NavBar` component.
    *   Disabled if `isGameOver` is `true` or `localPlayerColor` is `null`.
    *   On click, calls [`handleResignClick()`](src/components/NavBar.tsx:90).
*   [`handleResignClick(): void`](src/components/NavBar.tsx:90):
    *   Sets state `openResignConfirmDialog` to `true` to display the confirmation dialog.
*   **Resign Confirmation Dialog:**
    *   A Material UI `Dialog` component.
    *   Title: "Confirm Resignation".
    *   Message: "Are you sure you want to resign? This will result in a loss."
    *   Actions: "Cancel" and "Confirm" buttons.
*   [`handleCloseResignDialog(confirmed: boolean): void`](src/components/NavBar.tsx:94):
    *   Closes the dialog.
    *   If `confirmed` is `true` and `localPlayerColor` exists, it calls the `onResignConfirm` prop (passed from [`App.tsx`](src/App.tsx:1)).

#### 2.2.2. P2P Message Creation & Handling ([`src/modules/p2pService.ts`](src/modules/p2pService.ts:1))

*   [`createResignMessage(resigningPlayerColor: PlayerColor): ResignMessage`](src/modules/p2pService.ts:113):
    *   Constructs the P2P message object for resignation.
    *   Message `type`: `P2PMessageKeyEnum.RESIGN`.
    *   `payload`: Contains `resigningPlayerColor` and a `timestamp`.
*   [`handleReceivedResignation(payload: ResignPayload | null | undefined): void`](src/modules/p2pService.ts:177):
    *   This function is not directly called by [`App.tsx`](src/App.tsx:1) for resign messages. Instead, [`App.tsx`](src/App.tsx:1) handles the `RESIGN` message type directly in its `useEffect` hook by calling [`gameLogic.handleResignation()`](src/modules/gameLogic.ts:157). The `p2pService` version publishes to an `eventBus`, which is a different pattern than what `App.tsx` currently uses for resignations.
    *   *(Note: The documentation reflects the actual implementation in `App.tsx` for message handling rather than assuming `handleReceivedResignation` from `p2pService.ts` is used for this specific flow.)*

#### 2.2.3. Game Logic for Resignation ([`src/modules/gameLogic.ts`](src/modules/gameLogic.ts:1))

*   [`handleResignation(currentFen: string, resigningPlayerColor: PlayerColor): GameLogicState`](src/modules/gameLogic.ts:157):
    *   Takes the current FEN and the color of the resigning player.
    *   Determines the `winner` (the opponent).
    *   Sets the `appStatus` to `GameStatus.RESIGNATION_WHITE_WINS` or `GameStatus.RESIGNATION_BLACK_WINS`.
    *   Returns a new `GameLogicState` object with:
        *   `isGameOver: true`
        *   `winner: <opponent_color>`
        *   `appStatus: <ResignationStatus>`
        *   `isCheckmate: false`, `isStalemate: false`, `isDraw: false`
        *   `drawType: null`

#### 2.2.4. Application Core Logic ([`src/App.tsx`](src/App.tsx:1))

*   [`handleConfirmResign(): void`](src/App.tsx:413) (called by `NavBar`'s `onResignConfirm`):
    *   Checks `localPlayerColor` and `isConnected`.
    *   Calls [`p2pService.createResignMessage()`](src/modules/p2pService.ts:113).
    *   Sends the message via `sendGameData()`.
    *   Calls [`gameLogic.handleResignation()`](src/modules/gameLogic.ts:157) with local player's color.
    *   Updates `gameState` using `setGameState()` with the result from `gameLogic.handleResignation()`.
*   **`useEffect` hook for `receivedData`** (specifically [`src/App.tsx:51-185`](src/App.tsx:51)):
    *   Handles incoming P2P messages.
    *   `case P2PMessageKeyEnum.RESIGN:` (lines [`src/App.tsx:168-182`](src/App.tsx:168)):
        *   Extracts `resignPayload`.
        *   Calls [`gameLogic.handleResignation()`](src/modules/gameLogic.ts:157) with the `resigningPlayerColor` from the payload.
        *   Updates `gameState` using `setGameState()` with the result.
*   [`getGameDisplayStatusForNavBar(...): string`](src/App.tsx:437):
    *   Determines the status string displayed in the `NavBar`.
    *   For `GameStatus.RESIGNATION_WHITE_WINS`:
        *   "You resigned. Black wins." (if local player was White)
        *   "Opponent resigned. White wins!" (if local player was Black)
    *   For `GameStatus.RESIGNATION_BLACK_WINS`:
        *   "You resigned. White wins." (if local player was Black)
        *   "Opponent resigned. Black wins!" (if local player was White)

#### 2.2.5. UI Status Display ([`src/components/StatusDisplay.tsx`](src/components/StatusDisplay.tsx:1))

*   The `StatusDisplay` component receives `gameStatus`, `localPlayerColor`, and `winner` as props.
*   It constructs `statusText` based on these props.
*   If `gameStatus` is `GameStatus.RESIGNATION_WHITE_WINS`:
    *   If `localPlayerColor` is 'b': "White resigned. You win!"
    *   If `localPlayerColor` is 'w': "You resigned. Black wins."
    *   Else (spectator/unassigned): "White resigned. Black wins."
*   If `gameStatus` is `GameStatus.RESIGNATION_BLACK_WINS`:
    *   If `localPlayerColor` is 'w': "Black resigned. You win!"
    *   If `localPlayerColor` is 'b': "You resigned. White wins."
    *   Else (spectator/unassigned): "Black resigned. White wins."
*   This `statusText` is displayed prominently.

### 2.3. P2P "Resign" Message Structure

The P2P message for resignation is defined in [`src/utils/types.ts`](src/utils/types.ts:1) and created by [`createResignMessage()`](src/modules/p2pService.ts:113) in [`src/modules/p2pService.ts`](src/modules/p2pService.ts:1).

```typescript
// From src/utils/types.ts
export enum P2PMessageKeyEnum {
  // ... other message types
  RESIGN = 'resign',
  // ... other message types
}

export interface ResignPayload {
  resigningPlayerColor: PlayerColor;
  timestamp: string; // ISO Date string, e.g., "YYYY-MM-DDTHH:mm:ss.sssZ"
}

export interface ResignMessage {
  type: P2PMessageKeyEnum.RESIGN;
  payload: ResignPayload;
}
```

-   **`type`**: `P2PMessageKeyEnum.RESIGN` (string value: `"resign"`)
-   **`payload`**:
    -   `resigningPlayerColor`: The color (`'w'` or `'b'`) of the player who resigned.
    -   `timestamp`: An ISO 8601 timestamp string indicating when the resignation occurred.

This structure matches the specification document ([`specifications/07_resign_functionality_spec.md`](specifications/07_resign_functionality_spec.md:56)).

### 2.4. Game State Update

Upon resignation (either locally confirmed or received from an opponent), the `gameState` in [`App.tsx`](src/App.tsx:1) is updated by calling [`gameLogic.handleResignation()`](src/modules/gameLogic.ts:157). This function returns a new `GameLogicState` (defined in [`src/modules/gameLogic.ts`](src/modules/gameLogic.ts:11)) with the following key changes:

-   `isGameOver`: Set to `true`.
-   `winner`: Set to the color of the non-resigning player (e.g., if 'w' resigns, `winner` becomes 'b').
-   `appStatus`: Set to:
    -   `GameStatus.RESIGNATION_WHITE_WINS` if Black resigned (White wins).
    -   `GameStatus.RESIGNATION_BLACK_WINS` if White resigned (Black wins).
-   `isCheckmate`: Set to `false`.
-   `isStalemate`: Set to `false`.
-   `isDraw`: Set to `false`.
-   `drawType`: Set to `null`.

The `fen` (board state) and `currentTurn` from before the resignation are preserved in the returned state from `getGameStatus` within `handleResignation`, though `currentTurn` becomes less relevant once `isGameOver` is true. The `moveHistory` is not directly modified by the resignation event itself.

### 2.5. UI Reflection of Resignation

The UI updates to reflect the resignation outcome primarily through the [`NavBar.tsx`](src/components/NavBar.tsx:1) and [`StatusDisplay.tsx`](src/components/StatusDisplay.tsx:1) components, based on the updated `gameState` from [`App.tsx`](src/App.tsx:1).

**1. [`NavBar.tsx`](src/components/NavBar.tsx:1):**
   - The "Resign" button itself becomes disabled because `isGameOver` in `gameState` becomes `true`.
   - The game status text (provided by [`getGameDisplayStatusForNavBar()`](src/App.tsx:437) in [`App.tsx`](src/App.tsx:1)) changes to:
     - If White (local player) resigned: "You resigned. Black wins."
     - If Black (opponent) resigned: "Opponent resigned. White wins!"
     - (And vice-versa if Black is the local player).

**2. [`StatusDisplay.tsx`](src/components/StatusDisplay.tsx:1):**
   - The main `statusText` updates based on `gameStatus` and `localPlayerColor`:
     - If `gameStatus` is `GameStatus.RESIGNATION_WHITE_WINS`:
       - Local player is Black: "White resigned. You win!"
       - Local player is White: "You resigned. Black wins."
       - Spectator/unassigned: "White resigned. Black wins."
     - If `gameStatus` is `GameStatus.RESIGNATION_BLACK_WINS`:
       - Local player is White: "Black resigned. You win!"
       - Local player is Black: "You resigned. White wins."
       - Spectator/unassigned: "Black resigned. White wins."

**3. [`Board.tsx`](src/components/Board.tsx:1) (Implicit):**
   - Piece movement and other interactions on the board are effectively disabled because game-ending conditions (like `isGameOver` being true, or `status` reflecting a game end state) prevent `handlePieceDrop` and `onBoardPromotionPieceSelect` in [`App.tsx`](src/App.tsx:1) from processing further moves.