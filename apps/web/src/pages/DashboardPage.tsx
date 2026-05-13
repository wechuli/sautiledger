import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  CheckCircle2,
  Landmark,
  ListChecks,
} from "lucide-react";
import type { DashboardStats } from "@sautiledger/shared";
import { api } from "../lib/api";
import {
  Badge,
  Card,
  CardHeader,
  FormError,
  statusTone,
  urgencyTone,
} from "../components/ui";

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

export function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recent, setRecent] = useState<
    Awaited<ReturnType<typeof api.listMandates>>["items"]
  >([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.dashboardStats(),
      api.listMandates({ pageSize: 6, sort: "recent" }),
    ])
      .then(([s, m]) => {
        setStats(s);
        setRecent(m.items);
      })
      .catch((e) => setError(e.message ?? "Failed to load dashboard"));
  }, []);

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-border bg-card px-5 py-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">
          SautiLedger
        </p>
        <h1 className="mt-1 max-w-3xl text-3xl font-bold md:text-4xl">
          Community concerns into verifiable civic mandates.
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Anonymized submissions, aggregate dashboards, and institution response
          tracking — built for Kenya-first public participation.
        </p>
      </section>

      <FormError message={error} />

      {stats && (
        <>
          <section className="grid gap-4 md:grid-cols-4">
            <Metric
              icon={<ListChecks />}
              label="Community Mandates"
              value={String(stats.totals.mandates)}
            />
            <Metric
              icon={<Landmark />}
              label="Authorities"
              value={String(stats.totals.authorities)}
            />
            <Metric
              icon={<CheckCircle2 />}
              label="Acknowledged"
              value={`${stats.totals.acknowledgedPct}%`}
            />
            <Metric
              icon={<AlertTriangle />}
              label="Resolved"
              value={`${stats.totals.resolvedPct}%`}
            />
          </section>

          <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <Card>
              <CardHeader
                title="New mandates (30 days)"
                subtitle="Aggregate civic trend."
              />
              <div className="h-64">
                <ResponsiveContainer>
                  <LineChart data={stats.trend30d}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#16806f"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card>
              <CardHeader
                title="Top counties"
                subtitle="Where mandates are concentrated."
              />
              <div className="h-64">
                <ResponsiveContainer>
                  <BarChart
                    data={stats.byCounty}
                    layout="vertical"
                    margin={{ left: 24 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" allowDecimals={false} />
                    <YAxis dataKey="county" type="category" width={90} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#16806f" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader title="By category" />
              <div className="h-64">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={stats.byCategory}
                      dataKey="count"
                      nameKey="category"
                      outerRadius={90}
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
              <CardHeader title="By urgency" />
              <div className="h-64">
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
          </section>

          {stats.topResponsiveness.length > 0 && (
            <Card>
              <CardHeader
                title="Top responsiveness"
                subtitle="Acknowledgement, resolution, and response speed — not a partisan ranking."
              />
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-muted-foreground">
                    <tr className="border-b border-border">
                      <th className="py-2">Authority</th>
                      <th className="py-2">Mandates</th>
                      <th className="py-2">Acknowledged</th>
                      <th className="py-2">Resolved</th>
                      <th className="py-2">Index</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.topResponsiveness.map((row) => (
                      <tr
                        key={row.authority.id}
                        className="border-b border-border last:border-0"
                      >
                        <td className="py-2 font-medium">
                          {row.authority.name}
                          <span className="ml-2 text-xs text-muted-foreground">
                            {row.authority.level}
                          </span>
                        </td>
                        <td className="py-2">{row.assigned}</td>
                        <td className="py-2">{row.acknowledged}</td>
                        <td className="py-2">{row.resolved}</td>
                        <td className="py-2">
                          <Badge tone="primary">
                            {row.responsivenessIndex.toFixed(2)}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}

      <Card>
        <CardHeader
          title="Recent mandates"
          subtitle="Aggregate public view; raw submissions stay private."
        />
        {recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">No mandates yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {recent.map((m) => (
              <li key={m.id} className="py-3">
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
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                    {m.summary}
                  </p>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {m.submissionCount} submission
                    {m.submissionCount === 1 ? "" : "s"} · evidence{" "}
                    {m.evidenceStrength.toFixed(2)}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-md bg-primary/10 text-primary">
          {icon}
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </div>
    </Card>
  );
}
