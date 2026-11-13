import { Link, createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { Ban, ChevronDown, FileSpreadsheet, Layers, Pencil, Plus, Trash2, X } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Btn } from "@/components/khazna/btn";
import { Amount, Avatar, Chip, EmptyState, PageHeader } from "@/components/khazna/primitives";
import { VoidDialog } from "@/components/khazna/VoidDialog";
import { asSector } from "@/lib/khazna/data";
import { formatDate, formatINR, timeAgo } from "@/lib/khazna/format";
import { useKhazna } from "@/lib/khazna/store";
import type { Batch } from "@/lib/khazna/types";
import { cn } from "@/lib/utils";
import { reveal } from "@/components/khazna/motion";

export const Route = createFileRoute("/m/$sectorSlug/batches")({
  head: () => ({
    meta: [
      { title: "Batch History — Khazna" },
      { name: "description", content: "History of bulk postings in an Islahul Uloom sector with one-click batch voiding." },
      { property: "og:title", content: "Batch History — Khazna" },
      { property: "og:description", content: "Bulk posting history with one-click void." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BatchesPage,
});

function BatchesPage() {
  const slug = asSector(Route.useParams().sectorSlug);
  const sector = useKhazna((s) => s.sectors.find((x) => x.slug === slug)!);
  const allBatches = useKhazna((s) => s.batches);
  const batches = useMemo(() => allBatches.filter((b) => b.sector === slug), [allBatches, slug]);
  const students = useKhazna((s) => s.students);
  const voidBatch = useKhazna((s) => s.voidBatch);
  const editBatch = useKhazna((s) => s.editBatch);
  const deleteBatch = useKhazna((s) => s.deleteBatch);
  const [open, setOpen] = useState<string | null>(null);
  const [voiding, setVoiding] = useState<Batch | null>(null);
  const [editing, setEditing] = useState<Batch | null>(null);
  const [deleting, setDeleting] = useState<Batch | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDate, setEditDate] = useState("");

  const startEdit = (b: Batch) => {
    setEditing(b);
    setEditTitle(b.title);
    setEditDate(b.date);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    if (!editTitle.trim()) {
      toast.error("Please enter a batch title.");
      return;
    }
    editBatch(editing.id, { title: editTitle.trim(), date: editDate });
    toast.success("Batch updated successfully");
    setEditing(null);
  };

  const handleConfirmDelete = () => {
    if (!deleting) return;
    deleteBatch(deleting.id);
    toast.success(`Batch ${deleting.id} deleted`);
    setDeleting(null);
  };

  return (
    <div>
      <PageHeader
        eyebrow={`${sector.name} · Batches`}
        title="Batch history"
        description="Every bulk posting, grouped. Edit batch titles or void entries in one step."
        actions={
          <Btn asChild variant="primary">
            <Link to="/m/$sectorSlug/bulk" params={{ sectorSlug: slug }}>
              <Plus /> New batch
            </Link>
          </Btn>
        }
      />

      {batches.length === 0 ? (
        <motion.div {...reveal()} className="glass">
          <EmptyState icon={FileSpreadsheet} title="No batches yet" body="Use Bulk Entry to post the same fee to a whole class." />
        </motion.div>
      ) : (
        <div className="space-y-3">
          {batches.map((b, i) => {
            const total = b.amount * b.studentIds.length;
            const expanded = open === b.id;
            return (
              <motion.div key={b.id} {...reveal(i, 0, b.voided ? 0.7 : 1)} className="glass hover-lift overflow-hidden">
                <div className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:p-5">
                  <button className="flex flex-1 items-center gap-4 text-left" onClick={() => setOpen(expanded ? null : b.id)}>
                    <span className={cn("grid size-11 shrink-0 place-items-center rounded-xl border", b.voided ? "border-hairline bg-accent text-subtle" : b.type === "credit" ? "border-credit/30 bg-credit/12 text-credit" : "border-debit/30 bg-debit/12 text-debit")}>
                      <Layers className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={cn("font-semibold text-foreground", b.voided && "line-through")}>{b.title}</span>
                        <span className="font-mono text-xs text-subtle">{b.id}</span>
                        {b.voided ? <Chip tone="neutral" icon={Ban}>Voided</Chip> : <Chip tone="credit">Posted</Chip>}
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground num">
                        {formatDate(b.date)} · {b.studentIds.length} students × {formatINR(b.amount)} · receipts {b.receiptPrefix}001–{String(b.studentIds.length).padStart(3, "0")} · by {b.createdBy}
                      </div>
                      {b.voided && <div className="mt-1 text-xs text-debit">Voided {timeAgo(b.voided.at)}: {b.voided.reason}</div>}
                    </div>
                    <ChevronDown className={cn("size-4 shrink-0 text-subtle transition-transform", expanded && "rotate-180")} />
                  </button>
                  <div className="flex items-center justify-between gap-2 md:justify-end">
                    <div className={cn("text-right font-display text-lg font-semibold pr-2", b.voided && "line-through")}>
                      <Amount value={total} type={b.type} />
                    </div>
                    {!b.voided ? (
                      <>
                        <Btn variant="soft" size="sm" onClick={() => startEdit(b)}>
                          <Pencil className="size-3.5" /> Edit
                        </Btn>
                        <Btn variant="danger" size="sm" onClick={() => setVoiding(b)}>
                          <Ban className="size-3.5" /> Void
                        </Btn>
                      </>
                    ) : (
                      <Btn variant="danger" size="sm" onClick={() => setDeleting(b)}>
                        <Trash2 className="size-3.5" /> Delete
                      </Btn>
                    )}
                  </div>
                </div>
                <AnimatePresence initial={false}>
                  {expanded && (
                    <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden border-t border-hairline">
                      <div className="grid grid-cols-1 gap-2 p-4 sm:grid-cols-2 lg:grid-cols-3 w-full">
                        {b.studentIds.map((id, k) => {
                          const s = students.find((x) => x.id === id);
                          return (
                            <div key={id} className="glass-inset flex items-center gap-2.5 p-2.5">
                              <Avatar name={s?.name ?? id} size={26} />
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-sm text-foreground">{s?.name}</div>
                                <div className="text-[11px] text-subtle num">
                                  {id} · {b.receiptPrefix}
                                  {String(k + 1).padStart(3, "0")}
                                </div>
                              </div>
                              <Amount value={b.amount} type={b.type} className={cn("text-xs", b.voided && "line-through opacity-50")} />
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Edit Batch Dialog */}
      <Dialog.Root open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-background/60 backdrop-blur-sm" />
          <Dialog.Content className="glass-strong fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-3xl p-5 shadow-2xl border border-white/70 dark:border-white/10 outline-none">
            <div className="flex items-center justify-between pb-3 border-b border-hairline">
              <div className="flex items-center gap-2.5">
                <div className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Pencil className="size-4" />
                </div>
                <div>
                  <Dialog.Title className="text-base font-semibold text-foreground">
                    Edit Batch
                  </Dialog.Title>
                  <Dialog.Description className="text-xs text-muted-foreground">
                    Batch {editing?.id}
                  </Dialog.Description>
                </div>
              </div>
              <Dialog.Close className="grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-accent">
                <X className="size-4" />
              </Dialog.Close>
            </div>

            <form onSubmit={handleSaveEdit} className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-subtle">
                  Batch Title
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full rounded-xl border border-glass-border bg-accent/40 px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-subtle">
                  Posting Date
                </label>
                <input
                  type="date"
                  required
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full rounded-xl border border-glass-border bg-accent/40 px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="rounded-xl px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-accent"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-gradient-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-glow hover:opacity-95"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Delete Batch Dialog */}
      <Dialog.Root open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-background/60 backdrop-blur-sm" />
          <Dialog.Content className="glass-strong fixed left-1/2 top-1/2 z-50 w-[90vw] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-3xl p-5 shadow-2xl border border-white/70 dark:border-white/10 outline-none">
            <div className="flex items-center gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-rose-500/15 text-rose-500">
                <Trash2 className="size-5" />
              </div>
              <div>
                <Dialog.Title className="text-base font-semibold text-foreground">
                  Delete Batch?
                </Dialog.Title>
                <Dialog.Description className="text-xs text-muted-foreground">
                  Permanently remove batch {deleting?.id} and all its entries.
                </Dialog.Description>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleting(null)}
                className="rounded-xl px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-accent"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="rounded-xl bg-rose-500 px-4 py-2 text-xs font-semibold text-white shadow-glow hover:bg-rose-600"
              >
                Delete Batch
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <VoidDialog
        open={!!voiding}
        onOpenChange={(o) => !o && setVoiding(null)}
        title="Void entire batch?"
        summary={
          voiding && (
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-medium text-foreground">
                  {voiding.title} · <span className="font-mono text-xs">{voiding.id}</span>
                </div>
                <div className="text-xs text-muted-foreground">{voiding.studentIds.length} entries will be voided</div>
              </div>
              <Amount value={voiding.amount * voiding.studentIds.length} type={voiding.type} className="font-semibold" />
            </div>
          )
        }
        onConfirm={(reason) => {
          if (!voiding) return;
          voidBatch(voiding.id, reason);
          toast.success(`Batch ${voiding.id} voided`, { description: `${voiding.studentIds.length} entries reversed` });
        }}
      />
    </div>
  );
}
