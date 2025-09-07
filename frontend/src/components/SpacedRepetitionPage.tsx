"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Calendar, Clock, CheckCircle, Trophy, Zap } from 'lucide-react';
import { toast } from 'sonner';

interface Note {
  note_name: string;
  last_modified: number; // Unix timestamp in seconds
}

interface SpacedRepetitionInterval {
  name: string;
  days: number;
  icon: React.ReactNode;
  description: string;
}

interface CompletionData {
  [noteName: string]: number;
}

interface PracticeOption {
  description: string;
  isCorrect: boolean;
}

interface PracticeQuestion {
  question: string;
  options: PracticeOption[];
}

interface PracticeSession {
  questions: PracticeQuestion[];
  current_question: number;
  score: number;
  selected_answer: number | null;
  show_feedback: boolean;
  completed: boolean;
}

const intervals: SpacedRepetitionInterval[] = [
  {
    name: "1 Day Review",
    days: 1,
    icon: <Zap className="h-4 w-4" />,
    description: "Fresh material needs reinforcement"
  },
  {
    name: "Weekly Review", 
    days: 7,
    icon: <Calendar className="h-4 w-4" />,
    description: "Solidify your understanding"
  },
  {
    name: "Bi-weekly Review",
    days: 16,
    icon: <Clock className="h-4 w-4" />,
    description: "Long-term retention check"
  },
  {
    name: "Monthly Review",
    days: 35,
    icon: <Trophy className="h-4 w-4" />,
    description: "Master-level recall test"
  }
];

