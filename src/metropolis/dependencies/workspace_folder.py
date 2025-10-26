"""Helper functions for workspace thread folder management."""

from pathlib import Path


def get_execution_environment_folder(execution_environment: str) -> Path:
    """
    Get the persistent working directory for a workspace thread execution environment.

    Creates a permanent folder that persists across requests.
    This allows the Claude SDK to maintain session continuity via JSONL files.

    The execution_environment UUID is independent of the Claude session ID,
    avoiding folder path mismatches during thread resumption.

    Args:
        execution_environment: UUID for the execution environment

    Returns:
        Path to the execution environment's working directory

    Structure:
        /home/vkieuvongngam/exploration/metropolis-execution-environment/
        └── {execution_environment}/
            └── (agent working files and JSONL)
    """
    # Base directory for all execution environments
    base_dir = Path("/home/vkieuvongngam/exploration/metropolis-execution-environment")

    # Execution environment directory
    env_dir = base_dir / execution_environment

    # Create directory if it doesn't exist
    env_dir.mkdir(parents=True, exist_ok=True)
    env_dir.chmod(0o755)

    return env_dir


def cleanup_execution_environment_folder(execution_environment: str) -> bool:
    """
    Clean up an execution environment's working directory.

    Call this when deleting a thread to remove its files.

    Args:
        execution_environment: UUID for the execution environment

    Returns:
        True if folder was deleted, False if it didn't exist
    """
    import shutil

    base_dir = Path("/home/vkieuvongngam/exploration/metropolis-execution-environment")
    env_dir = base_dir / execution_environment

    if env_dir.exists():
        shutil.rmtree(env_dir)
        return True

    return False
