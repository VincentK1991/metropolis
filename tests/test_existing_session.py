"""Test with an existing session that has JSONL data."""

import asyncio

from ulam.config.settings import db_config
from ulam.db.session_store import SessionStore
from ulam.services.jsonl_handler import JSONLHandler


async def test_with_real_session():
    """Test JSONL persistence with a real session."""
    print("Testing with real session data...")

    # Initialize components
    session_store = SessionStore(
        mongodb_uri=db_config.uri, database_name=db_config.database
    )
    await session_store.create_indexes()

    # Create handler pointing to the correct workspace
    jsonl_handler = JSONLHandler(workspace_root="/home/vkieuvongngam/exploration/ulam")

    # Use an existing session
    test_session_id = "4ce6417b-7948-406e-bcbb-90a2c2000122"

    print(f"\n1. Project path: {jsonl_handler.get_project_path()}")
    print(f"   Session file: {jsonl_handler.get_session_file_path(test_session_id)}")

    print("\n2. Reading local JSONL file...")
    lines = jsonl_handler.read_jsonl_file(test_session_id)
    print(f"   Found {len(lines)} lines")

    if len(lines) > 0:
        print(f"   First line preview: {lines[0][:100]}...")
        print(f"   Last line preview: {lines[-1][:100]}...")

        print("\n3. Persisting to MongoDB...")
        await jsonl_handler.persist_to_mongodb(test_session_id, session_store)
        print("   ✓ Persisted successfully")

        print("\n4. Verifying in MongoDB...")
        stored_lines = await session_store.get_jsonl_lines(test_session_id)
        print(f"   Found {len(stored_lines)} lines in MongoDB")

        if len(stored_lines) == len(lines):
            print("   ✓ Line count matches")
            print("   ✓ First line matches:", stored_lines[0] == lines[0])
            print("   ✓ Last line matches:", stored_lines[-1] == lines[-1])
            print("\n✅ JSONL persistence working correctly!")
        else:
            print(f"   ❌ Line count mismatch: {len(lines)} vs {len(stored_lines)}")
    else:
        print("   Session has no JSONL data yet")

    # Cleanup
    await session_store.close()


if __name__ == "__main__":
    asyncio.run(test_with_real_session())
