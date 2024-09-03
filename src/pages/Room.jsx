import React, { useCallback, useEffect, useState, useRef } from 'react';
import { useSocket } from '../Providers/Socket';
import { usePeer } from '../Providers/Peer';

const Room = () => {
    const socket = useSocket();
    const { peer, createOffer, setRemoteAnswer, sendStream } = usePeer();
    const [myStream, setMyStream] = useState(null);
    const [viewers, setViewers] = useState([]);
    const [messages, setMessages] = useState([]);
    const [messageInput, setMessageInput] = useState('');
    const localVideoRef = useRef(null);

    const getUserMediaStream = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            setMyStream(stream);
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream;
            }
            stream.getTracks().forEach(track => peer.addTrack(track, stream));
        } catch (error) {
            console.error('Error accessing media devices:', error);
        }
    }, [peer]);

    useEffect(() => {
        getUserMediaStream();
    }, [getUserMediaStream]);

    useEffect(() => {
        socket.on("viewer-joined", async (data) => {
            const { viewerId } = data;
            console.log(`New viewer joined: ${viewerId}`);
            setViewers(prevViewers => [...prevViewers, viewerId]);

            // Create and send offer to the new viewer
            const offer = await createOffer();
            socket.emit("send-offer", { viewerId, offer });
        });

        socket.on("viewer-left", (data) => {
            const { viewerId } = data;
            console.log(`Viewer left: ${viewerId}`);
            setViewers(prevViewers => prevViewers.filter(v => v !== viewerId));
        });

        socket.on("receive-answer", async (data) => {
            const { answer } = data;
            await setRemoteAnswer(answer);
        });

        socket.on("new-message", (data) => {
            const { viewerId, message } = data;
            setMessages(prevMessages => [...prevMessages, { viewerId, message }]);
        });

        return () => {
            socket.off('viewer-joined');
            socket.off('viewer-left');
            socket.off('receive-answer');
            socket.off('new-message');
        };
    }, [socket, createOffer, setRemoteAnswer]);

    const handleSendMessage = () => {
        if (messageInput.trim()) {
            socket.emit("send-message", { message: messageInput });
            setMessages(prevMessages => [...prevMessages, { viewerId: 'You', message: messageInput }]);
            setMessageInput('');
        }
    };

    return (
        <div>
            <h2>Live Stream Room</h2>
            <p>Viewers: {viewers.length}</p>
            <div>
                <h3>Your Video</h3>
                <video ref={localVideoRef} autoPlay playsInline muted />
            </div>
            <div>
                <h3>Chat</h3>
                <div style={{ height: '200px', overflowY: 'scroll', border: '1px solid #ccc' }}>
                    {messages.map((msg, index) => (
                        <p key={index}><strong>{msg.viewerId}:</strong> {msg.message}</p>
                    ))}
                </div>
                <input 
                    type="text" 
                    value={messageInput} 
                    onChange={(e) => setMessageInput(e.target.value)}
                    placeholder="Type a message..."
                />
                <button onClick={handleSendMessage}>Send</button>
            </div>
        </div>
    );
};

export default Room;