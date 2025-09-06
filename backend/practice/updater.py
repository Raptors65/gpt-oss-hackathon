import os
import time
from typing import TypedDict

from agents import Agent, Runner, function_tool
from agents.extensions.models.litellm_model import LitellmModel

from config import NOTES_DIR, SQLITE_FILE_NAME
from practice.models import Option, Question
from sqlmodel import SQLModel, Session, create_engine, delete, select


SQLITE_URL = f"sqlite:///{SQLITE_FILE_NAME}"
CONNECT_ARGS = {"check_same_thread": False}

engine = create_engine(SQLITE_URL, connect_args=CONNECT_ARGS)
SQLModel.metadata.create_all(engine)

class PracticeUpdater:
    """Handles updating practice questions."""

    def __init__(self):
        self._last_updated = time.time()
    
    async def update(self):
        """Update practice questions for files changed since `update` was last run."""

        for filename in os.listdir(NOTES_DIR):
            full_path = os.path.join(NOTES_DIR, filename)

            last_modified_time = os.path.getmtime(full_path)

            if self._last_updated is None or last_modified_time > self._last_updated:
                await self._update_for_note(filename)
        
        self._last_updated = time.time()
    
    async def _update_for_note(self, note_name: str):
        @function_tool
        def add_practice_question(question: str, option_1: str, option_2: str, option_3: str, option_4: str, correct_option: int):
            """Adds a multiple-choice practice question.
            
            `correct_option` is an integer representing the number of the correct option between 1-4.
            """

            print("adding question", question, option_1, option_2, option_3, option_4, correct_option)

            question = Question(note_name=note_name, question=question)

            option_1 = Option(description=option_1, correct=correct_option == 1, question=question)
            option_2 = Option(description=option_2, correct=correct_option == 2, question=question)
            option_3 = Option(description=option_3, correct=correct_option == 3, question=question)
            option_4 = Option(description=option_4, correct=correct_option == 4, question=question)

            with Session(engine) as session:
                session.add(question)
                session.add(option_1)
                session.add(option_2)
                session.add(option_3)
                session.add(option_4)
                session.commit()

        # Delete any old questions
        with Session(engine) as session:
            statement = delete(Question).where(Question.note_name == note_name)
            session.exec(statement)
            session.commit()

        agent = Agent(name="Practice Question Generator",
                      instructions="You're a tutor for a student. Given some notes, your job is to generate multiple-choice practice questions for those notes. Add each question by calling the `add_practice_question` tool once for each question.",
                      model=LitellmModel(model="lm_studio/openai/gpt-oss-20b", api_key="lm-studio", base_url="http://127.0.0.1:1234/v1"),
                      tools=[add_practice_question])
        
        with open(os.path.join(NOTES_DIR, note_name), encoding="utf-8") as notes_file:
            await Runner.run(agent, f"Please generate practice questions for the following notes:\n\n{notes_file.read()}")

class OptionOutput(TypedDict):
    description: str
    isCorrect: bool

class QuestionOutput(TypedDict):
    question: str
    options: list[OptionOutput]

def get_questions_for_note(note_name: str) -> list[QuestionOutput]:
    """Returns a dict containing all the questions."""

    with Session(engine) as session:
        statement = select(Question).where(Question.note_name == note_name)
        results = session.exec(statement)
        questions = results.all()

        return [
            {
                "question": question.question,
                "options": [
                    {
                        "description": option.description,
                        "isCorrect": option.correct
                    }
                    for option in question.options
                ],
            }
            for question in questions
        ]
