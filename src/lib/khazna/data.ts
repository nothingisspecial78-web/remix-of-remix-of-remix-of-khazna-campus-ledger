import { addDays, TODAY } from "./format";
import type { AuditEntry, Batch, Manager, Notice, Sector, SectorSlug, Student, Tx } from "./types";

/* Deterministic PRNG so SSR and browser produce identical mock data. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20261112);
const pick = <T,>(arr: T[]): T => arr[Math.floor(rand() * arr.length)]!;
const between = (a: number, b: number) => a + Math.floor(rand() * (b - a + 1));
const round50 = (n: number) => Math.round(n / 50) * 50;

export const SECTORS: Sector[] = [
  {
    slug: "office",
    name: "Office",
    short: "OF",
    description: "Central college office — tuition, admission & exam fees.",
    color: "var(--sector-office)",
    receiptPrefix: "OF-",
    target: 1450000,
    creditTitles: ["Cash Deposit", "Advance Deposit", "Fee Payment"],
    debitTitles: ["Tuition Fee – Term 2", "Exam Fee", "Admission Fee", "Library Fine", "ID Card Fee"],
  },
  {
    slug: "ihsan-union",
    name: "Ihsan Union",
    short: "IU",
    description: "Students' union — arts fest, magazine & membership.",
    color: "var(--sector-ihsan)",
    receiptPrefix: "IU-",
    target: 320000,
    creditTitles: ["Cash Deposit", "Sponsorship Refund"],
    debitTitles: ["Arts Fest Contribution", "Union Membership", "Magazine Fund", "Sports Meet Fee"],
  },
  {
    slug: "velitcham-welfare",
    name: "Velitcham Welfare",
    short: "VW",
    description: "Welfare wing — mess bills, medical aid & relief.",
    color: "var(--sector-velitcham)",
    receiptPrefix: "VW-",
    target: 540000,
    creditTitles: ["Cash Deposit", "Welfare Grant"],
    debitTitles: ["Hostel Mess Bill", "Welfare Fund", "Medical Aid Recovery", "Relief Contribution"],
  },
  {
    slug: "dept-fiqh",
    name: "Dept Fiqh",
    short: "DF",
    description: "Department of Fiqh — kitabs, seminars & study tours.",
    color: "var(--sector-fiqh)",
    receiptPrefix: "DF-",
    target: 410000,
    creditTitles: ["Cash Deposit", "Scholarship Credit"],
    debitTitles: ["Study Tour Fee", "Kitab Purchase", "Seminar Fee", "Fiqh Study Material"],
  },
  {
    slug: "dept-civil",
    name: "Dept Civil",
    short: "DC",
    description: "Department of Civil — labs, field visits & workshops.",
    color: "var(--sector-civil)",
    receiptPrefix: "DC-",
    target: 380000,
    creditTitles: ["Cash Deposit", "Lab Deposit Refund"],
    debitTitles: ["Lab Fee", "Field Visit", "Drawing Kit", "Workshop Fee"],
  },
];

export const SECTOR_SLUGS = SECTORS.map((s) => s.slug);
export const isSectorSlug = (s: string): s is SectorSlug => (SECTOR_SLUGS as string[]).includes(s);

export const CLASSES = ["Thanawiyya 1", "Thanawiyya 2", "Fiqh 1", "Fiqh 2", "Fiqh 3", "Civil 1", "Civil 2", "Hifz"];

const NAMES = [
  "Muhammed Bilal", "Nihal Rahman", "Fathima Zahra", "Ayisha Nourin", "Muhammed Shamil", "Ahmed Rabeeh",
  "Mohammed Afnan", "Hana Fathima", "Rizwan P.", "Muhammed Ziyad", "Nafih Ali", "Abdul Basith",
  "Irfan Habeeb", "Jasim Muhammed", "Fida Sherin", "Minha Kadeeja", "Rinsha Mol", "Sahla Nasrin",
  "Adil Hashim", "Ameen Ashraf", "Hisham Hussain", "Muhammed Yaseen", "Safwan K.", "Thwaha Mubarak",
  "Uvais Karani", "Nahyan Abdulla", "Sinan Ummer", "Faheem Musthafa", "Junaid Kunhi", "Ansaf Muhammed",
  "Riyas Kunju", "Muhsin Ali", "Swalih K.P.", "Shibili Noman", "Mishal Rahman", "Haris Beeran",
  "Afsal Thangal", "Lubna Sherin", "Nusaiba Ummer", "Shifana Jabin", "Ijas Ahmed", "Mufeed Ebrahim",
  "Salman Faris", "Anshid Ali", "Hafis Saleem", "Ashique Rahman", "Dilshad V.", "Murshid Kareem",
  "Zainul Abid", "Noufal Kunhimon", "Raihan Shafi", "Arshad Mohideen", "Fayiz Ahmed", "Siraj Usman",
  "Sabith Mon", "Nabeel Qasim",
];
const GUARDIANS = ["Abdul Rahman", "Moideen Kutty", "Kunhi Mohammed", "Ali Haji", "Usman Musliyar", "Basheer P.", "Hamza K.", "Aboobacker T.", "Ibrahim Kutty", "Yusuf Faizy"];

export const ME_STUDENT_ID = "S0125";

export const STUDENTS: Student[] = NAMES.map((name, i) => {
  const id = `S${String(103 + i).padStart(4, "0")}`;
  const isMe = id === ME_STUDENT_ID;
  const className = isMe ? "Fiqh 2" : i % 4 === 1 ? "Fiqh 2" : CLASSES[(i * 3) % CLASSES.length]!;
  const phone = isMe ? "9847012125" : `9${between(100000000, 999999999)}`;
  const guardian = pick(GUARDIANS); // always draw so the seeded sequence stays stable
  const joined = addDays("2024-06-03", between(0, 420));
  return { id, name, className, phone, guardian: isMe ? "Moideen Kutty" : guardian, joined };
});

const SECTOR_CREATOR: Record<SectorSlug, string> = {
  office: "Hamza Saqafi",
  "ihsan-union": "Shameer Hudawi",
  "velitcham-welfare": "Rashid Wafy",
  "dept-fiqh": "Jaseel Faizy",
  "dept-civil": "Anees Rahmani",
};

let txSeq = 1;
const receiptSeq: Record<SectorSlug, number> = { office: 1040, "ihsan-union": 310, "velitcham-welfare": 520, "dept-fiqh": 220, "dept-civil": 180 };
const nextReceipt = (s: Sector) => `${s.receiptPrefix}${receiptSeq[s.slug]++}`;
const txId = () => `TX${String(txSeq++).padStart(5, "0")}`;

const AMOUNTS: Record<string, [number, number]> = {
  "Tuition Fee – Term 2": [4500, 6500], "Exam Fee": [400, 900], "Admission Fee": [1500, 2500], "Library Fine": [50, 250], "ID Card Fee": [150, 200],
  "Arts Fest Contribution": [300, 600], "Union Membership": [200, 300], "Magazine Fund": [100, 250], "Sports Meet Fee": [150, 350],
  "Hostel Mess Bill": [1800, 3200], "Welfare Fund": [200, 500], "Medical Aid Recovery": [300, 1200], "Relief Contribution": [100, 400],
  "Study Tour Fee": [500, 500], "Kitab Purchase": [350, 1400], "Seminar Fee": [200, 400], "Fiqh Study Material": [150, 450],
  "Lab Fee": [600, 1200], "Field Visit": [400, 900], "Drawing Kit": [350, 700], "Workshop Fee": [300, 650],
};

const generated: Tx[] = [];
for (const st of STUDENTS) {
  for (const sec of SECTORS) {
    const isDept = sec.slug === "dept-fiqh" || sec.slug === "dept-civil";
    if (isDept && st.id !== ME_STUDENT_ID) {
      const fiqhClass = st.className.startsWith("Fiqh") || st.className.startsWith("Thanawiyya") || st.className === "Hifz";
      if (sec.slug === "dept-fiqh" && !fiqhClass) continue;
      if (sec.slug === "dept-civil" && fiqhClass && rand() > 0.25) continue;
    }
    const n = between(3, 7);
    let day = between(100, 125);
    // opening deposit
    const debitTitles = sec.debitTitles.filter((t) => t !== "Study Tour Fee");
    for (let k = 0; k < n; k++) {
      const isCredit = k === 0 || rand() < 0.3;
      const title = isCredit ? (k === 0 ? "Cash Deposit" : pick(sec.creditTitles)) : pick(debitTitles);
      const range = AMOUNTS[title] ?? [500, 3000];
      const amount = isCredit ? round50(between(sec.slug === "office" ? 3000 : 600, sec.slug === "office" ? 9000 : 3000)) : round50(between(range[0], range[1]));
      generated.push({
        id: txId(),
        sector: sec.slug,
        studentId: st.id,
        type: isCredit ? "credit" : "debit",
        title,
        reason: isCredit ? undefined : `${title} for ${st.className}`,
        amount: Math.max(50, amount),
        date: addDays(TODAY, -day),
        receiptNo: nextReceipt(sec),
        createdBy: SECTOR_CREATOR[sec.slug],
      });
      day = Math.max(0, day - between(6, 30));
    }
  }
}

/* Seeded batches */
const fiqh2 = STUDENTS.filter((s) => s.className === "Fiqh 2");
const civil1 = STUDENTS.filter((s) => s.className === "Civil 1");
const allHostel = STUDENTS.filter((_, i) => i % 3 === 0);

