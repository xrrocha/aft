/**
 * Reactive core - Proxy-based reactivity with automatic dependency tracking
 *
 * Phase 1 implementation target
 */

type EffectFn = () => void;

let activeEffect: EffectFn | null = null;
const targetMap = new WeakMap<object, Map<string | symbol, Set<EffectFn>>>();

/**
 * Create a reactive proxy that tracks dependencies and triggers updates
 */
export function reactive<T extends object>(_target: T): T {
  // TODO: Phase 1 - Implement deep reactive proxy
  // - Proxy wrapper with get/set traps
  // - Dependency tracking via targetMap
  // - Array method interception
  throw new Error('reactive() not yet implemented - Phase 1');
}

/**
 * Register an effect that re-runs when its dependencies change
 */
export function effect(_fn: EffectFn): void {
  // TODO: Phase 1 - Implement effect registration
  // - Set activeEffect during execution
  // - Track dependencies via get traps
  // - Re-run on dependency changes
  throw new Error('effect() not yet implemented - Phase 1');
}

/**
 * Create a computed value that caches until dependencies change
 */
export function computed<T>(_getter: () => T): { readonly value: T } {
  // TODO: Phase 1 - Implement lazy computed
  // - Cache result until invalidated
  // - Track as dependency when accessed
  throw new Error('computed() not yet implemented - Phase 1');
}

// Internal helpers for dependency tracking
export function track(target: object, key: string | symbol): void {
  if (!activeEffect) return;
  let depsMap = targetMap.get(target);
  if (!depsMap) {
    targetMap.set(target, (depsMap = new Map()));
  }
  let deps = depsMap.get(key);
  if (!deps) {
    depsMap.set(key, (deps = new Set()));
  }
  deps.add(activeEffect);
}

export function trigger(target: object, key: string | symbol): void {
  const depsMap = targetMap.get(target);
  if (!depsMap) return;
  const deps = depsMap.get(key);
  if (deps) {
    deps.forEach((effect) => effect());
  }
}
