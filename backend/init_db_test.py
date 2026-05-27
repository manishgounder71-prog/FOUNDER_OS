import sys
import os

# Adjust import path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.database import init_db, save_memory, search_memory, get_all_memories
from datetime import datetime

if __name__ == "__main__":
    print("Initializing Qdrant database collections...")
    init_db()
    print("Database collections initialized successfully.")
    
    # Test saving a memory
    print("Testing saving a memory in startup_ideas collection...")
    idea_text = "AI-powered voice startup teammate designed for hackathons."
    now_str = datetime.utcnow().isoformat() + "Z"
    point_id = save_memory(
        collection="startup_ideas",
        text=idea_text,
        metadata={"timestamp": now_str, "author": "Founder", "tag": "Hackathon"}
    )
    print(f"Memory saved successfully! Point ID: {point_id}")
    
    # Test retrieving the memory
    print("Testing retrieval of the memory...")
    memories = get_all_memories("startup_ideas")
    print(f"Retrieved {len(memories)} memories.")
    for m in memories:
        print(f" - {m['payload']['text']} (Author: {m['payload'].get('author')}, Tag: {m['payload'].get('tag')})")
        
    # Test semantic search
    print("Testing semantic search...")
    search_results = search_memory("startup_ideas", "hackathon voice team")
    print(f"Found {len(search_results)} search results:")
    for result in search_results:
        print(f" - Score: {result['score']:.4f} | Text: {result['payload']['text']}")
    
    print("All tests passed!")
