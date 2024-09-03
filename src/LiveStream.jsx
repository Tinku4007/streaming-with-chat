// src/App.js

import React, { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';

const SERVER_URL = 'http://localhost:5000'; // Replace with your Ngrok URL if running remotely

function App() {
    const [socket, setSocket] = useState(null);
    const [roomId, setRoomId] = useState('');
    const [isJoined, setIsJoined] = useState(false);
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const pc = useRef(null);

    useEffect(() => {
        const newSocket = io(SERVER_URL);
        setSocket(newSocket);

        return () => newSocket.close();
    }, []);

    const handleJoinRoom = async () => {
        if (roomId) {
            setIsJoined(true);
            socket.emit('join-room', roomId);
            setupWebRTC();

            // Print URL to console
            console.log(`Room ID: ${roomId}`);
            console.log(`Share this URL with other users: ${SERVER_URL}/${roomId}`);
        }
    };

    const setupWebRTC = async () => {
        pc.current = new RTCPeerConnection({
            iceServers: [
                {
                    urls: 'stun:stun.l.google.com:19302',
                },
            ],
        });

        const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true,
        });

        stream.getTracks().forEach(track => {
            pc.current.addTrack(track, stream);
        });

        localVideoRef.current.srcObject = stream;

        pc.current.onicecandidate = event => {
            if (event.candidate) {
                socket.emit('candidate', {
                    target: roomId,
                    candidate: event.candidate,
                });
            }
        };

        pc.current.ontrack = event => {
            remoteVideoRef.current.srcObject = event.streams[0];
        };

        socket.on('offer', async data => {
            if (data.sdp) {
                await pc.current.setRemoteDescription(new RTCSessionDescription(data.sdp));
                const answer = await pc.current.createAnswer();
                await pc.current.setLocalDescription(answer);
                socket.emit('answer', {
                    target: data.sender,
                    sdp: pc.current.localDescription,
                });
            }
        });

        socket.on('answer', async data => {
            if (data.sdp) {
                await pc.current.setRemoteDescription(new RTCSessionDescription(data.sdp));
            }
        });

        socket.on('candidate', async data => {
            if (data.candidate) {
                await pc.current.addIceCandidate(new RTCIceCandidate(data.candidate));
            }
        });

        socket.on('user-connected', async userId => {
            const offer = await pc.current.createOffer();
            await pc.current.setLocalDescription(offer);
            socket.emit('offer', {
                target: userId,
                sdp: pc.current.localDescription,
            });
        });
    };

    return (
        <div>
            {!isJoined && (
                <div>
                    <input
                        type="text"
                        placeholder="Enter Room ID"
                        value={roomId}
                        onChange={(e) => setRoomId(e.target.value)}
                    />
                    <button onClick={handleJoinRoom}>Join Room</button>
                </div>
            )}
            <div>
                <video ref={localVideoRef} autoPlay playsInline muted />
                <video ref={remoteVideoRef} autoPlay playsInline />
            </div>
        </div>
    );
}

export default App;
