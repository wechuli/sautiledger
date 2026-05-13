import { useEffect, useState } from "react";
import { MANDATE_STATUSES } from "@sautiledger/shared";
import type { MandateStatus, MandateSummary } from "@sautiledger/shared";
import { Button } from "../components/button";
import {
  Badge,
  Card,
  CardHeader,
  FormError,
  Input,
  Label,
  Select,
  Textarea,
  statusTone,
  urgencyTone
} from "../components/ui";
import { api } from "../lib/api";

const KEY_STORAGE = "sl_institution_key";

export function InstitutionPage() {
  const [key, setKey] = useState<string>(() => localStorage.getItem(KEY_STORAGE) ?? "");
  const [items, setItems] = useState<MandateSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<MandateSummary | null>(null);

  useEffect(() => {
    api
      .listMandates({ sort: "urgency", pageSize: 30 })
      .then((r) => setItems(r.items))
      .catch((e) => setError(e.message));
  }, []);

  function saveKey() {
    localStorage.setItem(KEY_STORAGE, key);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Institution console</h1>
      <p className="text-sm text-muted-foreground">
        Demo institution access — paste your institution key, then acknowledge mandates and post responses.
      </p>

      <Card>
        <Label htmlFor="key">Institution key</Label>
        <div className="flex gap-2">
          <Input
            id="key"
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="From INSTITUTION_DEMO_KEY"
          />
          <Button onClick={saveKey} variant="secondary">
            Save
          </Button>
        </div>
      </Card>

      <FormError message={error} />

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <Card>
          <CardHeader title="Open mandates" subtitle="Sorted by urgency." />
          <ul className="space-y-2 max-h-[60vh] overflow-y-auto">
            {items.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => setSelected(m)}
                  className={`w-full rounded-md border border-border p-3 text-left hover:bg-muted ${
                    selected?.id === m.id ? "bg-muted" : ""
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{m.title}</span>
                    <Badge tone={urgencyTone(m.urgency)}>{m.urgency}</Badge>
                    <Badge tone={statusTone(m.status)}>{m.status.replace(/_/g, " ")}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {m.county ?? "—"} · {m.submissionCount} submission{m.submissionCount === 1 ? "" : "s"}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        </Card>

        {selected ? (
          <ResponsePanel
            mandate={selected}
            institutionKey={key}
            onUpdated={(updated) => {
              setSelected(updated);
              setItems((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
            }}
          />
        ) : (
          <Card>
            <p className="text-sm text-muted-foreground">Select a mandate to respond.</p>
          </Card>
        )}
      </div>
    </div>
  );
}

function ResponsePanel({
  mandate,
  institutionKey,
  onUpdated
}: {
  mandate: MandateSummary;
  institutionKey: string;
  onUpdated: (m: MandateSummary) => void;
}) {
  const [responderLabel, setResponderLabel] = useState("");
  const [responseText, setResponseText] = useState("");
  const [newStatus, setNewStatus] = useState<MandateStatus | "">("");
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!institutionKey) {
      setError("Set an institution key first.");
      return;
    }
    setError(null);
    setOkMsg(null);
    setBusy(true);
    try {
      await api.postResponse(mandate.id, institutionKey, {
        responderLabel,
        responseText,
        newStatus: newStatus || undefined
      });
      setOkMsg("Response posted.");
      // Refresh mandate summary
      const fresh = await api.mandate(mandate.id);
      onUpdated({
        ...mandate,
        status: fresh.status,
        lastActivityAt: fresh.lastActivityAt
      });
      setResponseText("");
      setNewStatus("");
    } catch (err) {
      setError((err as Error).message ?? "Failed to post response");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader title={mandate.title} subtitle={mandate.summary} />
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={urgencyTone(mandate.urgency)}>{mandate.urgency}</Badge>
        <Badge tone={statusTone(mandate.status)}>{mandate.status.replace(/_/g, " ")}</Badge>
        <Badge>{mandate.category}</Badge>
      </div>

      <form className="mt-4 space-y-3" onSubmit={onSubmit}>
        <div>
          <Label htmlFor="rl">Responder label</Label>
          <Input
            id="rl"
            value={responderLabel}
            onChange={(e) => setResponderLabel(e.target.value)}
            placeholder="e.g. County Water Office"
            required
          />
        </div>
        <div>
          <Label htmlFor="rt">Response</Label>
          <Textarea
            id="rt"
            className="min-h-28"
            value={responseText}
            onChange={(e) => setResponseText(e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="ns">Update status (optional)</Label>
          <Select
            id="ns"
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value as MandateStatus | "")}
          >
            <option value="">No change</option>
            {MANDATE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </div>

        <FormError message={error} />
        {okMsg && (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {okMsg}
          </div>
        )}
        <Button type="submit" disabled={busy}>
          {busy ? "Posting…" : "Post response"}
        </Button>
      </form>
    </Card>
  );
}
