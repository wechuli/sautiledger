import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  KENYA_COUNTIES,
  MANDATE_CATEGORIES,
  MANDATE_STATUSES,
  SCOPE_LEVELS,
  URGENCY_LEVELS,
  findCounty,
  findConstituency,
  type MandateAggregateStats,
  type MandateSummary,
  type ScopeLevel,
} from "@sautiledger/shared";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ThumbsUp } from "lucide-react";
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

const CATEGORY_COLORS = [
  "#16806f",
  "#3b82f6",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#10b981",
  "#0891b2",
  "#db2777",
  "#65a30d",
  "#dc2626",
  "#7c3aed",
  "#a16207",
];

export function MandatesListPage() {
  const [params, setParams] = useSearchParams();
  const [items, setItems] = useState<MandateSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<MandateAggregateStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const page = Number(params.get("page") ?? 1);
  const scopeLevel = (params.get("scopeLevel") as ScopeLevel | "") || "";
  const county = params.get("county") ?? "";
  const constituency = params.get("constituency") ?? "";
  const ward = params.get("ward") ?? "";

  // Which boundary fields make sense for the chosen scope?
  // - national: hide all boundary filters
  // - county: only county
  // - constituency: county + constituency
  // - ward: county + constituency + ward
  const showCounty = scopeLevel !== "national" && scopeLevel !== "";
  const showConstituency =
    scopeLevel === "constituency" || scopeLevel === "ward";
  const showWard = scopeLevel === "ward";

  const constituencies = useMemo(
    () => (county ? (findCounty(county)?.constituencies ?? []) : []),
    [county],
  );
  const wards = useMemo(
    () =>
      county && constituency
        ? (findConstituency(county, constituency)?.wards ?? [])
        : [],
    [county, constituency],
  );

  // Filters that get sent to the API. Exclude boundary fields that the
  // current scope hides (e.g. don't send a stale county filter after
  // switching to "national").
  const apiFilters = useMemo(() => {
    return {
      category: (params.get("category") as any) || undefined,
      urgency: (params.get("urgency") as any) || undefined,
      status: (params.get("status") as any) || undefined,
      scopeLevel: scopeLevel || undefined,
      county: showCounty && county ? county : undefined,
      constituency:
        showConstituency && constituency ? constituency : undefined,
      ward: showWard && ward ? ward : undefined,
      q: params.get("q") || undefined,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.toString()]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.listMandates({
        ...apiFilters,
        sort: (params.get("sort") as any) || "recent",
        page,
        pageSize: 20,
      }),
      api.mandateStats(apiFilters),
    ])
      .then(([list, s]) => {
        setItems(list.items);
        setTotal(list.total);
        setStats(s);
      })
      .catch((e) => setError(e.message ?? "Failed to load mandates"))
      .finally(() => setLoading(false));
  }, [apiFilters, page, params]);

  function update(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);

    // Cascade: clear dependent boundary fields when a parent changes.
    if (key === "scopeLevel") {
      // Keep boundary fields only if still relevant for the new scope.
      if (value === "national") {
        next.delete("county");
        next.delete("constituency");
        next.delete("ward");
      } else if (value === "county") {
        next.delete("constituency");
        next.delete("ward");
      } else if (value === "constituency") {
        next.delete("ward");
      }
    }
    if (key === "county") {
      next.delete("constituency");
      next.delete("ward");
    }
    if (key === "constituency") {
      next.delete("ward");
    }

    next.delete("page");
    setParams(next, { replace: true });
  }

  function clearAll() {
    setParams(new URLSearchParams(), { replace: true });
  }

  const activeScopeLabel =
    scopeLevel === "ward"
      ? ward
        ? `${ward} Ward`
        : "All wards"
      : scopeLevel === "constituency"
        ? constituency
          ? `${constituency} Constituency`
          : "All constituencies"
        : scopeLevel === "county"
          ? county
            ? `${county} County`
            : "All counties"
          : scopeLevel === "national"
            ? "National"
            : "All scopes";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-bold">Community Mandates</h1>
        <p className="text-sm text-muted-foreground">
          Showing: <span className="font-medium">{activeScopeLabel}</span>
          {stats && ` · ${stats.total} mandates`}
        </p>
      </div>

      <Card>
        <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-4">
          <div>
            <Label>Search</Label>
            <Input
              placeholder="Search title or summary…"
              defaultValue={params.get("q") ?? ""}
              onBlur={(e) => update("q", e.target.value)}
            />
          </div>
          <div>
            <Label>Scope</Label>
            <Select
              value={scopeLevel}
              onChange={(e) => update("scopeLevel", e.target.value)}
            >
              <option value="">All scopes</option>
              {SCOPE_LEVELS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </div>
          {showCounty && (
            <div>
              <Label>County</Label>
              <Select
                value={county}
                onChange={(e) => update("county", e.target.value)}
              >
                <option value="">All counties</option>
                {KENYA_COUNTIES.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
          )}
          {showConstituency && (
            <div>
              <Label>Constituency</Label>
              <Select
                value={constituency}
                onChange={(e) => update("constituency", e.target.value)}
                disabled={!county}
              >
                <option value="">
                  {county ? "All constituencies" : "Pick a county first"}
                </option>
                {constituencies.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
          )}
          {showWard && (
            <div>
              <Label>Ward</Label>
              <Select
                value={ward}
                onChange={(e) => update("ward", e.target.value)}
                disabled={!constituency}
              >
                <option value="">
                  {constituency ? "All wards" : "Pick a constituency first"}
                </option>
                {wards.map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </Select>
            </div>
          )}
          <div>
            <Label>Category</Label>
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
          </div>
          <div>
            <Label>Urgency</Label>
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
          </div>
          <div>
            <Label>Status</Label>
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
          </div>
          <div>
            <Label>Sort</Label>
            <Select
              value={params.get("sort") ?? "recent"}
              onChange={(e) => update("sort", e.target.value)}
            >
              <option value="recent">Most recent</option>
              <option value="upvotes">Most upvoted</option>
              <option value="evidence">Strongest evidence</option>
              <option value="urgency">Most urgent</option>
            </Select>
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <Button variant="secondary" onClick={clearAll}>
            Clear filters
          </Button>
        </div>
      </Card>

      <FormError message={error} />

      {stats && stats.total > 0 && <StatsPanel stats={stats} />}

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
                    <Badge>{m.scopeLevel}</Badge>
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
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span>
                      {m.submissionCount} submission
                      {m.submissionCount === 1 ? "" : "s"} · evidence{" "}
                      {m.evidenceStrength.toFixed(2)} · {m.responsibleOffice}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <ThumbsUp className="h-3.5 w-3.5" />
                      {m.upvoteCount}
                    </span>
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

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
      {children}
    </label>
  );
}

function StatsPanel({ stats }: { stats: MandateAggregateStats }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader title="By category" subtitle="Within current filters." />
        <div className="h-56">
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={stats.byCategory}
                dataKey="count"
                nameKey="category"
                outerRadius={80}
                label
              >
                {stats.byCategory.map((_, i) => (
                  <Cell
                    key={i}
                    fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card>
        <CardHeader title="By urgency" subtitle="Within current filters." />
        <div className="h-56">
          <ResponsiveContainer>
            <BarChart data={stats.byUrgency}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="urgency" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card>
        <CardHeader title="By status" />
        <div className="h-56">
          <ResponsiveContainer>
            <BarChart data={stats.byStatus}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="status" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card>
        <CardHeader
          title={
            stats.byWard.length > 0
              ? "Top wards"
              : stats.byConstituency.length > 0
                ? "Top constituencies"
                : "Top counties"
          }
          subtitle="Where mandates concentrate within the current filters."
        />
        <div className="h-56">
          <ResponsiveContainer>
            <BarChart
              data={
                stats.byWard.length > 0
                  ? stats.byWard.map((r) => ({ name: r.ward, count: r.count }))
                  : stats.byConstituency.length > 0
                    ? stats.byConstituency.map((r) => ({
                        name: r.constituency,
                        count: r.count,
                      }))
                    : stats.byCounty.map((r) => ({
                        name: r.county,
                        count: r.count,
                      }))
              }
              layout="vertical"
              margin={{ left: 24 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" allowDecimals={false} />
              <YAxis dataKey="name" type="category" width={110} />
              <Tooltip />
              <Bar dataKey="count" fill="#16806f" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {stats.topUpvoted.length > 0 && (
        <Card className="lg:col-span-2">
          <CardHeader
            title="Most upvoted"
            subtitle="What citizens are backing within the current filters."
          />
          <ul className="divide-y divide-border">
            {stats.topUpvoted.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between gap-4 py-2"
              >
                <Link
                  to={`/mandates/${m.id}`}
                  className="flex-1 text-sm hover:underline"
                >
                  {m.title}
                </Link>
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary">
                  <ThumbsUp className="h-4 w-4" />
                  {m.upvoteCount}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
