from pathlib import Path

from claude_agent_sdk import ClaudeAgentOptions

from metropolis.tools import multiplication_server, skill_server

main_agent_option = ClaudeAgentOptions(
    include_partial_messages=True,
    system_prompt={
        "type": "preset",
        "preset": "claude_code",
        "append": "when answering user question, if a web search tool is used,\
        always provide citation in the markdown format \
         at the end of the markdown text summary. \
        the website citation must be valid and clickable.",
    },
    model="claude-haiku-4-5",
    max_turns=100,
    permission_mode="bypassPermissions",
    mcp_servers={"multiplication": multiplication_server, "skill": skill_server},
    env={
        "MAX_THINKING_TOKENS": "4000",
    },
)


def get_workflow_agent_option(skill_id: str, temp_path: Path) -> ClaudeAgentOptions:
    """
    Get the Claude Agent options for the workflow agent.
    args:
        skill_id: the id of the skill to use
        temp_path: the path to the temporary folder to use
    returns:
        ClaudeAgentOptions: the Claude Agent options
    """
    options = ClaudeAgentOptions(
        include_partial_messages=True,
        model="claude-haiku-4-5",
        cwd=temp_path,
        system_prompt={
            "type": "preset",
            "preset": "claude_code",
            "append": f"""Always clean up any code .py files that you create
                    after you are finishing your task so that they are not left lying
                    around. if a task requires running python code and python library
                    is required use uv as package manager to install python library.
                    You will need this to implement the task. the task requires
                    a specific set of instructions called skills that you need to
                    follow to successfully complete the task. use the skills
                    that you have in the tool to learn what you can do.
                    The skill id is {skill_id}. Always work
                    within the folder {temp_path} do not work outside of this folder.
                    """,
        },
        max_turns=100,
        permission_mode="bypassPermissions",
        mcp_servers={"skill-server": skill_server},
        env={
            "MAX_THINKING_TOKENS": "4000",
        },
    )

    return options