function seedBatch(id: string, sector: SectorSlug, title: string, type: "credit" | "debit", amount: number, daysAgo: number, prefix: string, studs: Student[], voided?: Batch["voided"]): Batch {
  const date = addDays(TODAY, -daysAgo);
  studs.forEach((s, i) => {
    generated.push({
      id: txId(),
      sector,
      studentId: s.id,
      type,
      title,
      reason: type === "debit" ? `${title} — batch ${id}` : undefined,
      amount,
      date,
      receiptNo: `${prefix}${String(i + 1).padStart(3, "0")}`,
      batchId: id,
      createdBy: SECTOR_CREATOR[sector],
      voided: voided ? { ...voided } : undefined,
    });
  });
  return { id, sector, title, type, reason: type === "debit" ? `${title} — batch ${id}` : undefined, amount, date, receiptPrefix: prefix, studentIds: studs.map((s) => s.id), createdBy: SECTOR_CREATOR[sector], createdAt: `${date}T10:${10 + daysAgo}:00Z`, voided };
}

export const BATCHES: Batch[] = [
  seedBatch("B-2611-04", "dept-fiqh", "Study Tour Fee", "debit", 500, 3, "ST-", fiqh2),
  seedBatch("B-2610-19", "velitcham-welfare", "Hostel Mess Bill", "debit", 2400, 24, "MB-", allHostel),
  seedBatch("B-2610-11", "dept-civil", "Field Visit", "debit", 650, 32, "FV-", civil1),
  seedBatch("B-2610-02", "ihsan-union", "Arts Fest Contribution", "debit", 350, 41, "AF-", STUDENTS.slice(0, 24), {
    reason: "Duplicate posting — amount revised to ₹300",
    by: "Shameer Hudawi",
    at: "2026-10-03T09:12:00Z",
  }),
  seedBatch("B-2609-27", "office", "Exam Fee", "debit", 750, 46, "EX-", STUDENTS.slice(10, 40)),
];

