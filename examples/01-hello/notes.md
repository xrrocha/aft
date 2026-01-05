# 01 - Hello World

## Overview
The simplest possible Aft example - a single input control with dynamic message display.

## Translation Decisions

### Element Names
- `fx-fore` → `aft-form`
  - "form" is semantically accurate (data + UI binding)
  - Familiar to web developers
  - Honors XForms heritage without making it explicit
  - Same character count as `fx-fore` (7 chars)

- `fx-control` → `aft-control`
  - Keep same concept, just change prefix

- `fx-message` → `aft-message`
  - Keep same concept, just change prefix

### Expression Language

**Fore (XPath):**
```html
<fx-control ref="greeting">
    <fx-message event="value-changed">Hello {.}</fx-message>
</fx-control>
```

**Aft (JSONPath + JS):**
```html
<aft-form>
    <aft-control ref="$.greeting">
        <aft-message event="value-changed">Hello ${value}</aft-message>
    </aft-control>
</aft-form>
```

**Key Changes:**

1. **ref attribute:**
   - Fore: `ref="greeting"` (XPath - relative path)
   - Aft: `ref="$.greeting"` (JSONPath - explicit root with `$`)

2. **Template expressions:**
   - Fore: `{.}` (XPath - current node)
   - Aft: `${value}` (JS template literal - current value)
   - Rationale: `${...}` is native JavaScript syntax, immediately familiar
   - The context provides `value` variable for current bound value

### Implicit Model

**Fore:** Creates an implicit "lazy instance" when no `fx-instance` is declared.
Data is created on-the-fly when controls bind to refs.

**Aft:** Same behavior - when no `aft-data` is present, create lazy model.
The control with `ref="$.greeting"` will automatically create:
```json
{
  "greeting": ""
}
```

### Event System

Both use same event model:
- `value-changed` fires when control value changes
- Message displays during event

## Design Decisions (Confirmed)

1. **Lazy model creation**
   - ✅ Keep Fore's approach - create model on-demand when no explicit `aft-data`
   - Simplifies hello-world cases

2. **Template expression syntax: `${...}`**
   - ✅ Use native JS template literal syntax
   - Clearly signals "this is JavaScript"
   - Familiar to all JS developers

3. **Context variables in expressions:**
   - ✅ `value` - current bound value (equivalent to XPath `.`)
   - ✅ `data` - root data object (equivalent to `instance()`)
   - ✅ `index` - for repeats (equivalent to `index()`)
   - ✅ `event` - event object (equivalent to `event()`)

4. **No redundant root element**
   - ✅ Unlike XML/Fore, JSON doesn't need wrapper `<data>` element
   - The JSON structure itself defines the root

5. **Dual-mode data:**
   - ✅ Inline: `<aft-data>{...json...}</aft-data>`
   - ✅ External: `<aft-data src="..."></aft-data>`
   - 🤔 Reference: `<aft-data ref="..."></aft-data>` (syntax TBD)

## Resolved Questions

1. ✅ **Data reference syntax: Attribute-based**
   ```html
   <aft-data id="languages" source="person" path="languages"></aft-data>
   ```
   - Clean separation of concerns
   - `source` references another `aft-data` by id
   - `path` can contain JS/JSONPath expressions
   - Allows future extension (e.g., `path="languages.filter(l => l.active)")

2. ✅ **Repeat context variable: `item`**
   - Emphasizes multivalued nature (arrays/collections)
   - Reserves `value` for scalar bindings (controls)
   - Intuitive semantic distinction

3. ✅ **Format support: JSON-first, design for pluggability**
   - Start with JSON only
   - Design parser interface for future formats (YAML, XML, etc.)
   - Revisit based on real-world needs

## Implementation Notes

For this example to work, Aft needs:

1. ✅ `aft-form` element - main container
2. ✅ `aft-control` element - generic control wrapper
3. ✅ `aft-message` element - event-driven message display
4. ✅ Lazy model creation
5. ✅ JSONPath ref resolution
6. ✅ Template expression evaluation (`${...}`)
7. ✅ Event system (`value-changed`)
8. ✅ Two-way data binding

## Next Steps

After validating this translation:
- Proceed to 02-binding (explicit model)
- Establish pattern for more complex refs
