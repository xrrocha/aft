# Aft Architecture Specification

**Version**: 0.1 (Draft)
**Status**: Design Complete, Implementation Pending
**Last Updated**: 2025-01-05

---

## 1. Introduction

### 1.1 What is Aft?

Aft is a JavaScript library for building reactive user interfaces in the browser. Write HTML with special attributes, provide JSON data, and Aft keeps them synchronized.

```html
<aft-form>
  <aft-data>{"count": 0}</aft-data>

  <p>Count: <span aft-text="count"></span></p>
  <button aft-click="count++">Increment</button>
</aft-form>
```

Click the button → `count` increases → the `<span>` updates. No manual DOM manipulation.

### 1.2 Design Philosophy

- **Declarative**: Describe what, not how
- **JavaScript-native**: Plain JS expressions everywhere — no DSL, no special syntax
- **No build step**: Works directly via ES modules
- **Minimal surface**: Three elements, handful of attributes
- **Explicit**: Behavior is visible in markup

### 1.3 Target Use Cases

- Form-heavy applications
- Generated UIs from metadata
- Prototyping without tooling
- Teaching reactive programming

### 1.4 Non-Goals

Aft deliberately does **not** address:

| Non-Goal | Rationale |
|----------|-----------|
| Server-side rendering | Browser-only; SSR requires different architecture |
| Routing | Orthogonal concern; use any router |
| Component encapsulation | No shadow DOM, no scoped styles — use CSS conventions |
| State persistence | User provides persistence; Aft manages reactivity |
| Large dataset virtualization | For 10K+ items, use specialized libraries |
| Cross-document forms | Single document scope; no iframe/shadow DOM support |

---

## 2. Core Concepts

### 2.1 A Complete Small Example

Before diving into details, here's a working mini-application:

```html
<aft-form>
  <aft-data>
  {
    "items": [
      {"name": "Apples", "price": 2.50, "qty": 3},
      {"name": "Bread", "price": 3.00, "qty": 1}
    ]
  }
  </aft-data>

  <aft-bind name="total" calc="items.reduce((sum, i) => sum + i.price * i.qty, 0)"></aft-bind>

  <h2>Shopping Cart</h2>

  <div aft-each="items" aft-as="item">
    <span aft-text="item.name"></span>:
    $<span aft-text="item.price.toFixed(2)"></span> ×
    <input type="number" aft-ref="item.qty" style="width:50px">
  </div>

  <p><strong>Total: $<span aft-text="total.toFixed(2)"></span></strong></p>

  <button aft-click="items.push({name: 'New Item', price: 0, qty: 1})">Add Item</button>
</aft-form>
```

This demonstrates: data binding, computed values, iteration, two-way binding, and actions.

### 2.2 The Reactive Data Model

Aft wraps your data in a JavaScript **Proxy** that detects all reads and writes:

```
  JSON Data → Reactive Proxy → Effects (DOM bindings)
                   ↓
            On mutation: re-run affected effects
```

**Key terms**:

| Term | Definition |
|------|------------|
| **Data** | Your application state (from `<aft-data>`) |
| **Reactive** | Data wrapped in Proxy for automatic change detection |
| **Effect** | A function that updates DOM when its dependencies change |
| **Dependency** | A data property accessed during effect execution |

When you write `<span aft-text="count">`, Aft creates an effect that:
1. Evaluates `count` (Proxy records: "this effect depends on `count`")
2. Sets `span.textContent` to the result
3. Re-runs automatically when `count` changes

### 2.3 Dependency Tracking

Aft uses **runtime** dependency tracking, not static analysis:

```javascript
// Expression: showTax ? (price * taxRate) : price

// If showTax is false → depends on: showTax, price
// If showTax is true  → depends on: showTax, price, taxRate
```

Runtime tracking captures actual dependencies, not theoretical ones. This happens automatically via Proxy interception.

### 2.4 Paths vs Expressions

| Concept | Used By | Examples | Requirement |
|---------|---------|----------|-------------|
| **Path** | `aft-ref` | `name`, `user.email`, `items[0].qty` | Must be assignable |
| **Expression** | everything else | `count * 2`, `items.filter(...)` | Valid JavaScript |

The distinction matters: two-way binding (`aft-ref`) needs to know *where* to write, not just what to read. Paths are read-write; expressions are read-only.

### 2.5 Expression Context

All expressions have access to certain variables depending on context. See **Appendix B** for the complete reference.

The most common:
- `data` — root data object (always available)
- `item`, `index` — in `aft-each` loops
- `value` — in `aft-ref` and `aft-constraint`

---

