# app.py
import uvicorn
from fastapi import FastAPI
from api.routes import router
from core.config import config
from infrastructure.database import db

# Initialize FastAPI
app = FastAPI(title="Report Service API")

# Register Routes
app.include_router(router)

# Manage Database Lifecycle
@app.on_event("startup")
def startup_event():
    db.connect()

@app.on_event("shutdown")
def shutdown_event():
    db.close()

if __name__ == "__main__":
    # Run the server
    uvicorn.run(app, host="0.0.0.0", port=config.PORT)
