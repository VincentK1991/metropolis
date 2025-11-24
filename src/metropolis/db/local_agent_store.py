"""MongoDB store for persisting local agent sessions and messages."""

from metropolis.db.containerized_agent_store import ContainerizedAgentStore


class LocalAgentStore(ContainerizedAgentStore):
    """
    Handles all MongoDB operations for local agent sessions and messages.

    Subclass of ContainerizedAgentStore that uses separate collections
    for local testing: local_agent_sessions and local_agent_messages.
    """

    def __init__(self, mongodb_uri: str, database_name: str):
        """
        Initialize the local agent store.

        Args:
            mongodb_uri: MongoDB connection string
            database_name: Name of the database to use
        """
        # Initialize parent but override collections
        super().__init__(mongodb_uri, database_name)
        # Override collections to use local-specific names
        self.sessions = self.db["local_agent_sessions"]
        self.messages = self.db["local_agent_messages"]
