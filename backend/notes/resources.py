from abc import ABC, abstractmethod
import aiohttp

class Resource(ABC):
    """Base class for resources."""

    @abstractmethod
    async def get_text(self) -> str:
        """Extracts machine-readable text from the resource."""


class Webpage(Resource):
    """A webpage resource."""

    def __init__(self, url: str):
        self.url = url

    async def get_text(self) -> str:
        async with aiohttp.ClientSession() as session:
            async with session.get("https://md.dhr.wtf/", params={"url": self.url}) as response:
                return await response.text()
