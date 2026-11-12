import { beforeEach, describe, expect, it } from "vitest";
import { useKhazna } from "./store";

const st = () => useKhazna.getState();

describe("college sign-up and setup", () => {
  beforeEach(() => st().loadDemo());

  it("signing up starts an empty college owned by the new Super Admin", () => {
    st().signUpCollege({ college: "Al Noor College", name: "Ayesha N.", email: "Ayesha@AlNoor.edu", password: "secret123" });
    expect(st().college).toMatchObject({ name: "Al Noor College", adminName: "Ayesha N.", adminEmail: "ayesha@alnoor.edu", demo: false });
    expect(st().sectors).toHaveLength(0);
    expect(st().managers).toHaveLength(0);
    expect(st().students).toHaveLength(0);
  });

  it("admin can add a sector and bulk-add managers assigned to it", () => {
    st().signUpCollege({ college: "Al Noor", name: "Ayesha", email: "a@b.co", password: "secret123" });
    const s = st().addSector({ name: "Students Union", description: "", receiptPrefix: "SU-", target: 50000, color: "var(--sector-office)" });
    expect(s.slug).toBe("students-union");
    st().addManagers([
      { name: "Nizar", email: "n@b.co", phone: "—", sectors: [s.slug] },
      { name: "Rafi", email: "r@b.co", phone: "—", sectors: [] },
    ]);
    expect(st().managers.map((m) => m.status)).toEqual(["active", "active"]);
    expect(st().managers[0]!.sectors).toEqual(["students-union"]);
  });

  it("importing students creates any classes that don't exist yet", () => {
    st().signUpCollege({ college: "Al Noor", name: "Ayesha", email: "a@b.co", password: "secret123" });
    st().importStudents([{ id: "A1", name: "Rayan", className: "BA 1", phone: "", guardian: "—", joined: "2026-11-12" }]);
    expect(st().classes).toEqual(["BA 1"]);
  });
});
