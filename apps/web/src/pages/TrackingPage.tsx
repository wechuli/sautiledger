import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Link } from "react-router-dom";
import { Button } from "../components/button";
import { Badge, Card, CardHeader, FormError, Input, Label, statusTone } from "../components/ui";
import { api } from "../lib/api";

export function TrackingPage() {
  const { code: codeParam } = useParams<{ code?: string }>();
  const navigate = useNavigate();
  const [code, setCode] = useState(codeParam ?? "");
  const [result, setResult] = useState<Awaited<ReturnType<typeof api.tracking>> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (codeParam) void lookup(codeParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codeParam]);

  async function lookup(c: string) {
    setError(null);
    setBusy(true);
    try {
      const r = await api.tracking(c);
      setResult(r);
    } catch (err) {
      setResult(null);
      setError((err as Error).message ?? "Tracking lookup failed");
    } finally {
      setBusy(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code) return;
    navigate(`/tracking/${encodeURIComponent(code)}`, { replace: true });
    await lookup(code);
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="text-2xl font-bold">Track your submission</h1>
      <p className="text-sm text-muted-foreground">
        Use the anonymous tracking code you saved when you submitted. We never display your identity.
      </p>

      <form className="flex gap-2" onSubmit={onSubmit}>
        <Input
          placeholder="Tracking code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          required
        />
        <Button type="submit" disabled={busy}>
          {busy ? "Looking up…" : "Track"}
        </Button>
      </form>

      <FormError message={error} />

      {result && (
        <Card>
          <CardHeader title="Submission status" />
          <div className="flex flex-wrap items-center gap-2">
            <Badge>{result.processingStatus}</Badge>
            {result.urgency && <Badge>{result.urgency}</Badge>}
            {result.category && <Badge>{result.category}</Badge>}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Submitted {new Date(result.createdAt).toLocaleString()}
          </p>
          {result.mandate ? (
            <div className="mt-4 rounded-md border border-border bg-background p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Linked mandate</p>
              <p className="mt-1 font-medium">
                <Link to={`/mandates/${result.mandate.id}`} className="text-primary underline">
                  {result.mandate.title}
                </Link>
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <Badge tone={statusTone(result.mandate.status)}>
                  {result.mandate.status.replace(/_/g, " ")}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {result.mandate.submissionCount} total submission
                  {result.mandate.submissionCount === 1 ? "" : "s"}
                </span>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              Not yet linked to a mandate. Check back shortly.
            </p>
          )}
        </Card>
      )}
    </div>
  );
}
