# 6. Game Loop and Core Logic Pseudocode

This pseudocode outlines the main game loop, move handling, and rule enforcement for the chess application. It assumes the P2P connection is established as per `specifications/05_p2p_connection_logic_pseudocode.md` and uses entities from `specifications/04_domain_model.md`.

## 6.1. Modules (Conceptual)
*   `gameModule`: Handles core game logic, rules, state.
*   `uiModule`: Handles all UI interactions and updates.
*   `p2pModule`: Handles sending/receiving messages (wraps `sendP2PMessage` and `PROCESS receivedP2PMessage` from P2P pseudocode).

## 6.2. Global Game State (Managed by `gameModule`, referencing `GAME_INSTANCE` from P2P logic)
```pseudocode
// GAME_INSTANCE from P2P logic holds:
//   board: Board object
//   currentPlayer: PlayerColor
//   gameStatus: GameStatus
//   localPlayerColor: PlayerColor
//   ... and other attributes from Domain Model's Game entity
```

## 6.3. Game Initialization (Called after P2P connection confirmed)
```pseudocode
MODULE gameModule:

    FUNCTION initializeGame(gameInstance):
        // TEST: Game board is initialized to the standard starting chess layout.
        // TEST: Current player is set to WHITE.
        // TEST: Game status is set to IN_PROGRESS.
        gameInstance.board.initializeDefaultSetup()
        gameInstance.currentPlayer = PlayerColor.WHITE
        gameInstance.gameStatus = GameStatus.IN_PROGRESS
        gameInstance.castlingRights = { whiteKingSide: true, whiteQueenSide: true, blackKingSide: true, blackQueenSide: true }
        gameInstance.enPassantTargetSquare = NULL
        gameInstance.moveHistory = [] // Initialize if using move history

        CALL uiModule.initializeBoard(gameInstance.localPlayerColor) // Pass local player color for board orientation
        CALL uiModule.updateBoardDisplay(gameInstance.board)
        CALL uiModule.updateTurnIndicator(gameInstance.currentPlayer)
        CALL uiModule.displayGameStatus(gameInstance.gameStatus)
    ENDFUNCTION
ENDMODULE
```

