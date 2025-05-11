import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import NavBar from './components/NavBar'; // Added NavBar import
import useGameConnection from './hooks/useGameConnection';
import ConnectionManager from './components/ConnectionManager';
import Board from './components/Board';
import StatusDisplay from './components/StatusDisplay';
import PromotionChoice from './components/PromotionChoice';
import * as gameLogic from './modules/gameLogic';
import * as p2pService from './modules/p2pService'; // Import all p2pService functions
import type {
  AppGameState, PlayerColor, Move as AppMove, AnyP2PMessage,
  GameStateUpdatePayload, MovePayload, InitialGameSetupPayload, InitialGameSetupMessage,
  PieceSymbol as AppPieceSymbol,
  SyncGameStatePayload, // Added
  RequestGameStateMessage as AppRequestGameStateMessage, // Added with alias
  SyncGameStateMessage as AppSyncGameStateMessage // Added with alias
} from './utils/types';
import { P2PMessageKeyEnum, GameStatus, PieceSymbol } from './utils/types';
import { Chess, type Square } from 'chess.js';

interface PromotionPendingData {
  from: Square;
  to: Square;
  pieceString: string; // e.g. 'wP'
}

function App() {
  const {
    peerId, opponentPeerId, isConnected, isHost, gameId, assignedColor,
    connectionStatus, hostGame, joinGame, sendGameData, receivedData, leaveGame, error
  } = useGameConnection();

  const [gameState, setGameState] = useState<AppGameState>(() => {
    const initialFen = gameLogic.initializeNewGame();
    const initialLogicState = gameLogic.getGameStatus(initialFen);
    return {
      gameId: null,
      fen: initialFen,
      currentTurn: initialLogicState.turn,
      localPlayerColor: null,
      opponentPeerId: null,
      isHost: null,
      status: GameStatus.AWAITING_CONNECTION,
      castlingRights: { w: { k: true, q: true }, b: { k: true, q: true } },
      enPassantTarget: null,
      winner: null,
      moveHistory: [], // Added moveHistory
    };
  });

  const [promotionPendingData, setPromotionPendingData] = useState<PromotionPendingData | null>(null);


  // Effect to handle received P2P messages
  useEffect(() => {
    if (receivedData) {
      console.log("App.tsx received data:", receivedData);
      const message = receivedData as AnyP2PMessage; // Cast to our union type

      switch (message.type) {
        case P2PMessageKeyEnum.INITIAL_GAME_SETUP:
          if (!isHost) { // Joiner receives this from host
            const setupPayload = message.payload as InitialGameSetupPayload;
            const logicState = gameLogic.getGameStatus(setupPayload.startingFen);
            setGameState(prev => ({
              ...prev,
              fen: setupPayload.startingFen,
              currentTurn: logicState.turn,
              status: logicState.appStatus,
              localPlayerColor: peerId === setupPayload.playerWhite ? 'w' : 'b',
              opponentPeerId: isHost ? prev.opponentPeerId : (peerId === setupPayload.playerWhite ? setupPayload.playerBlack : setupPayload.playerWhite),
            }));
          }
          break;
        case P2PMessageKeyEnum.MOVE:
          {
            const movePayload = message.payload as MovePayload;
            const appMove: AppMove = { from: movePayload.from, to: movePayload.to, promotion: movePayload.promotion }; // promotion is already Type | null
            
            // Apply opponent's move
            // Ensure it's not our own move echoing back (though Trystero sends to specific peers)
            if (gameState.localPlayerColor && gameState.currentTurn !== gameState.localPlayerColor) {
              const moveResult = gameLogic.makeMove(gameState.fen, appMove);
              if (moveResult) {
                const newLogicState = gameLogic.getGameStatus(moveResult.newFen);
                setGameState(prev => ({
                  ...prev,
                  fen: moveResult.newFen,
                  currentTurn: newLogicState.turn,
                  status: newLogicState.appStatus,
                  winner: newLogicState.winner,
                  moveHistory: [...prev.moveHistory, appMove], // Add to history
                }));
              } else {
                console.error("Received invalid move from opponent:", appMove);
                // Opponent sent an invalid move, request resync from host
                if (!isHost && peerId && opponentPeerId) {
                    console.log("Requesting game state from host due to invalid opponent move.");
                    sendGameData(p2pService.createRequestGameStateMessage());
                    setGameState(prev => ({ ...prev, status: GameStatus.RESYNCHRONIZING_GAME_STATE }));
                }
              }
            }
          }
          break;
        case P2PMessageKeyEnum.GAME_STATE_UPDATE: // For simple FEN/turn updates (less common now with SYNC_GAME_STATE)
          {
            const updatePayload = message.payload as GameStateUpdatePayload;
            const logicState = gameLogic.getGameStatus(updatePayload.fen);
            setGameState(prev => ({
              ...prev,
              fen: updatePayload.fen,
              currentTurn: logicState.turn,
              status: logicState.appStatus, // Use appStatus from logic
              winner: logicState.winner,
              // moveHistory might be out of sync here, SYNC_GAME_STATE is better
            }));
          }
          break;
        case P2PMessageKeyEnum.REQUEST_GAME_STATE:
          if (isHost && opponentPeerId && peerId) { // Only host responds to this
            console.log("Host received REQUEST_GAME_STATE from opponent. Sending current state.");
            const syncMessage = p2pService.createSyncGameStateMessage(
              gameState.fen,
              gameState.currentTurn,
              gameState.status,
              gameState.moveHistory.length > 0 ? gameState.moveHistory[gameState.moveHistory.length - 1] : null,
              gameState.moveHistory,
              isHost ? peerId : opponentPeerId, // playerWhiteId
              isHost ? opponentPeerId : peerId, // playerBlackId (assuming host is white for now)
              true // isHostInitiated
            );
            sendGameData(syncMessage);
            setGameState(prev => ({ ...prev, status: GameStatus.RESYNCHRONIZING_GAME_STATE }));
          }
          break;
        case P2PMessageKeyEnum.SYNC_GAME_STATE:
          {
            const syncPayload = message.payload as SyncGameStatePayload;
            console.log("Received SYNC_GAME_STATE:", syncPayload);
            // Basic validation: if the message is not from the host and we are the host, ignore (or handle conflict)
            if (isHost && !syncPayload.isHostInitiated) {
                console.warn("Host received SYNC_GAME_STATE not initiated by host. Ignoring for now.");
                break;
            }

            const logicState = gameLogic.getGameStatus(syncPayload.fen); // Get status from the synced FEN
            setGameState(prev => ({
              ...prev,
              fen: syncPayload.fen,
              currentTurn: syncPayload.turn, // Use turn from payload
              status: logicState.appStatus, // Use appStatus from logic based on synced FEN
              winner: logicState.winner,
              moveHistory: syncPayload.moveHistory || [], // Ensure moveHistory is an array
              // Potentially update localPlayerColor if IDs match, but this should be stable
              localPlayerColor: prev.localPlayerColor || (peerId === syncPayload.playerWhiteId ? 'w' : (peerId === syncPayload.playerBlackId ? 'b' : null)),
              opponentPeerId: prev.opponentPeerId || (peerId === syncPayload.playerWhiteId ? syncPayload.playerBlackId : syncPayload.playerWhiteId),
            }));
            // After applying, set status to successful. UI can then react.
            // A brief timeout can make the "Resynchronizing..." message visible.
            setTimeout(() => {
                setGameState(prev => ({ ...prev, status: GameStatus.RESYNCHRONIZATION_SUCCESSFUL }));
                // Transition back to IN_PROGRESS or the actual game status after a short delay
                setTimeout(() => {
                    const currentLogicState = gameLogic.getGameStatus(syncPayload.fen);
                    setGameState(prev => ({ ...prev, status: currentLogicState.appStatus }));
                }, 1500);
            }, 500);
          }
          break;
        case P2PMessageKeyEnum.RESIGN:
          setGameState(prev => ({
            ...prev,
            status: prev.localPlayerColor === 'w' ? GameStatus.RESIGNATION_BLACK_WINS : GameStatus.RESIGNATION_WHITE_WINS,
            winner: prev.localPlayerColor === 'w' ? 'b' : 'w',
          }));
          break;
        // Add other cases like DRAW_OFFER, DRAW_ACCEPT if implemented
      }
    }
  }, [receivedData, isHost, peerId, opponentPeerId, sendGameData, gameState.fen, gameState.currentTurn, gameState.localPlayerColor, gameState.status, gameState.moveHistory]);

  // Effect to update local game state based on connection status changes from useGameConnection
  useEffect(() => {
    setGameState(prev => ({
      ...prev,
      gameId: gameId,
      localPlayerColor: assignedColor,
      opponentPeerId: opponentPeerId,
      isHost: isHost,
      // Update status based on connectionStatus from the hook
      status: connectionStatus === GameStatus.IN_PROGRESS && isConnected ? GameStatus.IN_PROGRESS :
              connectionStatus === GameStatus.CONNECTION_LOST_ATTEMPTING_RECONNECT ? GameStatus.CONNECTION_LOST_ATTEMPTING_RECONNECT :
              connectionStatus === GameStatus.OPPONENT_RECONNECTED_AWAITING_SYNC ? GameStatus.OPPONENT_RECONNECTED_AWAITING_SYNC :
              connectionStatus === GameStatus.DISCONNECTED_OPPONENT_LEFT ? GameStatus.DISCONNECTED_OPPONENT_LEFT :
              isConnected ? (prev.status === GameStatus.AWAITING_CONNECTION || prev.status === GameStatus.SETTING_UP || prev.status === GameStatus.RESYNCHRONIZATION_SUCCESSFUL ? GameStatus.IN_PROGRESS : prev.status) :
              GameStatus.AWAITING_CONNECTION,
    }));

    // Handle specific connection status changes
    if (connectionStatus === GameStatus.OPPONENT_RECONNECTED_AWAITING_SYNC && isHost && peerId && opponentPeerId) {
      console.log("Host detected opponent reconnected. Sending SYNC_GAME_STATE.");
      const syncMessage = p2pService.createSyncGameStateMessage(
        gameState.fen,
        gameState.currentTurn,
        gameState.status, // Send current game status
        gameState.moveHistory.length > 0 ? gameState.moveHistory[gameState.moveHistory.length - 1] : null,
        gameState.moveHistory,
        isHost ? peerId : opponentPeerId, // playerWhiteId
        isHost ? opponentPeerId : peerId, // playerBlackId
        true // isHostInitiated
      );
      sendGameData(syncMessage);
      setGameState(prev => ({ ...prev, status: GameStatus.RESYNCHRONIZING_GAME_STATE }));
    } else if (connectionStatus === GameStatus.OPPONENT_RECONNECTED_AWAITING_SYNC && !isHost) {
        // Client could optimistically request state if host doesn't send it quickly enough
        // For now, client waits for host's SYNC_GAME_STATE triggered by host's own detection
        console.log("Client detected opponent reconnected. Awaiting SYNC_GAME_STATE from host.");
        setGameState(prev => ({ ...prev, status: GameStatus.OPPONENT_RECONNECTED_AWAITING_SYNC }));
    }


    // Initial game setup by host
    if (isConnected && isHost && opponentPeerId && gameState.status !== GameStatus.IN_PROGRESS && !gameState.moveHistory.length && (connectionStatus === GameStatus.IN_PROGRESS || connectionStatus.includes("connected"))) {
        const initialFen = gameLogic.initializeNewGame();
        const initialLogicState = gameLogic.getGameStatus(initialFen);
        
        setGameState(prev => ({
            ...prev,
            fen: initialFen,
            currentTurn: 'w', // Host (White) starts
            localPlayerColor: 'w', // Host is White
            status: initialLogicState.appStatus, // Should be IN_PROGRESS
            opponentPeerId: opponentPeerId, // from hook
            isHost: true,
        }));

        const setupPayload: InitialGameSetupPayload = {
            startingFen: initialFen,
            playerWhite: peerId!, // Host is White
            playerBlack: opponentPeerId!,
        };
        sendGameData({
            type: P2PMessageKeyEnum.INITIAL_GAME_SETUP,
            payload: setupPayload,
        } as InitialGameSetupMessage); // Correct cast to specific message type
    }
  }, [isConnected, isHost, gameId, assignedColor, opponentPeerId, peerId, sendGameData, connectionStatus, gameState.fen, gameState.currentTurn, gameState.status, gameState.moveHistory]);


  const handleHostGame = () => {
    const newGameId = hostGame(); // from useGameConnection
    const initialFen = gameLogic.initializeNewGame(); // Prepare initial state
    const initialLogicState = gameLogic.getGameStatus(initialFen);
    setGameState({
      gameId: newGameId,
      fen: initialFen,
      currentTurn: 'w', // White starts
      localPlayerColor: 'w', // Host is White
      opponentPeerId: null,
      isHost: true,
      status: GameStatus.AWAITING_CONNECTION, // Waiting for opponent
      castlingRights: { w: { k: true, q: true }, b: { k: true, q: true } },
      enPassantTarget: null,
      winner: null,
      moveHistory: [],
    });
  };

  const handleJoinGame = (idToJoin: string) => {
    joinGame(idToJoin); // from useGameConnection
    // localPlayerColor will be set by CONNECTION_CONFIRMED from host via useGameConnection hook
    // or by INITIAL_GAME_SETUP from host
    const initialFen = gameLogic.initializeNewGame(); // Placeholder until host sends state
    setGameState(prev => ({
        ...prev,
        gameId: idToJoin,
        fen: initialFen, // Will be overwritten by host's INITIAL_GAME_SETUP
        currentTurn: 'w', // Default, will be overwritten
        isHost: false,
        status: GameStatus.SETTING_UP, // Waiting for host confirmation/setup
    }));
  };

  const handlePieceDrop = (sourceSquare: Square, targetSquare: Square, pieceString: string): boolean => {
    if (promotionPendingData) return false; // Don't allow new moves if promotion is pending

    if (!isConnected || gameState.localPlayerColor === null || gameState.currentTurn !== gameState.localPlayerColor || gameState.status !== GameStatus.IN_PROGRESS && gameState.status !== GameStatus.WHITE_IN_CHECK && gameState.status !== GameStatus.BLACK_IN_CHECK) {
      console.log("Cannot make move: Not your turn or game not in progress.");
      return false;
    }

    const pieceColor = pieceString[0] as PlayerColor;
    const pieceType = pieceString[1].toLowerCase() as AppPieceSymbol;

    if (pieceColor !== gameState.localPlayerColor) {
        console.log("Cannot move opponent's piece.");
        return false;
    }

    // Check for promotion
    const isPawn = pieceType === PieceSymbol.PAWN;
    const promotionRank = pieceColor === 'w' ? '8' : '1';
    const isPromotion = isPawn && targetSquare[1] === promotionRank;

    if (isPromotion) {
      // Check if the move is valid up to the promotion point using chess.js
      // This is a light check; gameLogic.makeMove will do the full validation.
      const tempChess = new Chess(gameState.fen); // Use imported Chess
      const possibleMoves = tempChess.moves({ square: sourceSquare, verbose: true });
      const isPotentiallyValidPromotion = possibleMoves.some(
        (m: any) => m.to === targetSquare && (m.flags.includes('p') || m.flags.includes('pc')) // 'p' for promotion, 'pc' for promotion capture
      );

      if (isPotentiallyValidPromotion) {
        setPromotionPendingData({ from: sourceSquare, to: targetSquare, pieceString });
        return false; // Prevent react-chessboard from making the move, wait for user choice
      } else {
        console.log("Invalid pawn promotion attempt (pre-check failed).");
        return false; // Not a valid square for the pawn to move to for promotion
      }
    }

    // Regular move
    const moveAttempt: AppMove = { from: sourceSquare, to: targetSquare, promotion: null };
    const moveResult = gameLogic.makeMove(gameState.fen, moveAttempt);

    if (moveResult) {
      const newLogicState = gameLogic.getGameStatus(moveResult.newFen);
      setGameState(prev => ({
        ...prev,
        fen: moveResult.newFen,
        currentTurn: newLogicState.turn,
        status: newLogicState.appStatus,
        winner: newLogicState.winner,
        moveHistory: [...prev.moveHistory, moveAttempt], // Add to history
      }));

      const movePayload: MovePayload = {
        from: sourceSquare,
        to: targetSquare,
        promotion: moveAttempt.promotion || null,
      };
      sendGameData({ type: P2PMessageKeyEnum.MOVE, payload: movePayload });
      return true;
    } else {
      console.log("Invalid move attempted by local player:", moveAttempt);
      return false;
    }
  };

  const handlePromotionSelect = (selectedPiece: Exclude<AppPieceSymbol, 'p' | 'k'>) => {
    if (!promotionPendingData || !gameState.localPlayerColor) return;

    const { from, to } = promotionPendingData;
    const moveWithPromotion: AppMove = { from, to, promotion: selectedPiece };
    
    const moveResult = gameLogic.makeMove(gameState.fen, moveWithPromotion);

    if (moveResult) {
      const newLogicState = gameLogic.getGameStatus(moveResult.newFen);
      setGameState(prev => ({
        ...prev,
        fen: moveResult.newFen,
        currentTurn: newLogicState.turn,
        status: newLogicState.appStatus,
        winner: newLogicState.winner,
        moveHistory: [...prev.moveHistory, moveWithPromotion], // Add to history
      }));

      const movePayload: MovePayload = {
        from,
        to,
        promotion: selectedPiece,
      };
      sendGameData({ type: P2PMessageKeyEnum.MOVE, payload: movePayload });
    } else {
      console.error("Error completing promotion move:", moveWithPromotion);
      // Handle error, perhaps reset UI or notify user
    }
    setPromotionPendingData(null); // Clear pending promotion
  };
  
  const handleResign = () => {
    if (isConnected && gameState.status === GameStatus.IN_PROGRESS) {
        sendGameData({ type: P2PMessageKeyEnum.RESIGN, payload: null });
        setGameState(prev => ({
            ...prev,
            status: prev.localPlayerColor === 'w' ? GameStatus.RESIGNATION_WHITE_WINS : GameStatus.RESIGNATION_BLACK_WINS,
            winner: prev.localPlayerColor === 'w' ? 'b' : 'w', // Opponent wins
        }));
    }
  };


  return (
    <div className="App">
      <NavBar /> {/* Added NavBar component */}
      <main className="app-main-content">
        <div className="content-section connection-manager-section">
          <ConnectionManager
            peerId={peerId}
            gameId={gameState.gameId}
            isConnected={isConnected}
            isHost={gameState.isHost}
            connectionStatus={connectionStatus} // from useGameConnection
            onHostGame={handleHostGame}
            onJoinGame={handleJoinGame}
            onLeaveGame={leaveGame}
            error={error}
            opponentPeerId={gameState.opponentPeerId} // Pass down opponentPeerId
            assignedColor={gameState.localPlayerColor}
          />
        </div>

        {/* Show board and status if game is active, or if attempting/undergoing resync */}
        {(isConnected || gameState.status === GameStatus.CONNECTION_LOST_ATTEMPTING_RECONNECT || gameState.status === GameStatus.RESYNCHRONIZING_GAME_STATE) && gameState.localPlayerColor && (
          <div className="content-section game-area">
            <StatusDisplay
              currentTurn={gameState.currentTurn}
              // Pass connectionStatus from hook for more detailed P2P status, and gameState.status for game logic status
              gameStatus={connectionStatus === GameStatus.IN_PROGRESS && isConnected ? gameState.status : connectionStatus as GameStatus}
              localPlayerColor={gameState.localPlayerColor}
              opponentPeerId={gameState.opponentPeerId}
              isConnected={isConnected}
              isHost={gameState.isHost}
              gameId={gameState.gameId}
            />
            <div className="board-container"> {/* Added board-container for specific board styling if needed */}
              <Board
                gameFen={gameState.fen}
                onPieceDrop={handlePieceDrop}
                boardOrientation={gameState.localPlayerColor}
                arePiecesDraggable={isConnected && gameState.currentTurn === gameState.localPlayerColor && !promotionPendingData && (gameState.status === GameStatus.IN_PROGRESS || gameState.status === GameStatus.WHITE_IN_CHECK || gameState.status === GameStatus.BLACK_IN_CHECK || gameState.status === GameStatus.RESYNCHRONIZATION_SUCCESSFUL)}
              />
            </div>
            {(isConnected && (gameState.status === GameStatus.IN_PROGRESS || gameState.status === GameStatus.WHITE_IN_CHECK || gameState.status === GameStatus.BLACK_IN_CHECK)) && !promotionPendingData &&
                 <button onClick={handleResign} className="mt-1">Resign</button>
            }
            {promotionPendingData && gameState.localPlayerColor && (
              <PromotionChoice
                onSelect={handlePromotionSelect}
                playerColor={gameState.localPlayerColor}
              />
            )}
          </div>
        )}
        { !isConnected && gameState.status !== GameStatus.AWAITING_CONNECTION && gameState.status !== GameStatus.CONNECTION_LOST_ATTEMPTING_RECONNECT && (
            <div className="content-section text-center">
                 <p>Disconnected. Please host or join a game.</p>
            </div>
        )}
      </main>
    </div>
  );
}

export default App;
