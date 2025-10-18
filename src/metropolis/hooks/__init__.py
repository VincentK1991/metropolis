"""Hooks module for metropolis MCP server."""

from .model_validate_hook import validate_deck_on_write

__all__ = ["validate_deck_on_write"]
