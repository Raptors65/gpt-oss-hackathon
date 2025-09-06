import asyncio
import aiohttp
import time

from agents import Agent, Runner
from agents.extensions.models.litellm_model import LitellmModel
from notes.tools import list_notes, read_note, update_note
from notes.resources import Resource
from practice.updater import PracticeUpdater


class NotesUpdater:
    """Handles updating of notes."""

    def __init__(self):
        self.queue = asyncio.Queue()
        self.worker_task = None
        self._running = False
        self.agent = Agent(name="Notes Updater",
                           instructions="You're an efficient note-writer for a student. Your job is to take in a piece of text, then extract the most important parts and update the existing Markdown notes or create new Markdown notes to include the info there.",
                           model=LitellmModel(model="lm_studio/openai/gpt-oss-20b", api_key="lm-studio", base_url="http://127.0.0.1:1234/v1"),
                           tools=[list_notes, read_note, update_note])
        self._practice_updater = PracticeUpdater()

    async def start(self):
        """Start the background worker that processes update requests."""

        if not self._running:
            self._running = True
            self.worker_task = asyncio.create_task(self._worker())

    async def stop(self):
        """Stop the worker gracefully."""

        self._running = False
        if self.worker_task:
            await self.worker_task

    async def add_update(self, resource: Resource):
        """Add a new resource update request to the queue."""

        resource_text = await resource.get_text()

        await self.queue.put(resource_text)

    async def _worker(self):
        """Continuously process updates one at a time."""

        while self._running:
            resource = await self.queue.get()
            try:
                await self._process_resource(resource)
            except Exception as e:
                print(f"Error processing resource: {e}")
                raise e
            finally:
                self.queue.task_done()

    async def _process_resource(self, resource_text: str):
        """Updates the notes to include the content in `resource_text`."""

        print(f"Processing resource: {resource_text}")
        start_time = time.time()
        await Runner.run(self.agent, f"Please update the notes to include notes from the following content:\n\n{resource_text}")
        print(f"Finished processing: {resource_text}")
        await self._practice_updater.update()
        

    async def _get_text_from_resource(self, resource: str) -> str:
        """Gets machine-readable text from a resource."""

        async with aiohttp.ClientSession() as session:
            async with session.get("https://md.dhr.wtf/", params={"url": resource}) as response:
                return await response.text()
