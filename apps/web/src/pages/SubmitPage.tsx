import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Send } from "lucide-react";
import type { AuthoritySummary } from "@sautiledger/shared";
import { Button } from "../components/button";
import {
  Card,
  CardHeader,
  FormError,
  Input,
  Label,
  Select,
  Textarea,
} from "../components/ui";
import { api } from "../lib/api";

export function SubmitPage() {
  const [authorities, setAuthorities] = useState<AuthoritySummary[]>([]);
  const [county, setCounty] = useState("");
  const [ward, setWard] = useState("");
  const [constituency, setConstituency] = useState("");
  const [authorityId, setAuthorityId] = useState("");
  const [originalText, setOriginalText] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Awaited<
    ReturnType<typeof api.submit>
  > | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .authorities({ county: county || undefined })
      .then(setAuthorities)
      .catch((e) => setError(e.message ?? "Failed to load authorities"));
  }, [county]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const r = await api.submit({
        originalText,
        targetAuthorityId: authorityId,
        location: {
          county: county || undefined,
          constituency: constituency || undefined,
          ward: ward || undefined,
        },
        consentToProcess: true,
      });
      setResult(r);
    } catch (err) {
      setError((err as Error).message ?? "Submission failed");
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    return (
      <Card className="mx-auto max-w-xl">
        <CardHeader
          title="Submission received"
          subtitle="Keep your tracking code somewhere safe."
        />
        <div className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Tracking code
          </p>
          <p className="font-mono text-lg font-bold">{result.trackingCode}</p>
        </div>
        <p className="mt-3 text-sm">
          Status: <span className="font-medium">{result.processingStatus}</span>
        </p>
        {result.mandateTitle && (
          <p className="mt-1 text-sm">
            Linked to mandate:{" "}
            <Link
              to={`/mandates/${result.mandateId}`}
              className="text-primary underline"
            >
              {result.mandateTitle}
            </Link>{" "}
            ({result.mandateStatus})
          </p>
        )}
        <div className="mt-4 flex gap-2">
          <Link
            to={`/tracking/${result.trackingCode}`}
            className="inline-flex h-10 items-center rounded-md border border-border px-3 text-sm font-medium hover:bg-muted"
          >
            View status
          </Link>
          <Button onClick={() => setResult(null)}>Submit another</Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold">Submit a concern</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Your raw text stays internal. Public pages only show anonymized mandate
        summaries.
      </p>

      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <Label htmlFor="county">County</Label>
            <Input
              id="county"
              value={county}
              onChange={(e) => setCounty(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="constituency">Constituency</Label>
            <Input
              id="constituency"
              value={constituency}
              onChange={(e) => setConstituency(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="ward">Ward</Label>
            <Input
              id="ward"
              value={ward}
              onChange={(e) => setWard(e.target.value)}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="authority">Responsible authority / institution</Label>
          <Select
            id="authority"
            value={authorityId}
            onChange={(e) => setAuthorityId(e.target.value)}
            required
          >
            <option value="">Choose an authority…</option>
            {authorities.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.level}
                {a.county ? `, ${a.county}` : ""})
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label htmlFor="concern">Concern</Label>
          <Textarea
            id="concern"
            className="min-h-36"
            value={originalText}
            onChange={(e) => setOriginalText(e.target.value)}
            placeholder="Example: Huku maji imekuwa shida for weeks. Borehole iko dead na chief anasema tu ngoja."
            minLength={10}
            maxLength={5000}
            required
          />
        </div>

        <div className="flex items-start gap-2 rounded-md bg-muted p-3 text-sm text-muted-foreground">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          Avoid names, phone numbers, exact GPS, or details that could identify
          someone.
        </div>

        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            required
          />
          <span>
            I understand my concern will be anonymized, summarized by AI, and
            may be clustered with similar concerns into a public Community
            Mandate.
          </span>
        </label>

        <FormError message={error} />

        <Button
          className="w-full gap-2"
          type="submit"
          disabled={busy || !consent}
        >
          <Send className="h-4 w-4" />
          {busy ? "Submitting…" : "Submit concern"}
        </Button>
      </form>
    </div>
  );
}
