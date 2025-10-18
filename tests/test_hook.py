#!/usr/bin/env python3
"""Test the validation hook manually."""

import asyncio

from src.metropolis.hooks import validate_deck_on_write


async def test_validation_hook():
    """Test the deck validation hook."""

    # Simulate a Write tool call to a deck JSON file
    input_data = {
        "tool_name": "Write",
        "tool_input": {
            "file_path": "/Users/vkieuvongngam/Documents/mcp_servers/metropolis/deck/data/deutsche_bank_deck.json"
        },
        "tool_response": "File written successfully",
    }

    print("Testing validation hook with deutsche_bank_deck.json...")
    print("-" * 80)

    result = await validate_deck_on_write(
        input_data, tool_use_id="test-001", context=None
    )

    print("\nHook Result:")
    print(result)

    # Test with a non-deck file (should be skipped)
    print("\n" + "=" * 80)
    print("Testing with non-deck file (should be skipped)...")
    print("-" * 80)

    input_data_non_deck = {
        "tool_name": "Write",
        "tool_input": {
            "file_path": "/Users/vkieuvongngam/Documents/mcp_servers/metropolis/README.md"
        },
        "tool_response": "File written successfully",
    }

    result2 = await validate_deck_on_write(
        input_data_non_deck, tool_use_id="test-002", context=None
    )
    print(f"Result: {result2 or 'Skipped (as expected)'}")


if __name__ == "__main__":
    asyncio.run(test_validation_hook())
