import asyncio
import shutil
import tempfile
from pathlib import Path

from claude_agent_sdk import ClaudeAgentOptions, ClaudeSDKClient

from metropolis.tools.skill_tool import skill_server
from metropolis.utils.partial_messages import StreamPrintHandler

artifact_folder = Path("/home/vkieuvongngam/exploration/metropolis/artifacts")
parent_dir = Path("/home/vkieuvongngam/exploration/metropolis/temp_folder")
parent_dir.mkdir(parents=True, exist_ok=True)

temp_dir = tempfile.mkdtemp(prefix="ai_agent_", dir=str(parent_dir))
temp_path = Path(temp_dir)
print(f"Temp path: {temp_path}\n\n")
temp_path.chmod(0o755)

skill_id = "68f38e657566242277ba0155"

options = ClaudeAgentOptions(
    include_partial_messages=True,
    model="claude-haiku-4-5",
    cwd=temp_path,
    system_prompt={
        "type": "preset",
        "preset": "claude_code",
        "append": f"""Always clean up any code .py files that you create after you are
            finishing your task so that they are not left lying around.
            if a task requires running python code and python library is required
            use uv as package manager to install python library.
            You will need this to implement the task.
            the task requires a specific set of instructions called skills that
            you need to follow to successfully complete the task.
        use the skills that you have in the tool to learn what you can do.
        the skill id is {skill_id}
        always work within the folder {temp_path} do not work outside of this folder.
        """,
    },
    max_turns=100,
    permission_mode="bypassPermissions",
    mcp_servers={"skill-server": skill_server},
    # allowed_tools=["Read", "Write", "WebSearch"],
    env={
        "MAX_THINKING_TOKENS": "4000",
    },
)


def copy_artifacts_from_temp_folder(temp_path: Path, artifact_folder: Path):
    """Copy specific artifact types from temp folder to artifact folder.

    Only copies: .pdf, .pptx, .txt, .md, .xls, .xlsx, .csv, .html files
    Structure: artifacts_folder/temp_folder_name/artifact_filename
    """
    # Define allowed file extensions
    allowed_extensions = {
        ".pdf",
        ".pptx",
        ".txt",
        ".md",
        ".xls",
        ".xlsx",
        ".csv",
        ".html",
    }

    # Get the temp folder name (e.g., "ai_agent_abc123")
    temp_folder_name = temp_path.name

    # Find files with allowed extensions
    files_to_copy = []
    for file_path in temp_path.iterdir():
        if file_path.is_file() and file_path.suffix.lower() in allowed_extensions:
            files_to_copy.append(file_path)

    # Skip copying if no matching files found
    if not files_to_copy:
        print("No artifact files found to copy.")
        print("Supported types: .pdf, .pptx, .txt, .md, .xls, .xlsx, .csv, .html")
        return

    # Create the destination directory: artifacts_folder/temp_folder_name/
    destination_dir = artifact_folder / temp_folder_name
    destination_dir.mkdir(parents=True, exist_ok=True)

    # Copy matching files to destination
    copied_count = 0
    for file_path in files_to_copy:
        try:
            shutil.copy2(file_path, destination_dir / file_path.name)
            print(f"Copied: {file_path.name} -> {destination_dir / file_path.name}")
            copied_count += 1
        except Exception as e:
            print(f"Error copying {file_path.name}: {e}")

    print(f"Artifacts copied: {copied_count} files to {destination_dir}")


async def main():
    async with ClaudeSDKClient(options=options) as client:
        print_handler = StreamPrintHandler(use_colors=True)

        while True:
            prompt = input("You: ")
            if prompt == "exit":
                # Final copy of artifacts before cleanup
                copy_artifacts_from_temp_folder(temp_path, artifact_folder)
                # remove the temp folder
                shutil.rmtree(temp_path)
                break

            await client.query(prompt)

            # Process response - handles all message types
            async for message in client.receive_response():
                print_handler.process_message(message)

            print_handler.finalize()

            # Copy artifacts after every turn
            copy_artifacts_from_temp_folder(temp_path, artifact_folder)


if __name__ == "__main__":
    asyncio.run(main())
