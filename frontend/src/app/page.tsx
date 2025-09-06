"use client";

import { Toaster } from "sonner";
import NotesWorkspace from "@/components/NotesWorkspace";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Top Header */}
      <header className="h-14 border-b border-border bg-card flex items-center justify-center">
        <div className="container mx-auto px-6">
          <h1 className="text-2xl font-bold text-foreground">Goose</h1>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="h-[calc(100vh-3.5rem)]">
        <NotesWorkspace />
      </div>

      {/* Toast Notifications */}
      <Toaster 
        position="bottom-right" 
        richColors 
        closeButton 
        toastOptions={{
          duration: 3000,
          style: {
            background: 'hsl(var(--background))',
            color: 'hsl(var(--foreground))',
            border: '1px solid hsl(var(--border))',
          },
        }}
      />
    </div>
  );
}