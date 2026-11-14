import { createFileRoute, redirect } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  Building2,
  Check,
  ChevronDown,
  ChevronRight,
  Eye,
  FileCheck,
  Info,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  ShieldCheck,
  Sliders,
  Trash2,
  Upload,
  UserCheck,
  X,
} from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Btn } from "@/components/khazna/btn";
import { Field, GlassCard, PageHeader } from "@/components/khazna/primitives";
import {
  processLogoImage,
  processSealImage,
  processSignatureImage,
  validateImageFile,
} from "@/lib/khazna/image-pipeline";
import { useKhazna } from "@/lib/khazna/store";
import type {
  InstitutionProfile,
  Signatory,
  SignatoryRole,
  SignatureSlotConfig,
} from "@/lib/khazna/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/institution")({
  beforeLoad: () => {
    const role = useKhazna.getState().currentRole;
    if (role !== "admin") {
      throw redirect({ to: "/admin" });
    }
  },
  head: () => ({
    meta: [
      { title: "Institution Profile — Khazna" },
      { name: "description", content: "College identity, logo, seal, and authorized signatories." },
    ],
  }),
  component: InstitutionProfilePage,
});

const ROLE_OPTIONS: { value: SignatoryRole; label: string; scope?: "sector" | "class" }[] = [
  { value: "principal", label: "Principal / Head of Institution" },
  { value: "accounts_officer", label: "Accounts Officer" },
  { value: "hod", label: "Head of Department (HOD)", scope: "sector" },
  { value: "sector_manager", label: "Sector Manager", scope: "sector" },
  { value: "class_teacher", label: "Class Teacher", scope: "class" },
  { value: "other", label: "Other Official Signatory" },
];

