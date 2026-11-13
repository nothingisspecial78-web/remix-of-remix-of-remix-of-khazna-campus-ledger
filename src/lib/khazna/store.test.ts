import { beforeEach, describe, expect, it } from "vitest";
import { NOTICES, STUDENTS } from "./data";
import { useKhazna } from "./store";

const unread = () => useKhazna.getState().notices.filter((n) => !n.read).length;

describe("student account actions", () => {
  beforeEach(() => useKhazna.setState({ notices: NOTICES, students: STUDENTS }));

  it("Safwan K. is S0125 in Fiqh 2 with guardian Moideen Kutty", () => {
    const me = STUDENTS.find((s) => s.id === "S0125")!;
    expect(me.name).toBe("Safwan K.");
    expect(me.className).toBe("Fiqh 2");
    expect(me.guardian).toBe("Moideen Kutty");
  });

  it("opening an unread notice marks only that one as read", () => {
    const before = unread();
    const first = NOTICES.find((n) => !n.read)!;
    useKhazna.getState().markRead(first.id);
    expect(unread()).toBe(before - 1);
    expect(useKhazna.getState().notices.find((n) => n.id === first.id)!.read).toBe(true);
  });

  it("mark all as read clears every unread notice", () => {
    useKhazna.getState().markAllRead();
    expect(unread()).toBe(0);
  });

  it("saving a phone number updates the student in the store", () => {
    useKhazna.getState().updatePhone("S0125", "9000011111");
    expect(useKhazna.getState().students.find((s) => s.id === "S0125")!.phone).toBe("9000011111");
  });

  it("editBatch updates batch title and date on both batch and its transactions", () => {
    const st = useKhazna.getState();
    const batch = st.batches[0];
    if (batch) {
      st.editBatch(batch.id, { title: "Updated Study Tour", date: "2026-11-20" });
      const updated = useKhazna.getState().batches.find((b) => b.id === batch.id)!;
      expect(updated.title).toBe("Updated Study Tour");
      expect(updated.date).toBe("2026-11-20");

      const relatedTx = useKhazna.getState().transactions.filter((t) => t.batchId === batch.id);
      for (const t of relatedTx) {
        expect(t.title).toBe("Updated Study Tour");
        expect(t.date).toBe("2026-11-20");
      }
    }
  });

  it("deleteBatch removes batch and its transactions", () => {
    const st = useKhazna.getState();
    const batch = st.batches[0];
    if (batch) {
      st.deleteBatch(batch.id);
      expect(useKhazna.getState().batches.some((b) => b.id === batch.id)).toBe(false);
      expect(useKhazna.getState().transactions.some((t) => t.batchId === batch.id)).toBe(false);
    }
  });

  it("editManager, toggleManagerStatus, and deleteManager work as expected", () => {
    const st = useKhazna.getState();
    const mgr = st.managers[0];
    if (mgr) {
      st.editManager(mgr.id, { name: "Updated Manager Name" });
      expect(useKhazna.getState().managers.find((m) => m.id === mgr.id)!.name).toBe("Updated Manager Name");

      st.toggleManagerStatus(mgr.id);
      expect(useKhazna.getState().managers.find((m) => m.id === mgr.id)!.status).toBe(
        mgr.status === "active" ? "inactive" : "active"
      );

      st.deleteManager(mgr.id);
      expect(useKhazna.getState().managers.some((m) => m.id === mgr.id)).toBe(false);
    }
  });

  it("setCurrentRole updates currentRole", () => {
    useKhazna.getState().setCurrentRole("admin");
    expect(useKhazna.getState().currentRole).toBe("admin");
    useKhazna.getState().setCurrentRole("manager");
    expect(useKhazna.getState().currentRole).toBe("manager");
  });
});
