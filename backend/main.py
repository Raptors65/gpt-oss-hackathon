import asyncio

from openai import AsyncOpenAI
from agents import set_default_openai_client
from notes.updater import NotesUpdater
from notes.resources import Webpage

async def main():
    updater = NotesUpdater()
    await updater.start()

    await updater.add_update(Webpage("https://dhravya.dev"))

    await asyncio.sleep(5)  # wait for tasks
    await updater.stop()

if __name__ == "__main__":
    custom_client = AsyncOpenAI(base_url="http://localhost:1234/v1", api_key="")
    set_default_openai_client(custom_client)

    asyncio.run(main())
