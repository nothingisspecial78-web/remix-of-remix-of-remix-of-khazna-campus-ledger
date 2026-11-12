import { Ban } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Btn } from "./btn";
import { KDialog } from "./overlays";
import { Field } from "./primitives";

const QUICK = ["Wrong student selected", "Wrong amount", "Duplicate entry", "Receipt cancelled"];

export function VoidDialog({ open, onOpenChange, title, summary, onConfirm }: { open: boolean; onOpenChange: (o: boolean) => void; title: string; summary: ReactNode; onConfirm: (reason: string) => void }) {
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);
  const err = reason.trim().length < 5 ? "Give a reason of at least 5 characters — it goes into the audit log." : "";
  const close = (o: boolean) => {
    if (!o) {
      setReason("");
      setTouched(false);
    }
    onOpenChange(o);
  };
  return (
    <KDialog
      open={open}
      onOpenChange={close}
      title={title}
      description="Voided entries stay visible with a strikethrough and stop counting toward balances. This can't be undone."
      footer={
        <>
          <Btn variant="ghost" onClick={() => close(false)}>
            Keep entry
          </Btn>
          <Btn
            variant="danger"
            onClick={() => {
              setTouched(true);
              if (err) return;
              onConfirm(reason.trim());
              close(false);
            }}
          >
            <Ban /> Void
          </Btn>
        </>
      }
    >
      <div className="glass-inset mb-4 p-3 text-sm">{summary}</div>
      <Field label="Reason for voiding" required error={touched ? err : ""}>
        <textarea className="k-input h-24 py-2" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Posted to the wrong student" aria-invalid={touched && !!err} />
      </Field>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {QUICK.map((q) => (
          <button key={q} type="button" onClick={() => setReason(q)} className="rounded-full border border-hairline bg-accent px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground">
            {q}
          </button>
        ))}
      </div>
    </KDialog>
  );
}
