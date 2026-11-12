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
});
