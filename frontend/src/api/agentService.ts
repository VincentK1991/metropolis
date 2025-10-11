import type { WebSocketMessage } from '../types/chat'

const WS_BASE_URL = 'ws://localhost:8088'

export class AgentWebSocketService {
  private ws: WebSocket | null = null
  private messageCallbacks: ((message: WebSocketMessage) => void)[] = []
  private errorCallbacks: ((error: Event) => void)[] = []
  private closeCallbacks: (() => void)[] = []
  private openCallbacks: (() => void)[] = []

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(`${WS_BASE_URL}/ws/agent`)

        this.ws.onopen = () => {
          console.log('WebSocket connected')
          this.openCallbacks.forEach(cb => cb())
          resolve()
        }

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data)
            this.messageCallbacks.forEach(cb => cb(message))
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error)
          }
        }

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error)
          this.errorCallbacks.forEach(cb => cb(error))
          reject(error)
        }

        this.ws.onclose = () => {
          console.log('WebSocket closed')
          this.closeCallbacks.forEach(cb => cb())
        }
      } catch (error) {
        reject(error)
      }
    })
  }

  sendMessage(text: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not connected')
    }

    const message = {
      type: 'query',
      content: text,
    }

    this.ws.send(JSON.stringify(message))
  }

  onMessage(callback: (message: WebSocketMessage) => void) {
    this.messageCallbacks.push(callback)
    return () => {
      this.messageCallbacks = this.messageCallbacks.filter(cb => cb !== callback)
    }
  }

  onError(callback: (error: Event) => void) {
    this.errorCallbacks.push(callback)
    return () => {
      this.errorCallbacks = this.errorCallbacks.filter(cb => cb !== callback)
    }
  }

  onClose(callback: () => void) {
    this.closeCallbacks.push(callback)
    return () => {
      this.closeCallbacks = this.closeCallbacks.filter(cb => cb !== callback)
    }
  }

  onOpen(callback: () => void) {
    this.openCallbacks.push(callback)
    return () => {
      this.openCallbacks = this.openCallbacks.filter(cb => cb !== callback)
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN
  }
}

// Export singleton instance
export const agentService = new AgentWebSocketService()

