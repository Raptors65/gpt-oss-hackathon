import os

from agents import function_tool
from config import NOTES_DIR

@function_tool
def list_notes() -> str:
    """Returns the names of all current notes."""

    return str([filename[:-3] for filename in os.listdir(NOTES_DIR)])

@function_tool
def read_note(note_name: str) -> str:
    """Returns the content in the given note."""

    with open(os.path.join(NOTES_DIR, note_name + ".md"), encoding="utf-8") as note_file:
        return note_file.read()

@function_tool
def update_note(note_name: str, new_content: str):
    """Replaces the old content in the given note with `new_content`.
    If the note didn't exist previously, this creates a new note.
    
    Only update a note after first reading the note content using `read_note`.
    """

    with open(os.path.join(NOTES_DIR, note_name + ".md"), mode="w", encoding="utf-8") as note_file:
        note_file.write(new_content)
