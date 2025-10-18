import asyncio

from claude_agent_sdk import ClaudeAgentOptions, ClaudeSDKClient

from metropolis.tools.skill_tool import _skill_db as skill_db
from metropolis.utils.partial_messages import StreamPrintHandler


def get_skills():
    skills = asyncio.run(skill_db.list_skills(limit=100))
    return skills


options = ClaudeAgentOptions(
    include_partial_messages=True,
    model="claude-haiku-4-5",
    system_prompt={
        "type": "preset",
        "preset": "claude_code",
        "append": f"Always clean up any code .py files that you create after you are\
            finishing your task so that they are not left lying around. \
        Here are the skills you can use: {get_skills()}",
    },
    max_turns=100,
    permission_mode="bypassPermissions",
    # mcp_servers={"multiplication": multiplication_server, "skill": skill_server},
    # allowed_tools=["Read", "Write", "WebSearch"],
    env={
        "MAX_THINKING_TOKENS": "4000",
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
