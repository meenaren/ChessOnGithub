# Specification: Resign Button Functionality

## 1. Overview

This document outlines the specifications for the "Resign" button functionality in the chess game. When a player chooses to resign, they will be asked for confirmation. Upon confirmation, their opponent will be notified, and the game status will be updated to reflect the resignation and the opponent's victory.

## 2. User Story

"As a player, when I click the 'Resign' button, I want to be asked for confirmation. If I confirm, my opponent should be notified of my resignation, and the game status should be updated to reflect that I have resigned and my opponent has won."

## 3. Functional Requirements

### 3.1. Resign Button Click
    - **FR3.1.1:** When a player clicks the "Resign" button, a confirmation dialog/modal MUST be displayed.
    - **TDD Anchor:** `// TEST: Clicking resign button displays confirmation dialog`

### 3.2. Confirmation Dialog
    - **FR3.2.1:** The confirmation message SHOULD clearly ask the player if they are sure they want to resign.
        - Suggested text: "Are you sure you want to resign? This will result in a loss."
    - **FR3.2.2:** The dialog MUST provide options to "Confirm" or "Cancel" the resignation.
    - **TDD Anchor:** `// TEST: Confirmation dialog shows correct message and options`

### 3.3. Confirmation Action
    - **FR3.3.1:** If the player confirms resignation:
        - **FR3.3.1.1:** A resignation message MUST be sent to the opponent.
        - **FR3.3.1.2:** The game state MUST be updated to reflect the resignation.
        - **FR3.3.1.3:** The resigning player's UI MUST display a message indicating they resigned and lost (e.g., "You resigned. Opponent wins.").
        - **FR3.3.1.4:** The game controls (e.g., moving pieces) MUST be disabled for both players.
    - **TDD Anchor:** `// TEST: Confirming resignation sends notification and updates game state`
    - **TDD Anchor:** `// TEST: Resigning player UI shows resignation loss message`
    - **TDD Anchor:** `// TEST: Game controls disabled after resignation`

### 3.4. Cancellation Action
    - **FR3.4.1:** If the player cancels resignation, the confirmation dialog MUST be closed, and the game MUST continue as normal.
    - **TDD Anchor:** `// TEST: Cancelling resignation closes dialog and game continues`

### 3.5. Opponent Notification
    - **FR3.5.1:** The opponent MUST receive a notification that the other player has resigned.
    - **FR3.5.2:** The opponent's UI MUST display a message indicating their opponent resigned and they won (e.g., "Opponent resigned. You win!").
    - **FR3.5.3:** The game controls (e.g., moving pieces) MUST be disabled for the opponent.
    - **TDD Anchor:** `// TEST: Opponent receives resignation notification`
    - **TDD Anchor:** `// TEST: Opponent UI shows resignation win message`

### 3.6. Game Status Update
    - **FR3.6.1:** The overall game status (potentially stored in a shared game state object) MUST be updated to indicate:
        - The game is over.
        - The reason for the game ending (resignation).
        - The winner and loser.
        - Example status: `{ gameOver: true, outcome: 'resignation', winner: 'black', loser: 'white', reason: 'White resigned.' }`
    - **TDD Anchor:** `// TEST: Game status object correctly reflects resignation outcome`

## 4. Opponent Notification Message Format

A JSON message format SHOULD be used for notifying the opponent over the P2P connection.

```json
{
  "type": "gameEvent",
  "event": "resignation",
  "payload": {
    "resigningPlayerColor": "white", // or "black"
    "timestamp": "YYYY-MM-DDTHH:mm:ss.sssZ"
  }
}
```
    - **TDD Anchor:** `// TEST: Resignation P2P message has correct format and payload`

## 5. Game Status Display

### 5.1. Resigning Player
    - The UI SHOULD display a clear message, for example:
        - If White resigns: "You resigned. Black wins."
        - If Black resigns: "You resigned. White wins."

### 5.2. Opponent (Winner)
    - The UI SHOULD display a clear message, for example:
        - If White resigns: "White resigned. You win!"
        - If Black resigns: "Black resigned. You win!"

### 5.3. Spectators (if applicable)
    - The UI SHOULD display a clear message, for example:
        - "White resigned. Black wins."

    - **TDD Anchor:** `// TEST: UI correctly displays game outcome messages for both players`

## 6. Edge Cases and Constraints

### 6.1. Resigning when it's not the player's turn
    - **EC6.1.1:** A player SHOULD be able to resign at any point during their turn or the opponent's turn, as long as the game is ongoing. The "Resign" button should always be active unless the game is over.
    - **TDD Anchor:** `// TEST: Player can resign when it is not their turn`

### 6.2. Resigning when the game is already over
    - **EC6.2.1:** If the game is already over (e.g., checkmate, stalemate, prior resignation), the "Resign" button SHOULD be disabled or, if clicked, should not trigger the resignation flow.
    - **Constraint:** The game state must accurately reflect `gameOver` status.
    - **TDD Anchor:** `// TEST: Resign button is disabled or inactive if game is already over`

