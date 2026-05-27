import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.config import settings
from backend.database import init_db
from backend.router import voice, workflow, memory

app = FastAPI(
    title="FounderOS API",
    description="The multi-agent orchestration and persistent memory engine for FounderOS",
    version="1.0.0"
)

# Configure CORS for Next.js communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(voice.router)
app.include_router(workflow.router)
app.include_router(memory.router)

@app.on_event("startup")
async def startup_event():
    """Initializes collections and database directories when backend boots up."""
    print("[Server Startup] Bootstrapping local Qdrant memory collections...")
    init_db()
    print("[Server Startup] Bootstrapping completed successfully.")

@app.get("/")
async def root():
    return {
        "status": "online",
        "system": "FounderOS Backend Engine",
        "version": "1.0.0"
    }

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=True
    )
