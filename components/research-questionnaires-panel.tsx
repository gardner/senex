"use client";

import { useEffect, useState } from "react";

import { QuestionnaireForm } from "@/components/questionnaires/questionnaire-form";
import {
  DEMOGRAPHICS_QUESTIONNAIRE,
  P0_RESEARCH_PROFILE_QUESTIONNAIRES,
  SESSION_CONTEXT_QUESTIONNAIRE,
  buildResearchProfileCompletionState,
  buildSessionContextQualityFlags,
  type ResearchProfileCompletionState,
} from "@/lib/questionnaires";
import {
  listLocalSessions,
  listQuestionnaireAnswers,
  updateLocalSessionContext,
  type QuestionnaireAnswerRecord,
} from "@/lib/local";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";

type Status = "idle" | "working" | "error";
type PanelSnapshot = {
  completion: ResearchProfileCompletionState;
  latestSessionId: string | null;
};

export function ResearchQuestionnairesPanel() {
  const [completion, setCompletion] =
    useState<ResearchProfileCompletionState | null>(null);
  const [latestSessionId, setLatestSessionId] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const disabled = status === "working";

  async function refresh() {
    applySnapshot(await readQuestionnairePanelSnapshot());
  }

  function applySnapshot(snapshot: PanelSnapshot) {
    setCompletion(snapshot.completion);
    setLatestSessionId(snapshot.latestSessionId);
  }

  async function handleDemographicsSaved() {
    await afterSave("Demographics saved locally.");
  }

  async function handleSessionContextSaved(
    answers: QuestionnaireAnswerRecord[],
  ) {
    await withStatus(async () => {
      const sessions = await listLocalSessions();
      const session = sessions.at(-1);
      if (session) {
        await updateLocalSessionContext(session.sessionId, {
          contextSnapshot: {
            ...session.contextSnapshot,
            session_context_v1: Object.fromEntries(
              answers.map((answer) => [answer.questionId, answer.answerValue]),
            ),
          },
          qualityFlags: buildSessionContextQualityFlags(answers),
        });
      }
      await refresh();
      notifyUpdated();
      setMessage("Session context saved locally.");
    });
  }

  async function afterSave(nextMessage: string) {
    await withStatus(async () => {
      await refresh();
      notifyUpdated();
      setMessage(nextMessage);
    });
  }

  async function withStatus(action: () => Promise<void>) {
    try {
      setStatus("working");
      setMessage(null);
      await action();
      setStatus("idle");
    } catch (caught) {
      setStatus("error");
      setMessage(caught instanceof Error ? caught.message : String(caught));
    }
  }

  useEffect(() => {
    let cancelled = false;
    void readQuestionnairePanelSnapshot()
      .then((snapshot) => {
        if (!cancelled) applySnapshot(snapshot);
      })
      .catch((caught: unknown) => {
        if (cancelled) return;
        setStatus("error");
        setMessage(caught instanceof Error ? caught.message : String(caught));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2">Research questionnaires</CardTitle>
        <CardDescription>
          Optional research context stays local until consented reporting
          includes it.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 text-sm">
        <CompletionSummary completion={completion} />
        <QuestionnaireForm
          questionnaire={DEMOGRAPHICS_QUESTIONNAIRE}
          sessionId={null}
          sourceScreen="research_questionnaires"
          submitLabel="Save demographics"
          disabled={disabled}
          onSaved={() => void handleDemographicsSaved()}
        />
        <QuestionnaireForm
          questionnaire={SESSION_CONTEXT_QUESTIONNAIRE}
          sessionId={latestSessionId}
          sourceScreen="session_context"
          submitLabel="Save session context"
          disabled={disabled}
          resolveSessionId={latestSessionIdFromStorage}
          onSaved={(answers) => void handleSessionContextSaved(answers)}
        />
        {message && (
          <p
            className={
              status === "error" ? "text-destructive" : "text-muted-foreground"
            }
          >
            {message}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function CompletionSummary({
  completion,
}: {
  completion: ResearchProfileCompletionState | null;
}) {
  if (!completion) return <p>Checking questionnaire completion...</p>;
  return (
    <div className="grid gap-2 md:grid-cols-3">
      {Object.values(completion.sections).map((section) => (
        <div
          key={section.questionnaireId}
          className="border-input rounded-md border px-3 py-2"
        >
          <p>
            {section.title}: {section.status.replaceAll("_", " ")}
          </p>
        </div>
      ))}
    </div>
  );
}

function notifyUpdated() {
  window.dispatchEvent(new Event("senex-questionnaires-updated"));
}

async function latestSessionIdFromStorage() {
  const sessions = await listLocalSessions();
  return sessions.at(-1)?.sessionId ?? null;
}

async function readQuestionnairePanelSnapshot(): Promise<PanelSnapshot> {
  const [answers, sessions] = await Promise.all([
    listQuestionnaireAnswers({}),
    listLocalSessions(),
  ]);
  return {
    completion: buildResearchProfileCompletionState({
      questionnaires: P0_RESEARCH_PROFILE_QUESTIONNAIRES,
      answers,
    }),
    latestSessionId: sessions.at(-1)?.sessionId ?? null,
  };
}
