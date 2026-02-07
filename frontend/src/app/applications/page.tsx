"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { KanbanBoard } from "@/components/kanban-board";
import { getApplications, updateApplication } from "@/lib/api";
import { Loader2 } from "lucide-react";

export default function ApplicationsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["applications"],
    queryFn: () => getApplications(),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      updateApplication(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["applications"] }),
  });

  const handleStatusChange = (id: string, status: string) => {
    updateMutation.mutate({ id, status });
  };

  const handleCardClick = (id: string) => {
    router.push(`/applications/${id}`);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Applications</h1>
        <p className="text-muted-foreground mt-1">
          Drag cards to update status. Click to view details.
        </p>
      </div>

      <KanbanBoard
        applications={data?.applications || []}
        onStatusChange={handleStatusChange}
        onCardClick={handleCardClick}
      />
    </div>
  );
}
