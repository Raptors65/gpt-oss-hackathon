from sqlmodel import Field, Relationship, SQLModel

class Question(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    note_name: str = Field(index=True)
    question: str

    options: list["Option"] = Relationship(back_populates="question")

class Option(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    description: str
    correct: bool

    question_id: int | None = Field(default=None, foreign_key="question.id")
    question: Question | None = Relationship(back_populates="options")
