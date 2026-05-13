import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "../components/button";
import { FormError, Input, Label } from "../components/ui";
import { useAuth } from "../lib/auth";

export function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [countyHint, setCountyHint] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await register(phone, password, countyHint || undefined);
      navigate("/submit");
    } catch (err) {
      setError((err as Error).message ?? "Registration failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-bold">Create an account</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        We use your phone number as your ID and store only a hash of it. We
        never publish it.
      </p>
      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        <div>
          <Label htmlFor="phone">Phone number</Label>
          <Input
            id="phone"
            type="tel"
            placeholder="07XX XXX XXX or +2547XX XXX XXX"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            autoComplete="tel"
          />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            minLength={8}
          />
        </div>
        <div>
          <Label htmlFor="county">County (optional)</Label>
          <Input
            id="county"
            value={countyHint}
            onChange={(e) => setCountyHint(e.target.value)}
            placeholder="e.g. Nairobi"
          />
        </div>
        <FormError message={error} />
        <Button className="w-full" type="submit" disabled={busy}>
          {busy ? "Creating…" : "Register"}
        </Button>
        <p className="text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="text-primary underline">
            Log in
          </Link>
        </p>
      </form>
    </div>
  );
}

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(phone, password);
      navigate("/me");
    } catch (err) {
      setError((err as Error).message ?? "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-bold">Log in</h1>
      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        <div>
          <Label htmlFor="phone">Phone number</Label>
          <Input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            autoComplete="tel"
          />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </div>
        <FormError message={error} />
        <Button className="w-full" type="submit" disabled={busy}>
          {busy ? "Signing in…" : "Log in"}
        </Button>
        <p className="text-sm text-muted-foreground">
          No account?{" "}
          <Link to="/register" className="text-primary underline">
            Register
          </Link>
        </p>
      </form>
    </div>
  );
}
