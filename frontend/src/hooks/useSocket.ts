import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuthStore } from '../store/authStore'

let socketInstance: Socket | null = null

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 
                   import.meta.env.VITE_API_URL?.replace('/api', '') || 
                   'http://localhost:3001'

export function useSocket() {
  const { user } = useAuthStore()
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    if (!user) return

    if (!socketInstance) {
      socketInstance = io(SOCKET_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
      })
      
      socketInstance.on('connect', () => {
        console.log('Socket connected to:', SOCKET_URL)
      })
      
      socketInstance.on('connect_error', (error) => {
        console.error('Socket connection error:', error.message)
      })
    }

    socketRef.current = socketInstance

    socketInstance.emit('join_user', user.id)

    return () => {
      // Don't disconnect on component unmount — keep alive
    }
  }, [user])

  return socketRef.current || socketInstance
}

export function getSocket() {
  return socketInstance
}
