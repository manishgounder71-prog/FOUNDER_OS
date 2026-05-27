import uuid
import random
import hashlib
from typing import List, Dict, Any, Optional
from qdrant_client import QdrantClient
from qdrant_client.http import models
from openai import OpenAI
from backend.config import settings

# Initialize Qdrant Client lazily to prevent locking issues under uvicorn reload
_qdrant_client = None

def get_qdrant_client() -> QdrantClient:
    global _qdrant_client
    if _qdrant_client is None:
        if settings.QDRANT_URL and settings.QDRANT_API_KEY:
            _qdrant_client = QdrantClient(url=settings.QDRANT_URL, api_key=settings.QDRANT_API_KEY)
        else:
            _qdrant_client = QdrantClient(path=settings.QDRANT_PATH)
    return _qdrant_client

# Define collections
COLLECTIONS = [
    "conversations",
    "startup_ideas",
    "reports",
    "market_research",
    "strategies",
    "workflows"
]

def init_db():
    """Initialize Qdrant collections if they do not exist."""
    try:
        client = get_qdrant_client()
        existing_collections = [c.name for c in client.get_collections().collections]
        for col in COLLECTIONS:
            if col not in existing_collections:
                client.create_collection(
                    collection_name=col,
                    vectors_config=models.VectorParams(
                        size=1536,  # Standard OpenAI embedding dimension
                        distance=models.Distance.COSINE
                    )
                )
                print(f"Created Qdrant collection: {col}")
            else:
                print(f"Qdrant collection '{col}' already exists.")
    except Exception as e:
        print(f"Error initializing Qdrant database: {e}")

def get_mock_embedding(text: str) -> List[float]:
    """Generates a deterministic unit vector of 1536 dimensions based on the text hash.
    Used as a fallback when OpenAI keys are unavailable to ensure database queries succeed.
    """
    # Create seed from text hash
    sha = hashlib.sha256(text.encode('utf-8')).digest()
    seed = int.from_bytes(sha, byteorder='big') % (2**32 - 1)
    
    # Deterministic generation
    rng = random.Random(seed)
    vector = [rng.gauss(0, 1) for _ in range(1536)]
    
    # Normalize vector to unit length
    magnitude = sum(x**2 for x in vector) ** 0.5
    if magnitude == 0:
        return [0.0] * 1536
    return [x / magnitude for x in vector]

def get_embedding(text: str) -> List[float]:
    """Generates a vector embedding for the given text.
    Uses OpenAI if available, otherwise falls back to a deterministic mock vector.
    """
    if not settings.OPENAI_API_KEY:
        return get_mock_embedding(text)
    
    try:
        client = OpenAI(api_key=settings.OPENAI_API_KEY)
        response = client.embeddings.create(
            input=[text],
            model="text-embedding-3-small"
        )
        return response.data[0].embedding
    except Exception as e:
        print(f"OpenAI embedding failed, falling back to mock: {e}")
        return get_mock_embedding(text)

def save_memory(collection: str, text: str, metadata: Optional[Dict[str, Any]] = None) -> str:
    """Stores a piece of text and its metadata in the specified Qdrant collection."""
    if collection not in COLLECTIONS:
        raise ValueError(f"Invalid collection name: {collection}")
    
    # Default metadata fields
    payload = {
        "text": text,
        "timestamp": metadata.get("timestamp") if metadata else None
    }
    if metadata:
        payload.update(metadata)
        
    point_id = str(uuid.uuid4())
    vector = get_embedding(text)
    
    get_qdrant_client().upsert(
        collection_name=collection,
        points=[
            models.PointStruct(
                id=point_id,
                vector=vector,
                payload=payload
            )
        ]
    )
    return point_id

# Minimum cosine similarity score to consider a result relevant.
# Cosine similarity of 1.0 = identical, 0.0 = unrelated, <0.0 = opposite.
# 0.40 is a practical threshold: below this the topic is genuinely different.
SCORE_THRESHOLD = 0.40

def search_memory(collection: str, query: str, limit: int = 5) -> List[Dict[str, Any]]:
    """Searches a specific collection semantically based on a query string.
    Only returns results whose cosine similarity meets the SCORE_THRESHOLD.
    """
    if collection not in COLLECTIONS:
        raise ValueError(f"Invalid collection name: {collection}")
        
    vector = get_embedding(query)
    search_results = get_qdrant_client().query_points(
        collection_name=collection,
        query=vector,
        limit=limit,
        score_threshold=SCORE_THRESHOLD
    )
    
    results = []
    for hit in search_results.points:
        results.append({
            "id": hit.id,
            "score": hit.score,
            "payload": hit.payload
        })
    return results

def get_all_memories(collection: str, limit: int = 100) -> List[Dict[str, Any]]:
    """Retrieves all points from a collection ordered roughly by insertion order (scrolling)."""
    if collection not in COLLECTIONS:
        raise ValueError(f"Invalid collection name: {collection}")
        
    records, _ = get_qdrant_client().scroll(
        collection_name=collection,
        limit=limit,
        with_payload=True,
        with_vectors=False
    )
    
    results = []
    for record in records:
        results.append({
            "id": record.id,
            "payload": record.payload
        })
        
    # Sort by timestamp if available in payload safely
    results.sort(key=lambda x: (x.get("payload") or {}).get("timestamp") or "", reverse=True)
    return results

def search_all_collections(query: str, limit_per_collection: int = 3) -> Dict[str, List[Dict[str, Any]]]:
    """Queries all collections semantically and returns aggregated results.
    Only includes collections that have at least one result above SCORE_THRESHOLD.
    """
    aggregated = {}
    for col in COLLECTIONS:
        results = search_memory(col, query, limit=limit_per_collection)
        # Only include collections with genuine matches (score_threshold already applied)
        if results:
            aggregated[col] = results
    return aggregated
