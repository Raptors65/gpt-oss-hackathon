"use client";

import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Search, RefreshCw, FileText, Play, X, ChevronLeft, ChevronRight, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

interface Note {
  note_name: string;
  last_modified: number; // Unix timestamp in seconds
}

interface PracticeOption {
  description: string;
  isCorrect: boolean;
}

interface PracticeQuestion {
  question: string;
  options: PracticeOption[];
}

interface PracticeQuestionsResponse {
  questions: PracticeQuestion[];
}

export const BrowsePage = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<string | null>(null);
  const [noteContent, setNoteContent] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoadingNotes, setIsLoadingNotes] = useState(true);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [isPracticeOpen, setIsPracticeOpen] = useState(false);
  const [practiceQuestions, setPracticeQuestions] = useState<PracticeQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [showAnswers, setShowAnswers] = useState(false);
  const [isLoadingPractice, setIsLoadingPractice] = useState(false);
  const [practiceComplete, setPracticeComplete] = useState(false);

  const fetchNotes = async () => {
    try {
      setIsLoadingNotes(true);
      const response = await fetch('http://127.0.0.1:8000/api/list-notes');
      if (!response.ok) throw new Error('Failed to fetch notes');
      const { notes }: { notes: Note[] } = await response.json();
      setNotes(notes);
      
      // Auto-select first note if none selected
      if (notes.length > 0 && !selectedNote) {
        setSelectedNote(notes[0].note_name);
      }
    } catch (error) {
      console.error('Error fetching notes:', error);
      toast.error('Failed to load notes');
    } finally {
      setIsLoadingNotes(false);
    }
  };

  const fetchNoteContent = async (noteName: string) => {
    try {
      setIsLoadingContent(true);
      const response = await fetch(`http://127.0.0.1:8000/api/get-note?note=${encodeURIComponent(noteName)}`);
      if (!response.ok) throw new Error('Failed to fetch note content');
      const data = await response.json();
      setNoteContent(data.content);
    } catch (error) {
      console.error('Error fetching note content:', error);
      toast.error('Failed to load note content');
      setNoteContent('');
    } finally {
      setIsLoadingContent(false);
    }
  };

  const fetchPracticeQuestions = async (noteName: string) => {
    try {
      setIsLoadingPractice(true);
      const response = await fetch(`http://127.0.0.1:8000/api/get-practice-questions?note=${encodeURIComponent(noteName)}`);
      if (!response.ok) throw new Error('Failed to fetch practice questions');
      const data: PracticeQuestionsResponse = await response.json();
      setPracticeQuestions(data.questions);
      setCurrentQuestionIndex(0);
      setSelectedAnswers(new Array(data.questions.length).fill(-1));
      setShowAnswers(false);
      setPracticeComplete(false);
    } catch (error) {
      console.error('Error fetching practice questions:', error);
      toast.error('Failed to load practice questions');
    } finally {
      setIsLoadingPractice(false);
    }
  };

  const startPractice = async (noteName: string) => {
    setIsPracticeOpen(true);
    await fetchPracticeQuestions(noteName);
  };

  const handleAnswerSelect = (answerIndex: number) => {
    if (showAnswers) return;
    
    const newAnswers = [...selectedAnswers];
    newAnswers[currentQuestionIndex] = answerIndex;
    setSelectedAnswers(newAnswers);
  };

  const handleShowAnswer = () => {
    setShowAnswers(true);
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < practiceQuestions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setShowAnswers(false);
    } else {
      setPracticeComplete(true);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      setShowAnswers(false);
    }
  };

  const calculateScore = () => {
    let correct = 0;
    selectedAnswers.forEach((answer, index) => {
      if (answer >= 0 && practiceQuestions[index]?.options[answer]?.isCorrect) {
        correct++;
      }
    });
    return { correct, total: practiceQuestions.length };
  };

  const resetPractice = () => {
    setCurrentQuestionIndex(0);
    setSelectedAnswers(new Array(practiceQuestions.length).fill(-1));
    setShowAnswers(false);
    setPracticeComplete(false);
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  useEffect(() => {
    if (selectedNote) {
      fetchNoteContent(selectedNote);
    }
  }, [selectedNote]);

  const filteredNotes = notes.filter(note =>
    note.note_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const currentQuestion = practiceQuestions[currentQuestionIndex];
  const selectedAnswer = selectedAnswers[currentQuestionIndex];
  const score = calculateScore();

  return (
    <div className="flex h-full bg-background">
      {/* Sidebar */}
      <div className="w-80 border-r border-border bg-sidebar flex flex-col flex-shrink-0">
        {/* Sidebar Header */}
        <div className="p-4 border-b border-sidebar-border flex-shrink-0">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="font-semibold text-sidebar-foreground">Notes</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchNotes}
              disabled={isLoadingNotes}
              className="ml-auto h-8 w-8 p-0"
            >
              <RefreshCw className={`h-4 w-4 ${isLoadingNotes ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Notes List */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-2">
              {isLoadingNotes ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredNotes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {searchTerm ? 'No notes match your search' : 'No notes found'}
                </div>
              ) : (
                filteredNotes.map((note) => (
                  <div
                    key={note.note_name}
                    className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedNote === note.note_name
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                        : 'hover:bg-sidebar-accent/50'
                    }`}
                    onClick={() => setSelectedNote(note.note_name)}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="truncate text-sm font-medium">{note.note_name}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        startPractice(note.note_name);
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity h-8 px-2"
                    >
                      <Play className="h-3 w-3" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header Bar */}
        <div className="h-14 border-b border-border bg-card flex items-center justify-between px-6 flex-shrink-0">
          <div className="flex items-center gap-2">
            {selectedNote && (
              <span className="text-sm text-muted-foreground">{selectedNote}</span>
            )}
          </div>
          {selectedNote && (
            <Button
              onClick={() => startPractice(selectedNote)}
              className="flex items-center gap-2"
            >
              <Play className="h-4 w-4" />
              Practice
            </Button>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {isLoadingContent ? (
            <div className="flex items-center justify-center h-full">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : selectedNote && noteContent ? (
            <ScrollArea className="h-full">
              <div className="max-w-4xl mx-auto p-6">
                <div className="prose prose-slate max-w-none">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h1: ({ children }) => (
                        <h1 className="text-3xl font-bold text-foreground mb-6 pb-3 border-b border-border">
                          {children}
                        </h1>
                      ),
                      h2: ({ children }) => (
                        <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">
                          {children}
                        </h2>
                      ),
                      h3: ({ children }) => (
                        <h3 className="text-xl font-semibold text-foreground mt-6 mb-3">
                          {children}
                        </h3>
                      ),
                      p: ({ children }) => (
                        <p className="text-foreground leading-7 mb-4">
                          {children}
                        </p>
                      ),
                      code: ({ children, className }) => {
                        const isInline = !className;
                        if (isInline) {
                          return (
                            <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono text-foreground">
                              {children}
                            </code>
                          );
                        }
                        return (
                          <pre className="bg-muted p-4 rounded-lg border border-border overflow-x-auto mb-4">
                            <code className="text-sm font-mono text-foreground">
                              {children}
                            </code>
                          </pre>
                        );
                      },
                      ul: ({ children }) => (
                        <ul className="list-disc pl-6 mb-4 text-foreground">
                          {children}
                        </ul>
                      ),
                      ol: ({ children }) => (
                        <ol className="list-decimal pl-6 mb-4 text-foreground">
                          {children}
                        </ol>
                      ),
                      li: ({ children }) => (
                        <li className="mb-1 leading-7">{children}</li>
                      ),
                      blockquote: ({ children }) => (
                        <blockquote className="border-l-4 border-primary pl-4 italic text-muted-foreground mb-4">
                          {children}
                        </blockquote>
                      ),
                      table: ({ children }) => (
                        <div className="overflow-x-auto mb-4">
                          <table className="w-full border-collapse border border-border">
                            {children}
                          </table>
                        </div>
                      ),
                      th: ({ children }) => (
                        <th className="border border-border bg-muted p-2 text-left font-semibold">
                          {children}
                        </th>
                      ),
                      td: ({ children }) => (
                        <td className="border border-border p-2">{children}</td>
                      ),
                    }}
                  >
                    {noteContent}
                  </ReactMarkdown>
                </div>
              </div>
            </ScrollArea>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              {notes.length === 0 ? 'No notes available' : 'Select a note to view its content'}
            </div>
          )}
        </div>
      </div>

      {/* Practice Modal */}
      <Dialog open={isPracticeOpen} onOpenChange={setIsPracticeOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Practice: {selectedNote}</span>
            </DialogTitle>
          </DialogHeader>

          {isLoadingPractice ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : practiceQuestions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No practice questions available for this note.
            </div>
          ) : practiceComplete ? (
            <div className="text-center py-8">
              <div className="mb-6">
                <h3 className="text-2xl font-semibold mb-2">Practice Complete!</h3>
                <p className="text-lg text-muted-foreground">
                  You scored {score.correct} out of {score.total} questions correct
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  ({Math.round((score.correct / score.total) * 100)}%)
                </p>
              </div>
              <div className="flex gap-4 justify-center">
                <Button onClick={resetPractice}>Try Again</Button>
                <Button variant="outline" onClick={() => setIsPracticeOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          ) : currentQuestion && (
            <div className="space-y-6">
              {/* Progress */}
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Question {currentQuestionIndex + 1} of {practiceQuestions.length}</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{
                        width: `${((currentQuestionIndex + 1) / practiceQuestions.length) * 100}%`
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Question */}
              <div>
                <h3 className="text-lg font-semibold mb-4">{currentQuestion.question}</h3>
                <div className="space-y-3">
                  {currentQuestion.options.map((option, index) => {
                    let buttonClass = "w-full text-left p-4 rounded-lg border transition-colors ";
                    
                    if (showAnswers) {
                      if (option.isCorrect) {
                        buttonClass += "bg-green-50 border-green-300 text-green-800";
                      } else if (index === selectedAnswer && !option.isCorrect) {
                        buttonClass += "bg-red-50 border-red-300 text-red-800";
                      } else {
                        buttonClass += "bg-muted border-border text-muted-foreground";
                      }
                    } else {
                      if (index === selectedAnswer) {
                        buttonClass += "bg-primary/10 border-primary text-primary";
                      } else {
                        buttonClass += "bg-background border-border hover:bg-muted";
                      }
                    }

                    return (
                      <button
                        key={index}
                        onClick={() => handleAnswerSelect(index)}
                        className={buttonClass}
                        disabled={showAnswers}
                      >
                        <div className="flex items-center gap-3">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full border border-current flex items-center justify-center text-xs font-medium">
                            {String.fromCharCode(65 + index)}
                          </span>
                          <span>{option.description}</span>
                          {showAnswers && option.isCorrect && (
                            <CheckCircle className="ml-auto h-5 w-5 text-green-600" />
                          )}
                          {showAnswers && index === selectedAnswer && !option.isCorrect && (
                            <XCircle className="ml-auto h-5 w-5 text-red-600" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={handlePreviousQuestion}
                  disabled={currentQuestionIndex === 0}
                  className="flex items-center gap-2"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>

                <div className="flex gap-2">
                  {!showAnswers && selectedAnswer !== -1 && (
                    <Button onClick={handleShowAnswer}>
                      Show Answer
                    </Button>
                  )}
                  
                  {showAnswers && (
                    <Button onClick={handleNextQuestion}>
                      {currentQuestionIndex === practiceQuestions.length - 1 ? 'Finish' : 'Next'}
                      {currentQuestionIndex < practiceQuestions.length - 1 && (
                        <ChevronRight className="h-4 w-4 ml-2" />
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BrowsePage;
