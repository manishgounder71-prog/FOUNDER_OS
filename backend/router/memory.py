from fastapi import APIRouter, Query, HTTPException
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
from backend.database import search_memory, search_all_collections, get_all_memories, COLLECTIONS

router = APIRouter(prefix="/api/memory", tags=["memory"])

@router.get("/search")
async def search_startup_memory(
    q: str = Query(..., min_length=1),
    collection: Optional[str] = Query(None)
):
    """Executes a semantic vector search across a specific collection or all collections in Qdrant."""
    try:
        if collection:
            if collection not in COLLECTIONS:
                raise HTTPException(status_code=400, detail=f"Invalid collection. Supported: {COLLECTIONS}")
            results = search_memory(collection, q, limit=6)
            return {collection: results}
        else:
            # Query all collections
            return search_all_collections(q, limit_per_collection=4)
    except Exception as e:
        print(f"[Memory API] Search error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/timeline")
async def get_memory_timeline(
    collection: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=100)
):
    """Retrieves list of stored memory blocks sorted by timestamp for timeline dashboard views."""
    try:
        timeline_items = []
        target_cols = [collection] if collection else COLLECTIONS
        
        for col in target_cols:
            if col not in COLLECTIONS:
                continue
            records = get_all_memories(col, limit=limit)
            for rec in records:
                payload = rec.get("payload", {})
                timeline_items.append({
                    "id": rec.get("id"),
                    "collection": col,
                    "text": payload.get("text", ""),
                    "timestamp": payload.get("timestamp", ""),
                    "type": payload.get("type", "Memory Record"),
                    "startup_name": payload.get("startup_name", "General"),
                    "tag": payload.get("tag", col)
                })
                
        # Sort globally by timestamp, putting newest first
        # Empty/missing timestamps go to the end
        timeline_items.sort(
            key=lambda x: x.get("timestamp") if x.get("timestamp") else "1970-01-01T00:00:00Z",
            reverse=True
        )
        return timeline_items[:limit]
    except Exception as e:
        print(f"[Memory API] Timeline error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class MemoryPayload(BaseModel):
    collection: str
    text: str
    metadata: Optional[Dict[str, Any]] = None

@router.post("/save")
async def save_startup_memory(payload: MemoryPayload):
    """Saves a memory record directly in a specified Qdrant collection."""
    try:
        from backend.database import save_memory
        point_id = save_memory(
            collection=payload.collection,
            text=payload.text,
            metadata=payload.metadata
        )
        return {"status": "success", "point_id": point_id}
    except Exception as e:
        print(f"[Memory API] Save memory error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
