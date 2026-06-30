import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-10 px-6">
      <div className="reveal text-center">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl text-5xl ring-1 ring-inset ring-[var(--border)] shadow-[0_0_40px_-10px_var(--accent-glow)]"
          style={{ background: "radial-gradient(circle at 50% 30%, color-mix(in srgb, var(--accent) 24%, transparent), transparent 70%)" }}>
          💸
        </div>
        <h1 className="display mt-5 text-2xl font-bold tracking-tight">Budget Tracker</h1>
        <p className="mt-1 text-sm text-muted-foreground">Enter your passcode</p>
      </div>
      <div className="reveal w-full max-w-xs" style={{ animationDelay: "80ms" }}>
        <LoginForm />
      </div>
    </main>
  );
}
