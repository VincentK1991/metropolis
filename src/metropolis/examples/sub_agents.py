import asyncio
import shutil
from pathlib import Path

from bson import ObjectId
from claude_agent_sdk import AgentDefinition, ClaudeAgentOptions, ClaudeSDKClient

from metropolis.dependencies.temp_folder import TempFolderManager
from metropolis.utils.artifact_handler import copy_artifacts_from_temp_folder
from metropolis.utils.partial_messages import StreamPrintHandler


def get_agent_options(temp_path: Path):
    options = ClaudeAgentOptions(
        include_partial_messages=True,
        model="claude-haiku-4-5",
        cwd=temp_path,
        system_prompt={
            "type": "preset",
            "preset": "claude_code",
            "append": f"""
            always work within the folder {temp_path}
            do not work outside of this folder.
            If a task is complex and contain multiple steps,
            you should break down the task into individual steps
            and use a todo list to track the progress of the task.
            if a task requires running python code and python library is required
            unless otherwise specified, use python 3.12
            do not rely on the system python version or existing python environment.
            use uv as package manager to install python library
            You will need this to implement the task.
            you may use uv run command to run the code without installing the library
            via uv run --no-project --with <library> <script path>
            """,
        },
        max_turns=100,
        permission_mode="bypassPermissions",
        env={
            "MAX_THINKING_TOKENS": "4000",
        },
        agents={
            "code-reviewer": AgentDefinition(
                description="Reviews code for best practices and potential issues",
                prompt="You are a code reviewer. Analyze code for bugs,"
                "performance issues "
                "security vulnerabilities, and adherence to best practices. "
                "Provide constructive feedback.",
                tools=["Read", "Grep"],
                model="sonnet",
            ),
            "data-gatherer": AgentDefinition(
                description="Gathers data from the web",
                prompt="You are a data gatherer. Gather data"
                "from the web for the given task.",
                tools=["WebSearch", "Read"],
                model="sonnet",
            ),
            "data-analyst": AgentDefinition(
                description=""" Analyze data and provide insights or analysis""",
                prompt="You are a senior data scientist. Analyze the data"
                "and come up with a detailed analysis."
                "Provide a detailed analysis of the data for the given task.",
                model="sonnet",
            ),
            "humor-generator": AgentDefinition(
                description="Generates humor",
                prompt="You are a humor generator."
                "you read conversation and come up with a funny response."
                "Generate humor for the given task.",
                tools=["Write"],
                model="sonnet",
            ),
        },
    )
    return options


async def main():
    temp_folder_manager = TempFolderManager()
    temp_path = temp_folder_manager.create_temp_folder()
    run_id = str(ObjectId())
    options = get_agent_options(temp_path)
    async with ClaudeSDKClient(options=options) as client:
        print_handler = StreamPrintHandler(use_colors=True)

        while True:
            prompt = input("You: ")
            if prompt == "exit":
                # Final copy of artifacts before cleanup
                copy_artifacts_from_temp_folder(temp_path, run_id)
                # remove the temp folder
                shutil.rmtree(temp_path)
                break

            await client.query(prompt)

            # Process response - handles all message types
            async for message in client.receive_response():
                # print(message)
                print_handler.process_message(message)

            print_handler.finalize()

            # Copy artifacts after every turn
            copy_artifacts_from_temp_folder(temp_path, run_id)


if __name__ == "__main__":
    asyncio.run(main())
