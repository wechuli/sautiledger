import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { Landmark, LogOut, Menu, Send } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../lib/auth";
import { cn } from "../lib/utils";

const navItems = [
  { to: "/", label: "Dashboard" },
  { to: "/mandates", label: "Mandates" },
  { to: "/tracking", label: "Track" },
  { to: "/institution", label: "Institution" }
];

export function Layout() {
  const { citizen, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Link to="/" className="flex items-center gap-2 font-bold">
            <Landmark className="h-5 w-5 text-primary" />
            SautiLedger
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  cn(
                    "px-3 py-1.5 rounded-md text-sm font-medium",
                    isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-2">
            {citizen ? (
              <>
                <button
                  type="button"
                  onClick={() => navigate("/submit")}
                  className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  <Send className="h-4 w-4" />
                  Submit
                </button>
                <NavLink
                  to="/me"
                  className="rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium hover:bg-muted"
                >
                  My submissions
                </NavLink>
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    navigate("/");
                  }}
                  className="inline-flex h-9 items-center gap-1 rounded-md border border-border bg-card px-3 text-sm font-medium hover:bg-muted"
                  aria-label="Log out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </>
            ) : (
              <>
                <NavLink
                  to="/login"
                  className="rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium hover:bg-muted"
                >
                  Log in
                </NavLink>
                <NavLink
                  to="/register"
                  className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  Register
                </NavLink>
              </>
            )}
          </div>

          <button
            type="button"
            className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-md border border-border"
            onClick={() => setOpen((s) => !s)}
            aria-label="Toggle menu"
          >
            <Menu className="h-4 w-4" />
          </button>
        </div>

        {open && (
          <div className="md:hidden border-t border-border">
            <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/"}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      "rounded-md px-3 py-2 text-sm font-medium",
                      isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
                    )
                  }
                >
                  {item.label}
                </NavLink>
              ))}
              {citizen ? (
                <>
                  <NavLink
                    to="/submit"
                    onClick={() => setOpen(false)}
                    className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
                  >
                    Submit
                  </NavLink>
                  <NavLink
                    to="/me"
                    onClick={() => setOpen(false)}
                    className="rounded-md border border-border px-3 py-2 text-sm font-medium"
                  >
                    My submissions
                  </NavLink>
                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      setOpen(false);
                      navigate("/");
                    }}
                    className="rounded-md border border-border px-3 py-2 text-left text-sm font-medium"
                  >
                    Log out
                  </button>
                </>
              ) : (
                <>
                  <NavLink
                    to="/login"
                    onClick={() => setOpen(false)}
                    className="rounded-md border border-border px-3 py-2 text-sm font-medium"
                  >
                    Log in
                  </NavLink>
                  <NavLink
                    to="/register"
                    onClick={() => setOpen(false)}
                    className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
                  >
                    Register
                  </NavLink>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-6">
        <Outlet />
      </main>

      <footer className="border-t border-border bg-card">
        <div className="mx-auto max-w-6xl px-4 py-4 text-xs text-muted-foreground">
          SautiLedger MVP — anonymized civic accountability for Kenya. Names, phone numbers, and exact
          locations are never displayed publicly.
        </div>
      </footer>
    </div>
  );
}
