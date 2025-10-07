import asyncio

from claude_agent_sdk import ClaudeAgentOptions, ClaudeSDKClient

options = ClaudeAgentOptions(
    include_partial_messages=True,
    model="claude-sonnet-4-5",
    max_turns=100,
    allowed_tools=["Read", "Write", "WebSearch"],
    env={
        "MAX_THINKING_TOKENS": "8000",
    },
)


async def main():
    async with ClaudeSDKClient(options=options) as client:
        while True:
            prompt = input("You: ")
            if prompt == "exit":
                break

            await client.query(prompt)

            # Process response
            async for message in client.receive_response():
                print(message)


asyncio.run(main())
