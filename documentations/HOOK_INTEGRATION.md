# Deck Validation Hook Integration

## Overview

The deck validation hook has been successfully integrated into the Claude Agent SDK conversation example at `src/ulam/examples/conversation.py`.

## What Was Done

### 1. Created the Validation Hook
- **Location**: `src/ulam/hooks/model_validate_hook.py`
- **Function**: `validate_deck_on_write` (async PostToolUse hook)
- **Purpose**: Automatically validates deck JSON files after Write/Edit operations

### 2. Integrated into Claude Agent
- **File Modified**: `src/ulam/examples/conversation.py`
- **Changes**:
  - Added `HookMatcher` import from `claude_agent_sdk`
  - Added `validate_deck_on_write` import from `ulam.hooks`
  - Configured PostToolUse hook in `ClaudeAgentOptions`
  - Fixed module execution to only run when directly executed (not on import)

## How It Works

When you run `conversation.py`, the Claude Agent will now:

1. **Monitor Write/Edit operations** - Hook triggers after these tool uses
2. **Filter for deck JSON files** - Only validates files with "deck" in path and `.json` extension
3. **Validate against schema** - Uses Pydantic `Deck` model for validation
4. **Provide feedback** - Claude receives validation results automatically

## Example Output

When you edit a deck JSON file in conversation mode, you'll see:

```
🔍 [VALIDATION HOOK] Validating deck JSON: deck/data/deutsche_bank_deck.json
✅ [VALIDATION HOOK] Deck JSON is valid!
   - Title: Deutsche Bank: Transformed European Banking Champion
   - Slides: 6
   - Blocks: 24
   - Sources: 4

System Message: ✅ Deck validation passed: 6 slides, 24 blocks, 4 sources.
```

## Testing

### Test Hook Configuration
```bash
python test_conversation_hooks.py
```

### Test Hook Functionality
```bash
python test_hook.py
```

### Run Conversation Agent
```bash
python src/ulam/examples/conversation.py
```

Then try editing a deck JSON file - the validation will run automatically!

## Configuration Details

```python
options = ClaudeAgentOptions(
    # ... other options ...
    hooks={
        "PostToolUse": [
            HookMatcher(hooks=[validate_deck_on_write])
        ]
    },
)
```

## Benefits

✅ **Automatic validation** - No manual validation needed
✅ **Immediate feedback** - Claude knows instantly if deck JSON is valid
✅ **Error prevention** - Catches schema violations before they cause issues
✅ **Non-intrusive** - Only validates relevant files (deck JSON files)
✅ **Detailed errors** - Pydantic provides specific validation messages

## Files Structure

```
src/ulam/
├── hooks/
│   ├── __init__.py
│   ├── model_validate_hook.py    # Hook implementation
│   └── README.md                  # Hook documentation
└── examples/
    └── conversation.py            # Claude agent with hook integrated

deck/
├── models.py                      # Pydantic schema definitions
├── validate_deck.py               # Standalone validation script
└── data/
    └── deutsche_bank_deck.json    # Example deck JSON

test_hook.py                       # Hook functionality test
test_conversation_hooks.py         # Hook configuration test
```

## Next Steps

1. Run the conversation agent: `python src/ulam/examples/conversation.py`
2. Ask Claude to edit a deck JSON file
3. Watch the automatic validation in action!

The hook will ensure that every deck JSON modification is validated against the Pydantic schema automatically.
