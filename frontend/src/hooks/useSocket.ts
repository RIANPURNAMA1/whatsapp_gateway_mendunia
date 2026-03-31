import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuthStore } from '../store/authStore'

let socketInstance: Socket | null = null

export function useSocket() {
  const { user } = useAuthStore()
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    if (!user) return

    if (!socketInstance) {
      socketInstance = io('http://localhost:3001', {
        transports: ['websocket'],
        reconnection: true,
        reconnectionDelay: 1000,
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