/* A couple of individually voided entries for realism */
generated[7]!.voided = { reason: "Wrong student selected", by: "Hamza Saqafi", at: "2026-09-02T11:30:00Z" };
generated[61]!.voided = { reason: "Receipt cancelled by office", by: "Rashid Wafy", at: "2026-10-14T15:05:00Z" };

export const TRANSACTIONS: Tx[] = generated.sort((a, b) => (a.date === b.date ? b.id.localeCompare(a.id) : b.date.localeCompare(a.date)));

export const MANAGERS: Manager[] = [
  { id: "M01", name: "Hamza Saqafi", email: "hamza@islahululoom.edu.in", phone: "9846011201", sectors: ["office"], status: "active", lastActive: "2026-11-12T15:40:00Z" },
  { id: "M02", name: "Shameer Hudawi", email: "shameer@islahululoom.edu.in", phone: "9895022143", sectors: ["ihsan-union"], status: "active", lastActive: "2026-11-12T09:05:00Z" },
  { id: "M03", name: "Rashid Wafy", email: "rashid@islahululoom.edu.in", phone: "9744033189", sectors: ["velitcham-welfare"], status: "active", lastActive: "2026-11-11T18:22:00Z" },
  { id: "M04", name: "Jaseel Faizy", email: "jaseel@islahululoom.edu.in", phone: "9562044410", sectors: ["dept-fiqh"], status: "active", lastActive: "2026-11-12T16:58:00Z" },
  { id: "M05", name: "Anees Rahmani", email: "anees@islahululoom.edu.in", phone: "9037055276", sectors: ["dept-civil"], status: "active", lastActive: "2026-11-10T12:14:00Z" },
  { id: "M06", name: "Mujeeb Baqavi", email: "mujeeb@islahululoom.edu.in", phone: "8086066318", sectors: ["office", "velitcham-welfare"], status: "invited", lastActive: "2026-11-09T08:00:00Z" },
];

