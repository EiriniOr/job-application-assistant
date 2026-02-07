"use client";

import { useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2 } from "lucide-react";
import type { Application } from "@/lib/api";

const COLUMNS = [
  { id: "saved", title: "Saved", color: "bg-slate-100" },
  { id: "applied", title: "Applied", color: "bg-blue-100" },
  { id: "phone_screen", title: "Phone Screen", color: "bg-purple-100" },
  { id: "interview", title: "Interview", color: "bg-amber-100" },
  { id: "offer", title: "Offer", color: "bg-green-100" },
  { id: "rejected", title: "Rejected", color: "bg-red-100" },
];

interface KanbanBoardProps {
  applications: Application[];
  onStatusChange: (id: string, status: string) => void;
  onCardClick: (id: string) => void;
}

function ApplicationCard({ app, onClick }: { app: Application; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: app.id,
    data: { app },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Card
        className="cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
        onClick={onClick}
      >
        <CardContent className="p-3 space-y-1">
          <p className="font-medium text-sm line-clamp-1">{app.job_title}</p>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Building2 className="h-3 w-3" />
            <span>{app.company}</span>
          </div>
          {app.applied_at && (
            <p className="text-xs text-muted-foreground">
              Applied {new Date(app.applied_at).toLocaleDateString()}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function KanbanBoard({ applications, onStatusChange, onCardClick }: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const byStatus = COLUMNS.reduce(
    (acc, col) => {
      acc[col.id] = applications.filter((a) => a.status === col.id);
      return acc;
    },
    {} as Record<string, Application[]>
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const appId = active.id as string;
    const newStatus = over.id as string;

    // Check if dropped on a column
    if (COLUMNS.some((c) => c.id === newStatus)) {
      const app = applications.find((a) => a.id === appId);
      if (app && app.status !== newStatus) {
        onStatusChange(appId, newStatus);
      }
    }
  };

  const activeApp = applications.find((a) => a.id === activeId);

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map((col) => (
          <div
            key={col.id}
            id={col.id}
            className={`flex-shrink-0 w-64 rounded-lg p-3 ${col.color}`}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm">{col.title}</h3>
              <Badge variant="secondary" className="text-xs">
                {byStatus[col.id]?.length || 0}
              </Badge>
            </div>
            <SortableContext
              items={byStatus[col.id]?.map((a) => a.id) || []}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2 min-h-[100px]">
                {byStatus[col.id]?.map((app) => (
                  <ApplicationCard
                    key={app.id}
                    app={app}
                    onClick={() => onCardClick(app.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </div>
        ))}
      </div>
      <DragOverlay>
        {activeApp ? (
          <Card className="w-60 shadow-lg">
            <CardContent className="p-3">
              <p className="font-medium text-sm">{activeApp.job_title}</p>
              <p className="text-xs text-muted-foreground">{activeApp.company}</p>
            </CardContent>
          </Card>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
