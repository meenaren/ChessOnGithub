import { useState, useEffect, useCallback, useRef } from 'react';
import { joinRoom, type Room as TrysteroRoom } from 'trystero'; 
import { P2PMessageKeyEnum } from '../utils/types';
import type { P2PMessage, PlayerColor, ConnectionConfirmedPayload, JsonValue, AnyP2PMessage, P2PPayloadConstraint, ConnectionConfirmedMessage } from '../utils/types';

const APP_ID = 'chess-on-github-app-v1'; // Unique ID for your application

// More specific local type for the Trystero room instance
interface AppRoom extends TrysteroRoom {
  selfId: string;
  // getPeers: () => Record<string, RTCPeerConnection>; // Already in TrysteroRoom
  // makeAction: <T extends Record<string, JsonValue>>(namespace: string) => [(payload: T, to?: string | string[] | undefined) => void, (callback: (payload: T, peerId: string) => void) => () => void]; // Already in TrysteroRoom
  // onPeerJoin: (callback: (peerId: string) => void) => () => void; // Already in TrysteroRoom
  // onPeerLeave: (callback: (peerId: string) => void) => () => void; // Already in TrysteroRoom
  // leave: () => void; // Already in TrysteroRoom
}


export interface UseGameConnectionReturn {
  peerId: string | null;
  opponentPeerId: string | null;
  isConnected: boolean;
  isHost: boolean | null;
  gameId: string | null;
  assignedColor: PlayerColor | null;
  connectionStatus: string;
  hostGame: () => string;
  joinGame: (roomId: string) => void;
  sendGameData: (data: AnyP2PMessage) => void;
  receivedData: AnyP2PMessage | null;
  leaveGame: () => void;
  error: string | null;
}

const generateRoomId = () => Math.random().toString(36).substring(2, 9);

