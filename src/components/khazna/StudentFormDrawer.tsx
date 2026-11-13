import { useState } from "react";
import { Pencil, Phone, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Btn } from "@/components/khazna/btn";
import { KDrawer } from "@/components/khazna/overlays";
import { Field } from "@/components/khazna/primitives";
import { TODAY } from "@/lib/khazna/format";
import { useKhazna } from "@/lib/khazna/store";
import type { Student } from "@/lib/khazna/types";

export function StudentFormDrawer({
  open,
  onOpenChange,
  student,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student?: Student | null;
}) {
  const students = useKhazna((s) => s.students);
  const classes = useKhazna((s) => s.classes);
  const addStudent = useKhazna((s) => s.addStudent);
  const editStudent = useKhazna((s) => s.editStudent);

  const isEdit = !!student;
  const maxNum = students.length > 0 ? Math.max(...students.map((s) => Number(s.id.slice(1)) || 0)) : 0;
  const nextId = `S${String(maxNum + 1).padStart(4, "0")}`;
  const [form, setForm] = useState({ name: "", id: "", className: classes[0] ?? "", phone: "", guardian: "" });
  const [touched, setTouched] = useState(false);
  const [lastOpen, setLastOpen] = useState(false);

  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      if (student) {
        setForm({
          name: student.name,
          id: student.id,
          className: student.className,
          phone: student.phone,
          guardian: student.guardian === "—" ? "" : student.guardian,
        });
      } else {
        setForm({ name: "", id: "", className: classes[0] ?? "", phone: "", guardian: "" });
      }
      setTouched(false);
    }
  }

  const id = form.id || nextId;
  const errors = {
    name: form.name.trim().length < 3 ? "Enter the student's full name" : "",
    id: !/^S\d{4}$/.test(id) ? "Format: S followed by 4 digits" : (!isEdit && students.some((s) => s.id === id)) ? "This Ad.No already exists" : "",
    phone: !/^\d{10}$/.test(form.phone) ? "10-digit mobile number" : "",
  };
  const valid = !errors.name && !errors.id && !errors.phone;

  const save = () => {
    setTouched(true);
    if (!valid) return;

    if (isEdit && student) {
      editStudent(student.id, {
        name: form.name.trim(),
        className: form.className,
        phone: form.phone,
        guardian: form.guardian || "—",
      });
      toast.success(`${form.name} updated`, { description: `${student.id} · ${form.className}` });
    } else {
      addStudent({
        id,
        name: form.name.trim(),
        className: form.className,
        phone: form.phone,
        guardian: form.guardian || "—",
        joined: TODAY,
      });
      toast.success(`${form.name} added`, { description: `${id} · ${form.className}` });
    }
    onOpenChange(false);
  };

  return (
    <KDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Edit student details" : "Add student"}
      description={isEdit ? "Update student name, class, contact or guardian information." : "New students get an empty ledger in every sector."}
      footer={
        <>
          <Btn variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Btn>
          <Btn variant="primary" onClick={save}>
            {isEdit ? <Pencil /> : <UserPlus />} {isEdit ? "Save changes" : "Add student"}
          </Btn>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Full name" required error={touched ? errors.name : ""}>
          <input className="k-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Muhammed Rayan" aria-invalid={touched && !!errors.name} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Ad.No" required error={touched ? errors.id : ""} hint={isEdit ? "Fixed admission ID" : "Auto-assigned"}>
            <input className="k-input num" value={form.id} disabled={isEdit} placeholder={nextId} onChange={(e) => setForm({ ...form, id: e.target.value.toUpperCase() })} />
          </Field>
          <Field label="Class" required>
            <select className="k-input" value={form.className} onChange={(e) => setForm({ ...form, className: e.target.value })}>
              {classes.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Mobile" required error={touched ? errors.phone : ""}>
          <div className="relative">
            <Phone className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
            <input className="k-input num pl-9" inputMode="numeric" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })} placeholder="98470 00000" />
          </div>
        </Field>
        <Field label="Guardian name">
          <input className="k-input" value={form.guardian} onChange={(e) => setForm({ ...form, guardian: e.target.value })} placeholder="e.g. Abdul Rahman" />
        </Field>
      </div>
    </KDrawer>
  );
}
