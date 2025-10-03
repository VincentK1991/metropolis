import asyncio

from claude_agent_sdk import AssistantMessage, ClaudeSDKClient, Message, TextBlock


async def print_message(message: Message):
    if isinstance(message, AssistantMessage):
        for block in message.content:
            if isinstance(block, TextBlock):
                print(f"Claude: {block.text}")


async def main():
    async with ClaudeSDKClient() as client:
        while True:
            prompt = input("You: ")
            if prompt == "exit":
                break
            # First question
            await client.query(prompt)

            # Process response
            async for message in client.receive_response():
                await print_message(message)

        # # Follow-up question - Claude remembers the previous context
        # await client.query("What's the population of that city?")

        # async for message in client.receive_response():
        #     if isinstance(message, AssistantMessage):
        #         for block in message.content:
        #             if isinstance(block, TextBlock):
        #                 print(f"Claude: {block.text}")

        # # Another follow-up - still in the same conversation
        # await client.query("What are some famous landmarks there?")

        # async for message in client.receive_response():
        #     if isinstance(message, AssistantMessage):
        #         for block in message.content:
        #             if isinstance(block, TextBlock):
        #                 print(f"Claude: {block.text}")


asyncio.run(main())