const IPS = ["10.0.4.12", "10.0.4.27", "10.0.6.3", "192.168.1.44", "10.0.4.90"];
const auditSeed: Omit<AuditEntry, "id" | "ip">[] = [
  { at: "2026-11-12T16:58:00Z", actor: "Jaseel Faizy", role: "manager", action: "LOGIN", target: "Dept Fiqh", details: "Signed in from staff room terminal", sector: "dept-fiqh" },
  { at: "2026-11-12T15:41:00Z", actor: "Hamza Saqafi", role: "manager", action: "CREATE_ENTRY", target: "S0131 · Fathima Zahra", details: "Credit ₹5,000 · Fee Payment · OF-1452", sector: "office" },
  { at: "2026-11-12T12:20:00Z", actor: "Abdulla K.", role: "admin", action: "ASSIGN_SECTOR", target: "Mujeeb Baqavi", details: "Assigned Office, Velitcham Welfare", },
  { at: "2026-11-12T10:02:00Z", actor: "Safwan K.", role: "student", action: "LOGIN", target: "S0125", details: "Student portal sign-in" },
  { at: "2026-11-09T11:04:00Z", actor: "Jaseel Faizy", role: "manager", action: "BULK_POST", target: "B-2611-04", details: "Study Tour Fee · ₹500 × 14 students · Fiqh 2", sector: "dept-fiqh" },
  { at: "2026-11-08T09:30:00Z", actor: "Abdulla K.", role: "admin", action: "IMPORT_STUDENTS", target: "Thanawiyya 1 intake", details: "Imported 18 students (2 rejected)" },
  { at: "2026-11-06T14:12:00Z", actor: "Rashid Wafy", role: "manager", action: "VOID_ENTRY", target: "VW-581", details: "Receipt cancelled by office", sector: "velitcham-welfare" },
  { at: "2026-11-04T08:48:00Z", actor: "Abdulla K.", role: "admin", action: "INVITE_ADMIN", target: "Mujeeb Baqavi", details: "Invitation sent to mujeeb@islahululoom.edu.in" },
  { at: "2026-10-31T16:25:00Z", actor: "Anees Rahmani", role: "manager", action: "EXPORT", target: "Civil 1 report", details: "Class-wise report exported as PDF", sector: "dept-civil" },
  { at: "2026-10-19T10:15:00Z", actor: "Rashid Wafy", role: "manager", action: "BULK_POST", target: "B-2610-19", details: "Hostel Mess Bill · ₹2,400 × 19 students", sector: "velitcham-welfare" },
  { at: "2026-10-11T10:21:00Z", actor: "Anees Rahmani", role: "manager", action: "BULK_POST", target: "B-2610-11", details: "Field Visit · ₹650 · Civil 1", sector: "dept-civil" },
  { at: "2026-10-03T09:12:00Z", actor: "Shameer Hudawi", role: "manager", action: "VOID_BATCH", target: "B-2610-02", details: "Duplicate posting — amount revised to ₹300", sector: "ihsan-union" },
  { at: "2026-10-02T13:40:00Z", actor: "Shameer Hudawi", role: "manager", action: "BULK_POST", target: "B-2610-02", details: "Arts Fest Contribution · ₹350 × 24 students", sector: "ihsan-union" },
  { at: "2026-09-28T11:00:00Z", actor: "Abdulla K.", role: "admin", action: "UPDATE_SECTOR", target: "Office", details: "Term target set to ₹14,50,000" },
  { at: "2026-09-27T10:56:00Z", actor: "Hamza Saqafi", role: "manager", action: "BULK_POST", target: "B-2609-27", details: "Exam Fee · ₹750 × 30 students", sector: "office" },
  { at: "2026-09-20T09:10:00Z", actor: "Abdulla K.", role: "admin", action: "ADD_STUDENT", target: "S0158 · Nabeel Qasim", details: "Added to Hifz" },
  { at: "2026-09-02T11:30:00Z", actor: "Hamza Saqafi", role: "manager", action: "VOID_ENTRY", target: "OF-1047", details: "Wrong student selected", sector: "office" },
  { at: "2026-08-30T15:44:00Z", actor: "Safwan K.", role: "student", action: "UPDATE_PROFILE", target: "S0125", details: "Phone number updated" },
];
export const AUDIT: AuditEntry[] = auditSeed.map((a, i) => ({ ...a, id: `AU${String(9000 - i)}`, ip: IPS[i % IPS.length]! }));

