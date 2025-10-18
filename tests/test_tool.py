from typing import Any

from claude_agent_sdk import create_sdk_mcp_server, tool


# Define a custom tool using the @tool decorator
@tool("multiplication", "multiply two large numbers", {"a": int, "b": int})
async def multiplication(args: dict[str, Any]) -> dict[str, Any]:
    try:
        # Call weather API
        a = args.get("a", 0)
        b = args.get("b", 0)
        result = a * b
        return {
            "content": [
                {"type": "text", "text": f"The result of {a} * {b} is {result}"}
            ]
        }
    except Exception as e:
        return {"content": [{"type": "text", "text": f"Error: {e}"}]}


# Create an SDK MCP server with the custom tool
multiplication_server = create_sdk_mcp_server(
    name="my-multiplication-tools",
    version="1.0.0",
    tools=[multiplication],  # Pass the decorated function
)
