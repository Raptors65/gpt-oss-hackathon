import os

from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from openai import AsyncOpenAI
from agents import set_default_openai_client
from config import LEARNING_DOMAINS, NOTES_DIR
from notes.updater import NotesUpdater
from notes.resources import Webpage
from practice.updater import get_questions_for_note

updater = NotesUpdater()
custom_client = AsyncOpenAI(base_url="http://localhost:1234/v1", api_key="")
set_default_openai_client(custom_client)

@asynccontextmanager
async def lifespan(_: FastAPI):
    await updater.start()
    yield
    # await updater.stop()

app = FastAPI(lifespan=lifespan)

origins = [
    "http://localhost:3000"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/add-website")
async def add_website(url: str):
    """Adds a website to the notes."""

    if all(domain not in url for domain in LEARNING_DOMAINS):
        return

    await updater.add_update(Webpage(url))

@app.get("/api/get-note")
async def get_note(note: str):
    """Gets the contents of one note file."""

    full_path = os.path.join(NOTES_DIR, note)

    if not os.path.isfile(full_path):
        return HTTPException(status_code=404, detail="Note does not exist")

    with open(full_path, encoding="utf-8") as note_file:
        return {
            "content": note_file.read()
        }

@app.get("/api/list-notes")
async def list_notes():
    """Lists the names of all the user's notes."""

    return {
        "notes": [
            {
                "note_name": filename,
                "last_modified": os.path.getmtime(os.path.join(NOTES_DIR, filename))
            }
            for filename in os.listdir(NOTES_DIR)
        ]
    }

@app.get("/api/get-practice-questions")
async def get_practice_questions(note: str):
    """Gets the practice questions for a given note file."""

    questions = get_questions_for_note(note)

    return {
        "questions": questions
    }
