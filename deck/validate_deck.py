#!/usr/bin/env python3
"""Validate a deck JSON file against the Pydantic schema."""

import json
import sys
from pathlib import Path
from typing import Optional

from models import Deck


def validate_deck_json(json_path: Path) -> tuple[bool, Optional[str], Optional[Deck]]:
    """
    Validate a deck JSON file against the Pydantic schema.

    Args:
        json_path: Path to the JSON file to validate

    Returns:
        Tuple of (is_valid, error_message, deck_object)
    """
    try:
        # Read the JSON file
        with open(json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        # Validate against Pydantic model
        deck = Deck.model_validate(data)

        return True, None, deck

    except json.JSONDecodeError as e:
        return False, f"JSON parsing error: {e}", None

    except Exception as e:
        return False, f"Validation error: {e}", None


def print_deck_summary(deck: Deck) -> None:
    """Print a summary of the validated deck."""
    print("\n" + "="*80)
    print("DECK SUMMARY")
    print("="*80)
    print(f"Title: {deck.title}")
    print(f"ID: {deck.id}")
    print(f"Size: {deck.size} slides")
    print(f"Status: {deck.status}")
    print(f"Created: {deck.createdAt}")
    print(f"Updated: {deck.updatedAt}")

    if deck.deepResearch:
        print(f"\nDeep Research Query: {deck.deepResearch.userQuery}")

    if deck.sources:
        print(f"\nSources: {len(deck.sources)} sources")
        for source in deck.sources:
            print(f"  [{source.label}] {source.title}")

    print(f"\nSlides: {len(deck.slides)} slides")
    for slide in deck.slides:
        print(f"  {slide.index}. {slide.title}")
        print(f"     Layout: {slide.layout}, Pattern: {slide.pattern or 'None'}")
        print(f"     Blocks: {len(slide.blocks)} blocks")

        # Count block types
        block_types = {}
        for block in slide.blocks:
            block_types[block.kind] = block_types.get(block.kind, 0) + 1

        block_summary = ", ".join(f"{count}x {kind}" for kind, count in sorted(block_types.items()))
        print(f"     Block types: {block_summary}")

    print("="*80)


def main():
    """Main entry point."""
    if len(sys.argv) < 2:
        print("Usage: python validate_deck.py <path_to_deck.json>")
        print("\nExample:")
        print("  python validate_deck.py data/deutsche_bank_deck.json")
        sys.exit(1)

    json_path = Path(sys.argv[1])

    if not json_path.exists():
        print(f"Error: File not found: {json_path}")
        sys.exit(1)

    print(f"Validating deck: {json_path}")
    print("-" * 80)

    is_valid, error, deck = validate_deck_json(json_path)

    if is_valid:
        print("✅ VALIDATION SUCCESSFUL!")
        print(f"The deck JSON is valid according to the Pydantic schema.")

        if deck:
            print_deck_summary(deck)

        sys.exit(0)
    else:
        print("❌ VALIDATION FAILED!")
        print(f"\nError: {error}")
        sys.exit(1)


if __name__ == "__main__":
    main()
