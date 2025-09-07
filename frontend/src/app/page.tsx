"use client";

import { useState } from "react";
import BrowsePage from "@/components/BrowsePage";
import SpacedRepetitionPage from "@/components/SpacedRepetitionPage";
import { useLocalStorage } from "@/hooks/useLocalStorage";

export default function HomePage() {
  const [currentPage, setCurrentPage] = useState<"Browse" | "Spaced Repetition">("Browse");
  const [streak] = useLocalStorage("spaced-repetition-streak", 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Top Header with Navigation */}
      <header className="h-14 border-b border-border bg-card flex items-center justify-between">
        <div className="container mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <h1 className="text-2xl font-bold text-foreground">Goose</h1>
            <nav className="flex gap-1">
              <button
                onClick={() => setCurrentPage("Browse")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  currentPage === "Browse"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                Browse
              </button>
              <button
                onClick={() => setCurrentPage("Spaced Repetition")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  currentPage === "Spaced Repetition"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                Spaced Repetition
              </button>
            </nav>
          </div>
          
          {/* Streak Counter */}
          {/* <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Streak:</span>
            <span className="font-bold text-primary">{streak} days</span>
          </div> */}
        </div>
      </header>

      {/* Main Content */}
      <div className="h-[calc(100vh-3.5rem)]">
        {currentPage === "Browse" ? <BrowsePage /> : <SpacedRepetitionPage />}
      </div>
    </div>
  );
}
