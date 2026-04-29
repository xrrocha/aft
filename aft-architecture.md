# Aft Architecture Specification

**Version**: 0.2 (Draft)
**Status**: Design in Progress, Implementation Pending
**Last Updated**: 2026-04-29

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

**Architectural identity.** Aft is a minimal reactive DOM binding system with declarative dataflow and optional async semantics. It is **not** a component framework, a virtual DOM system, or a full application platform. Holding to that scope is deliberate; it is what keeps the surface area small and the behavior legible.

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
- Internal tools and metadata-driven UIs

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
| Deep component hierarchies | Aft is a binding layer, not an application framework |

### 1.5 Design Tensions

Aft's design navigates three persistent tensions. Calling them out explicitly helps keep future decisions aligned with the project's identity.

| Tension | Stance |
|---------|--------|
| **Simplicity vs. Structure** | Maintain minimalism without collapsing under the weight of real applications. When in doubt, favor fewer primitives. |
| **Declarative vs. Expressive Power** | Allow inline JavaScript without turning markup into a programming language. When expressions grow, encourage delegation to named functions rather than new syntax. |
| **Transparency vs. Safety** | Expose behavior clearly in markup while avoiding obvious footguns. Prefer explicit opt-in over hidden magic. |

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

**Async loading**: When `src` is used, the form waits for fetch before emitting `aft-ready`. Loading state handling is TBD (see §12.1).

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
| `aft-task` | Name an async task (see §7) | Identifier |
| `aft-policy` | Concurrency policy (see §7) | `drop` \| `restart` \| `queue` \| `parallel` |

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

Constraint attributes express **UI-level validation** (input format, length, presence). Domain-level validation — business rules, server-side checks — is the application's responsibility, typically expressed via the task model (see §7) and `$tasks.<name>.error`.

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

## 7. Async and Tasks

### 7.1 Rationale

Aft's synchronous reactive model is sufficient for immediate state transitions: button clicks that mutate local data, computed values that re-derive, conditionals that re-render. But any interaction involving asynchronous work — saving to a server, fetching from an API, waiting for a confirmation — introduces something the synchronous model cannot capture: **multiple overlapping user intentions competing over time**.

A user clicks "Save" while a previous save is still in flight. A typed search query races the network. A submit fires twice from a double click. These are not implementation details; they are first-class declarative concerns about *which intent wins*.

Aft therefore exposes async work as a named, observable, policy-governed primitive: the **task**. Async handling is treated as a first-class declarative concern, not an implementation detail.

### 7.2 The Task Model

A task represents an asynchronous operation initiated by a user action. It is identified by name and exposes reactive state under `$tasks`.

```html
<button aft-click="save(data)" aft-task="save">
  Save
</button>
```

The function called by `aft-click` may return a promise; the task system observes its lifecycle through the `aft-task` declaration. Multiple bindings sharing the same task name share the same state — useful for global "saving…" indicators driven by any save trigger.

### 7.3 Task State

Each named task exposes:

```js
$tasks.<name> = {
  pending: boolean,
  error: Error | null,
  result: any,
  attempt: number,
  startedAt: timestamp,
  finishedAt: timestamp
}
```

These values are fully reactive and may be used in any expression:

```html
<span aft-show="$tasks.save.pending">Saving...</span>
<span aft-show="$tasks.save.error"
      aft-text="$tasks.save.error.message"></span>
```

### 7.4 Concurrency Policies

A task may declare a concurrency policy governing overlapping executions:

```html
<button aft-click="save(data)"
        aft-task="save"
        aft-policy="drop">
```

| Policy     | Behavior                                   |
| ---------- | ------------------------------------------ |
| `drop`     | Ignore new attempts while one is pending   |
| `restart`  | Cancel/ignore previous attempt, run latest |
| `queue`    | Execute sequentially                       |
| `parallel` | Allow all attempts concurrently            |

If unspecified, the default is `parallel`.

> **Note.** The `parallel` default is under review — for most user-initiated actions, `drop` or `restart` are safer. See Appendix C.9.

### 7.5 Stale Result Handling

For policies such as `restart`, earlier task completions are ignored when a newer attempt has superseded them. This prevents stale results from overwriting newer user intent. The exact cancellation mechanism for in-flight work — for example, propagating an `AbortSignal` to the task function — is left to the implementation and may be revisited as the task model matures.

### 7.6 Integration with Existing Bindings

Async state composes with the standard binding attributes — no new rendering primitives are introduced:

```html
<button aft-click="save(data)"
        aft-task="save"
        aft-policy="drop"
        aft-attr-disabled="$tasks.save.pending">
  Save
</button>

<div aft-if="$tasks.save.error" class="error">
  <p aft-text="$tasks.save.error.message"></p>
  <button aft-click="save(data)" aft-task="save">Retry</button>
</div>
```

