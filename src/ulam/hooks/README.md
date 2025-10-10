# Deck Validation Hook

## Overview

The `model_validate_hook.py` implements a **PostToolUse hook** for the Claude Agent SDK that automatically validates deck JSON files after they are written or edited.

## How It Works

### Hook: `validate_deck_on_write`

This async function is triggered after `Write` or `Edit` tool operations and:

1. **Detects deck JSON files** - Only activates for files containing "deck" in the path and ending with `.json`
2. **Validates structure** - Uses Pydantic's `Deck` model to validate the entire JSON structure
3. **Provides feedback** - Returns validation results with slide/block/source counts or error messages

### What Gets Validated

When a deck JSON file is written/edited, the hook validates:

- ✅ JSON syntax is correct
- ✅ All required fields are present (id, title, size, status, slides, etc.)
- ✅ Field types match the schema (strings, arrays, enums, etc.)
- ✅ Nested structures are valid (slides, blocks, sources, citations)
- ✅ Enum values are correct (DeckStatus, LayoutKind, BlockKindType, etc.)

## Integration with Claude Agent SDK

To use this hook in your Claude Agent:

```python
from claude_agent import ClaudeAgent, ClaudeAgentOptions, HookMatcher
from ulam.hooks import validate_deck_on_write

options = ClaudeAgentOptions(
    hooks={
        'PostToolUse': [
            HookMatcher(hooks=[validate_deck_on_write])
        ]
    }
)

agent = ClaudeAgent(options=options)
```

## Output Examples

### Successful Validation

```
🔍 [VALIDATION HOOK] Validating deck JSON: /path/to/deck.json
✅ [VALIDATION HOOK] Deck JSON is valid!
   - Title: Deutsche Bank: Transformed European Banking Champion
   - Slides: 6
   - Blocks: 24
   - Sources: 4

System Message: ✅ Deck validation passed: 6 slides, 24 blocks, 4 sources.
```

### Validation Error

```
🔍 [VALIDATION HOOK] Validating deck JSON: /path/to/deck.json
❌ [VALIDATION HOOK] Validation error: Field required [type=missing, input_value={...}]

System Message: ❌ Validation failed: Field required
```

## Testing

Run the test script to verify the hook:

```bash
python test_hook.py
```

## Benefits

1. **Automatic validation** - No need to manually run validation scripts
2. **Immediate feedback** - Claude receives validation results right after editing
3. **Error prevention** - Catches schema violations before they cause problems
4. **Non-intrusive** - Only validates deck JSON files, ignores other file operations

## File Structure

```
src/ulam/hooks/
├── __init__.py                 # Package exports
├── model_validate_hook.py      # Hook implementation
└── README.md                   # This file
```
