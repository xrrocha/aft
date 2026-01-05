/**
 * Unit tests for reactive core
 *
 * Run with: bun test
 */

import { describe, test, expect } from 'bun:test';
// import { reactive, effect, computed } from '../../src/reactive';

describe('reactive()', () => {
  test.todo('creates a reactive proxy');
  test.todo('tracks nested property access');
  test.todo('triggers updates on property change');
  test.todo('handles array mutations (push, pop, splice)');
  test.todo('handles Map and Set mutations');
});

describe('effect()', () => {
  test.todo('runs immediately on registration');
  test.todo('re-runs when dependencies change');
  test.todo('tracks only accessed properties');
  test.todo('handles nested effects');
});

describe('computed()', () => {
  test.todo('lazily evaluates getter');
  test.todo('caches result until dependencies change');
  test.todo('can be used as dependency in effects');
});
