type Listener = () => void;

class EventEmitter {
  private listeners: { [key: string]: Listener[] } = {};

  subscribe(event: string, callback: Listener): () => void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
    
    // Return unsubscribe function
    return () => {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    };
  }

  emit(event: string): void {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback());
    }
  }
}

// Create and export a single instance
const eventEmitter = new EventEmitter();
export default eventEmitter; 