function InstitutionProfilePage() {
  const profile = useKhazna((s) => s.institutionProfile);
  const signatories = useKhazna((s) => s.signatories);
  const signatureSlots = useKhazna((s) => s.signatureSlots);
  const sectors = useKhazna((s) => s.sectors);
  const classes = useKhazna((s) => s.classes);

  const updateProfile = useKhazna((s) => s.updateInstitutionProfile);
  const addSignatory = useKhazna((s) => s.addSignatory);
  const editSignatory = useKhazna((s) => s.editSignatory);
  const deleteSignatory = useKhazna((s) => s.deleteSignatory);
  const toggleSignatoryActive = useKhazna((s) => s.toggleSignatoryActive);
  const updateSignatureSlots = useKhazna((s) => s.updateSignatureSlots);

  // Local draft state for sticky save bar
  const [draftProfile, setDraftProfile] = useState<InstitutionProfile>(() => ({ ...profile }));
  const [draftSlots, setDraftSlots] = useState<SignatureSlotConfig>(() => ({ ...signatureSlots }));

  useEffect(() => {
    setDraftProfile({ ...profile });
  }, [profile]);

  useEffect(() => {
    setDraftSlots({ ...signatureSlots });
  }, [signatureSlots]);

  const hasUnsavedChanges = useMemo(() => {
    return (
      JSON.stringify(draftProfile) !== JSON.stringify(profile) ||
      JSON.stringify(draftSlots) !== JSON.stringify(signatureSlots)
    );
  }, [draftProfile, profile, draftSlots, signatureSlots]);

  // Unsaved changes warning
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Active section for navigation
  const [activeTab, setActiveTab] = useState<
    "identity" | "contact" | "logo" | "seal" | "signatories" | "verify" | "preview"
  >("identity");

  // Signatory modal state
  const [sigModalOpen, setSigModalOpen] = useState(false);
  const [editingSig, setEditingSig] = useState<Signatory | null>(null);

  // Logo file upload
  const logoInputRef = useRef<HTMLInputElement>(null);
  const sealInputRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const val = await validateImageFile(file);
    if (!val.valid) {
      toast.error(val.error || "Invalid image");
      return;
    }
    try {
      const { dataUrl } = await processLogoImage(file);
      setDraftProfile((prev) => ({
        ...prev,
        logo_path: dataUrl,
        logo_version: prev.logo_version + 1,
      }));
      toast.success("Logo uploaded and optimized to 512×512");
    } catch (err) {
      toast.error("Failed to process logo");
    } finally {
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  };

  const handleSealUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const val = await validateImageFile(file);
    if (!val.valid) {
      toast.error(val.error || "Invalid image");
      return;
    }
    try {
      const { dataUrl } = await processSealImage(file, { removeWhiteBg: true });
      setDraftProfile((prev) => ({
        ...prev,
        seal_path: dataUrl,
        seal_version: prev.seal_version + 1,
      }));
      toast.success("Official seal uploaded and transparent background applied");
    } catch (err) {
      toast.error("Failed to process seal");
    } finally {
      if (sealInputRef.current) sealInputRef.current.value = "";
    }
  };

  const handleSaveAll = () => {
    if (!draftProfile.name || draftProfile.name.trim().length < 2) {
      toast.error("College name must be at least 2 characters");
      return;
    }
    updateProfile(draftProfile);
    updateSignatureSlots(draftSlots);
    toast.success("Institution profile and signature settings saved successfully");
  };

  const handleDiscard = () => {
    setDraftProfile({ ...profile });
    setDraftSlots({ ...signatureSlots });
    toast.info("Changes discarded");
  };

  // Initials monogram fallback
  const monogramInitials = useMemo(() => {
    if (draftProfile.short_name) return draftProfile.short_name.slice(0, 3).toUpperCase();
    const parts = (draftProfile.name || "Khazna").trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  }, [draftProfile.short_name, draftProfile.name]);

  return (
    <div className="pb-32">
      <PageHeader
        eyebrow="Structure"
        title="Institution Profile"
        description="Configure your college's identity, logo, official seal, and signatories for professional reports."
        actions={
          <div className="flex items-center gap-2">
            <Btn
              variant={activeTab === "preview" ? "primary" : "outline"}
              onClick={() => setActiveTab(activeTab === "preview" ? "identity" : "preview")}
            >
              <Eye className="size-4" /> Live Header Preview
            </Btn>
          </div>
        }
      />

      {/* Navigation Pills */}
      <div className="no-scrollbar mb-6 flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { id: "identity", label: "Identity", icon: Building2 },
          { id: "contact", label: "Address & Contact", icon: MapPin },
          { id: "logo", label: "Logo & Crest", icon: Upload },
          { id: "seal", label: "Official Seal", icon: ShieldCheck },
          { id: "signatories", label: "Signatories & Slots", icon: UserCheck },
          { id: "verify", label: "Report Verification", icon: FileCheck },
          { id: "preview", label: "Live Preview", icon: Eye },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-medium transition-all whitespace-nowrap",
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "glass text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <Icon className="size-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div className="space-y-6">
        {/* SECTION 1: IDENTITY */}
        {activeTab === "identity" && (
          <GlassCard className="space-y-5 p-6">
            <div className="flex items-center gap-2.5 border-b border-hairline pb-4">
              <Building2 className="size-5 text-primary" />
              <div>
                <h3 className="text-base font-semibold text-foreground">College Identity</h3>
                <p className="text-xs text-muted-foreground">
                  Official name, affiliation, and registry details printed in report headers.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <Field label="College / Institution Full Name *">
                  <input
                    type="text"
                    value={draftProfile.name}
                    onChange={(e) => setDraftProfile({ ...draftProfile, name: e.target.value })}
                    maxLength={80}
                    placeholder="e.g. Islahul Uloom Arabic College"
                    className="w-full rounded-xl border border-input bg-background/50 px-3.5 py-2.5 text-sm font-medium outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                  <div className="mt-1 text-right text-[10px] text-muted-foreground">
                    {draftProfile.name.length} / 80 characters
                  </div>
                </Field>
              </div>

              <Field label="Short Name / Monogram Code">
                <input
                  type="text"
                  value={draftProfile.short_name || ""}
                  onChange={(e) => setDraftProfile({ ...draftProfile, short_name: e.target.value })}
                  maxLength={12}
                  placeholder="e.g. IUAC"
                  className="w-full rounded-xl border border-input bg-background/50 px-3.5 py-2.5 text-sm uppercase outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
                />
                <div className="mt-1 text-[11px] text-muted-foreground">
                  Used for monogram initials and report reference prefix (max 12 chars).
                </div>
              </Field>

              <Field label="Established Year">
                <input
                  type="text"
                  value={draftProfile.established_year || ""}
                  onChange={(e) => setDraftProfile({ ...draftProfile, established_year: e.target.value })}
                  maxLength={4}
                  placeholder="e.g. 1970"
                  className="w-full rounded-xl border border-input bg-background/50 px-3.5 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </Field>

              <div className="md:col-span-2">
                <Field label="Tagline / University Affiliation">
                  <input
                    type="text"
                    value={draftProfile.tagline || ""}
                    onChange={(e) => setDraftProfile({ ...draftProfile, tagline: e.target.value })}
                    maxLength={90}
                    placeholder="e.g. Affiliated to University of Calicut · Recognized under UGC"
                    className="w-full rounded-xl border border-input bg-background/50 px-3.5 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </Field>
              </div>

              <div className="md:col-span-2">
                <Field label="Institution Registration / License Number">
                  <input
                    type="text"
                    value={draftProfile.reg_no || ""}
                    onChange={(e) => setDraftProfile({ ...draftProfile, reg_no: e.target.value })}
                    maxLength={40}
                    placeholder="e.g. IUAC/REG/1970/KL"
                    className="w-full rounded-xl border border-input bg-background/50 px-3.5 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </Field>
              </div>
            </div>
          </GlassCard>
        )}

        {/* SECTION 2: ADDRESS & CONTACT */}
        {activeTab === "contact" && (
          <GlassCard className="space-y-5 p-6">
            <div className="flex items-center gap-2.5 border-b border-hairline pb-4">
              <MapPin className="size-5 text-primary" />
              <div>
                <h3 className="text-base font-semibold text-foreground">Address & Contact Details</h3>
                <p className="text-xs text-muted-foreground">
                  Displayed in the top contact row of issued official statements.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <Field label="Address Line 1">
                  <input
                    type="text"
                    value={draftProfile.address_line1 || ""}
                    onChange={(e) => setDraftProfile({ ...draftProfile, address_line1: e.target.value })}
                    placeholder="e.g. Islahul Uloom Campus, Post Box 12"
                    className="w-full rounded-xl border border-input bg-background/50 px-3.5 py-2.5 text-sm outline-none focus:border-primary"
                  />
                </Field>
              </div>

              <div className="md:col-span-2">
                <Field label="Address Line 2 (Optional)">
                  <input
                    type="text"
                    value={draftProfile.address_line2 || ""}
                    onChange={(e) => setDraftProfile({ ...draftProfile, address_line2: e.target.value })}
                    placeholder="e.g. P.O. Tanur, Near Central Mosque"
                    className="w-full rounded-xl border border-input bg-background/50 px-3.5 py-2.5 text-sm outline-none focus:border-primary"
                  />
                </Field>
              </div>

              <Field label="City / Town">
                <input
                  type="text"
                  value={draftProfile.city || ""}
                  onChange={(e) => setDraftProfile({ ...draftProfile, city: e.target.value })}
                  placeholder="e.g. Tanur"
                  className="w-full rounded-xl border border-input bg-background/50 px-3.5 py-2.5 text-sm outline-none focus:border-primary"
                />
              </Field>

              <Field label="District">
                <input
                  type="text"
                  value={draftProfile.district || ""}
                  onChange={(e) => setDraftProfile({ ...draftProfile, district: e.target.value })}
                  placeholder="e.g. Malappuram"
                  className="w-full rounded-xl border border-input bg-background/50 px-3.5 py-2.5 text-sm outline-none focus:border-primary"
                />
              </Field>

              <Field label="State">
                <input
                  type="text"
                  value={draftProfile.state || ""}
                  onChange={(e) => setDraftProfile({ ...draftProfile, state: e.target.value })}
                  placeholder="e.g. Kerala"
                  className="w-full rounded-xl border border-input bg-background/50 px-3.5 py-2.5 text-sm outline-none focus:border-primary"
                />
              </Field>

              <Field label="Pincode (6 Digits)">
                <input
                  type="text"
                  value={draftProfile.pincode || ""}
                  onChange={(e) => setDraftProfile({ ...draftProfile, pincode: e.target.value })}
                  maxLength={6}
                  placeholder="e.g. 676302"
                  className="w-full rounded-xl border border-input bg-background/50 px-3.5 py-2.5 text-sm outline-none focus:border-primary"
                />
              </Field>

              <Field label="Office Phone Number">
                <input
                  type="text"
                  value={draftProfile.phone || ""}
                  onChange={(e) => setDraftProfile({ ...draftProfile, phone: e.target.value })}
                  placeholder="e.g. +91 494 242 2234"
                  className="w-full rounded-xl border border-input bg-background/50 px-3.5 py-2.5 text-sm outline-none focus:border-primary"
                />
              </Field>

              <Field label="Finance / Accounts Email">
                <input
                  type="email"
                  value={draftProfile.email || ""}
                  onChange={(e) => setDraftProfile({ ...draftProfile, email: e.target.value })}
                  placeholder="e.g. accounts@islahululoom.edu.in"
                  className="w-full rounded-xl border border-input bg-background/50 px-3.5 py-2.5 text-sm outline-none focus:border-primary"
                />
              </Field>

              <div className="md:col-span-2">
                <Field label="Official Website">
                  <input
                    type="url"
                    value={draftProfile.website || ""}
                    onChange={(e) => setDraftProfile({ ...draftProfile, website: e.target.value })}
                    placeholder="e.g. https://islahululoom.edu.in"
                    className="w-full rounded-xl border border-input bg-background/50 px-3.5 py-2.5 text-sm outline-none focus:border-primary"
                  />
                </Field>
              </div>
            </div>
          </GlassCard>
        )}

        {/* SECTION 3: LOGO & CREST */}
        {activeTab === "logo" && (
          <GlassCard className="space-y-6 p-6">
            <div className="flex items-center gap-2.5 border-b border-hairline pb-4">
              <Upload className="size-5 text-primary" />
              <div>
                <h3 className="text-base font-semibold text-foreground">College Logo & Crest</h3>
                <p className="text-xs text-muted-foreground">
                  Displayed inside a 4px gold gradient ring at the top-left of every report.
                </p>
              </div>
            </div>

            <div className="flex flex-col items-center gap-6 sm:flex-row">
              {/* Gold Ring Preview */}
              <div className="flex flex-col items-center gap-2">
                <div
                  className="relative flex size-28 items-center justify-center rounded-full p-[4px] shadow-lg"
                  style={{
                    background: "linear-gradient(135deg, #E8B24A 0%, #FDE7B0 50%, #C9A24B 100%)",
                  }}
                >
                  <div className="relative flex size-full items-center justify-center overflow-hidden rounded-full border-[3px] border-[#0B2038] bg-[#0E2D4F]">
                    {draftProfile.logo_path ? (
                      <img
                        src={draftProfile.logo_path}
                        alt="Logo Preview"
                        className="size-full object-cover"
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center bg-gradient-to-br from-[#0E2D4F] to-[#08182B] text-2xl font-bold tracking-wider text-[#E8B24A]">
                        {monogramInitials}
                      </div>
                    )}
                  </div>
                </div>
                <span className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                  Header Look
                </span>
              </div>

              {/* Upload & Instructions */}
              <div className="flex-1 space-y-3 text-center sm:text-left">
                <div>
                  <h4 className="text-sm font-semibold text-foreground">
                    {draftProfile.logo_path ? "Custom Logo Active" : "Using Monogram Initials Fallback"}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Accepts PNG, JPG or WebP (SVG forbidden for security). Auto-cropped and resized to 512×512 square under 150 KB.
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={handleLogoUpload}
                  />
                  <Btn variant="primary" onClick={() => logoInputRef.current?.click()}>
                    <Upload className="size-4" />
                    {draftProfile.logo_path ? "Replace Logo" : "Upload Logo"}
                  </Btn>
                  {draftProfile.logo_path && (
                    <Btn
                      variant="outline"
                      onClick={() =>
                        setDraftProfile({ ...draftProfile, logo_path: "", logo_version: draftProfile.logo_version + 1 })
                      }
                    >
                      <Trash2 className="size-4 text-rose-500" /> Remove (Use Initials)
                    </Btn>
                  )}
                </div>
              </div>
            </div>
          </GlassCard>
        )}

        {/* SECTION 4: OFFICIAL SEAL */}
        {activeTab === "seal" && (
          <GlassCard className="space-y-6 p-6">
            <div className="flex items-center gap-2.5 border-b border-hairline pb-4">
              <ShieldCheck className="size-5 text-primary" />
              <div>
                <h3 className="text-base font-semibold text-foreground">Official Seal Stamp</h3>
                <p className="text-xs text-muted-foreground">
                  Embedded in the signature verification column at the bottom of the statement.
                </p>
              </div>
            </div>

            <div className="flex flex-col items-center gap-6 sm:flex-row">
              {/* Dual Light/Dark Seal Preview */}
              <div className="flex items-center gap-3">
                <div className="flex flex-col items-center gap-1.5">
                  <div className="flex size-24 items-center justify-center rounded-2xl border border-hairline bg-white p-2 shadow-inner">
                    {draftProfile.seal_path ? (
                      <img
                        src={draftProfile.seal_path}
                        alt="Seal on White"
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center rounded-full border-2 border-dashed border-slate-300 text-[10px] font-bold text-slate-400">
                        OFFICIAL SEAL
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground">On White Paper</span>
                </div>

                <div className="flex flex-col items-center gap-1.5">
                  <div className="flex size-24 items-center justify-center rounded-2xl border border-hairline bg-[#0E2D4F] p-2 shadow-inner">
                    {draftProfile.seal_path ? (
                      <img
                        src={draftProfile.seal_path}
                        alt="Seal on Dark"
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center rounded-full border-2 border-dashed border-slate-600 text-[10px] font-bold text-slate-500">
                        OFFICIAL SEAL
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground">On Dark/Tint</span>
                </div>
              </div>

              {/* Upload actions */}
              <div className="flex-1 space-y-3 text-center sm:text-left">
                <div>
                  <h4 className="text-sm font-semibold text-foreground">
                    {draftProfile.seal_path ? "Official Stamp Configured" : "Default Placeholder Stamp"}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Upload a circular or custom-shaped official college seal. The white background is automatically rendered transparent.
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                  <input
                    ref={sealInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={handleSealUpload}
                  />
                  <Btn variant="primary" onClick={() => sealInputRef.current?.click()}>
                    <Upload className="size-4" />
                    {draftProfile.seal_path ? "Replace Seal" : "Upload Seal"}
                  </Btn>
                  {draftProfile.seal_path && (
                    <Btn
                      variant="outline"
                      onClick={() =>
                        setDraftProfile({ ...draftProfile, seal_path: "", seal_version: draftProfile.seal_version + 1 })
                      }
                    >
                      <Trash2 className="size-4 text-rose-500" /> Clear
                    </Btn>
                  )}
                </div>
              </div>
            </div>
          </GlassCard>
        )}

        {/* SECTION 5: SIGNATORIES & SIGNATURE SLOTS */}
        {activeTab === "signatories" && (
          <div className="space-y-6">
            {/* Signature Slot Configuration Card */}
            <GlassCard className="space-y-4 p-5">
              <div className="flex items-center gap-2 border-b border-hairline pb-3">
                <Sliders className="size-4 text-primary" />
                <h4 className="text-sm font-semibold text-foreground">PDF 3-Slot Signature Mapping</h4>
              </div>
              <p className="text-xs text-muted-foreground">
                Khazna PDF statements provide 3 configurable signatory columns. Choose the label and which official role populates each column.
              </p>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {[
                  { key: "slot1" as const, num: "Slot 1 (Left Column)" },
                  { key: "slot2" as const, num: "Slot 2 (Middle Column)" },
                  { key: "slot3" as const, num: "Slot 3 (Right Column)" },
                ].map(({ key, num }) => (
                  <div key={key} className="glass-inset space-y-3 rounded-2xl p-3.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                      {num}
                    </span>
                    <Field label="Column Label">
                      <input
                        type="text"
                        value={draftSlots[key].label}
                        onChange={(e) =>
                          setDraftSlots({
                            ...draftSlots,
                            [key]: { ...draftSlots[key], label: e.target.value },
                          })
                        }
                        className="w-full rounded-lg border border-input bg-background/50 px-2.5 py-1.5 text-xs font-medium outline-none focus:border-primary"
                      />
                    </Field>
                    <Field label="Assigned Role">
                      <select
                        value={draftSlots[key].role}
                        onChange={(e) =>
                          setDraftSlots({
                            ...draftSlots,
                            [key]: { ...draftSlots[key], role: e.target.value as SignatoryRole },
                          })
                        }
                        className="w-full rounded-lg border border-input bg-background/50 px-2.5 py-1.5 text-xs outline-none focus:border-primary"
                      >
                        {ROLE_OPTIONS.map((ro) => (
                          <option key={ro.value} value={ro.value}>
                            {ro.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                ))}
              </div>
            </GlassCard>

            {/* Signatory Cards */}
            <GlassCard className="space-y-4 p-6">
              <div className="flex items-center justify-between border-b border-hairline pb-4">
                <div>
                  <h3 className="text-base font-semibold text-foreground">Authorized Signatories</h3>
                  <p className="text-xs text-muted-foreground">
                    Only one active signatory is permitted per role + scope.
                  </p>
                </div>
                <Btn
                  variant="primary"
                  onClick={() => {
                    setEditingSig(null);
                    setSigModalOpen(true);
                  }}
                >
                  <Plus className="size-4" /> Add Signatory
                </Btn>
              </div>

              {signatories.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-hairline p-8 text-center text-sm text-muted-foreground">
                  No signatories registered yet. Click "Add Signatory" to create one.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {signatories.map((sig) => (
                    <div
                      key={sig.id}
                      className={cn(
                        "glass hover-lift relative space-y-3 rounded-2xl border p-4 transition",
                        sig.active ? "border-hairline" : "opacity-60 border-dashed"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-sm font-semibold text-foreground">
                              {sig.full_name}
                            </span>
                            {sig.active ? (
                              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600">
                                Active
                              </span>
                            ) : (
                              <span className="rounded-full bg-slate-500/10 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                                Inactive
                              </span>
                            )}
                          </div>
                          <div className="text-xs font-medium text-muted-foreground">
                            {sig.designation}
                          </div>
                          <div className="mt-1 text-[11px] text-subtle">
                            Role: <span className="font-semibold text-foreground">{sig.role}</span>
                            {sig.sector_id && ` · Sector: ${sig.sector_id}`}
                            {sig.class_id && ` · Class: ${sig.class_id}`}
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <Btn
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingSig(sig);
                              setSigModalOpen(true);
                            }}
                            aria-label="Edit"
                          >
                            <Pencil className="size-3.5" />
                          </Btn>
                          <Btn
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (confirm(`Remove signatory ${sig.full_name}?`)) {
                                deleteSignatory(sig.id);
                                toast.success("Signatory removed");
                              }
                            }}
                            aria-label="Delete"
                          >
                            <Trash2 className="size-3.5 text-rose-500" />
                          </Btn>
                        </div>
                      </div>

                      {/* Signature Preview Line */}
                      <div className="space-y-1 rounded-xl bg-background/60 p-2.5">
                        <div className="flex h-12 items-center justify-center overflow-hidden">
                          {sig.signature_path ? (
                            <img
                              src={sig.signature_path}
                              alt="Signature"
                              className="max-h-full max-w-[160px] object-contain"
                            />
                          ) : (
                            <span className="text-[11px] italic text-muted-foreground">
                              Blank signature (hand-signing mode)
                            </span>
                          )}
                        </div>
                        <div className="h-[1px] w-full bg-slate-300 dark:bg-slate-700" />
                        <div className="flex items-center justify-between text-[9px] text-muted-foreground">
                          <span>{sig.full_name}</span>
                          <span>Auto Date: Today (IST)</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between border-t border-hairline pt-2 text-[11px]">
                        <button
                          type="button"
                          onClick={() => {
                            const res = toggleSignatoryActive(sig.id);
                            if (!res.success) {
                              toast.error(res.error || "Cannot activate signatory");
                            } else {
                              toast.success(`Signatory ${sig.active ? "deactivated" : "activated"}`);
                            }
                          }}
                          className={cn(
                            "font-medium",
                            sig.active ? "text-amber-600 hover:underline" : "text-emerald-600 hover:underline"
                          )}
                        >
                          {sig.active ? "Deactivate" : "Activate"}
                        </button>
                        {sig.authorised_at && (
                          <span className="text-[10px] text-muted-foreground">
                            Consent confirmed
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>
          </div>
        )}

        {/* SECTION 6: REPORT VERIFICATION (QR) */}
        {activeTab === "verify" && (
          <GlassCard className="space-y-6 p-6">
            <div className="flex items-center gap-2.5 border-b border-hairline pb-4">
              <FileCheck className="size-5 text-primary" />
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  Public Report Verification (QR) Settings
                </h3>
                <p className="text-xs text-muted-foreground">
                  Control how long public verification copies remain available and privacy options.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <Field label="Verification Link Expiry">
                <select
                  value={draftProfile.verify_expiry}
                  onChange={(e) =>
                    setDraftProfile({
                      ...draftProfile,
                      verify_expiry: e.target.value as "never" | "1y" | "90d",
                    })
                  }
                  className="w-full rounded-xl border border-input bg-background/50 px-3.5 py-2.5 text-sm outline-none focus:border-primary"
                >
                  <option value="never">Never expire (Permanent audit snapshot)</option>
                  <option value="1y">1 Year from generation</option>
                  <option value="90d">90 Days from generation</option>
                </select>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  Expired links display a secure "This document is not available" screen.
                </div>
              </Field>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">
                  Public Copy Name Masking (Privacy)
                </label>
                <div className="flex items-center gap-3 rounded-xl border border-hairline bg-background/50 p-3.5">
                  <input
                    type="checkbox"
                    id="mask_names"
                    checked={draftProfile.verify_mask_names}
                    onChange={(e) =>
                      setDraftProfile({
                        ...draftProfile,
                        verify_mask_names: e.target.checked,
                      })
                    }
                    className="size-4 rounded accent-primary"
                  />
                  <label htmlFor="mask_names" className="text-xs text-muted-foreground cursor-pointer">
                    <span className="font-medium text-foreground block">
                      Mask student names on public verification copy
                    </span>
                    When enabled, scanned QR copies show names as initials only (e.g. S.K. instead of Safwan K.).
                  </label>
                </div>
              </div>
            </div>
          </GlassCard>
        )}

        {/* SECTION 7: LIVE HEADER & SIGNATURE PREVIEW */}
        {activeTab === "preview" && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-xs text-primary">
              <Info className="inline size-4 mr-1.5" />
              This live preview shows the exact gradient, geometric overlay, logo crest, and signature layout that will be rendered inside your downloadable PDF reports.
            </div>

            {/* Realistic PDF Header Card Mockup */}
            <div
              className="relative overflow-hidden rounded-[26px] p-6 text-white shadow-xl"
              style={{
                background: "linear-gradient(118deg, #08182B 0%, #0E2D4F 52%, #0D4A5A 100%)",
                minHeight: "204px",
              }}
            >
              {/* Radial Glows */}
              <div
                className="pointer-events-none absolute -top-16 -right-16 size-80 rounded-full blur-3xl"
                style={{ background: "rgba(249,115,22,0.55)" }}
              />
              <div
                className="pointer-events-none absolute -bottom-16 -left-16 size-72 rounded-full blur-3xl"
                style={{ background: "rgba(201,162,75,0.30)" }}
              />

              {/* Header Content Grid */}
              <div className="relative z-10 flex flex-col justify-between gap-6 md:flex-row md:items-start">
                {/* Left: Logo & College details */}
                <div className="flex items-start gap-5">
                  {/* Logo with Gold Ring */}
                  <div
                    className="relative flex size-20 shrink-0 items-center justify-center rounded-full p-[4px] shadow-lg"
                    style={{
                      background: "linear-gradient(135deg, #E8B24A 0%, #FDE7B0 50%, #C9A24B 100%)",
                    }}
                  >
                    <div className="relative flex size-full items-center justify-center overflow-hidden rounded-full border-[3px] border-[#0B2038] bg-[#0E2D4F]">
                      {draftProfile.logo_path ? (
                        <img
                          src={draftProfile.logo_path}
                          alt="Logo"
                          className="size-full object-cover"
                        />
                      ) : (
                        <span className="text-xl font-bold tracking-wider text-[#E8B24A]">
                          {monogramInitials}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <h2 className="font-serif text-2xl font-bold leading-tight tracking-tight text-white">
                      {draftProfile.name || "College Name"}
                    </h2>
                    <div className="text-[11px] font-semibold uppercase tracking-[2.2px] text-[#E8B24A]">
                      DEPT FIQH · DEPARTMENT LEDGER
                    </div>
                    <div className="text-xs text-[#B7C7DA]">
                      2026–27 · Term 2 {draftProfile.reg_no && `· Reg: ${draftProfile.reg_no}`}
                    </div>
                  </div>
                </div>

                {/* Right: Glass Card */}
                <div
                  className="rounded-2xl border border-white/20 p-4 backdrop-blur-md"
                  style={{
                    background: "linear-gradient(180deg, rgba(255,255,255,0.17) 0%, rgba(255,255,255,0.06) 100%)",
                    minWidth: "240px",
                  }}
                >
                  <span className="inline-block rounded-full bg-[#F97316] px-2 py-0.5 text-[8.5px] font-bold uppercase tracking-[1.6px] text-white">
                    Official Statement
                  </span>
                  <div className="mt-1 font-serif text-lg font-bold text-white">Account Statement</div>
                  <div className="text-[10px] text-[#C7D5E6]">Summary ledger with credit & debit</div>
                  <div className="my-2 border-t border-dashed border-white/20" />
                  <div className="flex items-center justify-between text-[10px]">
                    <div>
                      <div className="text-[#AFC2D8]">REFERENCE</div>
                      <div className="font-semibold text-white">KHZ-FQ2-20261114-001</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[#AFC2D8]">ISSUED</div>
                      <div className="font-semibold text-white">14 Nov 2026</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom 5px Gradient Line */}
              <div
                className="absolute bottom-0 inset-x-0 h-[5px]"
                style={{
                  background: "linear-gradient(90deg, #F97316 0%, #E8B24A 45%, transparent 100%)",
                }}
              />
            </div>

            {/* Realistic Signature Row Mockup */}
            <GlassCard className="p-6">
              <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Signature Block Preview
              </h4>
              <div className="grid grid-cols-4 gap-6">
                {[
                  { slot: draftSlots.slot1, label: draftSlots.slot1.label },
                  { slot: draftSlots.slot2, label: draftSlots.slot2.label },
                  { slot: draftSlots.slot3, label: draftSlots.slot3.label },
                ].map((item, idx) => {
                  const matchedSig = signatories.find(
                    (s) => s.active && s.role === item.slot.role
                  );
                  return (
                    <div key={idx} className="space-y-1.5 text-center">
                      <div className="flex h-12 items-center justify-center">
                        {matchedSig?.signature_path ? (
                          <img
                            src={matchedSig.signature_path}
                            alt="Signature"
                            className="max-h-full max-w-[140px] object-contain"
                          />
                        ) : (
                          <span className="text-[10px] text-muted-foreground italic">
                            (Hand signing space)
                          </span>
                        )}
                      </div>
                      <div className="h-[1px] w-full bg-[#AEB8C6]" />
                      <div className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground">
                        {item.label}
                      </div>
                      <div className="text-[10px] font-semibold text-foreground">
                        {matchedSig?.full_name || "—"}
                      </div>
                      <div className="text-[9px] text-muted-foreground">
                        {matchedSig?.designation || item.slot.role}
                      </div>
                      <div className="text-[8.5px] text-muted-foreground">
                        Date: 14 Nov 2026
                      </div>
                    </div>
                  );
                })}

                {/* Seal Column */}
                <div className="flex flex-col items-center justify-center space-y-1.5">
                  <div className="flex size-16 items-center justify-center">
                    {draftProfile.seal_path ? (
                      <img
                        src={draftProfile.seal_path}
                        alt="Seal"
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <div className="flex size-14 items-center justify-center rounded-full border-2 border-dashed border-slate-400 text-[8px] font-bold text-slate-500">
                        OFFICIAL SEAL
                      </div>
                    )}
                  </div>
                  <div className="text-[8px] uppercase tracking-wider text-muted-foreground font-semibold">
                    College Seal
                  </div>
                </div>
              </div>
            </GlassCard>
          </div>
        )}
      </div>

      {/* STICKY SAVE BAR */}
      <AnimatePresence>
        {hasUnsavedChanges && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="fixed bottom-20 md:bottom-6 inset-x-4 md:left-64 md:right-8 z-40"
          >
            <div className="glass-strong flex items-center justify-between rounded-2xl border border-primary/30 p-3.5 shadow-2xl backdrop-blur-xl">
              <div className="flex items-center gap-2 text-xs font-medium text-foreground">
                <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
                <span>You have unsaved changes in Institution Profile</span>
              </div>
              <div className="flex items-center gap-2">
                <Btn variant="ghost" size="sm" onClick={handleDiscard}>
                  Discard
                </Btn>
                <Btn variant="primary" size="sm" onClick={handleSaveAll}>
                  <Save className="size-3.5" /> Save Changes
                </Btn>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ADD / EDIT SIGNATORY MODAL */}
      <SignatoryModal
        open={sigModalOpen}
        onOpenChange={setSigModalOpen}
        signatory={editingSig}
        sectors={sectors}
        classes={classes}
        existingSignatories={signatories}
        onSave={(data) => {
          if (editingSig) {
            const res = editSignatory(editingSig.id, data);
            if (!res.success) {
              toast.error(res.error || "Failed to update signatory");
              return false;
            }
            toast.success("Signatory updated");
          } else {
            const res = addSignatory(data as any);
            if (!res.success) {
              toast.error(res.error || "Failed to add signatory");
              return false;
            }
            toast.success("Signatory added successfully");
          }
          setSigModalOpen(false);
          return true;
        }}
      />
    </div>
  );
}

// -----------------------------------------------------------------------------
// SIGNATORY MODAL COMPONENT (Canvas Draw Pad + Photo Clean-up Pipeline)
// -----------------------------------------------------------------------------

interface SignatoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  signatory: Signatory | null;
  sectors: { slug: string; name: string }[];
  classes: string[];
  existingSignatories: Signatory[];
  onSave: (data: Partial<Signatory>) => boolean;
}

function SignatoryModal({
  open,
  onOpenChange,
  signatory,
  sectors,
  classes,
  onSave,
}: SignatoryModalProps) {
  const [fullName, setFullName] = useState("");
  const [designation, setDesignation] = useState("");
  const [role, setRole] = useState<SignatoryRole>("accounts_officer");
  const [sectorId, setSectorId] = useState("");
  const [classId, setClassId] = useState("");
  const [active, setActive] = useState(true);
  const [consent, setConsent] = useState(false);

  // Signature source
  const [inputTab, setInputTab] = useState<"draw" | "upload">("draw");
  const [signatureDataUrl, setSignatureDataUrl] = useState("");
  const [threshold, setThreshold] = useState(215);
  const [inkColor, setInkColor] = useState<"black" | "blue">("black");

  // Canvas drawing state
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      if (signatory) {
        setFullName(signatory.full_name);
        setDesignation(signatory.designation);
        setRole(signatory.role);
        setSectorId(signatory.sector_id || "");
        setClassId(signatory.class_id || "");
        setActive(signatory.active);
        setConsent(true);
        setSignatureDataUrl(signatory.signature_path || "");
      } else {
        setFullName("");
        setDesignation("");
        setRole("accounts_officer");
        setSectorId("");
        setClassId("");
        setActive(true);
        setConsent(false);
        setSignatureDataUrl("");
      }
      setHasDrawn(false);
    }
  }, [open, signatory]);

  // Setup drawing canvas
  useEffect(() => {
    if (open && inputTab === "draw" && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = inkColor === "blue" ? "#0E2D4F" : "#18212F";
      }
    }
  }, [open, inputTab, inkColor]);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    setIsDrawing(true);
    setHasDrawn(true);
    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = async () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const { dataUrl } = await processSignatureImage(canvas.toDataURL(), {
        threshold,
        inkColor,
      });
      setSignatureDataUrl(dataUrl);
    } catch {
      // ignore
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureDataUrl("");
    setHasDrawn(false);
  };

  const handleSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const val = await validateImageFile(file);
    if (!val.valid) {
      toast.error(val.error || "Invalid file");
      return;
    }
    try {
      const { dataUrl } = await processSignatureImage(file, { threshold, inkColor });
      setSignatureDataUrl(dataUrl);
      toast.success("Signature processed with transparent background");
    } catch {
      toast.error("Failed to process signature image");
    } finally {
      if (uploadInputRef.current) uploadInputRef.current.value = "";
    }
  };

  const handleSave = () => {
    if (!fullName.trim() || fullName.length > 60) {
      toast.error("Full name is required (max 60 characters)");
      return;
    }
    if (!designation.trim() || designation.length > 50) {
      toast.error("Designation is required (max 50 characters)");
      return;
    }
    if ((role === "hod" || role === "sector_manager") && !sectorId) {
      toast.error("Please select a sector for this role");
      return;
    }
    if (role === "class_teacher" && !classId) {
      toast.error("Please select a class for this role");
      return;
    }
    if (!consent) {
      toast.error("Consent checkbox must be ticked to authorise signature use");
      return;
    }

    onSave({
      full_name: fullName.trim(),
      designation: designation.trim(),
      role,
      sector_id: sectorId || undefined,
      class_id: classId || undefined,
      signature_path: signatureDataUrl || undefined,
      active,
      authorised_at: new Date().toISOString(),
      authorised_by: "Super Admin",
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in-0">
      <div className="glass-strong flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-white/60 shadow-2xl">
        <div className="flex items-center justify-between border-b border-hairline px-6 py-4">
          <h3 className="text-base font-semibold text-foreground">
            {signatory ? "Edit Signatory" : "Add Authorized Signatory"}
          </h3>
          <button
            onClick={() => onOpenChange(false)}
            className="grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-accent"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-6 text-sm">
          <Field label="Full Name *">
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              maxLength={60}
              placeholder="e.g. Prof. Sayyid Munavvar Ali"
              className="w-full rounded-xl border border-input bg-background/50 px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </Field>

          <Field label="Official Designation *">
            <input
              type="text"
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
              maxLength={50}
              placeholder="e.g. Principal & Head of Institution"
              className="w-full rounded-xl border border-input bg-background/50 px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Signatory Role *">
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as SignatoryRole)}
                className="w-full rounded-xl border border-input bg-background/50 px-3 py-2 text-sm outline-none focus:border-primary"
              >
                {ROLE_OPTIONS.map((ro) => (
                  <option key={ro.value} value={ro.value}>
                    {ro.label}
                  </option>
                ))}
              </select>
            </Field>

            {(role === "hod" || role === "sector_manager") && (
              <Field label="Associated Sector *">
                <select
                  value={sectorId}
                  onChange={(e) => setSectorId(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background/50 px-3 py-2 text-sm outline-none focus:border-primary"
                >
                  <option value="">Select Sector...</option>
                  {sectors.map((s) => (
                    <option key={s.slug} value={s.slug}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </Field>
            )}

            {role === "class_teacher" && (
              <Field label="Associated Class *">
                <select
                  value={classId}
                  onChange={(e) => setClassId(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background/50 px-3 py-2 text-sm outline-none focus:border-primary"
                >
                  <option value="">Select Class...</option>
                  {classes.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </Field>
            )}
          </div>

          {/* Signature Input Mode */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">Signature Image</span>
              <div className="flex rounded-lg bg-muted/60 p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setInputTab("draw")}
                  className={cn(
                    "rounded-md px-2.5 py-1 font-medium transition",
                    inputTab === "draw" ? "bg-background shadow-xs text-foreground" : "text-muted-foreground"
                  )}
                >
                  Draw Pad
                </button>
                <button
                  type="button"
                  onClick={() => setInputTab("upload")}
                  className={cn(
                    "rounded-md px-2.5 py-1 font-medium transition",
                    inputTab === "upload" ? "bg-background shadow-xs text-foreground" : "text-muted-foreground"
                  )}
                >
                  Upload Photo
                </button>
              </div>
            </div>

            {inputTab === "draw" && (
              <div className="space-y-2">
                <div className="relative rounded-2xl border border-hairline bg-white dark:bg-slate-900 p-2 shadow-inner">
                  <canvas
                    ref={canvasRef}
                    width={440}
                    height={140}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="size-full touch-none cursor-crosshair rounded-xl bg-transparent"
                  />
                  {/* Faint Baseline Guide */}
                  <div className="pointer-events-none absolute bottom-8 inset-x-6 h-[1px] bg-slate-200 dark:bg-slate-800" />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground">Ink:</span>
                    <button
                      type="button"
                      onClick={() => setInkColor("black")}
                      className={cn(
                        "size-4 rounded-full border bg-black",
                        inkColor === "black" ? "ring-2 ring-primary ring-offset-1" : ""
                      )}
                      aria-label="Black ink"
                    />
                    <button
                      type="button"
                      onClick={() => setInkColor("blue")}
                      className={cn(
                        "size-4 rounded-full border bg-[#0E2D4F]",
                        inkColor === "blue" ? "ring-2 ring-primary ring-offset-1" : ""
                      )}
                      aria-label="Blue ink"
                    />
                  </div>
                  <Btn variant="ghost" size="sm" onClick={clearCanvas}>
                    <RotateCcw className="size-3" /> Clear
                  </Btn>
                </div>
              </div>
            )}

            {inputTab === "upload" && (
              <div className="space-y-3">
                <input
                  ref={uploadInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleSignatureUpload}
                />
                <div
                  onClick={() => uploadInputRef.current?.click()}
                  className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-hairline p-6 text-center cursor-pointer hover:border-primary/50 transition"
                >
                  <Upload className="size-6 text-muted-foreground" />
                  <span className="text-xs font-medium text-foreground">
                    Upload photo or scan of signature on white paper
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    PNG, JPG, or WebP up to 2 MB · Auto-cleans background to transparent
                  </span>
                </div>
              </div>
            )}

            {/* Signature Preview Over Document Line */}
            {signatureDataUrl && (
              <div className="rounded-xl border border-hairline bg-background/70 p-3 space-y-1">
                <span className="text-[10px] font-semibold uppercase text-muted-foreground">
                  Processed Result Over Document Line
                </span>
                <div className="flex h-14 items-center justify-center overflow-hidden">
                  <img
                    src={signatureDataUrl}
                    alt="Processed Signature"
                    className="max-h-full max-w-[180px] object-contain"
                  />
                </div>
                <div className="h-[1px] w-full bg-[#AEB8C6]" />
                <div className="text-center text-[10px] text-muted-foreground">
                  {fullName || "Name"} · {designation || "Designation"}
                </div>
              </div>
            )}
          </div>

          {/* Consent Checkbox */}
          <div className="flex items-start gap-2.5 rounded-xl border border-hairline bg-background/50 p-3 pt-3.5">
            <input
              type="checkbox"
              id="consent"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5 size-4 rounded accent-primary cursor-pointer"
            />
            <label htmlFor="consent" className="text-xs text-muted-foreground cursor-pointer">
              <span className="font-semibold text-foreground">Official Consent Confirmation (Required)</span>:
              I confirm this person has authorised the use of this signature on official college reports.
            </label>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="active_sig"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="size-4 rounded accent-primary cursor-pointer"
            />
            <label htmlFor="active_sig" className="text-xs font-medium text-foreground cursor-pointer">
              Set as Active Signatory for this role
            </label>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-hairline px-6 py-3.5">
          <Btn variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Btn>
          <Btn variant="primary" onClick={handleSave}>
            Save Signatory
          </Btn>
        </div>
      </div>
    </div>
  );
}
