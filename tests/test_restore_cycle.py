"""Test full persistence and restore cycle."""

import asyncio
import os

from metropolis.config.settings import db_config
from metropolis.db.session_store import SessionStore
from metropolis.services.jsonl_handler import JSONLHandler


async def test_restore_cycle():
    """Test the full cycle of persist and restore."""
    print("Testing full JSONL persist → restore cycle...")

    # Initialize components
    session_store = SessionStore(
        mongodb_uri=db_config.uri, database_name=db_config.database
    )
    await session_store.create_indexes()
    jsonl_handler = JSONLHandler(
        workspace_root="/home/vkieuvongngam/exploration/metropolis"
    )

    test_session_id = "4ce6417b-7948-406e-bcbb-90a2c2000122"
    session_file = jsonl_handler.get_session_file_path(test_session_id)

    print("\n1. Reading original file...")
    original_lines = jsonl_handler.read_jsonl_file(test_session_id)
    print(f"   Original has {len(original_lines)} lines")

    print("\n2. Persisting to MongoDB...")
    await jsonl_handler.persist_to_mongodb(test_session_id, session_store)
    print("   ✓ Persisted")

    print("\n3. Simulating different pod (deleting local file)...")
    backup_path = session_file.parent / f"{test_session_id}.backup.jsonl"
    if session_file.exists():
        os.rename(session_file, backup_path)
        print(f"   ✓ Moved to {backup_path.name}")

    print("\n4. Restoring from MongoDB...")
    await jsonl_handler.restore_from_mongodb(test_session_id, session_store)
    print("   ✓ Restored")

    print("\n5. Verifying restored file...")
    restored_lines = jsonl_handler.read_jsonl_file(test_session_id)
    print(f"   Restored has {len(restored_lines)} lines")

    # Compare
    if len(restored_lines) == len(original_lines):
        print("   ✓ Line count matches")
    else:
        print(
            f"   ❌ Line count mismatch: {len(original_lines)} → {len(restored_lines)}"
        )

    matches = sum(
        1
        for i, (orig, rest) in enumerate(
            zip(original_lines, restored_lines, strict=False)
        )
        if orig == rest
    )
    print(f"   ✓ {matches}/{len(original_lines)} lines match exactly")

    if matches == len(original_lines):
        print("\n✅ Full restore cycle successful!")
        print("   MongoDB can successfully backup and restore JSONL files")
        print("   Ready for multi-pod deployment!")
    else:
        print("\n⚠️  Some lines don't match")

    # Restore original
    print("\n6. Restoring original file...")
    if backup_path.exists():
        if session_file.exists():
            session_file.unlink()
        os.rename(backup_path, session_file)
        print("   ✓ Original restored")

    # Cleanup
    await session_store.close()


if __name__ == "__main__":
    asyncio.run(test_restore_cycle())
