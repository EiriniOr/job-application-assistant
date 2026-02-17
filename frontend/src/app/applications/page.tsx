"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { KanbanBoard } from "@/components/kanban-board";
import { AuthGuard } from "@/components/auth-guard";
import { getApplications, updateApplication } from "@/lib/supabase-storage";
import type { Application } from "@/lib/api";
import { Loader2 } from "lucide-react";

export default function ApplicationsPage() {
  const router = useRouter();
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load applications from Supabase
  useEffect(() => {
    getApplications().then((apps) => {
      setApplications(apps);
      setIsLoading(false);
    });
  }, []);

  const handleStatusChange = async (id: string, status: string) => {
    // Update in Supabase
    const updated = await updateApplication(id, { status });
    if (updated) {
      // Update local state
      setApplications((prev) =>
        prev.map((app) => (app.id === id ? { ...app, status } : app))
      );
    }
  };

  const handleCardClick = (id: string) => {
    router.push(`/applications/${id}`);
  };

  if (isLoading) {
    return (
      <AuthGuard>
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent">
            Applications
          </h1>
          <p className="text-muted-foreground mt-1">
            Drag cards to update status. Click to view details.
          </p>
        </div>

        {applications.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>No saved applications yet.</p>
            <p className="text-sm mt-2">Search for jobs and click &quot;Save&quot; to add them here.</p>
          </div>
        ) : (
          <KanbanBoard
            applications={applications}
            onStatusChange={handleStatusChange}
            onCardClick={handleCardClick}
          />
        )}
      </div>
    </AuthGuard>
  );
}