## 6.4. Player Turn and Move Handling
```pseudocode
MODULE uiModule:
    SELECTED_PIECE = NULL
    SELECTED_PIECE_SQUARE = NULL

    FUNCTION onSquareClick(clickedSquare):
        // TEST: Clicking on an empty square when no piece is selected does nothing.
        // TEST: Clicking on an opponent's piece when it's not your turn does nothing.
        // TEST: Clicking on your own piece selects it.
        // TEST: Clicking on a valid move square for a selected piece makes the move.
        // TEST: Clicking on an invalid move square for a selected piece gives feedback.
        // TEST: Clicking another of your own pieces deselects the current and selects the new one.

        IF GAME_INSTANCE.gameStatus IS NOT IN_PROGRESS AND GAME_INSTANCE.gameStatus IS NOT WHITE_IN_CHECK AND GAME_INSTANCE.gameStatus IS NOT BLACK_IN_CHECK:
            DISPLAY_NOTIFICATION("Game is over or not started.")
            RETURN
        ENDIF

        IF GAME_INSTANCE.currentPlayer IS NOT GAME_INSTANCE.localPlayerColor:
            DISPLAY_NOTIFICATION("Not your turn.")
            RETURN
        ENDIF

        clickedPiece = GAME_INSTANCE.board.getPieceAt(clickedSquare)

        IF SELECTED_PIECE_SQUARE IS NOT NULL: // A piece is already selected
            IF clickedSquare.isEqualTo(SELECTED_PIECE_SQUARE): // Clicked same square
                CALL deselectPiece()
            ELSE:
                // Attempt to make a move
                isValidMove = CALL gameModule.validateAndMakeMove(SELECTED_PIECE_SQUARE, clickedSquare)
                IF isValidMove:
                    // Move was made, game state updated by gameModule
                    CALL deselectPiece()
                ELSE:
                    // Invalid move, check if clicked on another of own pieces
                    IF clickedPiece IS NOT NULL AND clickedPiece.color == GAME_INSTANCE.localPlayerColor:
                        CALL selectPiece(clickedPiece, clickedSquare)
                    ELSE:
                        DISPLAY_NOTIFICATION("Invalid move for " + SELECTED_PIECE.type)
                        // Optionally, deselect or keep selected based on UX preference
                    ENDIF
                ENDIF
            ENDIF
        ELSE: // No piece selected yet
            IF clickedPiece IS NOT NULL AND clickedPiece.color == GAME_INSTANCE.localPlayerColor:
                CALL selectPiece(clickedPiece, clickedSquare)
            ENDIF
        ENDIF
    ENDFUNCTION

    FUNCTION selectPiece(piece, square):
        SELECTED_PIECE = piece
        SELECTED_PIECE_SQUARE = square
        possibleMoves = CALL gameModule.getLegalMovesForPiece(piece, square, GAME_INSTANCE.board, GAME_INSTANCE.castlingRights, GAME_INSTANCE.enPassantTargetSquare)
        // TEST: Legal moves for a selected piece are correctly identified and highlighted.
        CALL highlightSelectedSquare(square)
        CALL highlightLegalMoves(possibleMoves)
    ENDFUNCTION

    FUNCTION deselectPiece():
        CALL unhighlightSelectedSquare(SELECTED_PIECE_SQUARE)
        CALL unhighlightAllLegalMoves()
        SELECTED_PIECE = NULL
        SELECTED_PIECE_SQUARE = NULL
    ENDFUNCTION

    // Other UI functions: initializeBoard, updateBoardDisplay, updateTurnIndicator, displayGameStatus, highlightSquare, etc.
ENDMODULE


MODULE gameModule:
    FUNCTION validateAndMakeMove(fromSquare, toSquare):
        // TEST: Player cannot move if it's not their turn (already checked by UI, but good for direct calls).
        // TEST: Player cannot move an opponent's piece.
        // TEST: Move is validated against piece-specific movement rules.
        // TEST: Move is validated against putting own king in check.
        // TEST: Castling move is validated and executed correctly.
        // TEST: En passant move is validated and executed correctly.
        // TEST: Pawn promotion is handled.

        pieceToMove = GAME_INSTANCE.board.getPieceAt(fromSquare)
        IF pieceToMove IS NULL OR pieceToMove.color IS NOT GAME_INSTANCE.currentPlayer:
            RETURN false // Should not happen if UI logic is correct
        ENDIF

        legalMoves = getLegalMovesForPiece(pieceToMove, fromSquare, GAME_INSTANCE.board, GAME_INSTANCE.castlingRights, GAME_INSTANCE.enPassantTargetSquare)
        
        isMoveInLegalList = false
        FOR EACH move IN legalMoves:
            IF move.targetSquare.isEqualTo(toSquare):
                isMoveInLegalList = true
                // `move` object might contain special flags like isCastling, isEnPassant, promotionType
                BREAK
            ENDIF
        ENDFOR

        IF NOT isMoveInLegalList:
            RETURN false
        ENDIF

        // Create a temporary board to check if the move leaves the king in check
        tempBoard = GAME_INSTANCE.board.clone()
        // Simulate the move on tempBoard (handle captures, piece movement, en passant, castling)
        // This includes updating piece.hasMoved, castlingRights, enPassantTargetSquare for the next turn
        capturedPiece = simulateMoveOnBoard(tempBoard, pieceToMove, fromSquare, toSquare, move.promotionType) // `move` from loop above

        IF isKingInCheck(GAME_INSTANCE.currentPlayer, tempBoard):
            // TEST: Move that leaves own king in check is rejected.
            DISPLAY_NOTIFICATION("Invalid move: Your king would be in check.")
            RETURN false
        ENDIF

        // If move is valid and doesn't leave king in check, apply to actual board
        actualCapturedPiece = applyMoveToBoard(GAME_INSTANCE.board, pieceToMove, fromSquare, toSquare, move.promotionType, move.isCastling, move.isEnPassant)
        
        // Update game state after successful move
        updateCastlingRights(pieceToMove, fromSquare)
        updateEnPassantTargetSquare(pieceToMove, fromSquare, toSquare) // Set for next turn if pawn double move
        
        pieceToMove.hasMoved = true
        
        moveData = CREATE Move(fromSquare, toSquare, pieceToMove.type, actualCapturedPiece?.type, move.promotionType, move.isCastling, move.isEnPassant)
        ADD moveData TO GAME_INSTANCE.moveHistory

        // Send move to opponent
        CALL p2pModule.sendP2PMessage({ type: "MOVE", moveData: moveData })
        // TEST: Valid move is sent to the opponent via P2P.

        CALL switchPlayerTurn()
        CALL checkForGameEndConditions() // Check for check, checkmate, stalemate after the move

        CALL uiModule.updateBoardDisplay(GAME_INSTANCE.board)
        CALL uiModule.updateTurnIndicator(GAME_INSTANCE.currentPlayer)
        CALL uiModule.displayGameStatus(GAME_INSTANCE.gameStatus) // Display check, checkmate, etc.
        
        RETURN true
    ENDFUNCTION

    FUNCTION applyOpponentMove(moveData):
        // TEST: Opponent's move is correctly applied to the local game board.
        // TEST: Game state (turn, check status) updates correctly after opponent's move.
        piece = GAME_INSTANCE.board.getPieceAt(moveData.fromSquare) // Should be opponent's piece
        // Apply move to GAME_INSTANCE.board (similar to applyMoveToBoard but with less validation as it's assumed valid)
        applyMoveToBoard(GAME_INSTANCE.board, piece, moveData.fromSquare, moveData.toSquare, moveData.promotionPiece, moveData.isCastling, moveData.isEnPassant)
        
        updateCastlingRights(piece, moveData.fromSquare) // Update based on opponent's move
        updateEnPassantTargetSquare(piece, moveData.fromSquare, moveData.toSquare) // Update based on opponent's move

        IF piece: piece.hasMoved = true
        ADD moveData TO GAME_INSTANCE.moveHistory

        CALL switchPlayerTurn()
        // Check for game end conditions triggered by opponent's move (e.g., if their move checkmates us)
        CALL checkForGameEndConditions() 

        CALL uiModule.updateBoardDisplay(GAME_INSTANCE.board)
        CALL uiModule.updateTurnIndicator(GAME_INSTANCE.currentPlayer)
        CALL uiModule.displayGameStatus(GAME_INSTANCE.gameStatus)
    ENDFUNCTION

    FUNCTION switchPlayerTurn():
        // TEST: Player turn switches correctly.
        IF GAME_INSTANCE.currentPlayer == PlayerColor.WHITE:
            GAME_INSTANCE.currentPlayer = PlayerColor.BLACK
        ELSE:
            GAME_INSTANCE.currentPlayer = PlayerColor.WHITE
        ENDIF
        // Reset en passant target square if it wasn't captured on this turn
        // (More precise: en passant target is only valid for one immediate reply)
        // This logic might be better placed within updateEnPassantTargetSquare or after a move is completed.
        // For now, a simple reset after turn switch might be too broad.
        // Correct handling: enPassantTargetSquare is set by a double pawn move, and cleared after the *next* player's move if not used.
    ENDFUNCTION

    FUNCTION getLegalMovesForPiece(piece, square, board, castlingRights, enPassantTarget):
        // This is a complex function, placeholder for detailed chess logic.
        // For each piece type (PAWN, ROOK, KNIGHT, BISHOP, QUEEN, KING):
        // 1. Calculate all pseudo-legal moves based on piece movement rules.
        //    - Pawn: forward one/two, diagonal capture, en passant, promotion.
        //      // TEST: Pawn legal moves (initial, subsequent, capture, en passant, promotion).
        //    - Rook: horizontal/vertical. // TEST: Rook legal moves.
        //    - Knight: L-shape. // TEST: Knight legal moves.
        //    - Bishop: diagonal. // TEST: Bishop legal moves.
        //    - Queen: horizontal, vertical, diagonal. // TEST: Queen legal moves.
        //    - King: one square any direction, castling. // TEST: King legal moves (incl. castling).
        // 2. For each pseudo-legal move:
        //    a. Create a temporary board state if the move were made.
        //    b. Check if the current player's King would be in check on this temporary board.
        //    c. If King is NOT in check, the move is legal. Add to list of legal moves.
        // RETURN list of legal Move objects (containing targetSquare and any special flags)
        // TEST: Moves that would leave own king in check are filtered out.
        // TEST: Castling is only allowed if conditions are met (king/rook not moved, path clear, not in/through check).
        // TEST: En passant is only allowed under correct conditions.
        RETURN [] // Placeholder
    ENDFUNCTION

    FUNCTION isKingInCheck(playerColor, board):
        // Find playerColor's King on the board.
        // FOR EACH opponent piece on the board:
        //   Calculate its pseudo-legal moves (ignoring if it puts their own king in check for this specific check detection).
        //   IF any of these moves target the playerColor's King's square:
        //     RETURN true // King is in check
        // ENDFOR
        // RETURN false
        // TEST: Correctly identifies if a king is in check.
        // TEST: Correctly identifies if a king is NOT in check.
        RETURN false // Placeholder
    ENDFUNCTION

    FUNCTION checkForGameEndConditions():
        // TEST: Checkmate is correctly detected and game status updated.
        // TEST: Stalemate is correctly detected and game status updated.
        currentPlayerHasLegalMoves = false
        allLegalMovesForCurrentPlayer = getAllLegalMoves(GAME_INSTANCE.currentPlayer, GAME_INSTANCE.board, GAME_INSTANCE.castlingRights, GAME_INSTANCE.enPassantTargetSquare)
        IF allLegalMovesForCurrentPlayer IS EMPTY:
            IF isKingInCheck(GAME_INSTANCE.currentPlayer, GAME_INSTANCE.board):
                GAME_INSTANCE.gameStatus = (GAME_INSTANCE.currentPlayer == PlayerColor.WHITE) ? GameStatus.CHECKMATE_BLACK_WINS : GameStatus.CHECKMATE_WHITE_WINS
                DISPLAY_NOTIFICATION("Checkmate! " + ((GAME_INSTANCE.currentPlayer == PlayerColor.WHITE) ? "Black" : "White") + " wins.")
            ELSE:
                GAME_INSTANCE.gameStatus = GameStatus.STALEMATE_DRAW
                DISPLAY_NOTIFICATION("Stalemate! The game is a draw.")
            ENDIF
        ELSE: // Still moves left, check if current player is in check
            IF isKingInCheck(GAME_INSTANCE.currentPlayer, GAME_INSTANCE.board):
                 GAME_INSTANCE.gameStatus = (GAME_INSTANCE.currentPlayer == PlayerColor.WHITE) ? GameStatus.WHITE_IN_CHECK : GameStatus.BLACK_IN_CHECK
                 DISPLAY_NOTIFICATION(GAME_INSTANCE.currentPlayer + " is in Check!")
            ELSE:
                 GAME_INSTANCE.gameStatus = GameStatus.IN_PROGRESS // No check, no mate, no stalemate
            ENDIF
        ENDIF
    ENDFUNCTION
    
    FUNCTION getAllLegalMoves(playerColor, board, castlingRights, enPassantTarget):
        // Iterate over all pieces of playerColor on the board.
        // For each piece, call getLegalMovesForPiece.
        // Aggregate and return all legal moves.
        RETURN [] // Placeholder
    ENDFUNCTION

    // Helper functions: applyMoveToBoard, simulateMoveOnBoard, updateCastlingRights, updateEnPassantTargetSquare
    // These would contain detailed logic for piece movement, captures, castling execution, en passant execution, pawn promotion.
ENDMODULE
```

This pseudocode covers the main aspects of the game loop and interaction between UI, game logic, and P2P communication. The `getLegalMovesForPiece` and related check detection functions are critical and would contain the bulk of the chess rule complexity.