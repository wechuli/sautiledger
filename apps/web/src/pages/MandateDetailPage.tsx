import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ThumbsUp } from "lucide-react";
import type { MandateDetail } from "@sautiledger/shared";
import { api, getAuthToken } from "../lib/api";
import { Button } from "../components/button";
import {
  Badge,
  Card,
  CardHeader,
  FormError,
  statusTone,
  urgencyTone,
} from "../components/ui";

export function MandateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [mandate, setMandate] = useState<MandateDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [upvoteBusy, setUpvoteBusy] = useState(false);
  const isLoggedIn = !!getAuthToken();

  useEffect(() => {
    if (!id) return;
    api
      .mandate(id)
      .then(setMandate)
      .catch((e) => setError(e.message ?? "Failed to load mandate"));
  }, [id]);

  async function onToggleUpvote() {
    if (!id || !mandate || upvoteBusy) return;
    setUpvoteBusy(true);
    try {
      const r = await api.toggleUpvote(id);
      setMandate({
        ...mandate,
        youUpvoted: r.youUpvoted,
        upvoteCount: r.upvoteCount,
      });
    } catch (e) {
      setError((e as Error).message ?? "Failed to update upvote");
    } finally {
      setUpvoteBusy(false);
    }
  }

  if (error) return <FormError message={error} />;
  if (!mandate)
    return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-4">
      <Link to="/mandates" className="text-sm text-primary underline">
        ← All mandates
      </Link>

      <Card>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={urgencyTone(mandate.urgency)}>{mandate.urgency}</Badge>
          <Badge tone={statusTone(mandate.status)}>
            {mandate.status.replace(/_/g, " ")}
          </Badge>
          <Badge>{mandate.category}</Badge>
          {mandate.county && (
            <span className="text-xs text-muted-foreground">
              {mandate.county}
            </span>
          )}
          {mandate.constituency && (
            <span className="text-xs text-muted-foreground">
              · {mandate.constituency}
            </span>
          )}
          {mandate.ward && (
            <span className="text-xs text-muted-foreground">
              · {mandate.ward}
            </span>
          )}
        </div>
        <h1 className="mt-2 text-2xl font-bold">{mandate.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{mandate.summary}</p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button
            variant={mandate.youUpvoted ? "primary" : "secondary"}
            onClick={onToggleUpvote}
            disabled={!isLoggedIn || upvoteBusy}
            className="gap-2"
            title={isLoggedIn ? "Toggle upvote" : "Sign in to upvote"}
          >
            <ThumbsUp className="h-4 w-4" />
            {mandate.youUpvoted ? "Upvoted" : "Upvote"}
            <span className="ml-1 rounded bg-background/20 px-1.5 text-xs font-semibold">
              {mandate.upvoteCount}
            </span>
          </Button>
          {!isLoggedIn && (
            <span className="text-xs text-muted-foreground">
              <Link to="/login" className="text-primary underline">
                Sign in
              </Link>{" "}
              to upvote.
            </span>
          )}
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3 text-sm">
          <Stat label="Submissions" value={String(mandate.submissionCount)} />
          <Stat
            label="Evidence strength"
            value={mandate.evidenceStrength.toFixed(2)}
          />
          <Stat
            label={`Responsible (${mandate.scopeLevel})`}
            value={mandate.responsibleOffice}
          />
        </div>

        <div className="mt-4">
          <CardHeader
            title="Formal mandate"
            subtitle="AI-drafted; reviewable by institutions."
          />
          <p className="whitespace-pre-line text-sm">
            {mandate.formalMandateText}
          </p>
        </div>
      </Card>

      <Card>
        <CardHeader title="Institution responses" />
        {mandate.responses.length === 0 ? (
          <p className="text-sm text-muted-foreground">No response yet.</p>
        ) : (
          <ul className="space-y-3">
            {mandate.responses.map((r) => (
              <li key={r.id} className="rounded-md border border-border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{r.responderLabel}</span>
                  {r.newStatus && (
                    <Badge tone={statusTone(r.newStatus)}>
                      {r.newStatus.replace(/_/g, " ")}
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {new Date(r.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="mt-2 text-sm whitespace-pre-line">
                  {r.responseText}
                </p>
                {r.expectedResolutionDate && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Expected resolution:{" "}
                    {new Date(r.expectedResolutionDate).toLocaleDateString()}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <CardHeader title="Status history" />
        {mandate.statusHistory.length === 0 ? (
          <p className="text-sm text-muted-foreground">No changes recorded.</p>
        ) : (
          <ol className="space-y-2 text-sm">
            {mandate.statusHistory.map((h) => (
              <li key={h.id} className="flex flex-wrap items-baseline gap-2">
                <span className="text-xs text-muted-foreground">
                  {new Date(h.createdAt).toLocaleString()}
                </span>
                <Badge tone={statusTone(h.newStatus)}>
                  {h.newStatus.replace(/_/g, " ")}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  by {h.changedByLabel}
                </span>
                {h.note && (
                  <span className="text-muted-foreground">— {h.note}</span>
                )}
              </li>
            ))}
          </ol>
        )}
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="text-base font-semibold">{value}</p>
    </div>
  );
}
