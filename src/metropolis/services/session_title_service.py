"""Service for generating session titles using OpenAI."""

import logging

from openai import OpenAI

from metropolis.config.settings import openai_config

logger = logging.getLogger(__name__)


class SessionTitleService:
    """Service for generating concise session titles from user queries."""

    def __init__(self):
        """Initialize the OpenAI client."""
        api_key_secret = openai_config.api_key
        api_key = api_key_secret.get_secret_value() if api_key_secret else ""

        if not api_key:
            logger.warning("OPENAI_API_KEY not set, title generation will fail")
            self.client = None
        else:
            self.client = OpenAI(api_key=api_key)

    async def generate_title(self, user_query: str) -> str:
        """
        Generate a short phrase title (3-5 words) based on user query.

        Args:
            user_query: The user's first query in the session

        Returns:
            A short phrase title, or "Untitled Session" if generation fails
        """
        if not self.client:
            logger.warning("OpenAI client not initialized, returning default title")
            return "Untitled Session"

        try:
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "system",
                        "content": "You are a helpful assistant that generates short, descriptive titles (3-5 words) for chat sessions based on the user's first message. Return only the title, nothing else.",
                    },
                    {
                        "role": "user",
                        "content": f"Generate a short title for a chat session based on this user query: {user_query}",
                    },
                ],
                max_tokens=20,
                temperature=0.7,
            )

            title = response.choices[0].message.content.strip()
            # Remove quotes if present
            title = title.strip('"').strip("'").strip()

            # Ensure title is not too long (safety check)
            words = title.split()
            if len(words) > 8:
                title = " ".join(words[:8])

            if not title:
                return "Untitled Session"

            return title

        except Exception as e:
            logger.error(f"Failed to generate session title: {e}", exc_info=True)
            return "Untitled Session"
