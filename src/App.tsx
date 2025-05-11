import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import NavBar from './components/NavBar';
import useGameConnection from './hooks/useGameConnection';
import ConnectionManager from './components/ConnectionManager';
import Board from './components/Board';
import StatusDisplay from './components/StatusDisplay';
import * as gameLogic from './modules/gameLogic';
import * as p2pService from './modules/p2pService';
import type {
  AppGameState, PlayerColor, Move as AppMove, AnyP2PMessage,
  GameStateUpdatePayload, MovePayload, InitialGameSetupPayload, InitialGameSetupMessage,
  PieceSymbol as AppPieceSymbol,
  SyncGameStatePayload,
  RequestGameStateMessage as AppRequestGameStateMessage,
  SyncGameStateMessage as AppSyncGameStateMessage,
  DrawType as AppDrawType
} from './utils/types';
import { P2PMessageKeyEnum, GameStatus, PieceSymbol, DrawType } from './utils/types';
import { Chess, type Square } from 'chess.js';

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
      isCheck: initialLogicState.isCheck,
      isCheckmate: initialLogicState.isCheckmate,
      castlingRights: { w: { k: true, q: true }, b: { k: true, q: true } },
      enPassantTarget: null,
      winner: null,
      moveHistory: [],
      drawType: null,
    };
  });

  useEffect(() => {
    if (receivedData) {
      console.log("App.tsx received data:", receivedData);
      const message = receivedData as AnyP2PMessage;

      switch (message.type) {
        case P2PMessageKeyEnum.INITIAL_GAME_SETUP:
          if (!isHost) {
            const setupPayload = message.payload as InitialGameSetupPayload;
            const logicState = gameLogic.getGameStatus(setupPayload.startingFen);
            setGameState(prev => ({
              ...prev,
              fen: setupPayload.startingFen,
              currentTurn: logicState.turn,
              status: logicState.appStatus,
              isCheck: logicState.isCheck,
              isCheckmate: logicState.isCheckmate,
              drawType: logicState.drawType,
              localPlayerColor: peerId === setupPayload.playerWhite ? 'w' : 'b',
              opponentPeerId: isHost ? prev.opponentPeerId : (peerId === setupPayload.playerWhite ? setupPayload.playerBlack : setupPayload.playerWhite),
            }));
          }
          break;
        case P2PMessageKeyEnum.MOVE:
          {
            const movePayload = message.payload as MovePayload;
            const appMove: AppMove = { from: movePayload.from, to: movePayload.to, promotion: movePayload.promotion };
            if (gameState.localPlayerColor && gameState.currentTurn !== gameState.localPlayerColor) {
              const moveResult = gameLogic.makeMove(gameState.fen, appMove);
              if (moveResult) {
                const newLogicState = gameLogic.getGameStatus(moveResult.newFen);
                setGameState(prev => ({
                  ...prev,
                  fen: moveResult.newFen,
                  currentTurn: newLogicState.turn,
                  status: newLogicState.appStatus,
                  isCheck: newLogicState.isCheck,
                  isCheckmate: newLogicState.isCheckmate,
                  winner: newLogicState.winner,
                  drawType: newLogicState.drawType,
                  moveHistory: [...prev.moveHistory, appMove],
                }));
              } else {
                console.error("Received invalid move from opponent:", appMove);
                if (!isHost && peerId && opponentPeerId) {
                    console.log("Requesting game state from host due to invalid opponent move.");
                    sendGameData(p2pService.createRequestGameStateMessage());
                    setGameState(prev => ({ ...prev, status: GameStatus.RESYNCHRONIZING_GAME_STATE }));
                }
              }
            }
          }
          break;
        case P2PMessageKeyEnum.GAME_STATE_UPDATE:
          {
            const updatePayload = message.payload as GameStateUpdatePayload;
            const logicState = gameLogic.getGameStatus(updatePayload.fen);
            setGameState(prev => ({
              ...prev,
              fen: updatePayload.fen,
              currentTurn: logicState.turn,
              status: logicState.appStatus,
              isCheck: logicState.isCheck,
              isCheckmate: logicState.isCheckmate,
              winner: logicState.winner,
              drawType: logicState.drawType,
            }));
          }
          break;
        case P2PMessageKeyEnum.REQUEST_GAME_STATE:
          if (isHost && opponentPeerId && peerId) {
            console.log("Host received REQUEST_GAME_STATE from opponent. Sending current state.");
            const syncMessage = p2pService.createSyncGameStateMessage(
              gameState.fen,
              gameState.currentTurn,
              gameState.status,
              gameState.moveHistory.length > 0 ? gameState.moveHistory[gameState.moveHistory.length - 1] : null,
              gameState.moveHistory,
              isHost ? peerId : opponentPeerId,
              isHost ? opponentPeerId : peerId,
              true
            );
            sendGameData(syncMessage);
            setGameState(prev => ({ ...prev, status: GameStatus.RESYNCHRONIZING_GAME_STATE }));
          }
          break;
        case P2PMessageKeyEnum.SYNC_GAME_STATE:
          {
            const syncPayload = message.payload as SyncGameStatePayload;
            console.log("Received SYNC_GAME_STATE:", syncPayload);
            if (isHost && !syncPayload.isHostInitiated) {
                console.warn("Host received SYNC_GAME_STATE not initiated by host. Ignoring for now.");
                break;
            }
            const logicState = gameLogic.getGameStatus(syncPayload.fen);
            setGameState(prev => ({
              ...prev,
              fen: syncPayload.fen,
              currentTurn: syncPayload.turn,
              status: logicState.appStatus,
              isCheck: logicState.isCheck,
              isCheckmate: logicState.isCheckmate,
              winner: logicState.winner,
              drawType: logicState.drawType,
              moveHistory: syncPayload.moveHistory || [],
              localPlayerColor: prev.localPlayerColor || (peerId === syncPayload.playerWhiteId ? 'w' : (peerId === syncPayload.playerBlackId ? 'b' : null)),
              opponentPeerId: prev.opponentPeerId || (peerId === syncPayload.playerWhiteId ? syncPayload.playerBlackId : syncPayload.playerWhiteId),
            }));
            setTimeout(() => {
                setGameState(prev => ({ ...prev, status: GameStatus.RESYNCHRONIZATION_SUCCESSFUL }));
                setTimeout(() => {
                    const currentLogicState = gameLogic.getGameStatus(syncPayload.fen);
                    setGameState(prev => ({ ...prev, status: currentLogicState.appStatus, isCheck: currentLogicState.isCheck, isCheckmate: currentLogicState.isCheckmate, drawType: currentLogicState.drawType }));
                }, 1500);
            }, 500);
          }
          break;
        case P2PMessageKeyEnum.RESIGN:
          setGameState(prev => ({
            ...prev,
            status: prev.localPlayerColor === 'w' ? GameStatus.RESIGNATION_BLACK_WINS : GameStatus.RESIGNATION_WHITE_WINS,
            winner: prev.localPlayerColor === 'w' ? 'b' : 'w',
            isCheck: false,
            isCheckmate: false,
            drawType: null,
          }));
          break;
      }
    }
  }, [receivedData, isHost, peerId, opponentPeerId, sendGameData, gameState.fen, gameState.currentTurn, gameState.localPlayerColor, gameState.status, gameState.moveHistory]);

  useEffect(() => {
    setGameState(prev => ({
      ...prev,
      gameId: gameId,
      localPlayerColor: assignedColor,
      opponentPeerId: opponentPeerId,
      isHost: isHost,
      status: connectionStatus === GameStatus.IN_PROGRESS && isConnected ? GameStatus.IN_PROGRESS :
              connectionStatus === GameStatus.CONNECTION_LOST_ATTEMPTING_RECONNECT ? GameStatus.CONNECTION_LOST_ATTEMPTING_RECONNECT :
              connectionStatus === GameStatus.OPPONENT_RECONNECTED_AWAITING_SYNC ? GameStatus.OPPONENT_RECONNECTED_AWAITING_SYNC :
              connectionStatus === GameStatus.DISCONNECTED_OPPONENT_LEFT ? GameStatus.DISCONNECTED_OPPONENT_LEFT :
              isConnected ? (prev.status === GameStatus.AWAITING_CONNECTION || prev.status === GameStatus.SETTING_UP || prev.status === GameStatus.RESYNCHRONIZATION_SUCCESSFUL ? GameStatus.IN_PROGRESS : prev.status) :
              GameStatus.AWAITING_CONNECTION,
    }));

    if (connectionStatus === GameStatus.OPPONENT_RECONNECTED_AWAITING_SYNC && isHost && peerId && opponentPeerId) {
      console.log("Host detected opponent reconnected. Sending SYNC_GAME_STATE.");
      const syncMessage = p2pService.createSyncGameStateMessage(
        gameState.fen,
        gameState.currentTurn,
        gameState.status,
        gameState.moveHistory.length > 0 ? gameState.moveHistory[gameState.moveHistory.length - 1] : null,
        gameState.moveHistory,
        isHost ? peerId : opponentPeerId,
        isHost ? opponentPeerId : peerId,
        true
      );
      sendGameData(syncMessage);
      setGameState(prev => ({ ...prev, status: GameStatus.RESYNCHRONIZING_GAME_STATE }));
    } else if (connectionStatus === GameStatus.OPPONENT_RECONNECTED_AWAITING_SYNC && !isHost) {
        console.log("Client detected opponent reconnected. Awaiting SYNC_GAME_STATE from host.");
        setGameState(prev => ({ ...prev, status: GameStatus.OPPONENT_RECONNECTED_AWAITING_SYNC }));
    }

    if (isConnected && isHost && opponentPeerId && gameState.status !== GameStatus.IN_PROGRESS && !gameState.moveHistory.length && (connectionStatus === GameStatus.IN_PROGRESS || (typeof connectionStatus === 'string' && connectionStatus.includes("connected")))) {
        const initialFen = gameLogic.initializeNewGame();
        const initialLogicState = gameLogic.getGameStatus(initialFen);
        setGameState(prev => ({
            ...prev,
            fen: initialFen,
            currentTurn: 'w',
            localPlayerColor: 'w',
            status: initialLogicState.appStatus,
            isCheck: initialLogicState.isCheck,
            isCheckmate: initialLogicState.isCheckmate,
            drawType: initialLogicState.drawType,
            opponentPeerId: opponentPeerId,
            isHost: true,
        }));
        const setupPayload: InitialGameSetupPayload = {
            startingFen: initialFen,
            playerWhite: peerId!,
            playerBlack: opponentPeerId!,
        };
        sendGameData({
            type: P2PMessageKeyEnum.INITIAL_GAME_SETUP,
            payload: setupPayload,
        } as InitialGameSetupMessage);
    }
  }, [isConnected, isHost, gameId, assignedColor, opponentPeerId, peerId, sendGameData, connectionStatus, gameState.fen, gameState.currentTurn, gameState.status, gameState.moveHistory]);

  const handleHostGame = () => {
    const newGameId = hostGame();
    const initialFen = gameLogic.initializeNewGame();
    const initialLogicState = gameLogic.getGameStatus(initialFen);
    setGameState({
      gameId: newGameId,
      fen: initialFen,
      currentTurn: 'w',
      localPlayerColor: 'w',
      opponentPeerId: null,
      isHost: true,
      status: GameStatus.AWAITING_CONNECTION,
      isCheck: initialLogicState.isCheck,
      isCheckmate: initialLogicState.isCheckmate,
      drawType: initialLogicState.drawType,
      castlingRights: { w: { k: true, q: true }, b: { k: true, q: true } },
      enPassantTarget: null,
      winner: null,
      moveHistory: [],
    });
  };

  const handleJoinGame = (idToJoin: string) => {
    joinGame(idToJoin);
    const initialFen = gameLogic.initializeNewGame();
    setGameState(prev => ({
        ...prev,
        gameId: idToJoin,
        fen: initialFen,
        currentTurn: 'w',
        isHost: false,
        status: GameStatus.SETTING_UP,
    }));
  };

  const handlePieceDrop = (sourceSquare: Square, targetSquare: Square, pieceString: string): boolean => {
    if (!isConnected || gameState.localPlayerColor === null || gameState.currentTurn !== gameState.localPlayerColor || gameState.status !== GameStatus.IN_PROGRESS && gameState.status !== GameStatus.WHITE_IN_CHECK && gameState.status !== GameStatus.BLACK_IN_CHECK) {
      console.log("Cannot make move: Not your turn or game not in progress.");
      return false;
    }
    const initialPieceColorForTurnCheck = pieceString[0] as PlayerColor;
    if (initialPieceColorForTurnCheck !== gameState.localPlayerColor) {
        console.log("Cannot move opponent's piece.");
        return false;
    }
    const chessInstanceForPieceCheck = new Chess(gameState.fen);
    const pieceDetailsFromFen = chessInstanceForPieceCheck.get(sourceSquare);
    if (!pieceDetailsFromFen) {
      console.error(`[handlePieceDrop] Critical error: No piece found on source square ${sourceSquare} in FEN ${gameState.fen} during piece drop. Aborting move.`);
      return false;
    }
    const actualPieceColor = pieceDetailsFromFen.color as PlayerColor;
    const actualPieceType = pieceDetailsFromFen.type as AppPieceSymbol;
    const isPawn = actualPieceType === PieceSymbol.PAWN;
    const promotionRank = actualPieceColor === 'w' ? '8' : '1';
    const isPromotion = isPawn && targetSquare[1] === promotionRank;

    if (isPromotion) {
      return false;
    }
    const moveAttempt: AppMove = { from: sourceSquare, to: targetSquare, promotion: null };
    const moveResult = gameLogic.makeMove(gameState.fen, moveAttempt);
    if (moveResult) {
      const newLogicState = gameLogic.getGameStatus(moveResult.newFen);
      setGameState(prev => ({
        ...prev,
        fen: moveResult.newFen,
        currentTurn: newLogicState.turn,
        status: newLogicState.appStatus,
        isCheck: newLogicState.isCheck,
        isCheckmate: newLogicState.isCheckmate,
        winner: newLogicState.winner,
        drawType: newLogicState.drawType,
        moveHistory: [...prev.moveHistory, moveAttempt],
      }));
      const movePayload: MovePayload = {
        from: sourceSquare,
        to: targetSquare,
        promotion: null,
      };
      sendGameData({ type: P2PMessageKeyEnum.MOVE, payload: movePayload });
      return true;
    } else {
      console.log("Invalid non-promotion move attempted by local player:", moveAttempt);
      return false;
    }
  };

  const onBoardPromotionPieceSelect = (
    selectedPromotionPiece?: string,
    promoteFromSquare?: Square,
    promoteToSquare?: Square
  ): boolean => {
    if (!isConnected || gameState.localPlayerColor === null || gameState.currentTurn !== gameState.localPlayerColor ||
        (gameState.status !== GameStatus.IN_PROGRESS && gameState.status !== GameStatus.WHITE_IN_CHECK && gameState.status !== GameStatus.BLACK_IN_CHECK)) {
      console.log("Cannot complete promotion: Not your turn or game not in progress/check state.");
      return false;
    }
    if (!promoteFromSquare || !promoteToSquare || !selectedPromotionPiece) {
      console.error("Promotion selection data incomplete:", { selectedPromotionPiece, promoteFromSquare, promoteToSquare });
      return false;
    }
    const promotionPiece = selectedPromotionPiece.charAt(1).toLowerCase() as Exclude<AppPieceSymbol, 'p' | 'k'>;
    const moveWithPromotion: AppMove = {
      from: promoteFromSquare,
      to: promoteToSquare,
      promotion: promotionPiece,
    };
    console.log("Attempting promotion move via onBoardPromotionPieceSelect:", moveWithPromotion);
    const moveResult = gameLogic.makeMove(gameState.fen, moveWithPromotion);
    if (moveResult) {
      const newLogicState = gameLogic.getGameStatus(moveResult.newFen);
      setGameState(prev => ({
        ...prev,
        fen: moveResult.newFen,
        currentTurn: newLogicState.turn,
        status: newLogicState.appStatus,
        isCheck: newLogicState.isCheck,
        isCheckmate: newLogicState.isCheckmate,
        winner: newLogicState.winner,
        drawType: newLogicState.drawType,
        moveHistory: [...prev.moveHistory, moveWithPromotion],
      }));
      const movePayload: MovePayload = {
        from: promoteFromSquare,
        to: promoteToSquare,
        promotion: promotionPiece,
      };
      sendGameData({ type: P2PMessageKeyEnum.MOVE, payload: movePayload });
      return true;
    } else {
      console.error("Error completing promotion move via onBoardPromotionPieceSelect:", moveWithPromotion, "FEN:", gameState.fen);
      return false;
    }
  };
  
  const handleResign = () => {
    if (isConnected && gameState.status === GameStatus.IN_PROGRESS) {
        sendGameData({ type: P2PMessageKeyEnum.RESIGN, payload: null });
        setGameState(prev => ({
            ...prev,
            status: prev.localPlayerColor === 'w' ? GameStatus.RESIGNATION_WHITE_WINS : GameStatus.RESIGNATION_BLACK_WINS,
            winner: prev.localPlayerColor === 'w' ? 'b' : 'w',
            isCheck: false,
            isCheckmate: false,
            drawType: null,
        }));
    }
  };

  const getGameDisplayStatusForNavBar = (
    gs: AppGameState,
    localPlayerColor: PlayerColor | null,
  ): string => {
    let turnIndicator = '';
    const turnColorText = gs.currentTurn === 'w' ? 'White' : 'Black';

    const isGameDrawn = gs.winner === 'draw' ||
                        gs.status === GameStatus.STALEMATE_DRAW ||
                        gs.status === GameStatus.DRAW_BY_THREEFOLD_REPETITION ||
                        gs.status === GameStatus.DRAW_BY_FIFTY_MOVE_RULE ||
                        gs.status === GameStatus.DRAW_BY_INSUFFICIENT_MATERIAL ||
                        gs.status === GameStatus.DRAW_AGREED;

    if (gs.currentTurn && !gs.isCheckmate && !isGameDrawn && gs.status !== GameStatus.RESIGNATION_BLACK_WINS && gs.status !== GameStatus.RESIGNATION_WHITE_WINS) {
      const isMyTurn = localPlayerColor === gs.currentTurn;
      turnIndicator = isMyTurn ? `Your turn (${turnColorText})` : `${turnColorText}'s turn`;
    }

    if (gs.isCheckmate) {
      const winnerColorText = gs.winner === 'w' ? 'White' : 'Black';
      return `Checkmate! ${winnerColorText} wins!`;
    }
    if (gs.drawType) {
      switch (gs.drawType) {
        case DrawType.STALEMATE: return 'Draw by Stalemate!';
        case DrawType.THREEFOLD_REPETITION: return 'Draw by Threefold Repetition!';
        case DrawType.INSUFFICIENT_MATERIAL: return 'Draw by Insufficient Material!';
        case DrawType.FIFTY_MOVE_RULE: return 'Draw by Fifty-Move Rule!';
        default: return 'Game Drawn!';
      }
    }
    if (gs.winner === 'draw') { 
        switch (gs.status) {
            case GameStatus.STALEMATE_DRAW: return 'Draw by Stalemate!';
            case GameStatus.DRAW_BY_THREEFOLD_REPETITION: return 'Draw by Threefold Repetition!';
            case GameStatus.DRAW_BY_FIFTY_MOVE_RULE: return 'Draw by Fifty-Move Rule!';
            case GameStatus.DRAW_BY_INSUFFICIENT_MATERIAL: return 'Draw by Insufficient Material!';
            case GameStatus.DRAW_AGREED: return 'Draw Agreed.';
            default: return 'Game Drawn!';
        }
    }
    if (gs.status === GameStatus.RESIGNATION_WHITE_WINS) return 'Black resigned. White wins.';
    if (gs.status === GameStatus.RESIGNATION_BLACK_WINS) return 'White resigned. Black wins.';
    if (gs.isCheck) return `Check! ${turnIndicator}`;
    if (turnIndicator) return turnIndicator;

    if (gs.status === GameStatus.AWAITING_CONNECTION || gs.status === GameStatus.SETTING_UP) {
        return "Waiting for game to start...";
    }
    if (gs.status === GameStatus.RESYNCHRONIZING_GAME_STATE || gs.status === GameStatus.OPPONENT_RECONNECTED_AWAITING_SYNC) {
        return "Synchronizing...";
    }
     if (gs.status === GameStatus.RESYNCHRONIZATION_SUCCESSFUL) {
        return `Game Synced! ${turnIndicator || (gs.currentTurn ? `${gs.currentTurn === 'w' ? 'White' : 'Black'}'s turn` : '') }`;
    }
    if (gs.status === GameStatus.IN_PROGRESS && turnIndicator) {
        return turnIndicator;
    }
    if (gs.status === GameStatus.IN_PROGRESS && !turnIndicator && gs.currentTurn) {
       return `${gs.currentTurn === 'w' ? 'White' : 'Black'}'s turn`;
    }
    return ''; 
  };

  const getNavBarDisplayStatus = (
    currentAppGameStatus: GameStatus,
    hookP2PStatus: GameStatus,
    isConnectedToPeer: boolean,
    currentRoomId: string | null,
    currentOpponentId: string | null,
    localColor: PlayerColor | null
  ): string => {
    if (!currentRoomId) return "Not in a game";

    if (!isConnectedToPeer || !currentOpponentId) {
      switch (hookP2PStatus) {
        case GameStatus.AWAITING_CONNECTION: return "Waiting for opponent...";
        case GameStatus.SETTING_UP: return "Setting up room...";
        case GameStatus.CONNECTION_FAILED: return "Connection Failed";
        case GameStatus.DISCONNECTED_OPPONENT_LEFT: return "Opponent Left";
        default: return "Establishing Connection...";
      }
    }

    switch (currentAppGameStatus) {
      case GameStatus.IN_PROGRESS:
      case GameStatus.WHITE_IN_CHECK:
      case GameStatus.BLACK_IN_CHECK:
        return "Connected"; 
      case GameStatus.CONNECTION_LOST_ATTEMPTING_RECONNECT:
        return "Reconnecting...";
      case GameStatus.OPPONENT_RECONNECTED_AWAITING_SYNC:
        return "Opponent reconnected, syncing...";
      case GameStatus.RESYNCHRONIZING_GAME_STATE:
        return "Syncing game...";
      case GameStatus.RESYNCHRONIZATION_SUCCESSFUL:
        return "Game Synced"; 
      case GameStatus.DISCONNECTED_OPPONENT_LEFT:
        return "Opponent Left";
      case GameStatus.CHECKMATE_WHITE_WINS: return "White Wins!";
      case GameStatus.CHECKMATE_BLACK_WINS: return "Black Wins!";
      case GameStatus.RESIGNATION_WHITE_WINS: return localColor === 'b' ? "Opponent Resigned (White Wins)" : "You Resigned (Black Wins)";
      case GameStatus.RESIGNATION_BLACK_WINS: return localColor === 'w' ? "Opponent Resigned (Black Wins)" : "You Resigned (White Wins)";
      case GameStatus.STALEMATE_DRAW: return "Draw: Stalemate";
      case GameStatus.DRAW_BY_INSUFFICIENT_MATERIAL: return "Draw: Insufficient Material";
      case GameStatus.DRAW_BY_THREEFOLD_REPETITION: return "Draw: Repetition";
      case GameStatus.DRAW_BY_FIFTY_MOVE_RULE: return "Draw: 50 Move Rule";
      case GameStatus.DRAW_AGREED: return "Draw Agreed";
      default:
        return currentAppGameStatus.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  const navBarConnectionStatusDisplay = getNavBarDisplayStatus(
    gameState.status,
    connectionStatus, 
    isConnected,
    gameState.gameId,
    gameState.opponentPeerId,
    gameState.localPlayerColor
  );

  const navBarGameDisplayStatus = getGameDisplayStatusForNavBar(
    gameState,
    gameState.localPlayerColor,
  );

  const gameHasEffectivelyStarted = isConnected &&
                         !!gameState.opponentPeerId &&
                         (
                           gameState.status === GameStatus.IN_PROGRESS ||
                           gameState.status === GameStatus.WHITE_IN_CHECK ||
                           gameState.status === GameStatus.BLACK_IN_CHECK ||
                           gameState.status.toUpperCase().includes("WINS") ||
                           gameState.status.toUpperCase().includes("DRAW") ||
                           gameState.status === GameStatus.RESYNCHRONIZATION_SUCCESSFUL ||
                           gameState.status === GameStatus.OPPONENT_RECONNECTED_AWAITING_SYNC || 
                           gameState.status === GameStatus.RESYNCHRONIZING_GAME_STATE
                         );
  
  const showMainGameComponents = isConnected && !!gameState.opponentPeerId && !!gameState.localPlayerColor;

  return (
    <div className="App">
      <NavBar
        connectionStatusDisplay={navBarConnectionStatusDisplay}
        gameId={gameState.gameId}
        peerId={peerId}
        isHost={gameState.isHost}
        opponentPeerId={gameState.opponentPeerId}
        rawConnectionStatus={connectionStatus}
        gameDisplayStatus={navBarGameDisplayStatus}
        currentTurn={gameState.currentTurn}
        isCheck={gameState.isCheck}
      />
      <main className="app-main-content">
        {!gameHasEffectivelyStarted && (
          <div className="content-section connection-manager-section">
            <ConnectionManager
              peerId={peerId}
              gameId={gameState.gameId}
              isConnected={isConnected}
              isHost={gameState.isHost}
              connectionStatus={connectionStatus} 
              onHostGame={handleHostGame}
              onJoinGame={handleJoinGame}
              onLeaveGame={leaveGame}
              error={error}
              opponentPeerId={gameState.opponentPeerId}
              assignedColor={gameState.localPlayerColor}
            />
          </div>
        )}

        {showMainGameComponents && (
          <div className="content-section game-area">
            {!gameHasEffectivelyStarted && (
                <StatusDisplay
                    gameStatus={gameState.status} 
                    currentTurn={gameState.currentTurn}
                    localPlayerColor={gameState.localPlayerColor}
                    isConnected={isConnected} 
                    isCheck={gameState.isCheck}
                    isCheckmate={gameState.isCheckmate}
                    winner={gameState.winner}
                    drawType={gameState.drawType}
                    opponentPeerId={gameState.opponentPeerId}
                    isHost={gameState.isHost}
                    gameId={gameState.gameId}
                />
            )}
            <div className="board-container"> 
              <Board
                gameFen={gameState.fen}
                onPieceDrop={handlePieceDrop}
                boardOrientation={gameState.localPlayerColor || 'w'}
                arePiecesDraggable={ 
                  isConnected &&
                  gameState.currentTurn === gameState.localPlayerColor &&
                  (gameState.status === GameStatus.IN_PROGRESS ||
                    gameState.status === GameStatus.WHITE_IN_CHECK ||
                    gameState.status === GameStatus.BLACK_IN_CHECK ||
                    gameState.status === GameStatus.RESYNCHRONIZATION_SUCCESSFUL)}
                onPromotionPieceSelect={onBoardPromotionPieceSelect}
              />
            </div>
            {(isConnected && (gameState.status === GameStatus.IN_PROGRESS || gameState.status === GameStatus.WHITE_IN_CHECK || gameState.status === GameStatus.BLACK_IN_CHECK)) &&
                 <button onClick={handleResign} className="mt-1">Resign</button>
            }
          </div>
        )}
        
        {!gameHasEffectivelyStarted && !showMainGameComponents && (
             <div className="content-section text-center">
                  <p>
                    {peerId ? `Your ID: ${peerId}. ` : 'Initializing... '}
                    {gameState.gameId && !isConnected ? `Attempting to join Game ID: ${gameState.gameId}. Please wait...` : 
                    !gameState.gameId && !isConnected ? 'Host or join a game to start.' : ''}
                  </p>
             </div>
        )}
      </main>
    </div>
  );
}

export default App;
