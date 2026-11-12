import { Link } from "@tanstack/react-router";
import { useKhazna } from "@/lib/khazna/store";

export function Logo({ size = "md", tagline }: { size?: "md" | "lg"; tagline?: string }) {
  const lg = size === "lg";
  const college = useKhazna((s) => s.college.name);
  return (
    <Link to="/login" className="flex items-center gap-2.5">
      <span className={`overflow-hidden rounded-xl shadow-glow ${lg ? "size-11" : "size-9"}`}>
        <img src="/icon-192.png" alt="Khazna" className="size-full object-cover" />
      </span>
      <span className="leading-none">
        <span className={`flex items-baseline gap-1.5 font-display font-semibold text-foreground ${lg ? "text-2xl" : "text-lg"}`}>
          Khazna
        </span>
        <span className="mt-0.5 hidden text-[10px] uppercase tracking-[0.18em] text-subtle sm:block">{tagline ?? college}</span>
      </span>
    </Link>
  );
}