## 3. Elements

Aft defines three custom elements.

### 3.1 `<aft-form>`

Root container. Every Aft interface must be wrapped in one.

```html
<aft-form>
  <!-- everything goes here -->
</aft-form>
```

**Responsibilities**: Initialize reactive context, scan for data/bindings, coordinate updates.

**Events**: Emits `aft-ready` after initialization.

### 3.2 `<aft-data>`

Declares application data as JSON.

```html
<!-- Inline -->
<aft-data>{"name": "", "items": []}</aft-data>

<!-- External -->
<aft-data src="/api/data.json"></aft-data>
```

| Attribute | Description |
|-----------|-------------|
| `id` | Optional identifier for multiple data sources |
| `src` | URL to fetch JSON from (mutually exclusive with inline content) |

**Why JSON only?** Security. Evaluating JavaScript from external sources (APIs, localStorage) creates XSS vulnerabilities. JSON is safe to parse.

**Multiple data sources**:

```html
<aft-data id="form">{"name": ""}</aft-data>
<aft-data id="lookup">{"countries": [...]}</aft-data>

<!-- Access: form.name, lookup.countries -->
```

Rules:
- Single `<aft-data>` without `id` → its content is the root data
- Multiple `<aft-data>` with `id` → merged into object keyed by id
- Mixed (one without id, others with) → TBD, avoid for now

**Async loading**: When `src` is used, the form waits for fetch before emitting `aft-ready`. Loading state handling is TBD.

### 3.3 `<aft-bind>`

Declares computed values. Optional — only needed for derived values that are reused or form dependency chains.

```html
<aft-bind name="completedCount" calc="tasks.filter(t => t.done).length"></aft-bind>
<aft-bind name="allDone" calc="completedCount === tasks.length"></aft-bind>
```

| Attribute | Description |
|-----------|-------------|
| `name` | Identifier (required) — accessible in all expressions |
| `calc` | JavaScript expression to compute the value |

**Behavior**:
- Computed values are **read-only** (cannot use with `aft-ref`)
- Can reference other computed values (lazy evaluation handles ordering)
- Re-evaluate when dependencies change

---

## 4. Binding Attributes

Attributes starting with `aft-` connect elements to data.

### 4.1 Quick Reference

| Attribute | Purpose | Value Type |
|-----------|---------|------------|
| `aft-ref` | Two-way binding | Path |
| `aft-text` | Text content | Expression |
| `aft-html` | HTML content (⚠️ XSS risk) | Expression |
| `aft-each` | Iteration | Path to array |
| `aft-as` | Iteration variable name | Identifier |
| `aft-index-as` | Index variable name | Identifier |
| `aft-if` | Conditional render | Expression (boolean) |
| `aft-show` | Conditional visibility | Expression (boolean) |
| `aft-click` | Click handler | Statement |
| `aft-on-{event}` | Any event handler | Statement |
| `aft-class` | Dynamic classes | Expression (object or string) |
| `aft-style` | Dynamic styles | Expression (object) |
| `aft-attr-{name}` | Dynamic attribute | Expression |

See **Appendix A** for full details.

### 4.2 Two-Way Binding: `aft-ref`

Binds an input to a data path. Changes flow both ways.

```html
<input aft-ref="user.name">
<textarea aft-ref="comment"></textarea>
<input type="checkbox" aft-ref="agreed">
<select aft-ref="country">...</select>
```

Aft auto-detects input type and uses appropriate value property (`value`, `checked`) and event (`input`, `change`).

**Override event**: `<input aft-ref="name" aft-event="change">` (update on blur, not keystroke)

### 4.3 Display Binding: `aft-text`

Sets element's text content.

```html
<span aft-text="user.name"></span>
<span aft-text="`${items.length} items`"></span>
<span aft-text="total.toFixed(2)"></span>
```

### 4.4 Iteration: `aft-each`

Repeats an element for each array item.

```html
<ul>
  <li aft-each="tasks" aft-as="task">
    <input type="checkbox" aft-ref="task.done">
    <span aft-text="task.text"></span>
    <button aft-click="tasks.splice(index, 1)">×</button>
  </li>
</ul>
```

- `aft-as` sets the item variable (default: `item`)
- `aft-index-as` sets the index variable (default: `index`)
- Nested iterations: use explicit names to avoid shadowing

```html
<div aft-each="depts" aft-as="dept">
  <div aft-each="dept.people" aft-as="person">
    <span aft-text="`${person.name} in ${dept.name}`"></span>
  </div>
</div>
```

### 4.5 Conditionals: `aft-if` and `aft-show`

