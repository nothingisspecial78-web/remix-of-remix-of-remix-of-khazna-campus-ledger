import { Link } from "@tanstack/react-router";
import { Vault } from "lucide-react";

export function Logo({ size = "md" }: { size?: "md" | "lg" }) {
  const lg = size === "lg";
  return (
    <Link to="/login" className="flex items-center gap-2.5">
      <span className={`grid place-items-center rounded-xl bg-gradient-primary text-primary-foreground shadow-glow ${lg ? "size-11" : "size-9"}`}>
        <Vault className={lg ? "size-5" : "size-[18px]"} />
      </span>
      <span className="leading-none">
        <span className={`flex items-baseline gap-1.5 font-display font-semibold text-foreground ${lg ? "text-2xl" : "text-lg"}`}>
          Khazna
        </span>
        <span className="mt-0.5 hidden text-[10px] uppercase tracking-[0.18em] text-subtle sm:block">Islahul Uloom</span>
      </span>
    </Link>
  );
}