const useGameConnection = (): UseGameConnectionReturn => {
  const roomInstanceRef = useRef<AppRoom | null>(null); 
  const [peerId, setPeerId] = useState<string | null>(null);
  const [opponentPeerId, setOpponentPeerId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isHost, setIsHost] = useState<boolean | null>(null);
  const [gameId, setGameId] = useState<string | null>(null);
  const [assignedColor, setAssignedColor] = useState<PlayerColor | null>(null);
  const [connectionStatus, setConnectionStatus] = useState('Idle');
  const [receivedData, setReceivedData] = useState<AnyP2PMessage | null>(null);
  const [error, setError] = useState<string | null>(null);

  const actionsRef = useRef<{
    send: ((data: AnyP2PMessage, to?: string | string[] | undefined) => void) | null;
    receive: ((callback: (data: AnyP2PMessage, peerId: string) => void) => void) | null;
  }>({ send: null, receive: null });

  const cleanup = useCallback(() => {
    if (roomInstanceRef.current) {
      roomInstanceRef.current.leave();
    }
    roomInstanceRef.current = null;
    actionsRef.current = { send: null, receive: null };
    setPeerId(null);
    setOpponentPeerId(null);
    setIsConnected(false);
    setIsHost(null);
    setAssignedColor(null);
    setConnectionStatus('Idle');
    setReceivedData(null);
    setError(null);
  }, []);

  const initializeRoom = useCallback((currentRoomId: string, hostStatus: boolean) => {
    if (roomInstanceRef.current) {
      cleanup(); 
    }

    setConnectionStatus(hostStatus ? `Hosting game ID: ${currentRoomId}. Waiting for opponent...` : `Attempting to join game ID: ${currentRoomId}...`);
    setError(null);
    
    // Cast the result of joinRoom to our more specific AppRoom type
    const currentRoom = joinRoom({ appId: APP_ID }, currentRoomId) as AppRoom;
    roomInstanceRef.current = currentRoom; 
    setPeerId(currentRoom.selfId); 
    setGameId(currentRoomId);
    setIsHost(hostStatus);

    const [send, receive] = currentRoom.makeAction<AnyP2PMessage>('gameData');
    actionsRef.current = { send, receive };

    receive((data, senderId) => {
      console.log('Data received:', data, 'from:', senderId);
      setReceivedData(data);
      setOpponentPeerId(senderId); 

      if (data.type === P2PMessageKeyEnum.CONNECTION_CONFIRMED && !hostStatus) {
        const payload = data.payload as ConnectionConfirmedPayload | null; // Type assertion is fine after checking data.type
        if (payload) {
            setAssignedColor(payload.assignedColor);
            setOpponentPeerId(payload.opponentPeerId);
            setIsConnected(true);
            setConnectionStatus(`Connected to host. You are ${payload.assignedColor === 'w' ? 'White' : 'Black'}.`);
        }
      }
    });

    currentRoom.onPeerJoin((joinedPeerId) => {
      console.log('Peer joined:', joinedPeerId);
      setOpponentPeerId(joinedPeerId);
      if (hostStatus) {
        setIsConnected(true);
        const playerColorForOpponent: PlayerColor = 'b'; 
        setAssignedColor('w');
        setConnectionStatus(`Opponent ${joinedPeerId} connected. You are White.`);
        
        const payloadForJoiner: ConnectionConfirmedPayload = {
            gameId: currentRoomId,
            assignedColor: playerColorForOpponent,
            opponentPeerId: currentRoom.selfId,
            startingFen: null, // Add missing required properties
            startingTurn: null   // Add missing required properties
        };

        actionsRef.current.send?.({
          type: P2PMessageKeyEnum.CONNECTION_CONFIRMED, // Use enum for type safety
          payload: payloadForJoiner,
        } as ConnectionConfirmedMessage, joinedPeerId); // Cast to specific message type
      } else {
        setConnectionStatus(`Connected to room. Waiting for host confirmation...`);
      }
    });

    currentRoom.onPeerLeave((leftPeerId) => {
      console.log('Peer left:', leftPeerId);
      if (leftPeerId === opponentPeerId) {
        setConnectionStatus('Opponent disconnected.');
        setIsConnected(false);
        setOpponentPeerId(null);
      }
    });

  }, [cleanup]);


  const hostGame = useCallback(() => {
    const newRoomId = generateRoomId();
    initializeRoom(newRoomId, true);
    return newRoomId;
  }, [initializeRoom]);

  const joinGame = useCallback((roomIdToJoin: string) => {
    if (!roomIdToJoin.trim()) {
      setError("Game ID cannot be empty.");
      setConnectionStatus("Idle");
      return;
    }
    initializeRoom(roomIdToJoin, false);
  }, [initializeRoom]);

  const sendGameData = useCallback((data: AnyP2PMessage) => {
    if (actionsRef.current.send && opponentPeerId) {
      actionsRef.current.send(data, opponentPeerId);
    } else if (actionsRef.current.send && isHost && roomInstanceRef.current && Object.keys(roomInstanceRef.current.getPeers()).length > 0) {
      const peers = roomInstanceRef.current.getPeers();
      const firstOpponentId = Object.keys(peers)[0];
      if(firstOpponentId) {
        setOpponentPeerId(firstOpponentId);
        actionsRef.current.send(data, firstOpponentId);
      } else {
        console.error('Cannot send data: No opponent connected.');
        setError('Cannot send data: No opponent connected.');
      }
    }
     else {
      console.error('Cannot send data: Connection not established or no send action.');
      setError('Cannot send data: Connection not established.');
    }
  }, [opponentPeerId, isHost]);

  const leaveGame = useCallback(() => {
    cleanup();
    setGameId(null); 
  }, [cleanup]);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    peerId,
    opponentPeerId,
    isConnected,
    isHost,
    gameId,
    assignedColor,
    connectionStatus,
    hostGame,
    joinGame,
    sendGameData,
    receivedData,
    leaveGame,
    error,
  };
};

export default useGameConnection;