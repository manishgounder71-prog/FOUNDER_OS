import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.database import get_qdrant_client, COLLECTIONS, get_all_memories

client = get_qdrant_client()
print("Collections in Qdrant:")
try:
    cols = client.get_collections().collections
    for c in cols:
        print(f"- {c.name}")
        records = get_all_memories(c.name, limit=5)
        print(f"  Total records retrieved: {len(records)}")
        for idx, r in enumerate(records):
            print(f"    Record #{idx+1}:")
            print(f"      ID: {r.get('id')}")
            payload = r.get("payload") or {}
            print(f"      Startup: {payload.get('startup_name')}")
            print(f"      Type: {payload.get('type')}")
            text = payload.get('text') or ""
            print(f"      Text: {text[:80]}...")
except Exception as e:
    print("Error:", e)