```html
<!-- Removes from DOM when false -->
<div aft-if="items.length > 0">...</div>

<!-- Hides via CSS when false (stays in DOM) -->
<div aft-show="isExpanded">...</div>
```

Use `aft-if` when content shouldn't exist when hidden. Use `aft-show` for frequent toggles.

### 4.6 Event Handlers: `aft-click`, `aft-on-*`

```html
<button aft-click="count++">+1</button>
<button aft-click="items.push({name: '', price: 0})">Add</button>
<button aft-click="saveData(data)">Save</button>

<input aft-on-focus="focused = true" aft-on-blur="focused = false">
<form aft-on-submit="event.preventDefault(); submit(data)">
```

The `event` variable is available in `aft-on-*` handlers.

### 4.7 Dynamic Attributes: `aft-class`, `aft-style`, `aft-attr-*`

```html
<div aft-class="{active: isActive, disabled: !enabled}">
<div aft-style="{backgroundColor: bgColor}">
<button aft-attr-disabled="isLoading">Submit</button>
<a aft-attr-href="linkUrl">Link</a>
```

---

## 5. Validation

### 5.1 Constraint Attributes

| Attribute | Purpose | Context Variable |
|-----------|---------|------------------|
| `aft-required` | Required when expression is truthy | — |
| `aft-constraint` | Valid when expression is truthy | `value` |
| `aft-readonly` | Read-only when expression is truthy | — |

```html
<input aft-ref="email"
       aft-required="true"
       aft-constraint="value.includes('@')">

<input aft-ref="age"
       aft-constraint="value >= 18 && value <= 120">

<input aft-ref="status"
       aft-readonly="isSubmitted">
```

### 5.2 Validation State: `$errors`

The `$errors` object exposes validation state:

| Property | Type | Description |
|----------|------|-------------|
| `$errors.{path}` | boolean | True if path has errors |
| `$errors.any` | boolean | True if any errors exist |
| `$errors.all` | array | All errors: `{path, message}` |

```html
<input aft-ref="email" aft-constraint="value.includes('@')">
<span aft-show="$errors.email" class="error">Invalid email</span>

<div aft-if="$errors.any">
  <p>Please fix errors:</p>
  <ul>
    <li aft-each="$errors.all" aft-text="item.message"></li>
  </ul>
</div>
```

**How paths map to errors**: The `aft-ref` path becomes the error key. For `aft-ref="user.email"`, check `$errors['user.email']` or `$errors.user?.email`.

**Custom messages** (TBD): Currently, error messages are generic. Future versions may support `aft-message` attribute.

### 5.3 CSS Classes

Aft applies classes to reflect state:

| Class | Meaning |
|-------|---------|
| `aft-valid` | All constraints pass |
| `aft-invalid` | Any constraint fails |
| `aft-required` | Has required constraint |
| `aft-pristine` | Not yet interacted with |
| `aft-dirty` | Has been modified |

---

## 6. Functions and External Logic

Expressions can call any globally-accessible JavaScript function:

```html
<script>
  function saveTasks(data) {
    localStorage.setItem('tasks', JSON.stringify(data.tasks));
  }

  function formatCurrency(n) {
    return '$' + n.toFixed(2);
  }
</script>

<aft-form>
  <aft-data>{"tasks": [], "total": 0}</aft-data>

  <span aft-text="formatCurrency(total)"></span>
  <button aft-click="saveTasks(data)">Save</button>
</aft-form>
```

For larger apps, use modules:

```html
<script type="module">
  import { save, load } from './app-logic.js';
  window.app = { save, load };
</script>

<button aft-click="app.save(data)">Save</button>
```

The `data` variable always refers to the root reactive object.

---

## 7. Implementation Notes

*This section is for implementers. Users can skip it.*

### 7.1 Proxy-Based Reactivity

The reactive system uses JavaScript Proxies:

```javascript
const data = new Proxy(rawData, {
  get(target, prop) {
    if (activeEffect) trackDependency(prop, activeEffect);
    const value = target[prop];
    // Recursively wrap nested objects
    return isObject(value) ? reactive(value) : value;
  },
  set(target, prop, value) {
    target[prop] = value;
    triggerEffects(prop);
    return true;
  }
});
```

### 7.2 Effect Execution

Each binding creates an effect:

```javascript
function createEffect(fn) {
  const effect = {
    run() {
      activeEffect = effect;
      fn();
      activeEffect = null;
    }
  };
  effect.run(); // Initial execution
  return effect;
}
```

### 7.3 Computed Values

Computed values are lazy:

