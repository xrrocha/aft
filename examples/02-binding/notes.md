# 02 - Simple Binding with Explicit Model

## Overview
Demonstrates explicit model declaration and two-way data binding with multiple controls bound to the same data path.

## Translation Decisions

### Element Mapping
- `fx-fore` → `aft-form`
- `fx-model` → `aft-model`
- `fx-instance` → `aft-data`
- `fx-control` → `aft-control`

### No Redundant Root Element

**Fore (XML requires single root):**
```html
<fx-model id="model1">
    <fx-instance>
        <data>  <!-- Redundant wrapper! -->
            <item>foobar</item>
        </data>
    </fx-instance>
</fx-model>
```

**Aft (JSON defines its own structure):**
```html
<aft-model>
    <aft-data id="main">
    {
        "item": "foobar"
    }
    </aft-data>
</aft-model>
```

**Key Benefit:** No need for `<data>` wrapper - the JSON itself is the data structure.

### Data Reference Syntax

**Fore uses XPath:**
```html
<fx-control ref="item">  <!-- Relative path from root -->
```

**Aft uses JSONPath:**
```html
<aft-control ref="$.item">  <!-- Explicit root with $ -->
```

**Why explicit `$`?**
- Clear that we're querying from root
- Standard JSONPath syntax
- Differentiates from potential future relative refs

### Template Expressions

**Fore (XPath function):**
```html
<div>Current value: {instance()/item}</div>
```

**Aft (JS context variable):**
```html
<div>Current value: ${data.item}</div>
```

**Context Variables:**
- `data` - The root data object (equivalent to `instance()` in XPath)
- `value` - Current bound value (for controls)
- `item` - Current item in repeats
- `index` - Current index in repeats
- `event` - Event object in event handlers

### Update Events

Both Fore and Aft support `update-event` attribute:
```html
<aft-control ref="$.item" update-event="input">
```

**Behavior:**
- Without `update-event`: Updates on `change` event (blur)
- With `update-event="input"`: Updates on every keystroke
- Same as Fore's behavior

### Two-Way Binding

Both controls bind to `$.item`:
```html
<aft-control ref="$.item" update-event="input">
    <label>First binding</label>
</aft-control>

<aft-control ref="$.item">
    <label>Same binding (synced)</label>
</aft-control>
```

**Expected behavior:**
1. User types in first control
2. Model updates on every keystroke (due to `update-event="input"`)
3. Second control automatically updates (observer pattern)
4. Template expression `${data.item}` also updates

This demonstrates Aft's **reactive data binding** - all observers of a ModelItem are notified when it changes.

## Data Format Design

### Three Modes of `aft-data`

**1. Inline JSON (this example):**
```html
<aft-data id="main">
{
    "item": "foobar"
}
</aft-data>
```

**2. External source (future):**
```html
<aft-data id="main" src="/api/data.json"></aft-data>
```

**3. Reference to other data (future):**
```html
<aft-data id="person">{"name": "Ricardo", "languages": [...]}</aft-data>
<aft-data id="langs" source="person" path="languages"></aft-data>
```

### Format Pluggability

The `aft-data` element should be designed for format extensibility:

```javascript
// Internal parser registry (future)
class DataParser {
  static parsers = {
    'json': (text) => JSON.parse(text),
    // Future formats:
    // 'yaml': (text) => YAML.parse(text),
    // 'xml': (text) => xmlToJson(text),
  };

  static parse(text, format = 'json') {
    return this.parsers[format](text);
  }
}
```

For now: **JSON only**, but architecture supports adding YAML, XML, etc. later.

## Implementation Notes

For this example to work, Aft needs:

1. ✅ `aft-form` element
2. ✅ `aft-model` container element
3. ✅ `aft-data` element with JSON parsing
4. ✅ `aft-control` with two-way binding
5. ✅ JSONPath ref resolution (`$.item`)
6. ✅ Observer pattern (multiple controls observe same ModelItem)
7. ✅ Template expression evaluation (`${data.item}`)
8. ✅ `update-event` attribute support
9. ✅ Automatic UI refresh on data change

## Key Architectural Points

### ModelItem Creation
When `aft-data` is parsed:
1. Parse JSON to object: `{"item": "foobar"}`
2. Create ModelItem for each path:
   - Path: `$.item`
   - Node: `"foobar"`
   - Observers: [] (empty initially)

### Binding Process
When `aft-control` with `ref="$.item"` initializes:
1. Resolve JSONPath `$.item` against data → gets `"foobar"`
2. Find/create ModelItem for path `$.item`
3. Register control as observer of ModelItem
4. Render control with initial value

### Update Flow
When user types in first control:
1. Control fires `input` event (because `update-event="input"`)
2. Control reads new value from input element
3. Control updates ModelItem: `modelItem.value = newValue`
4. ModelItem notifies all observers (control 2, template expression)
5. Observers re-render with new value

This is the **core reactive pattern** that powers Aft.

## Comparison with Fore

| Aspect | Fore | Aft |
|--------|------|-----|
| **Model wrapper** | `<fx-model id="...">` | `<aft-model>` (id optional) |
| **Data element** | `<fx-instance>` | `<aft-data>` |
| **Data format** | XML with `<data>` wrapper | JSON (no wrapper) |
| **Ref syntax** | `ref="item"` (XPath) | `ref="$.item"` (JSONPath) |
| **Templates** | `{instance()/item}` | `${data.item}` |
| **Update events** | Same | Same |
| **Reactivity** | Same (observer pattern) | Same (observer pattern) |

## Next Steps

After validating this translation:
- Proceed to 03-validation (ModelItem facets: required, readonly, constraint, relevant)
- This will introduce `aft-bind` element with JavaScript expressions for constraints
