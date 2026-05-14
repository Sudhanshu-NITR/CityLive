# app.py
import uvicorn
from contextlib import asynccontextmanager
from fastapi import FastAPI
from api.routes import router
from core.config import config
from infrastructure.database import db

# Manage Database Lifecycle via modern lifespan handler
@asynccontextmanager
async def lifespan(app: FastAPI):
    db.connect()
    yield
    db.close()

# Initialize FastAPI
app = FastAPI(title="Report Service API", lifespan=lifespan)

# Register Routes
app.include_router(router)

if __name__ == "__main__":
    # Run the server
    uvicorn.run(app, host="0.0.0.0", port=config.PORT)