```javascript
function computed(fn) {
  let cached, dirty = true;

  const effect = {
    run() { dirty = true; }
  };

  return {
    get value() {
      if (dirty) {
        activeEffect = effect;
        cached = fn();
        activeEffect = null;
        dirty = false;
      }
      return cached;
    }
  };
}
```

### 7.4 Array Handling

Array mutating methods (`push`, `pop`, `splice`, `shift`, `unshift`, `sort`, `reverse`) must be intercepted to trigger updates. The Proxy wraps these methods to call `trigger` after mutation.

### 7.5 Update Batching

Multiple synchronous mutations are batched via microtask:

```javascript
let pending = false;
const queue = new Set();

function scheduleEffect(effect) {
  queue.add(effect);
  if (!pending) {
    pending = true;
    queueMicrotask(() => {
      queue.forEach(e => e.run());
      queue.clear();
      pending = false;
    });
  }
}
```

### 7.6 Initial Strategy: Brute Force

v1 uses brute-force updates: when any data changes, all effects re-run. This is simple and correct. Optimize later based on real bottlenecks.

---

## 8. Lifecycle

### 8.1 Initialization Sequence

When `<aft-form>` connects to DOM:

1. Find `<aft-data>`, parse JSON, create reactive object
2. Find `<aft-bind>`, register computed values
3. Scan descendants for `aft-*` attributes
4. Create effects for each binding
5. Run all effects (initial render)
6. Emit `aft-ready` event

### 8.2 Dynamic Content

Content added after initialization must be processed:

```javascript
document.getElementById('my-form').rescan();
```

Content inside `aft-if` and `aft-each` is handled automatically.

### 8.3 Cleanup

When `<aft-form>` disconnects:
- Effects disposed
- Event listeners removed
- Dependency tracking cleared

---

## 9. Error Handling

### 9.1 Expression Errors

If an expression throws:
- Error logged to console
- Binding uses fallback (empty string for text)
- Other bindings continue working

### 9.2 Circular Dependencies

```html
<aft-bind name="a" calc="b + 1"></aft-bind>
<aft-bind name="b" calc="a + 1"></aft-bind>
<!-- Error: Circular dependency: a → b → a -->
```

Detected during evaluation. Error logged, computed returns `undefined`.

### 9.3 Invalid Paths

If `aft-ref` path doesn't exist:
- Reading returns `undefined`
- Writing creates the path (standard JS behavior)

---

## 10. Complete Example

A todo application demonstrating all major features:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Aft Todo</title>
  <script type="module" src="aft.js"></script>
  <style>
    .done { text-decoration: line-through; opacity: 0.6; }
    .aft-invalid { border-color: red; }
    .error { color: red; font-size: 0.8em; }
    .filters button.active { font-weight: bold; }
  </style>
</head>
<body>

<aft-form>
  <aft-data>
  {
    "tasks": [
      {"text": "Learn Aft", "done": false},
      {"text": "Build something", "done": false}
    ],
    "newText": "",
    "filter": "all"
  }
  </aft-data>

  <aft-bind name="completed" calc="tasks.filter(t => t.done).length"></aft-bind>
  <aft-bind name="active" calc="tasks.length - completed"></aft-bind>
  <aft-bind name="visible" calc="
    filter === 'all' ? tasks :
    filter === 'active' ? tasks.filter(t => !t.done) :
    tasks.filter(t => t.done)
  "></aft-bind>

  <h1>Todo</h1>

  <!-- Add task -->
  <div>
    <input aft-ref="newText"
           aft-constraint="value.length <= 100"
           placeholder="What needs to be done?">
    <span aft-show="$errors.newText" class="error">Max 100 chars</span>
    <button aft-click="tasks.push({text: newText, done: false}); newText = ''"
            aft-attr-disabled="!newText.trim()">Add</button>
  </div>

  <!-- Status -->
  <p><span aft-text="active"></span> left, <span aft-text="completed"></span> done</p>

  <!-- Filters -->
  <div class="filters">
    <button aft-click="filter = 'all'" aft-class="{active: filter === 'all'}">All</button>
    <button aft-click="filter = 'active'" aft-class="{active: filter === 'active'}">Active</button>
    <button aft-click="filter = 'completed'" aft-class="{active: filter === 'completed'}">Done</button>
  </div>

  <!-- Task list -->
  <ul>
    <li aft-each="visible" aft-as="task">
      <input type="checkbox" aft-ref="task.done">
      <span aft-text="task.text" aft-class="{done: task.done}"></span>
      <button aft-click="tasks.splice(tasks.indexOf(task), 1)">×</button>
    </li>
  </ul>

  <p aft-show="visible.length === 0">No tasks.</p>

  <button aft-show="completed > 0"
          aft-click="data.tasks = tasks.filter(t => !t.done)">
    Clear completed
  </button>
