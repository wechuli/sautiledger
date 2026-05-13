import React from "react";
import ReactDOM from "react-dom/client";
import { AlertTriangle, BarChart3, CheckCircle2, Landmark, Send } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { Button } from "./components/button";
import "./index.css";

const mandateData = [
  { county: "Nairobi", mandates: 18 },
  { county: "Kisumu", mandates: 12 },
  { county: "Mombasa", mandates: 9 },
  { county: "Nakuru", mandates: 7 }
];

function App() {
  return (
    <main className="min-h-screen">
      <section className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">SautiLedger MVP</p>
            <h1 className="mt-2 max-w-3xl text-3xl font-bold md:text-5xl">
              Community concerns into verifiable civic mandates.
            </h1>
            <p className="mt-3 max-w-2xl text-base text-muted-foreground">
              A Kenya-first public participation workflow with anonymized submissions, aggregate dashboards,
              and institution response tracking.
            </p>
          </div>
          <Button className="w-full gap-2 md:w-auto">
            <Send className="h-4 w-4" />
            Submit concern
          </Button>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-4 py-6 md:grid-cols-3">
        <Metric icon={<BarChart3 />} label="Community Mandates" value="46" />
        <Metric icon={<Landmark />} label="Authorities Routed" value="11" />
        <Metric icon={<CheckCircle2 />} label="Acknowledged" value="62%" />
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 pb-10 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Mandates by county</h2>
              <p className="text-sm text-muted-foreground">Aggregate public view only.</p>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mandateData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="county" />
                <YAxis allowDecimals={false} />
                <Bar dataKey="mandates" fill="#16806f" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <form className="rounded-lg border border-border bg-card p-4">
          <h2 className="text-lg font-semibold">Low-bandwidth submission</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Raw text stays internal. Public pages show anonymized mandate summaries.
          </p>
          <label className="mt-4 block text-sm font-medium" htmlFor="concern">
            Concern
          </label>
          <textarea
            id="concern"
            className="mt-2 min-h-36 w-full rounded-md border border-border bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-primary"
            placeholder="Example: Water has been missing in our ward for several days..."
          />
          <div className="mt-4 flex items-start gap-2 rounded-md bg-muted p-3 text-sm text-muted-foreground">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            Avoid names, phone numbers, exact GPS points, or details that could identify someone.
          </div>
          <Button className="mt-4 w-full gap-2" type="button">
            <Send className="h-4 w-4" />
            Create tracking code
          </Button>
        </form>
      </section>
    </main>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-md bg-primary/10 text-primary">
          {React.cloneElement(icon as React.ReactElement, { className: "h-5 w-5" })}
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
