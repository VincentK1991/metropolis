#!/usr/bin/env python3
"""Test that conversation.py has hooks properly configured."""

import sys
sys.path.insert(0, 'src')

from ulam.examples.conversation import options
from ulam.hooks import validate_deck_on_write


def test_hooks_configuration():
    """Verify that hooks are properly configured in conversation.py options."""

    print("Testing hooks configuration in conversation.py...")
    print("-" * 80)

    # Check that hooks are configured
    assert options.hooks is not None, "❌ No hooks configured"
    print("✅ Hooks configuration exists")

    # Check PostToolUse hook exists
    assert "PostToolUse" in options.hooks, "❌ PostToolUse hook not configured"
    print("✅ PostToolUse hook configured")

    # Check HookMatcher list
    post_tool_hooks = options.hooks["PostToolUse"]
    assert len(post_tool_hooks) > 0, "❌ No PostToolUse hook matchers"
    print(f"✅ {len(post_tool_hooks)} PostToolUse hook matcher(s) found")

    # Check validate_deck_on_write is in the hooks
    first_matcher = post_tool_hooks[0]
    assert hasattr(first_matcher, 'hooks'), "❌ HookMatcher missing 'hooks' attribute"

    hook_functions = first_matcher.hooks
    assert validate_deck_on_write in hook_functions, "❌ validate_deck_on_write not found in hooks"
    print("✅ validate_deck_on_write hook properly registered")

    print("\n" + "=" * 80)
    print("✅ All tests passed! Hook configuration is correct.")
    print("=" * 80)

    # Print configuration summary
    print("\nConfiguration Summary:")
    print(f"  Model: {options.model}")
    print(f"  Max Turns: {options.max_turns}")
    print(f"  Permission Mode: {options.permission_mode}")
    print(f"  MCP Servers: {list(options.mcp_servers.keys()) if options.mcp_servers else []}")
    print(f"  Hooks: {list(options.hooks.keys())}")
    print(f"    - PostToolUse: {len(post_tool_hooks)} hook(s)")
    print(f"      → validate_deck_on_write (deck JSON validation)")


if __name__ == "__main__":
    test_hooks_configuration()
