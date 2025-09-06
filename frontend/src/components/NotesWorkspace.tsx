"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Search, RefreshCw, PanelLeft, PanelLeftOpen, Play, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";

interface Note {
  name: string;
}

interface Question {
  question: string;
  options: Array<{
    description: string;
    isCorrect: boolean;
  }>;
}

interface PracticeState {
  questions: Question[];
  currentQuestionIndex: number;
  answers: Record<number, number>;
  isFinished: boolean;
  score: number;
}

export default function NotesWorkspace() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [filteredNotes, setFilteredNotes] = useState<Note[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeNote, setActiveNote] = useState<string | null>(null);
  const [noteContent, setNoteContent] = useState<string>("");
  const [contentCache, setContentCache] = useState<Record<string, string>>({});
  
  // Loading states
  const [isLoadingNotes, setIsLoadingNotes] = useState(false);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  
  // Error states
  const [notesError, setNotesError] = useState<string | null>(null);
  const [contentError, setContentError] = useState<string | null>(null);
  
  // UI states
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [practiceModalOpen, setPracticeModalOpen] = useState(false);
  const [practiceState, setPracticeState] = useState<PracticeState | null>(null);
  
  // Refs for keyboard navigation
  const notesListRef = useRef<HTMLDivElement>(null);
  const [selectedNoteIndex, setSelectedNoteIndex] = useState(-1);

  // Fetch notes list
  const fetchNotes = useCallback(async () => {
    setIsLoadingNotes(true);
    setNotesError(null);
    
    try {
      const response = await fetch("http://127.0.0.1:8000/api/list-notes");
      if (!response.ok) {
        throw new Error(`Failed to fetch notes: ${response.status}`);
      }
      
      const data = await response.json();
      const notesList = data.notes || [];
      setNotes(notesList.map((name: string) => ({ name })));
      toast.success("Notes refreshed");
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Failed to fetch notes";
      setNotesError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsLoadingNotes(false);
    }
  }, []);

  // Fetch note content
  const fetchNoteContent = useCallback(async (noteName: string) => {
    // Check cache first
    if (contentCache[noteName]) {
      setNoteContent(contentCache[noteName]);
      return;
    }
    
    setIsLoadingContent(true);
    setContentError(null);
    
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/get-note?note=${encodeURIComponent(noteName)}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch note: ${response.status}`);
      }
      
      const data = await response.json();
      const content = data.content || "";
      
      setNoteContent(content);
      setContentCache(prev => ({ ...prev, [noteName]: content }));
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Failed to fetch note content";
      setContentError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsLoadingContent(false);
    }
  }, [contentCache]);

  // Fetch practice questions
  const fetchPracticeQuestions = useCallback(async (noteName: string) => {
    setIsLoadingQuestions(true);
    
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/get-practice-questions?note=${encodeURIComponent(noteName)}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch practice questions: ${response.status}`);
      }
      
      const data = await response.json();
      const questions = data.questions || [];
      
      if (questions.length === 0) {
        toast.error("No practice questions available for this note");
        setPracticeModalOpen(false);
        return;
      }
      
      // Shuffle questions and options
      const shuffledQuestions = [...questions]
        .sort(() => Math.random() - 0.5)
        .map(q => ({
          ...q,
          options: [...q.options].sort(() => Math.random() - 0.5)
        }));
      
      setPracticeState({
        questions: shuffledQuestions,
        currentQuestionIndex: 0,
        answers: {},
        isFinished: false,
        score: 0
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Failed to fetch practice questions";
      toast.error(errorMsg);
      setPracticeModalOpen(false);
    } finally {
      setIsLoadingQuestions(false);
    }
  }, []);

  // Filter notes based on search
  useEffect(() => {
    if (searchTerm) {
      setFilteredNotes(notes.filter(note => 
        note.name.toLowerCase().includes(searchTerm.toLowerCase())
      ));
    } else {
      setFilteredNotes(notes);
    }
  }, [notes, searchTerm]);

  // Initial fetch
  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  // Handle note selection
  const handleNoteSelect = useCallback((noteName: string) => {
    setActiveNote(noteName);
    fetchNoteContent(noteName);
  }, [fetchNoteContent]);

  // Handle practice modal open
  const handlePracticeOpen = useCallback((noteName: string) => {
    setPracticeModalOpen(true);
    fetchPracticeQuestions(noteName);
  }, [fetchPracticeQuestions]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (practiceModalOpen) return;
      
      if (e.key === "ArrowDown" && filteredNotes.length > 0) {
        e.preventDefault();
        setSelectedNoteIndex(prev => 
          prev < filteredNotes.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === "ArrowUp" && filteredNotes.length > 0) {
        e.preventDefault();
        setSelectedNoteIndex(prev => 
          prev > 0 ? prev - 1 : filteredNotes.length - 1
        );
      } else if (e.key === "Enter" && selectedNoteIndex >= 0) {
        e.preventDefault();
        handleNoteSelect(filteredNotes[selectedNoteIndex].name);
      } else if (e.key === "p" || e.key === "P") {
        if (activeNote) {
          e.preventDefault();
          handlePracticeOpen(activeNote);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [filteredNotes, selectedNoteIndex, practiceModalOpen, activeNote, handleNoteSelect, handlePracticeOpen]);

  // Practice modal handlers
  const handleAnswerSelect = useCallback((questionIndex: number, optionIndex: number) => {
    if (!practiceState) return;
    
    setPracticeState(prev => ({
      ...prev!,
      answers: { ...prev!.answers, [questionIndex]: optionIndex }
    }));
  }, [practiceState]);

  const handleNextQuestion = useCallback(() => {
    if (!practiceState) return;
    
    setPracticeState(prev => ({
      ...prev!,
      currentQuestionIndex: prev!.currentQuestionIndex + 1
    }));
  }, [practiceState]);

  const handlePreviousQuestion = useCallback(() => {
    if (!practiceState) return;
    
    setPracticeState(prev => ({
      ...prev!,
      currentQuestionIndex: prev!.currentQuestionIndex - 1
    }));
  }, [practiceState]);

  const handleFinishPractice = useCallback(() => {
    if (!practiceState) return;
    
    const score = practiceState.questions.reduce((total, question, index) => {
      const selectedOption = practiceState.answers[index];
      if (selectedOption !== undefined && question.options[selectedOption]?.isCorrect) {
        return total + 1;
      }
      return total;
    }, 0);
    
    setPracticeState(prev => ({
      ...prev!,
      isFinished: true,
      score
    }));
  }, [practiceState]);

  const handleRetryPractice = useCallback(() => {
    if (activeNote) {
      fetchPracticeQuestions(activeNote);
    }
  }, [activeNote, fetchPracticeQuestions]);

  const handleClosePractice = useCallback(() => {
    setPracticeModalOpen(false);
    setPracticeState(null);
  }, []);

  return (
    <div className="flex h-full bg-background">
      {/* Sidebar - Fixed height with internal scrolling */}
      <div className={`${
        sidebarOpen ? "w-80" : "w-0"
      } transition-all duration-200 border-r border-border bg-sidebar flex-shrink-0`}>
        <div className={`${sidebarOpen ? "block" : "hidden"} h-full flex flex-col`}>
          {/* Sidebar Header */}
          <div className="p-4 border-b border-sidebar-border flex-shrink-0">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search notes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchNotes}
                disabled={isLoadingNotes}
              >
                <RefreshCw className={`h-4 w-4 ${isLoadingNotes ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>

          {/* Notes List - Scrollable */}
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div ref={notesListRef} className="p-2" role="list">
                {isLoadingNotes ? (
                  // Loading skeleton
                  Array.from({ length: 8 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-12 bg-muted/50 rounded-md mb-2 animate-pulse"
                    />
                  ))
                ) : notesError ? (
                  // Error state
                  <Card className="m-2">
                    <CardContent className="pt-6">
                      <p className="text-sm text-destructive mb-3">{notesError}</p>
                      <Button onClick={fetchNotes} size="sm">
                        Retry
                      </Button>
                    </CardContent>
                  </Card>
                ) : filteredNotes.length === 0 ? (
                  // Empty state
                  <Card className="m-2">
                    <CardContent className="pt-6">
                      <p className="text-sm text-muted-foreground mb-3">
                        {notes.length === 0 ? "No notes found" : "No matching notes"}
                      </p>
                      <Button onClick={fetchNotes} size="sm">
                        Refresh
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  // Notes list
                  filteredNotes.map((note, index) => (
                    <div
                      key={note.name}
                      role="listitem"
                      className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer border transition-colors ${
                        activeNote === note.name
                          ? "bg-sidebar-accent border-sidebar-primary/20 border-l-4 border-l-sidebar-primary"
                          : selectedNoteIndex === index
                          ? "bg-sidebar-accent/50 border-sidebar-border"
                          : "hover:bg-sidebar-accent/50 border-transparent"
                      }`}
                      onClick={() => handleNoteSelect(note.name)}
                    >
                      <span className="truncate text-sm font-medium text-sidebar-foreground">
                        {note.name}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePracticeOpen(note.name);
                        }}
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>

      {/* Main Content - Flex container with fixed header and scrollable content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header - Fixed */}
        <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6 flex-shrink-0">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? (
                <PanelLeft className="h-4 w-4" />
              ) : (
                <PanelLeftOpen className="h-4 w-4" />
              )}
            </Button>
            <h1 className="text-xl font-bold text-foreground">Goose</h1>
          </div>
          
          {activeNote && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => activeNote && fetchNoteContent(activeNote)}
                disabled={isLoadingContent}
              >
                <RefreshCw className={`h-4 w-4 ${isLoadingContent ? "animate-spin" : ""}`} />
              </Button>
            </div>
          )}
        </header>

        {/* Content Area - Scrollable content with fixed action bar */}
        <div className="flex-1 flex flex-col min-h-0">
          {!activeNote ? (
            // Empty state
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Select a note to get started
                </h3>
                <p className="text-muted-foreground">
                  Choose a note from the sidebar or press the first letter to navigate
                </p>
              </div>
            </div>
          ) : contentError ? (
            // Error state
            <div className="flex-1 flex items-center justify-center">
              <Card className="w-96">
                <CardHeader>
                  <CardTitle className="text-destructive">Error Loading Note</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">{contentError}</p>
                  <Button onClick={() => fetchNoteContent(activeNote)}>
                    Retry
                  </Button>
                </CardContent>
              </Card>
            </div>
          ) : isLoadingContent ? (
            // Loading state
            <div className="flex-1 flex items-center justify-center">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5 animate-spin" />
                <span className="text-muted-foreground">Loading note...</span>
              </div>
            </div>
          ) : (
            // Content viewer with scrollable markdown and fixed action bar
            <>
              {/* Scrollable Markdown Content */}
              <div className="flex-1 overflow-hidden">
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
              </div>
              
              {/* Action Bar - Fixed at bottom */}
              <div className="border-t border-border bg-card p-4 flex-shrink-0">
                <div className="max-w-4xl mx-auto flex justify-center">
                  <Button
                    onClick={() => handlePracticeOpen(activeNote)}
                    className="bg-primary hover:bg-primary/90"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Practice
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Practice Modal */}
      <Dialog open={practiceModalOpen} onOpenChange={(open) => {
        if (!open) {
          handleClosePractice();
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Practice — {activeNote}</span>
              {practiceState && !practiceState.isFinished && (
                <Badge variant="outline">
                  Question {practiceState.currentQuestionIndex + 1} of {practiceState.questions.length}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {isLoadingQuestions ? (
              <div className="flex items-center justify-center py-8">
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5 animate-spin" />
                  <span className="text-muted-foreground">Loading questions...</span>
                </div>
              </div>
            ) : !practiceState ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Failed to load practice questions</p>
                <Button onClick={() => activeNote && fetchPracticeQuestions(activeNote)} className="mt-4">
                  Retry
                </Button>
              </div>
            ) : practiceState.isFinished ? (
              // Score Summary
              <div className="space-y-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary mb-2">
                    {practiceState.score}/{practiceState.questions.length}
                  </div>
                  <p className="text-lg text-muted-foreground">
                    {Math.round((practiceState.score / practiceState.questions.length) * 100)}% Correct
                  </p>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold text-foreground">Review:</h4>
                  {practiceState.questions.map((question, qIndex) => {
                    const selectedOption = practiceState.answers[qIndex];
                    const correctOption = question.options.findIndex(opt => opt.isCorrect);
                    
                    return (
                      <Card key={qIndex} className="p-4">
                        <p className="font-medium text-sm mb-3">{question.question}</p>
                        <div className="space-y-2">
                          {question.options.map((option, oIndex) => (
                            <div
                              key={oIndex}
                              className={`p-2 rounded text-sm ${
                                oIndex === correctOption
                                  ? "bg-green-100 border border-green-300 text-green-800"
                                  : selectedOption === oIndex && oIndex !== correctOption
                                  ? "bg-red-100 border border-red-300 text-red-800"
                                  : "bg-muted"
                              }`}
                            >
                              {option.description}
                            </div>
                          ))}
                        </div>
                      </Card>
                    );
                  })}
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleRetryPractice} className="flex-1">
                    Retry
                  </Button>
                  <Button variant="outline" onClick={handleClosePractice} className="flex-1">
                    Close
                  </Button>
                </div>
              </div>
            ) : (
              // Question UI
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-4">
                    {practiceState.questions[practiceState.currentQuestionIndex].question}
                  </h3>
                  
                  <RadioGroup
                    value={practiceState.answers[practiceState.currentQuestionIndex]?.toString() || ""}
                    onValueChange={(value) => 
                      handleAnswerSelect(practiceState.currentQuestionIndex, parseInt(value))
                    }
                    disabled={practiceState.answers[practiceState.currentQuestionIndex] !== undefined}
                  >
                    {practiceState.questions[practiceState.currentQuestionIndex].options.map((option, index) => {
                      const isSelected = practiceState.answers[practiceState.currentQuestionIndex] === index;
                      const isAnswered = practiceState.answers[practiceState.currentQuestionIndex] !== undefined;
                      const isCorrect = option.isCorrect;
                      
                      return (
                        <div
                          key={index}
                          className={`flex items-center space-x-2 p-3 rounded-lg border transition-colors ${
                            isAnswered
                              ? isCorrect
                                ? "bg-green-50 border-green-200"
                                : isSelected
                                ? "bg-red-50 border-red-200"
                                : "bg-muted border-border"
                              : "hover:bg-muted border-border"
                          }`}
                        >
                          <RadioGroupItem value={index.toString()} id={`option-${index}`} />
                          <Label
                            htmlFor={`option-${index}`}
                            className="flex-1 cursor-pointer text-sm"
                          >
                            {option.description}
                          </Label>
                        </div>
                      );
                    })}
                  </RadioGroup>
                </div>

                <div className="flex justify-between items-center">
                  <Button
                    variant="outline"
                    onClick={handlePreviousQuestion}
                    disabled={practiceState.currentQuestionIndex === 0}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  
                  <div className="flex gap-2">
                    {practiceState.currentQuestionIndex < practiceState.questions.length - 1 ? (
                      <Button
                        onClick={handleNextQuestion}
                        disabled={practiceState.answers[practiceState.currentQuestionIndex] === undefined}
                      >
                        Next
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    ) : (
                      <Button
                        onClick={handleFinishPractice}
                        disabled={practiceState.answers[practiceState.currentQuestionIndex] === undefined}
                        className="bg-primary hover:bg-primary/90"
                      >
                        Finish
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
