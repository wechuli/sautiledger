import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { CitizenSubmissionView } from "@sautiledger/shared";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import {
  Badge,
  Card,
  CardHeader,
  FormError,
  statusTone,
  urgencyTone,
} from "../components/ui";

export function MyPage() {
  const { citizen, loading } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<CitizenSubmissionView[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!citizen) {
      navigate("/login");
      return;
    }
    api
      .mySubmissions()
      .then(setItems)
      .catch((e) => setError(e.message ?? "Failed to load submissions"));
  }, [citizen, loading, navigate]);

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">My submissions</h1>
      <FormError message={error} />
      {items.length === 0 ? (
        <Card>
          <p className="text-sm text-muted-foreground">
            You haven't submitted any concerns yet.{" "}
            <Link to="/submit" className="text-primary underline">
              Submit your first
            </Link>
            .
          </p>
        </Card>
      ) : (
        <ul className="space-y-3">
          {items.map((s) => (
            <li key={s.trackingCode}>
              <Card>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs">{s.trackingCode}</span>
                  <Badge>{s.processingStatus}</Badge>
                  {s.urgency && (
                    <Badge tone={urgencyTone(s.urgency)}>{s.urgency}</Badge>
                  )}
                  {s.category && <Badge>{s.category}</Badge>}
                  {s.mandateStatus && (
                    <Badge tone={statusTone(s.mandateStatus)}>
                      {s.mandateStatus}
                    </Badge>
                  )}
                </div>
                {s.mandateId && s.mandateTitle && (
                  <p className="mt-2 text-sm">
                    Mandate:{" "}
                    <Link
                      to={`/mandates/${s.mandateId}`}
                      className="text-primary underline"
                    >
                      {s.mandateTitle}
                    </Link>
                  </p>
                )}
                {s.targetAuthority && (
                  <p className="text-xs text-muted-foreground">
                    Routed to {s.targetAuthority.name} (
                    {s.targetAuthority.level})
                  </p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(s.createdAt).toLocaleString()}
                </p>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
