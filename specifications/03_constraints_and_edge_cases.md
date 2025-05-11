# 3. Constraints and Edge Cases

## 3.1. Constraints

*   **C1: GitHub Pages Hosting:**
    *   The application must consist entirely of static files (HTML, CSS, JavaScript).
    *   No server-side backend can be used for game logic, user authentication, or persistent data storage (beyond what a P2P signaling server might temporarily facilitate for connection setup).
    *   All game logic and state management must occur client-side.
*   **C2: P2P Communication Dependency:**
    *   A third-party JavaScript library for WebRTC (e.g., PeerJS) will likely be used, introducing a dependency on that library's functionality and its own potential need for a signaling server (often provided by the library).
    *   Reliability of P2P connection depends on network conditions of both players and potential NAT traversal issues.
*   **C3: Client-Side Resources:**
    *   The application must be mindful of browser resource limitations (CPU, memory).
*   **C4: Security:**
    *   Since all logic is client-side, it's inherently more transparent. Cheating by manipulating client-side code is a possibility if not carefully considered, though for a simple P2P game, this might be an accepted limitation. The focus is on correct gameplay between consenting players.
    *   No sensitive user data should be stored or transmitted beyond what's necessary for gameplay (e.g., game ID).
*   **C5: No Persistent Game State:**
    *   Games cannot be saved and resumed later unless implemented using local browser storage, which would only be local to one player and not synchronized P2P for a shared save. This feature is out of scope for the basic version.
*   **C6: Two Players Only:**
    *   The application is designed strictly for two-player games. No spectator mode or multi-player (>2) functionality.
*   **C7: Basic Chess Rules:**
    *   Focus on core chess rules. Complex or less common rules (e.g., fifty-move rule, threefold repetition for draws) might be out of scope for the initial version to maintain simplicity, unless explicitly added. (Pawn promotion, castling, en passant are listed as optional FRs).

## 3.2. Edge Cases

### 3.2.1. Connection Issues
*   **EC1.1:** Host creates a game, but Joiner never connects.
    *   // TEST: Host UI waits for Joiner, provides option to cancel/timeout.
*   **EC1.2:** Joiner attempts to connect with an invalid/expired Game ID.
    *   // TEST: Joiner receives an "Invalid Game ID" error.
*   **EC1.3:** P2P connection fails to establish after a valid Game ID exchange (e.g., due to strict firewalls, NAT issues).
    *   // TEST: Both players receive a "Connection Failed" notification.
*   **EC1.4:** P2P connection drops mid-game.
    *   // TEST: Both players are notified; game might end or attempt reconnection (if implemented).
*   **EC1.5:** One player closes their browser tab/window abruptly.
    *   // TEST: The other player is notified of the disconnection.
*   **EC1.6:** Both players try to host and join each other simultaneously (less likely with Game ID model but consider P2P library behavior).

### 3.2.2. Gameplay Issues
*   **EC2.1:** Player attempts an illegal move (should be prevented by FR3.1 & FR3.5).
    *   // TEST: UI does not allow the move, provides feedback.
*   **EC2.2:** Rapid succession of moves or inputs from one player.
    *   // TEST: System handles inputs sequentially, maintains correct game state.
*   **EC2.3:** Discrepancy in game state between the two players (should be minimized by reliable P2P message passing).
    *   // TEST: Implement a basic sync check or rely on ordered message processing.
*   **EC2.4:** Player tries to move opponent's piece.
    *   // TEST: UI prevents selection/movement of opponent's pieces.
*   **EC2.5:** Browser performance issues on low-end devices affecting gameplay.
    *   // TEST: (Manual) Test on a range of devices if possible.
*   **EC2.6:** Player attempts to make a move when it's not their turn (should be prevented by FR3.2).
    *   // TEST: UI does not allow the move.

### 3.2.3. UI/Interaction Issues
*   **EC3.1:** Player resizes browser window during gameplay.
    *   // TEST: UI remains responsive and usable.
*   **EC3.2:** Loss of browser focus (player clicks outside the game window).
    *   // TEST: Game state is preserved; resumes correctly when focus returns.
*   **EC3.3:** Different screen resolutions or aspect ratios between players.
    *   // TEST: UI scales reasonably; core gameplay elements remain visible and usable.

### 3.2.4. Game Logic Specifics
*   **EC4.1:** Multiple pawn promotion choices if implemented (Queen, Rook, Bishop, Knight).
    *   // TEST: Player can select desired promotion piece.
*   **EC4.2:** Scenarios where castling rights are lost or conditions are not met.
    *   // TEST: Castling is only allowed when King/Rook haven't moved and path is clear.
*   **EC4.3:** Complex checkmate or stalemate patterns.
    *   // TEST: Logic correctly identifies these end conditions in various scenarios.