export const SpacedRepetitionPage = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completionData, setCompletionData] = useLocalStorage<CompletionData>('spaced-repetition-completions', {});
  const [streak, setStreak] = useLocalStorage('spaced-repetition-streak', 0);
  const [lastStreakDate, setLastStreakDate] = useLocalStorage('last-streak-date', '');
  
  // Practice modal state
  const [practiceModalOpen, setPracticeModalOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [practiceSession, setPracticeSession] = useState<PracticeSession | null>(null);
  const [practiceLoading, setPracticeLoading] = useState(false);

  const fetchNotes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('http://127.0.0.1:8000/api/list-notes');
      
      if (!response.ok) {
        throw new Error('Failed to fetch notes');
      }
      
      const { notes }: { notes: Note[] } = await response.json();
      setNotes(notes);
    } catch (err) {
      console.error('Error fetching notes:', err);
      setError('Failed to load notes. Please try again.');
      toast.error('Failed to load notes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  // Clean up old completions (older than 24 hours)
  useEffect(() => {
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    
    const cleanedCompletions = Object.entries(completionData).reduce((acc, [noteName, timestamp]) => {
      if (now - timestamp < oneDayMs) {
        acc[noteName] = timestamp;
      }
      return acc;
    }, {} as CompletionData);
    
    if (Object.keys(cleanedCompletions).length !== Object.keys(completionData).length) {
      setCompletionData(cleanedCompletions);
    }
  }, [completionData, setCompletionData]);

  const getDaysDifference = (lastModifiedTimestamp: number): number => {
    const today = new Date();
    const modifiedDate = new Date(lastModifiedTimestamp * 1000); // Convert from seconds to milliseconds
    
    // Reset time to compare only dates
    today.setHours(0, 0, 0, 0);
    modifiedDate.setHours(0, 0, 0, 0);
    
    const diffTime = today.getTime() - modifiedDate.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  const isNoteCompleted = (noteName: string): boolean => {
    return !!completionData[noteName];
  };

  const groupNotesByInterval = () => {
    const grouped = intervals.map(interval => ({
      ...interval,
      notes: notes.filter(note => {
        const daysDiff = getDaysDifference(note.last_modified);
        const isInInterval = daysDiff >= interval.days;
        const isCompleted = isNoteCompleted(note.note_name);
        return isInInterval && !isCompleted;
      })
    }));

    return grouped;
  };

  const startPractice = async (note: Note) => {
    setSelectedNote(note);
    setPracticeLoading(true);
    setPracticeModalOpen(true);

    try {
      const response = await fetch(`http://127.0.0.1:8000/api/get-practice-questions?note=${encodeURIComponent(note.note_name)}`);

      if (!response.ok) {
        throw new Error('Failed to fetch practice questions');
      }

      const data = await response.json();
      
      setPracticeSession({
        questions: data.questions,
        current_question: 0,
        score: 0,
        selected_answer: null,
        show_feedback: false,
        completed: false
      });
    } catch (err) {
      console.error('Error fetching practice questions:', err);
      toast.error('Failed to load practice questions');
      setPracticeModalOpen(false);
    } finally {
      setPracticeLoading(false);
    }
  };

  const handleAnswerSelect = (answerIndex: number) => {
    if (!practiceSession || practiceSession.show_feedback) return;
    
    const currentQuestion = practiceSession.questions[practiceSession.current_question];
    const isCorrect = currentQuestion.options[answerIndex].isCorrect;
    
    setPracticeSession(prev => prev ? {
      ...prev,
      selected_answer: answerIndex,
      show_feedback: true,
      score: isCorrect ? prev.score + 1 : prev.score
    } : null);
  };

  const nextQuestion = () => {
    if (!practiceSession) return;

    if (practiceSession.current_question < practiceSession.questions.length - 1) {
      setPracticeSession(prev => prev ? {
        ...prev,
        current_question: prev.current_question + 1,
        selected_answer: null,
        show_feedback: false
      } : null);
    } else {
      // Complete the session
      setPracticeSession(prev => prev ? {
        ...prev,
        completed: true
      } : null);
    }
  };

  const completePractice = () => {
    if (!selectedNote || !practiceSession) return;

    // Mark note as completed
    const now = Date.now();
    setCompletionData(prev => ({
      ...prev,
      [selectedNote.note_name]: now
    }));

    // Check if all due notes are now completed
    const allIntervalGroups = groupNotesByInterval();
    const totalDueNotes = allIntervalGroups.reduce((sum, group) => sum + group.notes.length, 0);
    
    if (totalDueNotes === 1) { // This was the last note
      updateStreak();
    }

    toast.success(`Practice completed! Score: ${practiceSession.score}/${practiceSession.questions.length}`);
    closePracticeModal();
  };

  const updateStreak = () => {
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();
    
    if (lastStreakDate === yesterday || lastStreakDate === '') {
      setStreak(prev => prev + 1);
      setLastStreakDate(today);
      toast.success(`Streak updated! ${streak + 1} days 🔥`);
    } else if (lastStreakDate !== today) {
      setStreak(1);
      setLastStreakDate(today);
      toast.success("New streak started! 1 day 🔥");
    }
  };

  const closePracticeModal = () => {
    setPracticeModalOpen(false);
    setSelectedNote(null);
    setPracticeSession(null);
    setPracticeLoading(false);
  };

  const retryPractice = () => {
    if (selectedNote) {
      closePracticeModal();
      startPractice(selectedNote);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-muted-foreground">Loading spaced repetition data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-6 py-8">
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-6 text-center">
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={fetchNotes} variant="outline">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const intervalGroups = groupNotesByInterval();
  const totalDueNotes = intervalGroups.reduce((sum, group) => sum + group.notes.length, 0);

  return (
    <div className="container mx-auto px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Spaced Repetition</h1>
          <p className="text-muted-foreground mt-1">
            Reinforce your learning with scientifically-timed reviews
          </p>
        </div>
        
        {streak > 0 && (
          <div className="flex items-center gap-2 bg-accent/50 px-3 py-2 rounded-lg">
            <Trophy className="h-4 w-4 text-accent-foreground" />
            <span className="font-medium text-accent-foreground">{streak} day streak</span>
          </div>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {intervalGroups.map((group, index) => (
          <Card key={group.name} className="relative">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-accent/20">
                  {group.icon}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{group.name}</p>
                  <p className="text-2xl font-bold">{group.notes.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content */}
      {totalDueNotes === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">All Caught Up!</h2>
            <p className="text-muted-foreground mb-4">
              You've completed all your spaced repetition reviews for today.
            </p>
            <p className="text-sm text-muted-foreground">
              Check back tomorrow for new reviews to maintain your learning momentum.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {intervalGroups.map((group) => (
            group.notes.length > 0 && (
              <Card key={group.name}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-accent/20">
                      {group.icon}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{group.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{group.description}</p>
                    </div>
                    <Badge variant="secondary" className="ml-auto">
                      {group.notes.length} due
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {group.notes.map((note) => (
                    <div 
                      key={note.note_name}
                      className="flex items-center justify-between p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1">
                        <h3 className="font-medium">{note.note_name}</h3>
                        <p className="text-sm text-muted-foreground">
                          Last modified: {new Date(note.last_modified * 1000).toLocaleDateString()}
                        </p>
                      </div>
                      <Button 
                        onClick={() => startPractice(note)}
                        size="sm"
                        className="ml-4"
                      >
                        Practice
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )
          ))}
        </div>
      )}

      {/* Practice Modal */}
      <Dialog open={practiceModalOpen} onOpenChange={closePracticeModal}>
        <DialogContent className="max-w-2xl">
          {practiceLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center space-y-4">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-muted-foreground">Loading practice questions...</p>
              </div>
            </div>
          ) : practiceSession?.completed ? (
            <div className="text-center py-8">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <DialogHeader className="mb-6">
                <DialogTitle className="text-2xl">Practice Complete!</DialogTitle>
                <DialogDescription className="text-lg">
                  You scored {practiceSession.score} out of {practiceSession.questions.length}
                </DialogDescription>
              </DialogHeader>
              <div className="flex gap-3 justify-center">
                <Button onClick={retryPractice} variant="outline">
                  Practice Again
                </Button>
                <Button onClick={completePractice}>
                  Mark Complete
                </Button>
              </div>
            </div>
          ) : practiceSession ? (
            <>
              <DialogHeader>
                <DialogTitle>Practice: {selectedNote?.note_name}</DialogTitle>
                <DialogDescription>
                  Question {practiceSession.current_question + 1} of {practiceSession.questions.length}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                <Progress 
                  value={((practiceSession.current_question + (practiceSession.show_feedback ? 1 : 0)) / practiceSession.questions.length) * 100} 
                  className="w-full" 
                />

                <div className="space-y-4">
                  <h3 className="text-lg font-medium">
                    {practiceSession.questions[practiceSession.current_question].question}
                  </h3>

                  <RadioGroup 
                    value={practiceSession.selected_answer?.toString() || ""}
                    onValueChange={(value) => handleAnswerSelect(parseInt(value))}
                    disabled={practiceSession.show_feedback}
                  >
                    {practiceSession.questions[practiceSession.current_question].options.map((option, index) => {
                      const isCorrect = option.isCorrect;
                      const isSelected = practiceSession.selected_answer === index;
                      
                      return (
                        <div key={index} className="flex items-center space-x-2">
                          <RadioGroupItem value={index.toString()} id={`option-${index}`} />
                          <Label 
                            htmlFor={`option-${index}`} 
                            className={`flex-1 cursor-pointer p-3 rounded-lg border transition-colors ${
                              practiceSession.show_feedback
                                ? isCorrect
                                  ? 'bg-green-50 border-green-200 text-green-800'
                                  : isSelected && !isCorrect
                                    ? 'bg-red-50 border-red-200 text-red-800'
                                    : 'bg-muted/30'
                                : 'hover:bg-muted/50'
                            }`}
                          >
                            {option.description}
                          </Label>
                        </div>
                      );
                    })}
                  </RadioGroup>

                  {practiceSession.show_feedback && (
                    <div className="flex justify-between items-center pt-4">
                      <div className="text-sm text-muted-foreground">
                        {practiceSession.questions[practiceSession.current_question].options[practiceSession.selected_answer!]?.isCorrect
                          ? "Correct! ✓"
                          : "Incorrect ✗"}
                      </div>
                      <Button onClick={nextQuestion}>
                        {practiceSession.current_question < practiceSession.questions.length - 1 ? "Next Question" : "Finish"}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SpacedRepetitionPage;
