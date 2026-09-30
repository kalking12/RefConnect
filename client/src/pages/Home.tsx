import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { BrandLockup } from "@/components/BrandMark";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import {
  CAPABILITY_DEFINITIONS,
  PROCEDURE_SPECIALTIES,
  readinessTier,
  SURGERY_TYPES,
} from "@shared/readiness";
import {
  ArrowRight,
  Building2,
  Check,
  CircleAlert,
  ClipboardCheck,
  MapPin,
  Search,
  SlidersHorizontal,
  Stethoscope,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";

type Hospital = {
  id: string;
  name: string;
  shortName: string | null;
  ownership: string;
  facilityLevel: string;
  grade: number | null;
  lga: string;
  ward: string | null;
  description: string | null;
  active: boolean;
  sourceNote: string | null;
  isIllustrative: boolean;
  capabilities: Record<string, number>;
  scores: Record<string, number>;
};

type PatientProfile = {
  id: string;
  displayName: string;
  patientReference: string;
  conditionSummary: string;
  isDemonstration: boolean;
};

const tierStyles = {
  ready: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
  conditional: "bg-amber-50 text-amber-700 ring-amber-600/15",
  "not-ready": "bg-rose-50 text-rose-700 ring-rose-600/15",
};

const PORTAL_IMAGES = {
  publicHeader: "/preview/hero-clinicians.png",
};

const ILLUSTRATIVE_REFERRAL_MESSAGE =
  "This hospital uses demonstration readiness data. Use a demo profile for a demo referral, or choose a hospital with verified data for a real profile.";
function procedureFromUrl() {
  const id = new URLSearchParams(window.location.search).get("procedure");
  return SURGERY_TYPES.find(procedure => procedure.id === id) ?? null;
}

function createRequestId() {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, "0"));
  return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`;
}

function ReadinessRing({
  score,
  size = 76,
}: {
  score: number | null;
  size?: number;
}) {
  const tier = score === null ? null : readinessTier(score);
  const color =
    tier?.tone === "ready"
      ? "#0b8d61"
      : tier?.tone === "conditional"
        ? "#c07a16"
        : tier
          ? "#cc4a3c"
          : "#b5c7be";
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const dash = ((score ?? 0) / 100) * circumference;
  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={
        tier
          ? `${score}% readiness: ${tier.label}`
          : "Readiness score unavailable"
      }
    >
      <svg
        viewBox="0 0 96 96"
        className="h-full w-full -rotate-90"
        aria-hidden="true"
      >
        <circle
          cx="48"
          cy="48"
          r={radius}
          fill="none"
          stroke="#e4edf3"
          strokeWidth="8"
        />
        <circle
          cx="48"
          cy="48"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference - dash}`}
        />
      </svg>
      <div
        className="absolute inset-0 flex flex-col items-center justify-center"
        aria-hidden="true"
      >
        <span className="font-[Poppins] text-base font-bold text-[#173f63]">
          {score === null ? "—" : `${score}%`}
        </span>
      </div>
    </div>
  );
}

function CapabilityDots({
  capability,
  level,
}: {
  capability: string;
  level: number;
}) {
  const item = CAPABILITY_DEFINITIONS.find(entry => entry.key === capability);
  if (!item) return null;
  const tone =
    level === 2
      ? "bg-emerald-500"
      : level === 1
        ? "bg-amber-400"
        : "bg-rose-400";
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-[#587180]">
      <span className={`h-1.5 w-1.5 rounded-full ${tone}`} aria-hidden="true" />
      <span>{item.label}</span>
    </span>
  );
}

