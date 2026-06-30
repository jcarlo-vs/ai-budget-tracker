import { redirect } from "next/navigation";

// Auth is enforced client-side by <LockGate> at the app root now, so a direct
// visit to /login just bounces home where the lock screen takes over.
export default function LoginPage() {
  redirect("/");
}
