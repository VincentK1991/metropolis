"""Main module for the Metropolis project."""

from metropolis import __version__


def hello() -> str:
    """Return a greeting message."""
    return f"Hello from metropolis v{__version__}!"


def main() -> None:
    """Main entry point."""
    print(hello())


if __name__ == "__main__":
    main()
