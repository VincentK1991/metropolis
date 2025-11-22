# Use Python 3.12 slim image as base
FROM python:3.12-slim

# Set working directory
WORKDIR /app

# Install system dependencies (curl, bash, and Node.js/npm for Claude Code)
RUN apt-get update && apt-get install -y \
    curl \
    bash \
    ca-certificates \
    gnupg \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Install uv
RUN pip install --no-cache-dir uv

# Copy project files
COPY pyproject.toml ./
COPY README.md ./
COPY src/ ./src/

# Install Claude Code using npm
RUN npm install -g @anthropic-ai/claude-code

# Install Python dependencies using uv
# This will generate uv.lock if it doesn't exist
RUN uv sync

# Create a non-root user to run the application
# Claude Code doesn't allow bypassPermissions when running as root
RUN useradd -m -u 1000 appuser && \
    chown -R appuser:appuser /app

# Copy Claude skills repository to a location that won't be overwritten by volume mounts
# Store in /opt/claude-skills/ and copy to mounted volume on startup via entrypoint
COPY skills/ /opt/claude-skills/
RUN chown -R appuser:appuser /opt/claude-skills

# Copy entrypoint script
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh && \
    chown appuser:appuser /usr/local/bin/entrypoint.sh

# Set environment variables
ENV PORT=8089
ENV PYTHONPATH=/app
ENV PATH="/usr/local/bin:/usr/bin:/bin:${PATH}"
# Note: ANTHROPIC_API_KEY should be set at runtime via docker run -e or docker-compose

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 8089

# Set entrypoint
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]

# Run the FastAPI application
CMD ["uv", "run", "uvicorn", "containerized_agent.main:app", "--host", "0.0.0.0", "--port", "8089"]

