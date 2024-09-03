import { useContext, useState } from 'react'
import './App.css'
import { BrowserRouter, Routes, Route } from "react-router-dom"
import { SocketProvider } from './Providers/Socket'
import { PeerProvider } from './Providers/Peer'
import HomePage from './pages/HomePage'
import Room from './pages/Room'

function App() {
  return (
    <>
      <BrowserRouter>
        <SocketProvider>
          <PeerProvider>
            <Routes>
              <Route path='/' element={<HomePage />} />
              <Route path='/room/:id' element={<Room />} />
            </Routes>
          </PeerProvider>
        </SocketProvider>
      </BrowserRouter>

    </>
  )
}

export default App
