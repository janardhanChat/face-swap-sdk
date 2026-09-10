/**
 * Typed Event Emitter for Jewellery AI Try-On SDK
 */

import { EventCallback, SDKEventMap } from './types';

export class EventEmitter {
  private listeners: Map<keyof SDKEventMap, Set<EventCallback<any>>> = new Map();

  /**
   * Subscribe to an SDK event. Returns an unsubscribe cleanup function.
   */
  public on<K extends keyof SDKEventMap>(
    event: K,
    callback: EventCallback<SDKEventMap[K]>
  ): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    const set = this.listeners.get(event)!;
    set.add(callback);

    return () => {
      this.off(event, callback);
    };
  }

  /**
   * Unsubscribe from an SDK event
   */
  public off<K extends keyof SDKEventMap>(
    event: K,
    callback: EventCallback<SDKEventMap[K]>
  ): void {
    const set = this.listeners.get(event);
    if (set) {
      set.delete(callback);
      if (set.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  /**
   * Subscribe to an SDK event once
   */
  public once<K extends keyof SDKEventMap>(
    event: K,
    callback: EventCallback<SDKEventMap[K]>
  ): void {
    const wrapper: EventCallback<SDKEventMap[K]> = (data) => {
      this.off(event, wrapper);
      callback(data);
    };
    this.on(event, wrapper);
  }

  /**
   * Emit an event to all subscribers with safe error containment
   */
  public emit<K extends keyof SDKEventMap>(event: K, data: SDKEventMap[K]): void {
    const set = this.listeners.get(event);
    if (!set || set.size === 0) return;

    // Create a copy of the set to avoid mutation issues during dispatch
    const callbacks = Array.from(set);
    for (const cb of callbacks) {
      try {
        cb(data);
      } catch (err) {
        console.error(`[TryOnSDK] Error in listener for event "${String(event)}":`, err);
      }
    }
  }

  /**
   * Remove all listeners
   */
  public clear(): void {
    this.listeners.clear();
  }
}

export const events = new EventEmitter();
