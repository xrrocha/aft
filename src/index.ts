/**
 * Aft - Declarative, attribute-based data binding for the browser
 *
 * @module aft
 */

export { reactive, effect, computed } from './reactive.js';
export { AftForm, AftData, AftBind } from './elements.js';
export { initBindings } from './bindings.js';

// Import classes for local use in init()
import { AftForm, AftData, AftBind } from './elements.js';

// Auto-initialize when DOM is ready
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => init());
  } else {
    init();
  }
}

function init(): void {
  // Register custom elements
  if (!customElements.get('aft-form')) {
    customElements.define('aft-form', AftForm);
  }
  if (!customElements.get('aft-data')) {
    customElements.define('aft-data', AftData);
  }
  if (!customElements.get('aft-bind')) {
    customElements.define('aft-bind', AftBind);
  }
}