### 6.3. Network Issues during Resignation
    - **EC6.3.1:** If the resignation message fails to send to the opponent (e.g., P2P connection lost):
        - The resigning player's game SHOULD still end locally (they have confirmed resignation).
        - The system MAY attempt to resend the message or mark the game as abandoned due to connection loss if the opponent cannot be reached after a timeout. This needs further specification if complex retry logic is desired. For now, assume the local resignation is final.
        - The UI for the resigning player should still reflect their resignation.
    - **TDD Anchor:** `// TEST: Resignation is processed locally even if P2P notification fails`

### 6.4. Simultaneous Actions (e.g., opponent makes a move as player resigns)
    - **EC6.4.1:** Resignation should take precedence. If a resignation is confirmed, any concurrent move received from the opponent that has not yet been fully processed locally should ideally be disregarded in favor of the game ending by resignation. The game state update due to resignation should be atomic.
    - **Constraint:** Requires careful handling of message sequencing and state updates.
    - **TDD Anchor:** `// TEST: Resignation takes precedence over concurrent opponent move`

## 7. Pseudocode Anchors (for implementation in separate pseudocode files)

### [`src/components/ResignButtonComponent.tsx`](../../src/components/ResignButtonComponent.tsx) (Illustrative - actual file might be part of a larger GameControls component)
```pseudocode
// FUNCTION handleResignClick()
  // // TEST: Clicking resign button displays confirmation dialog
  // DISPLAY confirmation_dialog("Are you sure you want to resign? This will result in a loss.", onConfirmResign, onCancelResign)

// FUNCTION onConfirmResign()
  // // TEST: Confirming resignation sends notification and updates game state
  // // TEST: Resigning player UI shows resignation loss message
  // // TEST: Game controls disabled after resignation
  // // TEST: Resignation is processed locally even if P2P notification fails
  // // TEST: Resignation takes precedence over concurrent opponent move
  // current_player_color = GET_CURRENT_PLAYER_COLOR()
  // game_id = GET_CURRENT_GAME_ID()

  // // 1. Update local game state immediately
  // UPDATE_GAME_STATE(game_id, {
  //   gameOver: TRUE,
  //   outcome: "resignation",
  //   winner: GET_OPPONENT_COLOR(current_player_color),
  //   loser: current_player_color,
  //   reason: current_player_color + " resigned."
  // })
  // // TEST: Game status object correctly reflects resignation outcome

  // // 2. Notify UI to update display for resigning player
  // EMIT_UI_EVENT("display_game_outcome", {
  //   message: "You resigned. " + GET_OPPONENT_COLOR(current_player_color) + " wins."
  // })
  // // TEST: UI correctly displays game outcome messages for both players (resigning player part)

  // // 3. Disable game controls
  // DISABLE_GAME_CONTROLS()

  // // 4. Send notification to opponent
  // resignation_message = CREATE_JSON_MESSAGE({
  //   type: "gameEvent",
  //   event: "resignation",
  //   payload: {
  //     resigningPlayerColor: current_player_color,
  //     timestamp: GET_CURRENT_TIMESTAMP()
  //   }
  // })
  // // TEST: Resignation P2P message has correct format and payload
  // SEND_P2P_MESSAGE(GET_OPPONENT_ID(), resignation_message)
  //   .ON_FAILURE (error) => LOG_ERROR("Failed to send resignation notification: " + error) // Handle potential failure

// FUNCTION onCancelResign()
  // // TEST: Cancelling resignation closes dialog and game continues
  // HIDE confirmation_dialog()
```

### [`src/modules/GameService.ts`](../../src/modules/GameService.ts) (Illustrative - handles incoming P2P messages)
```pseudocode
// FUNCTION handleIncomingP2PMessage(message)
  // IF message.type == "gameEvent" AND message.event == "resignation"
    // // TEST: Opponent receives resignation notification
    // // TEST: Opponent UI shows resignation win message
    // // TEST: Game controls disabled after resignation (for opponent)
    // // TEST: Resignation takes precedence over concurrent opponent move (opponent side)
    // resigning_player_color = message.payload.resigningPlayerColor
    // local_player_color = GET_LOCAL_PLAYER_COLOR()
    // game_id = GET_CURRENT_GAME_ID()

    // // 1. Update local game state
    // UPDATE_GAME_STATE(game_id, {
    //   gameOver: TRUE,
    //   outcome: "resignation",
    //   winner: local_player_color, // Opponent is the winner
    //   loser: resigning_player_color,
    //   reason: resigning_player_color + " resigned."
    // })
    // // TEST: Game status object correctly reflects resignation outcome (opponent side)

    // // 2. Notify UI to update display for opponent (winner)
    // EMIT_UI_EVENT("display_game_outcome", {
    //   message: resigning_player_color + " resigned. You win!"
    // })
    // // TEST: UI correctly displays game outcome messages for both players (opponent part)

    // // 3. Disable game controls
    // DISABLE_GAME_CONTROLS()
```

### [`src/components/GameControls.tsx`](../../src/components/GameControls.tsx) (Illustrative - contains the resign button)
```pseudocode
// FUNCTION RENDER_RESIGN_BUTTON()
  // game_state = GET_GAME_STATE()
  // IF game_state.gameOver
    // // TEST: Resign button is disabled or inactive if game is already over
    // RENDER Button(text="Resign", onClick=handleResignClick, disabled=TRUE)
  // ELSE
    // // TEST: Player can resign when it is not their turn (button is enabled)
    // RENDER Button(text="Resign", onClick=handleResignClick, disabled=FALSE)