import os
import time

from config import NOTES_DIR

class PracticeUpdater:
    """Handles updating practice questions."""

    def __init__(self):
        self._last_updated = None
    
    async def update(self):
        """Update practice questions for files changed since `update` was last run."""

        for filename in os.listdir(NOTES_DIR):
            full_path = os.path.join(NOTES_DIR, filename)

            last_modified_time = os.path.getmtime(full_path)

            if last_modified_time > self._last_updated:
                await self._update_for_note(filename)
        
        self._last_updated = time.time()
    
    async def _update_for_note(self, note_name: str):
        pass