### 7.7 Design Constraints

The task model deliberately preserves the broader Aft philosophy:

- No implicit awaiting of expressions
- No hidden scheduling beyond task management
- No async-specific templating constructs (no `<aft-await>`, no `<aft-suspense>`)
- Full compatibility with plain JavaScript functions returning promises

---

## 8. Implementation Notes

*This section is for implementers. Users can skip it.*

### 8.1 Proxy-Based Reactivity

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

### 8.2 Effect Execution

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

### 8.3 Computed Values

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

### 8.4 Array Handling

Array mutating methods (`push`, `pop`, `splice`, `shift`, `unshift`, `sort`, `reverse`) must be intercepted to trigger updates. The Proxy wraps these methods to call `trigger` after mutation.

### 8.5 Update Batching

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

### 8.6 Initial Strategy: Brute Force

v1 uses brute-force updates: when any data changes, all effects re-run. This is simple and correct. Optimize later based on real bottlenecks.

---

## 9. Lifecycle

### 9.1 Initialization Sequence

When `<aft-form>` connects to DOM:

1. Find `<aft-data>`, parse JSON, create reactive object
2. Find `<aft-bind>`, register computed values
3. Scan descendants for `aft-*` attributes
4. Create effects for each binding
5. Run all effects (initial render)
6. Emit `aft-ready` event

### 9.2 Dynamic Content

Content added after initialization must be processed:

```javascript
document.getElementById('my-form').rescan();
```

Content inside `aft-if` and `aft-each` is handled automatically.

### 9.3 Cleanup

When `<aft-form>` disconnects:
- Effects disposed
- Event listeners removed
- Dependency tracking cleared

---

## 10. Error Handling

### 10.1 Expression Errors

If an expression throws:
- Error logged to console
- Binding uses fallback (empty string for text)
- Other bindings continue working

### 10.2 Circular Dependencies

```html
<aft-bind name="a" calc="b + 1"></aft-bind>
<aft-bind name="b" calc="a + 1"></aft-bind>
<!-- Error: Circular dependency: a → b → a -->
```

Detected during evaluation. Error logged, computed returns `undefined`.

### 10.3 Invalid Paths

If `aft-ref` path doesn't exist:
- Reading returns `undefined`
- Writing creates the path (standard JS behavior)

---

## 11. Complete Example

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

## 12. Open Questions and Future Work

### 12.1 Unresolved Design Questions

| Question | Notes |
|----------|-------|
| Custom validation messages | How to associate messages with constraints? `aft-message` attribute? |
| Loading state for `<aft-data src>` | Reuse task-model semantics (e.g. `$tasks.<dataId>.pending`) or introduce a separate primitive? |
| Form submission | Declarative `<aft-submit>` element, or leave to user? |
| Animation hooks | How to animate `aft-if`/`aft-show` transitions? |
| Multiple data source merge | Exact semantics when mixing `id` and no-`id` data elements? |
| Default concurrency policy | Whether `parallel` is the right default for `aft-task` (see Appendix C.9) |

### 12.2 Known v1 Limitations

| Limitation | Rationale |
|------------|-----------|
| Brute-force updates | Simplicity first; optimize when we understand real bottlenecks |
| No keyed iteration | `aft-each` re-renders on any change; keying deferred (see Appendix C.1) |
| Global function scope | Expressions eval in global scope; no sandboxing |
| Single document | No iframe/shadow DOM support |

### 12.3 Future Exploration

- **Fine-grained reactivity**: Per-property dependency tracking
- **DevTools**: Visualize dependency graph and data flow (see Appendix C.5)
- **TypeScript integration**: Type-safe expressions
- **Transitions**: `aft-enter`, `aft-leave` for animations
- **Scoped contexts**: A possible `<aft-scope>` element for nested local state (see Appendix C.3)

---

## 13. Glossary

| Term | Definition |
|------|------------|
| **Binding** | Connection between DOM element and data via `aft-*` attribute |
| **Computed** | Derived value from `<aft-bind>`, auto-updated on dependency change |
| **Concurrency Policy** | Rule governing how overlapping executions of a task interact (see §7.4) |
| **Data** | Application state from `<aft-data>` |
| **Dependency** | Property accessed during effect execution |
| **Effect** | Function that updates DOM when dependencies change |
| **Expression** | JavaScript code in attribute values |
| **Path** | Assignable property chain (e.g., `user.name`) |
| **Proxy** | JS feature for intercepting property access |
| **Reactive** | Data wrapped for automatic change detection |
| **Task** | Named asynchronous operation with reactive state under `$tasks` (see §7) |

---

## 14. Acknowledgements

Aft's design was informed by:

