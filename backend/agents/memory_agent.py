from backend.database import save_memory, search_memory, search_all_collections
from datetime import datetime
from typing import Dict, Any, List

MEMORY_ROLE = "Memory Agent"
MEMORY_PERSONA = """You are the Semantic Memory Officer of FounderOS.
Your role is to index startup documents, strategies, conversations, and research reports into the Qdrant vector database,
and retrieve contextually relevant historical memories to assist the team.
"""

def save_agent_output(collection: str, content: str, startup_name: str, doc_type: str) -> str:
    """Stores generated agent outputs inside the vector memory with appropriate metadata tags."""
    metadata = {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "startup_name": startup_name,
        "type": doc_type,
        "indexed_by": "Memory Agent"
    }
    point_id = save_memory(collection=collection, text=content, metadata=metadata)
    print(f"[Memory Agent] Saved '{doc_type}' inside Qdrant collection '{collection}' (Point: {point_id})")
    return point_id

def retrieve_historical_context(query: str, limit_per_col: int = 2) -> tuple[str, list]:
    """Queries all Qdrant vector collections to compile relevant history for a query."""
    try:
        aggregated_results = search_all_collections(query, limit_per_collection=limit_per_col)
        if not aggregated_results:
            return "", []
            
        context_blocks = []
        matches = []
        for col, hits in aggregated_results.items():
            # Filter hits by a cosine similarity relevance threshold
            # Cosine similarity >= 0.7 indicates semantic relevance; mock/random matches fall well below this
            valid_hits = [h for h in hits if h.get("score", 0.0) >= 0.7]
            if not valid_hits:
                continue
                
            context_blocks.append(f"--- Qdrant Collection: {col} ---")
            for idx, hit in enumerate(valid_hits):
                payload = hit.get("payload", {})
                text = payload.get("text", "")
                doc_type = payload.get("type", "Unknown")
                ts = payload.get("timestamp", "")
                score = hit.get("score", 0.0)
                context_blocks.append(
                    f"Result #{idx+1} [Type: {doc_type}, Date: {ts}, Relevance: {score:.3f}]:\n{text}\n"
                )
                matches.append({
                    "id": hit.get("id"),
                    "collection": col,
                    "type": doc_type,
                    "timestamp": ts,
                    "score": float(score),
                    "text": text[:150] + "..." if len(text) > 150 else text
                })
        return "\n".join(context_blocks), matches
    except Exception as e:
        print(f"[Memory Agent] Error retrieving historical context: {e}")
        return "", []
