# Ulam

A modern Python project template with best practices and tooling.

## Features

- **Python 3.12** - Latest Python version
- **uv** - Fast Python package installer and resolver
- **Ruff** - An extremely fast Python linter and code formatter
- **Pyright** - Static type checker for Python
- **VSCode Integration** - Pre-configured settings and extensions

## Setup

1. Clone the repository
2. Open in VSCode (recommended extensions will be suggested)
3. The virtual environment is automatically created and managed by uv

## Development

### Running the project
```bash
uv run python main.py
```

### Linting and formatting
```bash
# Check and fix linting issues
uv run ruff check --fix

# Format code
uv run ruff format

# Type checking
uv run pyright
```

### Installing dependencies
```bash
# Add a new dependency
uv add package-name

# Add a development dependency
uv add --dev package-name
```

## Project Structure

```
ulam/
├── ulam/              # Main package
│   └── __init__.py
├── main.py           # Entry point
├── pyproject.toml    # Project configuration
├── .vscode/          # VSCode settings
├── .gitignore        # Git ignore rules
└── README.md         # This file
```



