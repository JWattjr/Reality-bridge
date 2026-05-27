import Link from "next/link";
import { ShieldCheck } from "lucide-react";

export default function DeprecatedCreatePage() {
  return (
    <div className="mx-auto max-w-xl py-16 text-center">
      <div className="bubbly-card bg-white p-6">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-[var(--color-primary-900)] bg-[var(--color-pastel-yellow)]">
          <ShieldCheck size={22} />
        </div>
        <h1 className="font-display text-3xl font-bold">Public market creation is disabled</h1>
        <p className="mt-2 text-sm font-bold opacity-70">
          ProofPlay X Cup uses official admin-created football game events and markets only.
        </p>
        <Link
          href="/organizer"
          className="mt-5 inline-flex rounded-full border-2 border-[var(--color-primary-900)] bg-[var(--color-pastel-green)] px-5 py-2.5 text-sm font-bold shadow-[2px_2px_0px_0px_#312e81]"
        >
          Open Admin Dashboard
        </Link>
      </div>
    </div>
  );
}
