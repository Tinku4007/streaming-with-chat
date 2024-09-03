// src/App.js

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../Providers/Socket';


function HomePage() {
    const navigate = useNavigate()
    const [email, setEmail] = useState()
    const [roomId, setRoomID] = useState()
    const socket = useSocket()

    const handleJoinRoom = useCallback(() => {
        const body = {
            roomId: roomId,
            emailId: email
        }
        socket.emit("join-room", body)
        navigate(`/room/${roomId}`)
    }, [socket ,roomId ,email])

    useEffect(() => {
        socket.emit("join-room", handleJoinRoom)
        return () => {
            socket.off("join-room", handleJoinRoom)
        }
    }, [])

    return (
        <div>
            <div>
                <label htmlFor="">room id</label>
                <input value={roomId} onChange={(e) => setRoomID(e.target.value)} type="text" placeholder="Enter Room ID" />
                <div>
                    <label htmlFor="">Email</label>
                    <input type="text" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter Email" />
                </div>
                <button onClick={handleJoinRoom}>Submit</button>
            </div>
        </div>
    );
}

export default HomePage;
