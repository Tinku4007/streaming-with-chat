import React, { useCallback, useEffect, useState, useRef } from 'react';
import { useSocket } from '../Providers/Socket';
import { usePeer } from '../Providers/Peer';

const Room = () => {
    const socket = useSocket();
    const { peer, createOffer, createAnswer, setRemoteAnswer, setRemoteOffer } = usePeer();
    const [myStream, setMyStream] = useState(null);
    const [isStreaming, setIsStreaming] = useState(false);
    const [roomId, setRoomId] = useState('');
    const [joinRoomId, setJoinRoomId] = useState('');
    const [liveStreamers, setLiveStreamers] = useState([]);
    const [viewers, setViewers] = useState([]);
    const [messages, setMessages] = useState([]);
    const [messageInput, setMessageInput] = useState('');
    const [remoteStream, setRemoteStream] = useState(null);
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);

    const getUserMediaStream = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            setMyStream(stream);
            return stream;
        } catch (error) {
            console.error('Error accessing media devices:', error);
            alert('Kamera ya microphone access nahi mil paya. Kripya permissions check karein.');
        }
    }, []);

    useEffect(() => {
        if (myStream && localVideoRef.current && !localVideoRef.current.srcObject) {
            localVideoRef.current.srcObject = myStream;
        }
    }, [myStream]);

    useEffect(() => {
        if (remoteStream && remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream;
        }
    }, [remoteStream]);

    const startStream = async () => {
        const stream = await getUserMediaStream();
        if (stream) {
            setIsStreaming(true);
            const newRoomId = Math.random().toString(36).substr(2, 9);
            setRoomId(newRoomId);
            socket.emit("create-room", { roomId: newRoomId, streamerId: socket.id });
            
            stream.getTracks().forEach(track => peer.addTrack(track, stream));
        }
    };

    const joinStream = () => {
        if (joinRoomId.trim() === '') {
            alert('Kripya valid Room ID darj karein.');
            return;
        }
        setRoomId(joinRoomId);
        socket.emit("join-room", { roomId: joinRoomId, viewerId: socket.id });
    };

    useEffect(() => {
        const handleRoomCreated = (data) => {
            setLiveStreamers(prev => [...prev, { id: data.streamerId, roomId: data.roomId }]);
        };

        const handleViewerJoined = async (data) => {
            const { viewerId, totalViewers } = data;
            console.log(`New viewer joined: ${viewerId}`);
            console.log(totalViewers , 'tinku')
            setViewers(totalViewers);

            if (isStreaming && myStream) {
                const offer = await createOffer();
                socket.emit("send-offer", { viewerId, offer, roomId });
            }
        };

        const handleViewerLeft = (data) => {
            const { viewerId, totalViewers } = data;
            console.log(`Viewer left: ${viewerId}`);
            setViewers(totalViewers);
        };

        const handleReceiveOffer = async (data) => {
            const { offer, roomId } = data;
            await setRemoteOffer(offer);
            const answer = await createAnswer();
            socket.emit("send-answer", { roomId, answer });
        };

        const handleReceiveAnswer = async (data) => {
            const { answer } = data;
            await setRemoteAnswer(answer);
        };

        const handleNewMessage = (data) => {
            const { viewerId, message } = data;
            setMessages(prevMessages => [...prevMessages, { viewerId, message }]);
        };

        const handleStreamEnded = (data) => {
            const { roomId: endedRoomId } = data;
            setLiveStreamers(prev => prev.filter(streamer => streamer.roomId !== endedRoomId));
            if (endedRoomId === roomId) {
                setIsStreaming(false);
                setRoomId('');
                setRemoteStream(null);
                alert('Stream khatam ho gaya hai.');
            }
        };

        socket.on("room-created", handleRoomCreated);
        socket.on("viewer-joined", handleViewerJoined);
        socket.on("viewer-left", handleViewerLeft);
        socket.on("receive-offer", handleReceiveOffer);
        socket.on("receive-answer", handleReceiveAnswer);
        socket.on("new-message", handleNewMessage);
        socket.on("stream-ended", handleStreamEnded);

        peer.ontrack = (event) => {
            setRemoteStream(new MediaStream([event.track]));
        };

        return () => {
            socket.off('room-created', handleRoomCreated);
            socket.off('viewer-joined', handleViewerJoined);
            socket.off('viewer-left', handleViewerLeft);
            socket.off('receive-offer', handleReceiveOffer);
            socket.off('receive-answer', handleReceiveAnswer);
            socket.off('new-message', handleNewMessage);
            socket.off('stream-ended', handleStreamEnded);
        };
    }, [socket, peer, createOffer, createAnswer, setRemoteOffer, setRemoteAnswer, isStreaming, roomId, myStream]);

    const handleSendMessage = () => {
        if (messageInput.trim()) {
            socket.emit("send-message", { roomId, viewerId: socket.id, message: messageInput });
            setMessageInput('');
        }
    };

    return (
        <div className="container mx-auto p-4">
            <h2 className="text-2xl font-bold mb-4">Live Streaming Room</h2>
            {!isStreaming && roomId === '' && (
                <div>
                    <button 
                        onClick={startStream}
                        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                    >
                        Go Live
                    </button>
                    <h3 className="text-xl font-semibold mt-4 mb-2">Join a Stream</h3>
                    <input 
                        type="text" 
                        value={joinRoomId} 
                        onChange={(e) => setJoinRoomId(e.target.value)}
                        placeholder="Enter Room ID to join"
                        className="border-2 border-gray-300 p-2 rounded mr-2"
                    />
                    <button 
                        onClick={joinStream}
                        className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
                    >
                        Join Stream
                    </button>
                    <h3 className="text-xl font-semibold mt-4 mb-2">Live Streamers</h3>
                    <div className="flex flex-wrap">
                        {liveStreamers.map(streamer => (
                            <div key={streamer.id} className="m-2 text-center">
                                <div 
                                    className="w-12 h-12 rounded-full bg-red-500 flex justify-center items-center text-white cursor-pointer"
                                    onClick={() => {
                                        setJoinRoomId(streamer.roomId);
                                        joinStream();
                                    }}
                                >
                                    Live
                                </div>
                                <p className="mt-1">Click to join (ID: {streamer.roomId})</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            {isStreaming && (
                <div className="mt-4">
                    <h3 className="text-xl font-semibold mb-2">Your Stream {roomId && `(Room ID: ${roomId})`}</h3>
                    <video ref={localVideoRef} autoPlay playsInline muted className="w-full max-w-md" />
                    <p className="mt-2">Viewers: {viewers}</p>
                </div>
            )}
            {!isStreaming && roomId !== '' && (
                <div className="mt-4">
                    <h3 className="text-xl font-semibold mb-2">Viewing Stream (Room ID: {roomId})</h3>
                    <video ref={remoteVideoRef} autoPlay playsInline className="w-full max-w-md" />
                </div>
            )}
            <div className="mt-4">
                <h3 className="text-xl font-semibold mb-2">Chat</h3>
                <div className="h-48 overflow-y-scroll border border-gray-300 p-2 mb-2">
                    {messages.map((msg, index) => (
                        <p key={index}><strong>{msg.viewerId}:</strong> {msg.message}</p>
                    ))}
                </div>
                <input 
                    type="text" 
                    value={messageInput} 
                    onChange={(e) => setMessageInput(e.target.value)}
                    placeholder="Type a message..."
                    className="border-2 border-gray-300 p-2 rounded mr-2"
                />
                <button 
                    onClick={handleSendMessage}
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                >
                    Send
                </button>
            </div>
        </div>
    );
};

export default Room;