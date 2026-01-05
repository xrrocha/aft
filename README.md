# Aft

**Declarative, attribute-based data binding for the browser.**

Aft enables reactive HTML interfaces through plain JavaScript expressions bound to data via HTML attributes. No build step, no framework lock-in, no template DSL — just HTML with data-binding attributes and JavaScript for logic.

## Quick Example

```html
<aft-form>
  <aft-data>
  {
    "tasks": [
      {"text": "Learn Aft", "done": false},
      {"text": "Build something", "done": false}
    ],
    "newText": ""
  }
  </aft-data>

  <aft-bind name="remaining" calc="tasks.filter(t => !t.done).length"></aft-bind>

  <h1>Todo (<span aft-text="remaining"></span> left)</h1>

  <input aft-ref="newText" placeholder="New task...">
  <button aft-click="tasks.push({text: newText, done: false}); newText = ''">Add</button>

  <ul>
    <li aft-each="tasks" aft-as="task">
      <input type="checkbox" aft-ref="task.done">
      <span aft-text="task.text"></span>
    </li>
  </ul>
</aft-form>
```

## Design Philosophy

- **Declarative**: Describe what, not how
- **JavaScript-native**: Plain JS expressions everywhere — no DSL, no special syntax
- **No build step**: Works directly via ES modules
- **Minimal surface**: Three elements, handful of attributes
- **Explicit**: Behavior is visible in markup

## Core Concepts

### Three Custom Elements

| Element | Purpose |
|---------|---------|
| `<aft-form>` | Root container, owns reactive context |
| `<aft-data>` | Data declaration (JSON content or external `src`) |
| `<aft-bind>` | Computed values (optional) |

### Binding Attributes

| Attribute | Purpose |
|-----------|---------|
| `aft-ref="path"` | Two-way binding to data path |
| `aft-text="expr"` | One-way text content |
| `aft-each="path"` | Iteration over collection |
| `aft-if="expr"` | Conditional rendering |
| `aft-show="expr"` | Conditional visibility |
| `aft-click="stmt"` | Click handler |
| `aft-on-{event}="stmt"` | Arbitrary event handlers |

## How It Works

Aft wraps your data in a JavaScript **Proxy** that detects reads and writes:

1. When you write `<span aft-text="count">`, Aft creates an *effect* that reads `count` and sets the span's text
2. The Proxy records: "this effect depends on `count`"
3. When `count` changes, the effect re-runs automatically

No virtual DOM. No compilation. Just JavaScript proxies and DOM updates.

## Documentation

See [aft-architecture.md](aft-architecture.md) for the complete specification.

## Status

**Current phase**: Design complete, implementation pending.

The architecture has been defined through extensive deliberation. Core concepts are stable. Implementation has not begun.

## Target Use Cases

- Form-heavy applications
- Generated UIs from metadata
- Prototyping without tooling
- Teaching reactive programming

## Acknowledgements

Aft's design was informed by:

- **[Fore](https://github.com/Jinntec/Fore)** — XForms-inspired declarative UI; we borrowed core concepts while replacing XPath/XML with JavaScript/JSON
- **[Ireneo](https://github.com/xrrocha/ireneo)** — Proxy patterns for tracking complex mutations
- **Vue.js** — Proxy-based reactivity model
- **Alpine.js** — Attribute-based binding syntax

## License

[TBD]
