/**
 * Custom elements - <aft-form>, <aft-data>, <aft-bind>
 *
 * Phase 2+ implementation target
 */

import { reactive } from './reactive.js';
// import { initBindings } from './bindings.js'; // TODO: use in Phase 2

/**
 * Root container for Aft data binding
 * Provides getData/setData API and scopes binding context
 */
export class AftForm extends HTMLElement {
  private _data: Map<string, object> = new Map();

  connectedCallback(): void {
    // TODO: Phase 2 - Initialize form
    // - Parse child <aft-data> elements
    // - Set up binding context
    // - Process aft-* attributes
    // - Dispatch aft-ready event
    this.dispatchEvent(new CustomEvent('aft-ready', { bubbles: true }));
    document.dispatchEvent(new CustomEvent('aft-ready', { detail: { form: this } }));
  }

  /**
   * Get reactive data by ID
   */
  getData(id: string): object | undefined {
    return this._data.get(id);
  }

  /**
   * Set data by ID, triggering reactivity
   */
  setData(id: string, data: object): void {
    this._data.set(id, reactive(data));
    // TODO: Trigger re-render
  }

  /**
   * Re-scan for dynamically added content
   */
  rescan(): void {
    // TODO: Phase 7 - Re-process bindings
  }
}

/**
 * Data source element - inline JSON or external fetch
 */
export class AftData extends HTMLElement {
  connectedCallback(): void {
    // TODO: Phase 2 - Parse inline JSON
    // TODO: Phase 7 - Handle src attribute for async fetch
  }
}

/**
 * Named computed value binding
 */
export class AftBind extends HTMLElement {
  connectedCallback(): void {
    // TODO: Phase 3 - Register computed binding
  }
}
