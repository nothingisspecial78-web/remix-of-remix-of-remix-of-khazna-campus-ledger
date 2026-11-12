import { beforeEach, describe, expect, it } from "vitest";
import { DEMO_ORG_ID, useKhazna } from "./store";

const st = () => useKhazna.getState();

describe("Multi-tenant organization isolation", () => {
  beforeEach(() => {
    st().loadDemo();
  });

  it("loads demo organization with pre-seeded data", () => {
    expect(st().college.id).toBe(DEMO_ORG_ID);
    expect(st().college.name).toBe("Islahul Uloom");
    expect(st().college.demo).toBe(true);
    expect(st().students.length).toBeGreaterThan(0);
    expect(st().sectors.length).toBeGreaterThan(0);
  });

  it("creating a new organization starts with clean slate and ZERO demo data", () => {
    const demoStudentCount = st().students.length;
    const demoSectorCount = st().sectors.length;

    // Create new organization
    const newCollege = st().createOrg({
      name: "Markaz College",
      adminName: "Ahmad K.",
      adminEmail: "ahmad@markaz.edu",
      password: "password123",
    });

    expect(newCollege.name).toBe("Markaz College");
    expect(newCollege.demo).toBe(false);

    // Verify complete data isolation: ZERO demo data in new org
    expect(st().college.name).toBe("Markaz College");
    expect(st().students).toHaveLength(0);
    expect(st().sectors).toHaveLength(0);
    expect(st().transactions).toHaveLength(0);
    expect(st().batches).toHaveLength(0);
    expect(st().managers).toHaveLength(0);

    // Add a student and sector to Markaz College
    const sector = st().addSector({
      name: "Tuition Fund",
      description: "College tuition fees",
      receiptPrefix: "TF-",
      target: 200000,
      color: "var(--sector-office)",
    });
    st().addStudent({
      id: "M001",
      name: "Bilal",
      className: "CS 1",
      phone: "+919999999999",
      guardian: "Parent",
      joined: "2026-11-13",
    });

    expect(st().sectors).toHaveLength(1);
    expect(st().students).toHaveLength(1);
    expect(st().students[0]!.name).toBe("Bilal");

    // Switch back to Demo organization
    st().switchOrg(DEMO_ORG_ID);
    expect(st().college.name).toBe("Islahul Uloom");
    expect(st().students).toHaveLength(demoStudentCount);
    expect(st().sectors).toHaveLength(demoSectorCount);
    // Ensure Bilal does not exist in Demo
    expect(st().students.some((s) => s.id === "M001")).toBe(false);

    // Switch back to Markaz College
    st().switchOrg(newCollege.id);
    expect(st().college.name).toBe("Markaz College");
    expect(st().students).toHaveLength(1);
    expect(st().students[0]!.id).toBe("M001");
    expect(st().sectors).toHaveLength(1);
    expect(st().sectors[0]!.slug).toBe(sector.slug);
  });

  it("creating a second organization has independent clean slate with neither demo nor first org data", () => {
    // Org 1
    const org1 = st().createOrg({
      name: "Org Alpha",
      adminName: "Admin Alpha",
      adminEmail: "alpha@edu.in",
    });
    st().addStudent({ id: "ALPHA-1", name: "Student Alpha", className: "A1", phone: "", guardian: "", joined: "2026-11-13" });
    expect(st().students).toHaveLength(1);

    // Org 2
    const org2 = st().createOrg({
      name: "Org Beta",
      adminName: "Admin Beta",
      adminEmail: "beta@edu.in",
    });

    // Org Beta must have ZERO students (neither demo nor Alpha)
    expect(st().college.name).toBe("Org Beta");
    expect(st().students).toHaveLength(0);
    expect(st().sectors).toHaveLength(0);

    // Org list contains all organizations
    const orgIds = st().organizations.map((o) => o.id);
    expect(orgIds).toContain(DEMO_ORG_ID);
    expect(orgIds).toContain(org1.id);
    expect(orgIds).toContain(org2.id);
  });
});
