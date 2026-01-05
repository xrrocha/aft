/**
 * Attribute bindings - aft-ref, aft-text, aft-each, aft-if, etc.
 *
 * Phase 2-6 implementation targets
 */

// import { effect } from './reactive.js'; // TODO: use in Phase 2

export interface BindingContext {
  data: Record<string, unknown>;
  locals?: Record<string, unknown>;
}

/**
 * Initialize all bindings within a root element
 */
export function initBindings(root: Element, context: BindingContext): void {
  // TODO: Walk DOM and process aft-* attributes
  processElement(root, context);
}

function processElement(el: Element, context: BindingContext): void {
  // Process in order of precedence:
  // 1. aft-each (creates new scope)
  // 2. aft-if (may remove element)
  // 3. Other bindings

  // TODO: Phase 2 - aft-text, aft-ref
  // TODO: Phase 3 - aft-each, aft-as, aft-index-as
  // TODO: Phase 4 - aft-if, aft-show, aft-click, aft-on-*
  // TODO: Phase 5 - aft-class, aft-style, aft-attr-*, aft-html

  // Recurse to children
  for (const child of el.children) {
    processElement(child, context);
  }
}

/**
 * Evaluate an expression in the given context
 * Security: Only property access, no arbitrary JS
 */
export function evaluate(_expr: string, _context: BindingContext): unknown {
  // TODO: Phase 2 - Implement safe expression evaluation
  // - Parse property paths (a.b.c)
  // - Support simple expressions (a + b, a ? b : c)
  // - Reject dangerous constructs
  throw new Error('evaluate() not yet implemented - Phase 2');
}

/**
 * Resolve a property path to get/set values
 */
export function resolvePath(
  _path: string,
  _context: BindingContext
): { target: object; key: string } | undefined {
  // TODO: Phase 2 - Implement path resolution
  // - Split on dots
  // - Walk object tree
  // - Return final target and key for two-way binding
  throw new Error('resolvePath() not yet implemented - Phase 2');
}