- **XForms** (W3C) — Pioneered declarative form binding
- **Fore** — XForms-inspired Web Components library; Aft borrowed core concepts (reactive model, computed values, constraints) while replacing XPath/XML with JavaScript/JSON
- **Vue.js** — Proxy-based reactivity model
- **Alpine.js** — Attribute-based binding syntax
- **ember-concurrency** — Named tasks with concurrency policies

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

### A.6 Async / Tasks

| Attribute | Value | Description |
|-----------|-------|-------------|
| `aft-task` | identifier | Names a task whose state is exposed under `$tasks.<name>` |
| `aft-policy` | `drop` \| `restart` \| `queue` \| `parallel` | Concurrency policy for the task (default: `parallel`; under review) |

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
| `$tasks` | All expressions | Reactive map of named async task states (see §7.3) |

---

## Appendix C: Known Weaknesses and Proposed Directions

This appendix is an honest inventory of acknowledged weaknesses in the current design, paired with anticipated directions for resolution. Inclusion here does not imply commitment to any specific solution; it commits only to acknowledging the gap.

### C.1 Lack of Identity in Iteration

**Issue.** `aft-each` lacks keying, so any change to the source array re-renders the entire list. This is inefficient for large lists and can cause loss of focus, scroll position, and input state.

**Proposed direction.** Introduce an `aft-key` attribute supplying a stable identity expression:

```html
<li aft-each="items" aft-as="item" aft-key="item.id">
```

When present, the implementation can perform keyed reconciliation rather than full re-render.

### C.2 Expression Sprawl

**Issue.** Inline expressions can accumulate non-trivial logic, reducing readability and making behavior harder to test in isolation.

**Proposed direction.** No syntactic enforcement. Encourage delegation to named functions in documentation and example code:

```html
<button aft-click="app.addItem(data)">Add</button>
```

### C.3 Absence of Scoped Contexts

**Issue.** A single global scope per `<aft-form>` limits composability. There is no way to define a reusable subtree with its own local state.

**Proposed direction.** A possible — *not yet committed* — `<aft-scope>` element introducing nested scopes without a full component abstraction:

```html
<aft-scope data="item">
  <!-- inner bindings see `item` as their local root -->
</aft-scope>
```

This expands the element count from three to four and is in tension with "minimal surface" (§1.2). Decision deferred.

### C.4 Validation Ambiguity

**Issue.** Without explicit scoping, `aft-constraint` can drift between UI-level validation (input format, length, presence) and domain-level validation (business rules, server-side checks).

**Proposed direction.** Scope `aft-constraint` to UI-level validation in documentation and examples (already reflected in §5.1). Domain validation remains the application's responsibility, expressed via the task model and `$tasks.<name>.error`.

### C.5 Debuggability Limitations

**Issue.** No introspection into active bindings, dependency graphs, or recent errors — diagnosing reactive bugs requires console-based archaeology.

**Proposed direction.** A development-mode build exposing:

- active bindings on a given element
- the dependency graph
- last errors per binding
- a snapshot of current reactive state

### C.6 Performance Limitations

**Issue.** The v1 brute-force update strategy re-runs all effects on any data change.

**Proposed direction.** Maintain the simple strategy as the default. Explore optionally:

- dependency graph pruning (re-run only effects whose dependencies changed)
- keyed list updates (see C.1)
- partial invalidation per property path

### C.7 Security Considerations

**Issue.** Aft evaluates arbitrary JavaScript expressions from markup. While markup is author-controlled in normal use, mistakes — for example, interpolating untrusted strings into attributes — can introduce code execution paths.

**Proposed direction.**

- Maintain JSON-only data input for `<aft-data>`
- Document trust boundaries clearly: markup is trusted; `<aft-data>` content is data
- Resist introducing expression sandboxing prematurely; the cost rarely justifies the benefit

### C.8 Missing Transaction / State Semantics

**Issue.** Aft has no built-in notion of commit/rollback, snapshotting, or dirty-tracking against a baseline.

**Proposed direction.** Out of scope for standalone Aft. Leave the door open by ensuring the reactive layer can be observed externally, so applications or extensions can layer transactional semantics on top.

### C.9 Default Concurrency Policy

**Issue.** §7.4 defines the default `aft-task` policy as `parallel`. For typical user-initiated actions (save, submit, fetch), `parallel` allows duplicate work and out-of-order completions — a footgun for the common case. A double-clicked Save fires two requests; the later-issued request may complete first and be overwritten by the earlier one.

**Proposed direction.** Reconsider before v1. Candidates:

- Default to `drop` (safest for clicks)
- Default to `restart` (safest for typed input)
- Require explicit `aft-policy` (no default — most explicit, least convenient)

---

*End of Specification*
