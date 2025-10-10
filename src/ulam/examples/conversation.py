import asyncio

from claude_agent_sdk import ClaudeAgentOptions, ClaudeSDKClient, HookMatcher

from ulam.hooks import validate_deck_on_write
from ulam.tools.test_tool import multiplication_server
from ulam.utils.partial_messages import StreamPrintHandler

options = ClaudeAgentOptions(
    include_partial_messages=True,
    model="claude-sonnet-4-5",
    max_turns=100,
    permission_mode="bypassPermissions",
    mcp_servers={"multiplication": multiplication_server},
    # allowed_tools=["Read", "Write", "WebSearch"],
    hooks={
        "PostToolUse": [
            HookMatcher(hooks=[validate_deck_on_write])
        ]
    },
    env={
        "MAX_THINKING_TOKENS": "8000",
    },
)


async def main():
    async with ClaudeSDKClient(options=options) as client:
        print_handler = StreamPrintHandler(use_colors=True)

        while True:
            prompt = input("You: ")
            if prompt == "exit":
                break

            await client.query(prompt)

            # Process response - handles all message types
            async for message in client.receive_response():
                print_handler.process_message(message)

            print_handler.finalize()


if __name__ == "__main__":
    asyncio.run(main())