</aft-form>

</body>
</html>
```

---

## 11. Open Questions and Future Work

### 11.1 Unresolved Design Questions

| Question | Notes |
|----------|-------|
| Custom validation messages | How to associate messages with constraints? `aft-message` attribute? |
| Async data loading UX | What happens during `<aft-data src="...">` fetch? Loading state? |
| Form submission | Declarative `<aft-submit>` element, or leave to user? |
| Animation hooks | How to animate `aft-if`/`aft-show` transitions? |
| Multiple data source merge | Exact semantics when mixing `id` and no-`id` data elements? |

### 11.2 Known v1 Limitations

| Limitation | Rationale |
|------------|-----------|
| Brute-force updates | Simplicity first; optimize when we understand real bottlenecks |
| No keyed iteration | `aft-each` re-renders on any change; keying deferred |
| Global function scope | Expressions eval in global scope; no sandboxing |
| Single document | No iframe/shadow DOM support |

### 11.3 Future Exploration

- **Fine-grained reactivity**: Per-property dependency tracking
- **DevTools**: Visualize dependency graph and data flow
- **TypeScript integration**: Type-safe expressions
- **Keyed iteration**: `aft-key` attribute for efficient list updates
- **Transitions**: `aft-enter`, `aft-leave` for animations

---

## 12. Glossary

| Term | Definition |
|------|------------|
| **Binding** | Connection between DOM element and data via `aft-*` attribute |
| **Computed** | Derived value from `<aft-bind>`, auto-updated on dependency change |
| **Data** | Application state from `<aft-data>` |
| **Dependency** | Property accessed during effect execution |
| **Effect** | Function that updates DOM when dependencies change |
| **Expression** | JavaScript code in attribute values |
| **Path** | Assignable property chain (e.g., `user.name`) |
| **Proxy** | JS feature for intercepting property access |
| **Reactive** | Data wrapped for automatic change detection |

---

## 13. Acknowledgements

Aft's design was informed by:

- **XForms** (W3C) — Pioneered declarative form binding
- **Fore** — XForms-inspired Web Components library; Aft borrowed core concepts (reactive model, computed values, constraints) while replacing XPath/XML with JavaScript/JSON
- **Vue.js** — Proxy-based reactivity model
- **Alpine.js** — Attribute-based binding syntax

---

## Appendix A: Attribute Reference

### A.1 Data Binding

| Attribute | Value | Description |
|-----------|-------|-------------|
| `aft-ref` | path | Two-way binding; path must be assignable |
| `aft-text` | expression | Sets `textContent` |
| `aft-html` | expression | Sets `innerHTML` (⚠️ XSS risk with untrusted data) |

### A.2 Control Flow

| Attribute | Value | Description |
|-----------|-------|-------------|
| `aft-each` | path | Iterate over array |
| `aft-as` | identifier | Iteration variable name (default: `item`) |
| `aft-index-as` | identifier | Index variable name (default: `index`) |
| `aft-if` | expression | Remove from DOM when falsy |
| `aft-show` | expression | Hide via CSS when falsy |

### A.3 Events

| Attribute | Value | Description |
|-----------|-------|-------------|
| `aft-click` | statement | Execute on click |
| `aft-on-{event}` | statement | Execute on any event; `event` variable available |
| `aft-event` | event name | Override default event for `aft-ref` |

### A.4 Dynamic Attributes

| Attribute | Value | Description |
|-----------|-------|-------------|
| `aft-class` | expression | Object `{class: condition}` or string |
| `aft-style` | expression | Object `{prop: value}` |
| `aft-attr-{name}` | expression | Set any attribute dynamically |

### A.5 Validation

| Attribute | Value | Description |
|-----------|-------|-------------|
| `aft-required` | expression | Required when truthy |
| `aft-constraint` | expression | Valid when truthy; `value` available |
| `aft-readonly` | expression | Read-only when truthy |

---

## Appendix B: Context Variables

| Variable | Available In | Description |
|----------|--------------|-------------|
| `data` | All expressions | Root reactive data object |
| `value` | `aft-ref`, `aft-constraint` | Current bound value |
| `item` | `aft-each` (or `aft-as` name) | Current iteration element |
| `index` | `aft-each` (or `aft-index-as` name) | Current iteration index (0-based) |
| `event` | `aft-on-*` handlers | DOM event object |
| `$errors` | All expressions | Validation error state object |

---

*End of Specification*
