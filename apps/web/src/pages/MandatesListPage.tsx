import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  KENYA_COUNTIES,
  MANDATE_CATEGORIES,
  MANDATE_STATUSES,
  URGENCY_LEVELS,
} from "@sautiledger/shared";
import type { MandateSummary } from "@sautiledger/shared";
import { api } from "../lib/api";
import {
  Badge,
  Card,
  CardHeader,
  FormError,
  Input,
  Select,
  statusTone,
  urgencyTone,
} from "../components/ui";
import { Button } from "../components/button";

export function MandatesListPage() {
  const [params, setParams] = useSearchParams();
  const [items, setItems] = useState<MandateSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const page = Number(params.get("page") ?? 1);

  useEffect(() => {
    setLoading(true);
    api
      .listMandates({
        category: (params.get("category") as any) || undefined,
        urgency: (params.get("urgency") as any) || undefined,
        status: (params.get("status") as any) || undefined,
        county: params.get("county") || undefined,
        q: params.get("q") || undefined,
        sort: (params.get("sort") as any) || "recent",
        page,
        pageSize: 20,
      })
      .then((res) => {
        setItems(res.items);
        setTotal(res.total);
      })
      .catch((e) => setError(e.message ?? "Failed to load mandates"))
      .finally(() => setLoading(false));
  }, [params, page]);

  function update(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    setParams(next, { replace: true });
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Community Mandates</h1>

      <Card>
        <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
          <Input
            placeholder="Search…"
            defaultValue={params.get("q") ?? ""}
            onBlur={(e) => update("q", e.target.value)}
          />
          <Select
            value={params.get("category") ?? ""}
            onChange={(e) => update("category", e.target.value)}
          >
            <option value="">All categories</option>
            {MANDATE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
          <Select
            value={params.get("urgency") ?? ""}
            onChange={(e) => update("urgency", e.target.value)}
          >
            <option value="">All urgencies</option>
            {URGENCY_LEVELS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </Select>
          <Select
            value={params.get("status") ?? ""}
            onChange={(e) => update("status", e.target.value)}
          >
            <option value="">All statuses</option>
            {MANDATE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
          <Select
            value={params.get("county") ?? ""}
            onChange={(e) => update("county", e.target.value)}
          >
            <option value="">All counties</option>
            {KENYA_COUNTIES.map((c) => (
              <option key={c.name} value={c.name}>
                {c.name}
              </option>
            ))}
          </Select>
          <Select
            value={params.get("sort") ?? "recent"}
            onChange={(e) => update("sort", e.target.value)}
          >
            <option value="recent">Most recent</option>
            <option value="evidence">Strongest evidence</option>
            <option value="urgency">Most urgent</option>
          </Select>
        </div>
      </Card>

      <FormError message={error} />

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : items.length === 0 ? (
        <Card>
          <p className="text-sm text-muted-foreground">
            No mandates match these filters.
          </p>
        </Card>
      ) : (
        <ul className="space-y-3">
          {items.map((m) => (
            <li key={m.id}>
              <Card>
                <Link
                  to={`/mandates/${m.id}`}
                  className="block hover:underline"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{m.title}</span>
                    <Badge tone={urgencyTone(m.urgency)}>{m.urgency}</Badge>
                    <Badge tone={statusTone(m.status)}>
                      {m.status.replace(/_/g, " ")}
                    </Badge>
                    <Badge>{m.category}</Badge>
                    {m.county && (
                      <span className="text-xs text-muted-foreground">
                        {m.county}
                      </span>
                    )}
                    {m.ward && (
                      <span className="text-xs text-muted-foreground">
                        · {m.ward}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                    {m.summary}
                  </p>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {m.submissionCount} submission
                    {m.submissionCount === 1 ? "" : "s"} · evidence{" "}
                    {m.evidenceStrength.toFixed(2)} · {m.responsibleOffice}
                  </div>
                </Link>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {total > 20 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} of {total}
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              disabled={page <= 1}
              onClick={() => {
                const next = new URLSearchParams(params);
                next.set("page", String(page - 1));
                setParams(next);
              }}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              disabled={page * 20 >= total}
              onClick={() => {
                const next = new URLSearchParams(params);
                next.set("page", String(page + 1));
                setParams(next);
              }}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
