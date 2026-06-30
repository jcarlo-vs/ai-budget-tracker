import { THEMES } from "@/lib/themes";
import { ThemeCard } from "./theme-card";

export default function ThemesPage() {
  return (
    <main className="mx-auto max-w-md space-y-6 px-4 py-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold">Pick a theme</h1>
        <p className="text-sm text-zinc-500">
          Tell Claude the name and I&apos;ll build the whole app in it.
        </p>
      </header>
      <div className="space-y-8">
        {THEMES.map((t) => (
          <ThemeCard key={t.id} theme={t} />
        ))}
      </div>
    </main>
  );
}
