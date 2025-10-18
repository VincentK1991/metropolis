"""Test script for resume session feature."""

import asyncio

from metropolis.config.settings import db_config
from metropolis.db.session_store import SessionStore
from metropolis.services.jsonl_handler import JSONLHandler


async def test_jsonl_persistence():
    """Test JSONL persistence to MongoDB and restoration."""
    print("Testing JSONL persistence and restoration...")

    # Initialize components
    session_store = SessionStore(
        mongodb_uri=db_config.uri, database_name=db_config.database
    )
    await session_store.create_indexes()
    jsonl_handler = JSONLHandler()

    # Test session ID (use an existing one from your system)
    test_session_id = "4ce6417b-7948-406e-bcbb-90a2c2000122"

    print(f"\n1. Reading local JSONL file for session: {test_session_id}")
    lines = jsonl_handler.read_jsonl_file(test_session_id)
    print(f"   Found {len(lines)} lines in local file")
    if lines:
        print(f"   First line preview: {lines[0][:100]}...")

    print("\n2. Persisting to MongoDB...")
    await jsonl_handler.persist_to_mongodb(test_session_id, session_store)
    print("   ✓ Persisted successfully")

    print("\n3. Verifying in MongoDB...")
    stored_lines = await session_store.get_jsonl_lines(test_session_id)
    print(f"   Found {len(stored_lines)} lines in MongoDB")
    assert len(stored_lines) == len(lines), "Line count mismatch!"
    print("   ✓ Line count matches")

    print("\n4. Testing restoration...")
    # Clear local file first (simulate different pod)
    import os

    local_path = jsonl_handler.get_session_file_path(test_session_id)
    backup_path = local_path.parent / f"{test_session_id}.backup.jsonl"
    if local_path.exists():
        os.rename(local_path, backup_path)
        print(f"   Backed up local file to {backup_path}")

    # Restore from MongoDB
    await jsonl_handler.restore_from_mongodb(test_session_id, session_store)
    print("   ✓ Restored from MongoDB")

    # Verify restoration
    restored_lines = jsonl_handler.read_jsonl_file(test_session_id)
    print(f"   Restored {len(restored_lines)} lines")
    assert len(restored_lines) == len(lines), "Restored line count mismatch!"
    assert restored_lines == lines, "Restored content mismatch!"
    print("   ✓ Content matches original")

    # Restore backup
    if backup_path.exists():
        os.rename(backup_path, local_path)
        print("   Restored original file")

    print("\n✅ All tests passed!")

    # Cleanup
    await session_store.close()


async def test_project_path():
    """Test project path generation."""
    print("\nTesting project path generation...")

    jsonl_handler = JSONLHandler()
    project_path = jsonl_handler.get_project_path()
    print(f"Project path: {project_path}")

    test_session_id = "test-session-123"
    session_file_path = jsonl_handler.get_session_file_path(test_session_id)
    print(f"Session file path: {session_file_path}")

    assert str(project_path).endswith("metropolis") or "-home-" in str(project_path)
    print("✓ Project path looks correct")


if __name__ == "__main__":
    print("=== Resume Session Feature Tests ===\n")

    # Run tests
    asyncio.run(test_project_path())
    asyncio.run(test_jsonl_persistence())

    print("\n=== All Tests Complete ===")
