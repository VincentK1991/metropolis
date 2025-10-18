"""Model validation hook for deck JSON files."""

import json
import sys
from pathlib import Path
from typing import Any

# Add the deck module to the path so we can import models
deck_path = Path(__file__).parent.parent.parent.parent / "deck"
sys.path.insert(0, str(deck_path))

try:
    from models import Deck
except ImportError:
    print(f"Warning: Could not import Deck model from {deck_path}")
    Deck = None


async def validate_deck_on_write(
    input_data: dict[str, Any], tool_use_id: str | None, context: Any
) -> dict[str, Any]:
    """
    PostToolUse hook that validates deck JSON files after Write or Edit operations.

    This hook:
    1. Checks if the tool used was Write or Edit
    2. Checks if the file path contains 'deck' and ends with '.json'
    3. Reads and validates the JSON against the Pydantic Deck model
    4. Returns validation results to Claude

    Args:
        input_data: Hook input containing tool_name, tool_input, and tool_response
        tool_use_id: Optional identifier for the tool use
        context: Hook context with additional information

    Returns:
        Dictionary with validation results
        (empty if validation passes or not applicable)
    """
    tool_name = input_data.get("tool_name", "")
    tool_input = input_data.get("tool_input", {})

    # Only validate Write and Edit operations
    if tool_name not in ["Write", "Edit"]:
        return {}

    # Get the file path from tool input
    file_path = tool_input.get("file_path", "")

    # Only validate JSON files in deck-related paths
    if (
        not file_path
        or "deck" not in file_path.lower()
        or not file_path.endswith(".json")
    ):
        return {}

    # Skip if Deck model is not available
    if Deck is None:
        return {}

    print(f"\n🔍 [VALIDATION HOOK] Validating deck JSON: {file_path}")

    try:
        # Read the JSON file
        path = Path(file_path)
        if not path.exists():
            return {
                "systemMessage": f"⚠️  Warning: File {file_path}\
                     was written but cannot be found for validation."
            }

        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)

        # Validate against Pydantic model
        deck = Deck.model_validate(data)

        # Success - build summary
        slide_count = len(deck.slides)
        block_count = sum(len(slide.blocks) for slide in deck.slides)
        source_count = len(deck.sources) if deck.sources else 0

        print("✅ [VALIDATION HOOK] Deck JSON is valid!")
        print(f"   - Title: {deck.title}")
        print(f"   - Slides: {slide_count}")
        print(f"   - Blocks: {block_count}")
        print(f"   - Sources: {source_count}")

        return {
            "systemMessage": (
                f"✅ Deck validation passed: {slide_count} slides, "
                f"{block_count} blocks, {source_count} sources."
            )
        }

    except json.JSONDecodeError as e:
        error_msg = f"❌ JSON parsing error in {file_path}: {e}"
        print(f"❌ [VALIDATION HOOK] {error_msg}")
        return {"systemMessage": f"❌ Validation failed: {error_msg}"}

    except Exception as e:
        error_msg = f"❌ Validation error in {file_path}: {str(e)}"
        print(f"❌ [VALIDATION HOOK] {error_msg}")
        return {"systemMessage": f"❌ Validation failed: {error_msg}"}


# Export the hook function
__all__ = ["validate_deck_on_write"]
