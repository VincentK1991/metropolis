"""Main module for the Ulam project."""

from ulam import __version__


def hello() -> str:
    """Return a greeting message."""
    return f"Hello from ulam v{__version__}!"


def main() -> None:
    """Main entry point."""
    print(hello())


if __name__ == "__main__":
    main()