function HospitalCard({
  hospital,
  surgeryId,
  rank,
  compared,
  onCompare,
  onRefer,
}: {
  hospital: Hospital;
  surgeryId: string;
  rank: number;
  compared: boolean;
  onCompare: () => void;
  onRefer: () => void;
}) {
  const rawScore = hospital.scores[surgeryId];
  const score = Number.isFinite(rawScore) ? rawScore : null;
  const tier = score === null ? null : readinessTier(score);
  const capabilities = Object.entries(hospital.capabilities)
    .filter(([, level]) => level > 0)
    .slice(0, 3);
  return (
    <article className="spotlight-card surface-shadow flex flex-col gap-5 rounded-[1.35rem] border border-[#dbe9f1] bg-white p-5 transition-shadow hover:shadow-[0_18px_44px_-26px_rgba(13,60,51,0.38)] md:flex-row md:items-start">
      <ReadinessRing score={score} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs uppercase tracking-[0.08em] text-[#406988]">
                Rank {rank}
              </span>
              {hospital.isIllustrative && (
                <span className="rounded-full bg-[#fff3dd] px-2 py-0.5 text-xs font-bold text-[#705b30]">
                  Demonstration data
                </span>
              )}
            </div>
            <h3 className="font-display text-[22px] leading-tight text-[#173f63]">
              {hospital.name}
              {hospital.shortName ? ` (${hospital.shortName})` : ""}
            </h3>
            <p className="mt-1 text-sm text-[#526b7b]">
              {hospital.ownership} ·{" "}
              {hospital.grade
                ? `Grade ${hospital.grade}`
                : hospital.facilityLevel}
            </p>
          </div>
          <span
            className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-bold ring-1 ${tier ? tierStyles[tier.tone] : "bg-[#eef7fc] text-[#526b7b] ring-[#c4ddeb]"}`}
          >
            {tier?.label ?? "Score unavailable"}
          </span>
        </div>
        {hospital.description && (
          <p className="mt-3 line-clamp-2 text-sm leading-6 text-[#4d6a7b]">
            {hospital.description}
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
          {capabilities.map(([key, level]) => (
            <CapabilityDots key={key} capability={key} level={level} />
          ))}
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Button
            onClick={onRefer}
            className="min-h-11 rounded-full bg-[#086aa9] px-4 text-sm font-bold hover:bg-[#116a9e]"
          >
            Prepare referral
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" aria-hidden="true" />
          </Button>
          <Button
            variant="outline"
            onClick={onCompare}
            aria-pressed={compared}
            aria-label={`${compared ? "Remove" : "Add"} ${hospital.name} ${compared ? "from" : "to"} comparison`}
            className={`min-h-11 rounded-full border-[#c6deed] px-4 text-sm font-bold ${compared ? "bg-[#e2f2fb] text-[#126c9c]" : "text-[#326483]"}`}
          >
            {compared ? (
              <Check className="mr-1.5 h-3.5 w-3.5" />
            ) : (
              <SlidersHorizontal className="mr-1.5 h-3.5 w-3.5" />
            )}
            {compared ? "Comparing" : "Compare"}
          </Button>
          <span className="ml-auto inline-flex items-center gap-1 text-sm text-[#526b7b]">
            <MapPin className="h-3.5 w-3.5" />
            {hospital.lga}
          </span>
        </div>
      </div>
    </article>
  );
}

function ComparisonBar({
  hospitals,
  surgeryId,
  onRemove,
}: {
  hospitals: Hospital[];
  surgeryId: string;
  onRemove: (id: string) => void;
}) {
  if (!hospitals.length) return null;
  const surgery =
    SURGERY_TYPES.find(entry => entry.id === surgeryId) ?? SURGERY_TYPES[0];
  const criteria = Object.entries(surgery.weights);

  return (
    <section
      id="comparison-results"
      tabIndex={-1}
      className="surface-shadow mb-7 scroll-mt-24 rounded-2xl border border-[#c4deee] bg-[#f5fbfe] p-4 md:p-5"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl text-[#173f63]">
            Compare hospitals
          </h2>
        </div>
        <span className="text-xs text-[#526b7b]">
          {hospitals.length} of 3 selected
        </span>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {hospitals.map(hospital => {
          const rawScore = hospital.scores[surgeryId];
          const score = Number.isFinite(rawScore) ? rawScore : null;
          const tier = score === null ? null : readinessTier(score);
          return (
            <div
              key={hospital.id}
              className="rounded-xl bg-white p-3 ring-1 ring-[#e3eef5]"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-bold text-[#234b69]">
                    {hospital.name}
                    {hospital.shortName ? ` (${hospital.shortName})` : ""}
                  </p>
                  {hospital.isIllustrative && (
                    <span className="text-xs font-semibold text-[#705b30]">
                      Demonstration data
                    </span>
                  )}
                </div>
                <button
                  onClick={() => onRemove(hospital.id)}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[#526b7b] hover:bg-[#edf7fc]"
                  aria-label={`Remove ${hospital.name} from comparison`}
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <span className="font-[Poppins] text-xl font-bold text-[#173f63]">
                  {score === null ? "—" : `${score}%`}
                </span>
                {score !== null && (
                  <Progress
                    value={score}
                    className="h-1.5 flex-1 bg-[#e7f0f7] [&>div]:bg-[#0b8d61]"
                  />
                )}
              </div>
              <p
                className={`mt-2 text-sm font-bold ${tier?.tone === "ready" ? "text-emerald-700" : tier?.tone === "conditional" ? "text-amber-700" : tier ? "text-rose-700" : "text-[#526b7b]"}`}
              >
                {tier?.label ?? "Score unavailable"}
              </p>
            </div>
          );
        })}
      </div>
      <p className="mt-5 text-sm text-[#526b7b] md:hidden">
        Scroll sideways to see all comparison values.
      </p>
      <div
        className="mt-2 overflow-x-auto rounded-xl border border-[#dceaf3] bg-white"
        role="region"
        aria-label="Capability comparison"
        tabIndex={0}
      >
        <table className="w-full min-w-[520px] border-collapse text-left text-sm">
          <thead className="bg-[#eef7fc] font-mono text-xs font-bold uppercase tracking-[0.08em] text-[#55758b]">
            <tr>
              <th scope="col" className="w-[40%] px-3 py-2">
                Weighted requirement
              </th>
              {hospitals.map(hospital => (
                <th
                  key={hospital.id}
                  scope="col"
                  className="min-w-[130px] px-3 py-2"
                >
                  {hospital.shortName ?? hospital.name}
                  {hospital.isIllustrative ? " (demo)" : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#edf3f8]">
            {criteria.map(([capabilityKey, weight]) => {
              const label =
                CAPABILITY_DEFINITIONS.find(
                  entry => entry.key === capabilityKey
                )?.label ?? capabilityKey;
              return (
                <tr key={capabilityKey}>
                  <th
                    scope="row"
                    className="px-3 py-2.5 font-medium text-[#345f79]"
                  >
                    {label}{" "}
                    <span className="font-mono text-xs font-normal text-[#526b7b]">
                      {weight}% wt
                    </span>
                  </th>
                  {hospitals.map(hospital => {
                    const level = hospital.capabilities[capabilityKey];
                    const value =
                      level === 2
                        ? "Available"
                        : level === 1
                          ? "Limited"
                          : level === 0
                            ? "Unavailable"
                            : "—";
                    const tone =
                      level === 2
                        ? "text-emerald-700"
                        : level === 1
                          ? "text-amber-700"
                          : level === 0
                            ? "text-rose-700"
                            : "text-[#526b7b]";
                    return (
                      <td
                        key={hospital.id}
                        className={`px-3 py-2.5 font-semibold ${tone}`}
                      >
                        {value}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function Home() {
  const { user, logout } = useAuth();
  const hospitalsQuery = trpc.showcase.hospitals.useQuery();
  const profilesQuery = trpc.showcase.profiles.useQuery();
  const referralMutation = trpc.showcase.createReferral.useMutation();
  const [selectedSurgery, setSelectedSurgery] = useState<string | null>(
    () => procedureFromUrl()?.id ?? null
  );
  const [pickerOpen, setPickerOpen] = useState(() => !procedureFromUrl());
  const [procedureSearch, setProcedureSearch] = useState("");
  const [openSpecialties, setOpenSpecialties] = useState<string[]>(() => [
    procedureFromUrl()?.specialty ?? PROCEDURE_SPECIALTIES[0],
  ]);
  const [comparisonIds, setComparisonIds] = useState<string[]>([]);
  const [referralHospital, setReferralHospital] = useState<Hospital | null>(
    null
  );
  const [selectedProfileId, setSelectedProfileId] = useState("");
  const [referralError, setReferralError] = useState<string | null>(null);
  const [referralNeedsRetry, setReferralNeedsRetry] = useState(false);
  const referralRequestIds = useRef(new Map<string, string>());
  const referralFailures = useRef(new Map<string, number>());
  const [isScrolled, setIsScrolled] = useState(false);

  const hospitals = (
    hospitalsQuery.isError ? [] : (hospitalsQuery.data ?? [])
  ) as Hospital[];
  const activeHospitals = hospitals.filter(hospital => hospital.active);
  const inactiveHospitals = hospitals.filter(hospital => !hospital.active);
  const profiles = (profilesQuery.data ?? []) as PatientProfile[];
  const profile = profilesQuery.isError
    ? null
    : profiles.length === 1
      ? profiles[0]
      : (profiles.find(item => item.id === selectedProfileId) ?? null);
  const isDemoReferral =
    Boolean(profile?.isDemonstration) ||
    Boolean(referralHospital?.isIllustrative);
  const blockedReferral =
    Boolean(profile) &&
    !profile?.isDemonstration &&
    Boolean(referralHospital?.isIllustrative);
  const referralKey =
    profile && referralHospital && selectedSurgery
      ? JSON.stringify([
          user?.id,
          profile.id,
          referralHospital.id,
          selectedSurgery,
        ])
      : null;
  const compared = useMemo(
    () =>
      activeHospitals.filter(hospital => comparisonIds.includes(hospital.id)),
    [activeHospitals, comparisonIds]
  );
  const surgery =
    SURGERY_TYPES.find(entry => entry.id === selectedSurgery) ?? null;
  const normalizedSearch = procedureSearch.trim().toLowerCase();
  const proceduresBySpecialty = useMemo(
    () =>
      PROCEDURE_SPECIALTIES.map(specialty => ({
        specialty,
        procedures: SURGERY_TYPES.filter(
          procedure =>
            procedure.specialty === specialty &&
            (!normalizedSearch ||
              `${procedure.name} ${procedure.shortName} ${procedure.description} ${procedure.specialty}`
                .toLowerCase()
                .includes(normalizedSearch))
        ),
      })).filter(group => group.procedures.length),
    [normalizedSearch]
  );
  const rankedHospitals = useMemo(
    () =>
      selectedSurgery
        ? [...activeHospitals].sort(
            (a, b) =>
              (Number.isFinite(b.scores[selectedSurgery])
                ? b.scores[selectedSurgery]
                : -1) -
              (Number.isFinite(a.scores[selectedSurgery])
                ? a.scores[selectedSurgery]
                : -1)
          )
        : [],
    [activeHospitals, selectedSurgery]
  );

  useEffect(() => {
    if (normalizedSearch)
      setOpenSpecialties(proceduresBySpecialty.map(group => group.specialty));
  }, [normalizedSearch, proceduresBySpecialty]);

  // A direct link survives Google sign-in's full reload. Browser history can
  // also change just the query string while this page remains mounted.
  useEffect(() => {
    const restoreProcedure = () => {
      const procedure = procedureFromUrl();
      setSelectedSurgery(procedure?.id ?? null);
      setPickerOpen(!procedure);
      setComparisonIds([]);
      setReferralHospital(null);
      if (procedure) {
        setOpenSpecialties(current =>
          current.includes(procedure.specialty)
            ? current
            : [...current, procedure.specialty]
        );
      }
    };
    window.addEventListener("popstate", restoreProcedure);
    return () => window.removeEventListener("popstate", restoreProcedure);
  }, []);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    const spotlightCards = Array.from(
      document.querySelectorAll<HTMLElement>(".spotlight-card")
    );
    let frame = 0;
    const pointerMove = (event: PointerEvent) => {
      const card = (event.target as HTMLElement).closest<HTMLElement>(
        ".spotlight-card"
      );
      if (!card || frame) return;
      frame = requestAnimationFrame(() => {
        const rect = card.getBoundingClientRect();
        card.style.setProperty("--spot-x", `${event.clientX - rect.left}px`);
        card.style.setProperty("--spot-y", `${event.clientY - rect.top}px`);
        frame = 0;
      });
    };
    spotlightCards.forEach(card =>
      card.addEventListener("pointermove", pointerMove)
    );
    return () => {
      window.removeEventListener("scroll", onScroll);
      spotlightCards.forEach(card =>
        card.removeEventListener("pointermove", pointerMove)
      );
      cancelAnimationFrame(frame);
    };
  }, [hospitalsQuery.data]);

  const chooseProcedure = (procedureId: string) => {
    const procedure = SURGERY_TYPES.find(item => item.id === procedureId);
    if (!procedure) return;
    setSelectedSurgery(procedure.id);
    const url = new URL(window.location.href);
    url.searchParams.set("procedure", procedure.id);
    window.history.replaceState(window.history.state, "", url);
    setPickerOpen(false);
    setComparisonIds([]);
    setReferralError(null);
    setReferralNeedsRetry(false);
    setReferralHospital(null);
    setOpenSpecialties(current =>
      current.includes(procedure.specialty)
        ? current
        : [...current, procedure.specialty]
    );
    requestAnimationFrame(() =>
      document.getElementById("selected-procedure-heading")?.focus()
    );
  };

  const toggleCompare = (id: string) => {
    setComparisonIds(current => {
      if (current.includes(id))
        return current.filter(selected => selected !== id);
      if (current.length >= 3) {
        toast.info("You can compare up to three hospitals at a time.");
        return current;
      }
      return [...current, id];
    });
  };

  const referralRequestId = (key: string) => {
    const existing = referralRequestIds.current.get(key);
    if (existing) return existing;
    // Keep the same operation ID after a reload in this tab. A retry is then
    // reconciled by the server instead of creating a second handoff.
    const storageKey = `refconnect:referral:${key}`;
    let id: string | null = null;
    try {
      id = window.sessionStorage.getItem(storageKey);
    } catch {
      // A disabled session store still permits safe retries in this page.
    }
    id ??= createRequestId();
    referralRequestIds.current.set(key, id);
    try {
      window.sessionStorage.setItem(storageKey, id);
    } catch {
      // In-memory ID remains stable while this page is open.
    }
    return id;
  };

  const clearReferralRequestId = (key: string) => {
    referralRequestIds.current.delete(key);
    referralFailures.current.delete(key);
    try {
      window.sessionStorage.removeItem(`refconnect:referral:${key}`);
    } catch {
      // Session storage may be disabled.
    }
  };

  const completeReferral = async () => {
    if (!profile || !referralHospital || !selectedSurgery || !referralKey)
      return;
    if (blockedReferral) {
      setReferralError(ILLUSTRATIVE_REFERRAL_MESSAGE);
      return;
    }
    setReferralError(null);
    setReferralNeedsRetry(false);
    try {
      await referralMutation.mutateAsync({
        requestId: referralRequestId(referralKey),
        profileId: profile.id,
        destinationHospitalId: referralHospital.id,
        surgeryTypeId: selectedSurgery,
      });
      toast.success(
        isDemoReferral
          ? "Demonstration referral record created. It has not been sent to a hospital."
          : `Referral record prepared for ${referralHospital.shortName ?? referralHospital.name}. Confirm acceptance with the hospital.`
      );
      clearReferralRequestId(referralKey);
      setReferralError(null);
      setReferralNeedsRetry(false);
      setReferralHospital(null);
    } catch (error) {
      const code = (error as { data?: { code?: string } } | null)?.data?.code;
      if (
        error instanceof Error &&
        error.message.includes("illustrative readiness data")
      ) {
        setReferralNeedsRetry(false);
        setReferralError(ILLUSTRATIVE_REFERRAL_MESSAGE);
      } else if (code === "BAD_REQUEST" || code === "CONFLICT" || code === "NOT_FOUND") {
        clearReferralRequestId(referralKey);
        setReferralNeedsRetry(false);
        setReferralError("This profile, hospital, or procedure is no longer available for this request. Refresh the page and choose again.");
      } else if (code === "UNAUTHORIZED" || code === "FORBIDDEN") {
        setReferralNeedsRetry(false);
        setReferralError("Your sign-in no longer permits this action. Refresh the page and sign in again.");
      } else {
        const failures = (referralFailures.current.get(referralKey) ?? 0) + 1;
        referralFailures.current.set(referralKey, failures);
        setReferralNeedsRetry(true);
        setReferralError(
          failures > 1
            ? "We still could not confirm the referral. Try again, or ask an administrator to check its status. The same request will be reused."
            : "We could not confirm whether the referral was saved. Try again; we will check the same request before creating a record."
        );
      }
    }
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#fffaf1] text-[#173f63]">
      <a
        href="#doctor-portal"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-2 focus:z-50 focus:rounded-lg focus:bg-white focus:p-3"
      >
        Skip to procedure search
      </a>
      <header
        className={`investor-nav sticky top-0 z-30 border-b border-[#dbe9f1]/80 bg-[#fffaf1]/90 ${isScrolled ? "nav-scrolled" : ""}`}
      >
        <div className="container flex min-h-[74px] flex-wrap items-center justify-between gap-2 py-2 sm:flex-nowrap">
          <Link
            href="/"
            aria-label="RefConnect introduction"
            className="shrink-0"
          >
            <BrandLockup className="h-11 w-[145px] sm:w-[180px]" />
          </Link>
          <nav
            aria-label="Page sections"
            className="hidden items-center gap-5 text-xs font-bold text-[#456b84] lg:flex"
          >
            <a href="#doctor-portal" className="hover:text-[#086aa9]">
              Find a hospital
            </a>
            <a href="#contact" className="hover:text-[#086aa9]">
              Contact
            </a>
          </nav>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <span className="hidden text-xs font-semibold text-[#547187] xl:inline">
              {user?.name || user?.email}
            </span>
            {user?.role === "admin" && (
              <Link
                href="/admin"
                className="inline-flex min-h-11 items-center rounded-full bg-[#086aa9] px-4 text-sm font-bold text-white hover:bg-[#116a9e]"
              >
                Admin
              </Link>
            )}
            <button
              type="button"
              onClick={() =>
                void logout().catch(() =>
                  toast.error("Sign-out failed. Reconnect and try again.")
                )
              }
              className="min-h-11 rounded-full border border-[#c6ddec] bg-white px-4 text-sm font-bold text-[#2c6080] hover:bg-[#f4f9fc]"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2">
        {compared.length > 0 && (
          <button
            type="button"
            onClick={() => {
              const comparison = document.getElementById("comparison-results");
              comparison?.scrollIntoView({
                behavior: "smooth",
                block: "start",
              });
              comparison?.focus({ preventScroll: true });
            }}
            className="inline-flex min-h-11 items-center rounded-full border border-[#93c9ec] bg-[#eff8fe] px-4 text-sm font-bold text-[#124b76] shadow-lg hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#269feb]"
            aria-label={`${compared.length} hospitals selected for comparison. Review comparison`}
          >
            {compared.length} compared · Review
          </button>
        )}
        <ThemeToggle />
      </div>
      <main>
        <section
          id="doctor-portal"
          className="container scroll-mt-24 py-7 lg:py-10"
          tabIndex={-1}
        >
          <div className="mesh-bg relative isolate overflow-hidden rounded-[1.5rem] border border-[#dbe9f2] bg-[#e8f5fc] px-5 py-7 sm:px-8 lg:px-10">
            <picture>
              <source
                srcSet="/preview/hero-clinicians.webp"
                type="image/webp"
              />
              <img
                src={PORTAL_IMAGES.publicHeader}
                alt=""
                width="1254"
                height="1254"
                decoding="async"
                fetchPriority="high"
                className="absolute inset-0 -z-20 h-full w-full object-cover object-center opacity-35"
              />
            </picture>
            <div
              className="hero-photo-scrim absolute inset-0 -z-10"
              aria-hidden="true"
            />
            <div className="inline-flex items-center gap-2 rounded-full bg-[#e8f5fc] px-3 py-1.5 font-mono text-xs font-bold uppercase tracking-[0.08em] text-[#086aa9]">
              <Stethoscope className="h-3.5 w-3.5" aria-hidden="true" />{" "}
              Referral planning
            </div>
            <h1 className="mt-3 max-w-2xl font-display text-[30px] leading-tight tracking-[-0.025em] text-[#173f63] sm:text-[36px]">
              Find a hospital by procedure
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#335d78]">
              Compare recorded capabilities and prepare a referral record.
              Demonstration scores are marked; confirm current capacity with the
              receiving hospital.
            </p>
          </div>
          <div
            className={`mt-5 gap-5 ${pickerOpen ? "grid xl:grid-cols-[360px_minmax(0,1fr)]" : ""}`}
          >
            {pickerOpen && (
              <aside
                id="procedure-picker"
                className={`surface-shadow rounded-2xl border border-[#d8e8f2] bg-white p-4 md:p-5 ${surgery ? "" : "order-2 xl:order-1"}`}
              >
                <label
                  htmlFor="procedure-search"
                  className="text-sm font-bold text-[#225778]"
                >
                  Search procedures
                </label>
                <div className="relative mt-3">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#526b7b]" />
                  <Input
                    id="procedure-search"
                    type="search"
                    value={procedureSearch}
                    onChange={event => setProcedureSearch(event.target.value)}
                    placeholder="Name, acronym or specialty"
                    className="h-11 border-[#c9dfea] bg-[#fdfefe] pl-10 text-sm"
                  />
                </div>
                {normalizedSearch && (
                  <p role="status" className="mt-3 text-sm text-[#526b7b]">
                    {proceduresBySpecialty.reduce(
                      (count, group) => count + group.procedures.length,
                      0
                    )}{" "}
                    matching procedures
                  </p>
                )}
                <Accordion
                  type="multiple"
                  value={openSpecialties}
                  onValueChange={setOpenSpecialties}
                  className="mt-4 border-t border-[#e3edf4]"
                >
                  {proceduresBySpecialty.map(({ specialty, procedures }) => (
                    <AccordionItem
                      key={specialty}
                      value={specialty}
                      className="border-b-[#e3edf4]"
                    >
                      <AccordionTrigger className="min-h-11 py-3 text-left text-sm font-bold text-[#2b607e] hover:no-underline">
                        <span>{specialty}</span>
                        <span className="mr-2 rounded-full bg-[#ebf6fc] px-2 py-0.5 font-mono text-xs text-[#406988]">
                          {procedures.length}
                        </span>
                      </AccordionTrigger>
                      <AccordionContent className="pb-3">
                        <div className="space-y-1">
                          {procedures.map(procedure => (
                            <button
                              key={procedure.id}
                              onClick={() => chooseProcedure(procedure.id)}
                              aria-pressed={selectedSurgery === procedure.id}
                              className={`min-h-11 w-full rounded-lg px-3 py-2 text-left text-sm leading-5 transition-colors ${selectedSurgery === procedure.id ? "bg-[#086aa9] font-bold text-white" : "text-[#4e6b7b] hover:bg-[#edf7fd] hover:text-[#173f63]"}`}
                            >
                              <span className="block">{procedure.name}</span>
                              {procedure.shortName !== procedure.name && (
                                <span
                                  className={`mt-0.5 block font-mono text-xs ${selectedSurgery === procedure.id ? "text-white/85" : "text-[#526b7b]"}`}
                                >
                                  {procedure.shortName}
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
                {!proceduresBySpecialty.length && (
                  <div className="mt-4 rounded-xl bg-[#f4f9fc] p-4 text-center text-sm text-[#4e6b7b]">
                    No matching procedure. Try a name, acronym or specialty.
                  </div>
                )}
              </aside>
            )}
            <div
              className={`surface-shadow rounded-2xl border border-[#d8e8f2] bg-white p-5 md:p-6 ${surgery ? "" : "order-1 xl:order-2"}`}
            >
              {surgery ? (
                <>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="font-mono text-xs font-bold uppercase tracking-[.08em] text-[#086aa9]">
                        Selected procedure · {surgery.specialty}
                      </p>
                      <h2
                        id="selected-procedure-heading"
                        tabIndex={-1}
                        aria-live="polite"
                        className="mt-2 font-display text-[30px] leading-tight text-[#173f63]"
                      >
                        {surgery.name}
                      </h2>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      aria-expanded={pickerOpen}
                      aria-controls={pickerOpen ? "procedure-picker" : undefined}
                      onClick={() => {
                        setPickerOpen(open => !open);
                        if (!pickerOpen) {
                          requestAnimationFrame(() =>
                            document.getElementById("procedure-search")?.focus()
                          );
                        }
                      }}
                      className="min-h-11 rounded-full border-[#a8cfe7] text-[#145b88]"
                    >
                      {pickerOpen ? "Hide procedure list" : "Change procedure"}
                    </Button>
                  </div>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-[#526b7b]">
                    {surgery.description}
                  </p>
                  {!hospitalsQuery.isLoading && !hospitalsQuery.isError && (
                    <p
                      role="status"
                      className="mt-5 rounded-xl border border-[#dbe9f2] bg-[#f5fbfe] p-4 text-sm leading-6 text-[#335d78]"
                    >
                      {rankedHospitals.length} active{" "}
                      {rankedHospitals.length === 1 ? "hospital" : "hospitals"}{" "}
                      available.
                    </p>
                  )}
                </>
              ) : (
                <div
                  role="status"
                  className="flex h-full flex-col justify-center"
                >
                  <p className="font-mono text-xs font-bold uppercase tracking-[.08em] text-[#086aa9]">
                    Start here
                  </p>
                  <h2 className="mt-2 font-display text-[30px] leading-tight text-[#173f63]">
                    Choose a procedure to see ranked hospitals
                  </h2>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-[#526b7b]">
                    Search or browse the procedures, then select one to review
                    facility capabilities.
                  </p>
                </div>
              )}
            </div>
          </div>
          {surgery && hospitalsQuery.isError && (
            <div
              role="alert"
              className="mt-7 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
            >
              Hospitals could not load.{" "}
              <button
                type="button"
                className="inline-flex min-h-11 items-center font-bold underline"
                onClick={() => void hospitalsQuery.refetch()}
              >
                Try again
              </button>
            </div>
          )}
          {surgery &&
            !hospitalsQuery.isError &&
            !hospitalsQuery.isLoading &&
            rankedHospitals.length === 0 && (
              <p className="mt-7 rounded-xl border border-[#dbe9f2] bg-white p-5 text-sm text-[#526b7b]">
                No hospitals are active for referral yet.
              </p>
            )}
          {surgery && (
            <ComparisonBar
              hospitals={compared}
              surgeryId={surgery.id}
              onRemove={id =>
                setComparisonIds(current => current.filter(item => item !== id))
              }
            />
          )}
          {surgery && hospitalsQuery.isLoading && (
            <p role="status" className="mt-7 text-sm text-[#335d78]">
              Loading hospitals…
            </p>
          )}
          {surgery && (
            <div
              className="mt-7 grid gap-4 xl:grid-cols-2"
              aria-busy={hospitalsQuery.isLoading}
            >
              {hospitalsQuery.isLoading
                ? Array.from({ length: 4 }).map((_, index) => (
                    <div
                      key={index}
                      className="h-64 animate-pulse rounded-2xl bg-[#e6f2f9]"
                      aria-hidden="true"
                    />
                  ))
                : rankedHospitals.map((hospital, index) => (
                    <HospitalCard
                      key={hospital.id}
                      hospital={hospital}
                      surgeryId={surgery.id}
                      rank={index + 1}
                      compared={comparisonIds.includes(hospital.id)}
                      onCompare={() => toggleCompare(hospital.id)}
                      onRefer={() => {
                        setReferralError(null);
                        setReferralNeedsRetry(false);
                        setSelectedProfileId("");
                        setReferralHospital(hospital);
                      }}
                    />
                  ))}
            </div>
          )}
        </section>

        {surgery && inactiveHospitals.length > 0 && (
          <section
            id="network"
            className="border-y border-[#dbe8f1] bg-[#edf7fc]"
          >
            <div className="container py-10 lg:py-12">
              <h2 className="font-display text-[28px] text-[#234b69]">
                Directory entries awaiting onboarding
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#526b7b]">
                These facilities cannot be compared or selected for referral
                here.
              </p>
              <details className="mt-5 rounded-2xl border border-[#d7e7f1] bg-white p-4">
                <summary className="cursor-pointer text-sm font-bold text-[#225778]">
                  Browse {inactiveHospitals.length} inactive listings
                </summary>
                <p className="mt-4 flex items-center gap-2 text-sm text-[#526b7b]">
                  <CircleAlert className="h-4 w-4 shrink-0 text-[#996d21]" /> A
                  directory listing does not confirm available services.
                </p>
                <div className="mt-3 grid max-h-[360px] overflow-auto sm:grid-cols-2">
                  {inactiveHospitals.map(hospital => (
                    <div
                      key={hospital.id}
                      className="flex items-center gap-3 border-b border-[#edf3f8] p-3"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#edf3f8] text-[#667d8a]">
                        <Building2 className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-[#3d637a]">
                          {hospital.name}
                        </p>
                        <p className="mt-0.5 text-sm text-[#526b7b]">
                          {hospital.facilityLevel} · {hospital.lga}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            </div>
          </section>
        )}

        <footer id="contact" className="border-t border-[#dbe8f1] bg-[#edf7fc]">
          <div className="container grid gap-8 py-10 lg:grid-cols-[1.1fr_.9fr]">
            <div>
              <BrandLockup className="h-16 w-[230px]" />
              <p className="mt-3 max-w-xl text-sm leading-6 text-[#526b7b]">
                Referral planning for healthcare centres in Nigeria.
              </p>
              <p className="mt-6 text-sm text-[#526b7b]">
                © {new Date().getFullYear()} RefConnect
              </p>
            </div>
            <div className="rounded-2xl border border-[#d6e7f1] bg-white p-5">
              <h2 className="text-sm font-bold text-[#225778]">
                About RefConnect
              </h2>
              <p className="mt-3 text-sm leading-6 text-[#44667d]">
                See how the referral planning workflow works and meet the team.
              </p>
              <Link
                href="/#about"
                className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-[#086aa9] hover:underline"
              >
                Visit About RefConnect
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </footer>
      </main>

      <Dialog
        open={!!referralHospital}
        onOpenChange={open => {
          if (!open) {
            setReferralError(null);
            setReferralNeedsRetry(false);
            setSelectedProfileId("");
            setReferralHospital(null);
          }
        }}
      >
        <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-md overflow-y-auto border-[#d9e8f1] bg-[#fdfefe]">
          <DialogHeader>
            <p className="font-mono text-xs font-bold uppercase tracking-[0.08em] text-[#086aa9]">
              Referral record
            </p>
            <DialogTitle className="font-display text-2xl text-[#173f63]">
              Prepare referral for{" "}
              {referralHospital?.shortName ?? referralHospital?.name}
            </DialogTitle>
            <DialogDescription
              role={referralError ? "alert" : "status"}
              className="pt-2 text-sm leading-6 text-[#4d697b]"
            >
              {referralError
                ? referralError
                : blockedReferral
                  ? ILLUSTRATIVE_REFERRAL_MESSAGE
                  : isDemoReferral
                    ? "Demonstration only. This record is not for patient care and will not be sent to the hospital."
                    : "This saves a record in RefConnect; it does not notify the hospital or confirm acceptance."}
            </DialogDescription>
          </DialogHeader>
          {profiles.length > 1 && !profilesQuery.isError && (
            <div className="space-y-2">
              <label
                htmlFor="referral-profile"
                className="block text-sm font-bold text-[#225778]"
              >
                Referral profile
              </label>
              <select
                id="referral-profile"
                value={selectedProfileId}
                onChange={event => {
                  setSelectedProfileId(event.target.value);
                  setReferralError(null);
                  setReferralNeedsRetry(false);
                }}
                disabled={referralMutation.isPending}
                className="min-h-11 w-full rounded-lg border border-[#c9dfea] bg-white px-3 text-sm text-[#234b69]"
              >
                <option value="">Choose a profile</option>
                {profiles.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.displayName} · {item.patientReference}
                    {item.isDemonstration ? " (demo)" : ""}
                  </option>
                ))}
              </select>
            </div>
          )}
          {profile ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-[#d8e8f2] bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-[#234b69]">
                      {profile.displayName}
                    </p>
                    <p className="mt-1 font-mono text-sm text-[#526b7b]">
                      {profile.patientReference}
                    </p>
                  </div>
                  {profile.isDemonstration && (
                    <span className="rounded-full bg-[#fff0d5] px-2 py-1 text-xs font-bold text-[#705b30]">
                      Demo profile
                    </span>
                  )}
                </div>
                {!profile.isDemonstration && (
                  <p className="mt-3 text-sm leading-6 text-[#526b7b]">
                    {profile.conditionSummary}
                  </p>
                )}
              </div>
              <p className="rounded-xl border border-[#dbe9f1] bg-[#f0f8fc] p-3 text-sm leading-6 text-[#4d697b]">
                <span className="font-bold text-[#275e7c]">Procedure:</span>{" "}
                {surgery?.name ?? "Choose a procedure"}
              </p>
              <Button
                onClick={completeReferral}
                disabled={referralMutation.isPending || blockedReferral}
                className="min-h-11 w-full rounded-full bg-[#086aa9] text-sm font-bold hover:bg-[#116a9e]"
              >
                <ClipboardCheck className="mr-2 h-4 w-4" aria-hidden="true" />
                {referralMutation.isPending
                  ? "Preparing referral…"
                  : referralNeedsRetry
                    ? "Try again"
                    : "Prepare referral"}
              </Button>
            </div>
          ) : (
            <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
              <p role={profilesQuery.isError ? "alert" : "status"}>
                {profilesQuery.isLoading
                  ? "Loading the referral profile…"
                  : profilesQuery.isError
                    ? "The referral profile could not load. Check your connection and try again."
                    : profiles.length > 1
                      ? "Choose a referral profile above to continue."
                      : "No referral profile is available yet. Ask your RefConnect administrator to set one up through your usual secure channel. Do not include patient details in the request."}
              </p>
              {!profilesQuery.isLoading &&
                !profilesQuery.isError &&
                profiles.length === 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-3 min-h-11"
                    onClick={() => {
                      if (!navigator.clipboard?.writeText) {
                        toast.error(
                          "Clipboard is unavailable. Ask your administrator to set up a referral profile."
                        );
                        return;
                      }
                      void navigator.clipboard
                        .writeText(
                          "Please set up a RefConnect referral profile for my account."
                        )
                        .then(() =>
                          toast.success(
                            "Profile request copied. Share it with your administrator."
                          )
                        )
                        .catch(() =>
                          toast.error(
                            "Could not copy the request. Ask your administrator to set up a referral profile."
                          )
                        );
                    }}
                  >
                    Copy profile request
                  </Button>
                )}
              {profilesQuery.isError && (
                <Button
                  type="button"
                  variant="outline"
                  className="mt-3 min-h-11"
                  onClick={() => void profilesQuery.refetch()}
                  disabled={profilesQuery.isFetching}
                >
                  {profilesQuery.isFetching ? "Trying again…" : "Try again"}
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
