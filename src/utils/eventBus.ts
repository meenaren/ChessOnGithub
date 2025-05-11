// Placeholder for eventBus.ts
type EventCallback = (data?: any) => void;
interface Events { [key: string]: EventCallback[]; }

export const eventBus = {
  events: {} as Events,
  subscribe(event: string, callback: EventCallback): () => void {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
    return () => this.unsubscribe(event, callback); // Return an unsubscribe function
  },
  publish(event: string, data?: any): void {
    if (!this.events[event]) {
      return;
    }
    this.events[event].forEach(callback => callback(data));
  },
  unsubscribe(event: string, callback: EventCallback): void {
    if (!this.events[event]) {
      return;
    }
    this.events[event] = this.events[event].filter(cb => cb !== callback);
  }
};