export const NOTICES: Notice[] = [
  { id: "N1", kind: "debit", title: "Study Tour Fee posted", body: "₹500 debited from your Dept Fiqh account for the Ooty study tour.", at: "2026-11-09T11:04:00Z", read: false, sector: "dept-fiqh" },
  { id: "N2", kind: "due", title: "Mess bill due", body: "Your Velitcham Welfare balance is running low. Please deposit before 20 Nov.", at: "2026-11-08T08:00:00Z", read: false, sector: "velitcham-welfare" },
  { id: "N3", kind: "credit", title: "Deposit received", body: "₹3,000 credited to your Office account. Receipt OF-1398.", at: "2026-11-02T13:22:00Z", read: false, sector: "office" },
  { id: "N4", kind: "info", title: "Term 2 statements ready", body: "Download sector-wise statements from your ledger pages.", at: "2026-10-28T09:00:00Z", read: true },
  { id: "N5", kind: "debit", title: "Hostel Mess Bill", body: "₹2,400 debited for October mess charges.", at: "2026-10-19T10:15:00Z", read: true, sector: "velitcham-welfare" },
  { id: "N6", kind: "info", title: "Arts fest entry corrected", body: "A duplicate Ihsan Union entry was voided. Your balance has been restored.", at: "2026-10-03T09:12:00Z", read: true, sector: "ihsan-union" },
  { id: "N7", kind: "credit", title: "Scholarship credited", body: "₹1,500 Dept Fiqh merit scholarship added to your account.", at: "2026-09-21T12:00:00Z", read: true, sector: "dept-fiqh" },
];

export const SUPER_ADMIN = { name: "Abdulla K.", title: "Principal · Super Admin", email: "principal@islahululoom.edu.in" };
export const DEFAULT_MANAGER_SECTOR: SectorSlug = "dept-fiqh";
export const managerNameFor = (s: SectorSlug) => SECTOR_CREATOR[s] ?? "Sector manager";

export const asSector = (s: string): SectorSlug => s;
