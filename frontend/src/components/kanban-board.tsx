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
  useDroppable,
  useDraggable,
  DragOverEvent,
} from "@dnd-kit/core";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2 } from "lucide-react";
import type { Application } from "@/lib/api";

const COLUMNS = [
  { id: "saved", title: "Saved", color: "bg-slate-800/50 border border-slate-600/30", hoverColor: "bg-slate-700/50 border border-slate-500/40" },
  { id: "applied", title: "Applied", color: "bg-violet-900/30 border border-violet-500/30", hoverColor: "bg-violet-800/40 border border-violet-400/40" },
  { id: "phone_screen", title: "Phone Screen", color: "bg-fuchsia-900/30 border border-fuchsia-500/30", hoverColor: "bg-fuchsia-800/40 border border-fuchsia-400/40" },
  { id: "interview", title: "Interview", color: "bg-cyan-900/30 border border-cyan-500/30", hoverColor: "bg-cyan-800/40 border border-cyan-400/40" },
  { id: "offer", title: "Offer", color: "bg-emerald-900/30 border border-emerald-500/30", hoverColor: "bg-emerald-800/40 border border-emerald-400/40" },
  { id: "rejected", title: "Rejected", color: "bg-red-900/30 border border-red-500/30", hoverColor: "bg-red-800/40 border border-red-400/40" },
];

interface KanbanBoardProps {
  applications: Application[];
  onStatusChange: (id: string, status: string) => void;
  onCardClick: (id: string) => void;
}

function DraggableCard({
  app,
  onClick,
}: {
  app: Application;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: app.id,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        opacity: isDragging ? 0.5 : 1,
      }
    : undefined;

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <Card
        className="cursor-grab active:cursor-grabbing hover:shadow-md hover:shadow-purple-500/20 transition-shadow bg-slate-900 border border-purple-500/20"
        onClick={(e) => {
          // Only trigger click if not dragging
          if (!isDragging) {
            onClick();
          }
        }}
      >
        <CardContent className="p-3 space-y-1">
          <p className="font-medium text-sm line-clamp-1 text-white">{app.job_title}</p>
          <div className="flex items-center gap-1 text-xs text-purple-300">
            <Building2 className="h-3 w-3" />
            <span>{app.company}</span>
          </div>
          {app.applied_at && (
            <p className="text-xs text-purple-400">
              Applied {new Date(app.applied_at).toLocaleDateString()}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DroppableColumn({
  id,
  title,
  color,
  hoverColor,
  applications,
  isOver,
  onCardClick,
}: {
  id: string;
  title: string;
  color: string;
  hoverColor: string;
  applications: Application[];
  isOver: boolean;
  onCardClick: (id: string) => void;
}) {
  const { setNodeRef } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`flex-shrink-0 w-64 rounded-lg p-3 transition-colors ${isOver ? hoverColor : color}`}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm text-white">{title}</h3>
        <Badge variant="secondary" className="text-xs bg-purple-500/30 text-purple-200 border-0">
          {applications.length}
        </Badge>
      </div>
      <div className="space-y-2 min-h-[100px]">
        {applications.map((app) => (
          <DraggableCard
            key={app.id}
            app={app}
            onClick={() => onCardClick(app.id)}
          />
        ))}
      </div>
    </div>
  );
}

export function KanbanBoard({ applications, onStatusChange, onCardClick }: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

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

  const handleDragOver = (event: DragOverEvent) => {
    setOverId(event.over?.id as string | null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setOverId(null);

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
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map((col) => (
          <DroppableColumn
            key={col.id}
            id={col.id}
            title={col.title}
            color={col.color}
            hoverColor={col.hoverColor}
            applications={byStatus[col.id] || []}
            isOver={overId === col.id}
            onCardClick={onCardClick}
          />
        ))}
      </div>
      <DragOverlay>
        {activeApp ? (
          <Card className="w-60 shadow-lg shadow-purple-500/30 rotate-3 bg-slate-900 border border-fuchsia-500/50">
            <CardContent className="p-3">
              <p className="font-medium text-sm text-white">{activeApp.job_title}</p>
              <p className="text-xs text-purple-300">{activeApp.company}</p>
            </CardContent>
          </Card>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
