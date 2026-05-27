import asyncio
import uuid
import json
from datetime import datetime
from typing import Dict, Any, List, Optional
from duckduckgo_search import DDGS

ACTIVE_DIRECTIVES: Dict[str, Dict[str, Any]] = {}
DIRECTIVE_QUEUES: Dict[str, asyncio.Queue] = {}

class DirectiveEngine:
    @staticmethod
    def create_directive(query: str) -> str:
        directive_id = str(uuid.uuid4())
        ACTIVE_DIRECTIVES[directive_id] = {
            "id": directive_id,
            "query": query,
            "status": "searching",
            "results": [],
            "summary": "",
            "created_at": datetime.utcnow().isoformat() + "Z"
        }
        DIRECTIVE_QUEUES[directive_id] = asyncio.Queue()
        return directive_id

    @staticmethod
    async def push_event(directive_id: str, event_type: str, data: Dict[str, Any]):
        queue = DIRECTIVE_QUEUES.get(directive_id)
        if queue:
            payload = {
                "event": event_type,
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "data": data
            }
            await queue.put(payload)

    @classmethod
    async def execute_research(cls, directive_id: str):
        if directive_id not in ACTIVE_DIRECTIVES:
            return

        directive = ACTIVE_DIRECTIVES[directive_id]
        query = directive["query"]

        try:
            await cls.push_event(directive_id, "research_started", {"query": query})

            results = await asyncio.to_thread(cls._search_web, query)

            for i, result in enumerate(results):
                directive["results"].append(result)
                await cls.push_event(directive_id, "result_found", {
                    "index": i,
                    "total": len(results),
                    "result": result
                })
                await asyncio.sleep(0.1)

            directive["status"] = "completed"
            await cls.push_event(directive_id, "research_completed", {
                "results": directive["results"],
                "total": len(results)
            })

        except Exception as e:
            directive["status"] = "failed"
            await cls.push_event(directive_id, "research_failed", {"error": str(e)})

        finally:
            await asyncio.sleep(5)
            if directive_id in DIRECTIVE_QUEUES:
                del DIRECTIVE_QUEUES[directive_id]

    @staticmethod
    def _search_web(query: str, max_results: int = 10) -> List[Dict[str, str]]:
        try:
            with DDGS() as ddgs:
                raw_results = list(ddgs.text(query, max_results=max_results))
                results = []
                for r in raw_results:
                    results.append({
                        "title": r.get("title", ""),
                        "url": r.get("href", ""),
                        "snippet": r.get("body", "")
                    })
                return results
        except Exception as e:
            return [{"title": "Search Error", "url": "", "snippet": f"Search failed: {str(e)}"}]
