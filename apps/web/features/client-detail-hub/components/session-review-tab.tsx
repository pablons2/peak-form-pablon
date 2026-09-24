"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2, Clock, X } from "lucide-react";
import type { PublicSessionExecution } from "@/features/client-training-execution/api-client";
import { SessionExerciseReview } from "@/features/client-training-execution/components/session-exercise-review";

const SESSION_STATUS_LABELS: Record<string, string> = {
  SCHEDULED: "Agendado",
  COMPLETED: "Concluído",
  MISSED: "Perdido",
  CANCELLED: "Cancelado",
};

const SESSION_STATUS_ICONS: Record<string, React.ReactNode> = {
  SCHEDULED: <Clock className="h-4 w-4" />,
  COMPLETED: <CheckCircle2 className="h-4 w-4" />,
  MISSED: <AlertCircle className="h-4 w-4" />,
  CANCELLED: <X className="h-4 w-4" />,
};

const SESSION_STATUS_COLORS: Record<string, string> = {
  SCHEDULED: "text-muted-foreground",
  COMPLETED: "text-success",
  MISSED: "text-destructive",
  CANCELLED: "text-muted-foreground",
};

export function SessionReviewTab({
  sessions,
  exercises = new Map(),
}: {
  sessions: PublicSessionExecution[];
  exercises?: Map<string, any>;
}) {
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(
    sessions.length > 0 ? (sessions[0]?.id ?? null) : null
  );

  if (sessions.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">Nenhuma sessão de treino registrada ainda.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Sessions List */}
      <div className="space-y-2">
        {sessions.map((session) => (
          <button
            key={session.id}
            onClick={() =>
              setExpandedSessionId(expandedSessionId === session.id ? null : session.id)
            }
            className={`w-full text-left rounded-lg border transition-colors p-4 ${
              expandedSessionId === session.id
                ? "border-primary bg-primary/5"
                : "border-border bg-card hover:bg-muted"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={SESSION_STATUS_COLORS[session.status]}>
                  {SESSION_STATUS_ICONS[session.status]}
                </div>
                <div className="text-left">
                  <p className="font-medium text-foreground">
                    {new Date(session.date).toLocaleDateString("pt-BR", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {SESSION_STATUS_LABELS[session.status]} • {session.exercises.length} exercício
                    {session.exercises.length !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              <div
                className={`text-muted-foreground transition-transform ${
                  expandedSessionId === session.id ? "rotate-180" : ""
                }`}
              >
                ▼
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Session Details */}
      {expandedSessionId && (
        <div className="mt-6 space-y-4 pt-4 border-t border-border">
          {sessions
            .filter((s) => s.id === expandedSessionId)
            .map((session) => (
              <div key={session.id} className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className={SESSION_STATUS_COLORS[session.status]}>
                    {SESSION_STATUS_ICONS[session.status]}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">
                      {new Date(session.date).toLocaleDateString("pt-BR", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {SESSION_STATUS_LABELS[session.status]}
                    </p>
                  </div>
                </div>

                {/* Exercises in Session */}
                <div className="space-y-4">
                  {session.exercises.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum exercício nesta sessão.</p>
                  ) : (
                    session.exercises.map((exercise) => (
                      <SessionExerciseReview
                        key={exercise.id}
                        exercise={exercise}
                        exerciseDetails={exercises.get(exercise.exerciseId)}
                      />
                    ))
                  )}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
