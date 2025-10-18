from typing import Any

from claude_agent_sdk import create_sdk_mcp_server, tool

from ulam.routes.skill_routes import get_skill_store


# Define a custom tool using the @tool decorator
@tool("list_skills", "list all skills", {})
async def list_skills(args: dict[str, Any]) -> dict[str, Any]:
    """
    List all skills that the agent can use.
    this should return a list of skill (skill id, and skill title) from mongodb
    """
    try:
        skill_store = get_skill_store()
        skills = await skill_store.list_skills(limit=100, skip=0)

        if not skills:
            return {"content": [{"type": "text", "text": "No skills available."}]}

        # Format skills as a readable list
        skills_text = "Available skills:\n\n"
        for skill in skills:
            skills_text += f"• ID: {skill.id}\n"
            skills_text += f"  Title: {skill.title}\n"
            created = skill.created_at.strftime("%Y-%m-%d %H:%M:%S")
            skills_text += f"  Created: {created}\n\n"

        return {"content": [{"type": "text", "text": skills_text}]}
    except Exception as e:
        return {"content": [{"type": "text", "text": f"Error: {e}"}]}


@tool("apply_skill", "apply a skill", {"id": str})
async def apply_skill(args: dict[str, Any]) -> dict[str, Any]:
    """
    get the skills from the mongodb (based on the skill id)
    and return the content of the skill
    """
    try:
        skill_id = args.get("id")
        if not skill_id:
            return {
                "content": [{"type": "text", "text": "Error: skill id is required"}]
            }

        skill_store = get_skill_store()
        skill = await skill_store.get_skill(skill_id)

        if not skill:
            error_msg = f"Error: Skill with ID '{skill_id}' not found"
            return {"content": [{"type": "text", "text": error_msg}]}

        # Return the skill content
        result_text = f"# {skill.title}\n\n{skill.content}"
        return {"content": [{"type": "text", "text": result_text}]}
    except Exception as e:
        return {"content": [{"type": "text", "text": f"Error: {e}"}]}


# Create an SDK MCP server with the custom tool
skill_server = create_sdk_mcp_server(
    name="skill-tools",
    version="1.0.0",
    tools=[list_skills, apply_skill],  # Pass the decorated function
)
