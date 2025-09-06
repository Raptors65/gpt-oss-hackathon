import asyncio

from contextlib import asynccontextmanager
from fastapi import FastAPI
from openai import AsyncOpenAI
from agents import set_default_openai_client
from notes.updater import NotesUpdater
from notes.resources import Webpage

updater = NotesUpdater()
custom_client = AsyncOpenAI(base_url="http://localhost:1234/v1", api_key="")
set_default_openai_client(custom_client)

@asynccontextmanager
async def lifespan(app: FastAPI):
    await updater.start()
    yield
    # await updater.stop()

app = FastAPI(lifespan=lifespan)

@app.post("/api/add-website")
async def add_website(url: str):
    """Adds a website to the notes."""

    if "wikipedia.org" not in url:
        return

    await updater.add_update(Webpage(url))
