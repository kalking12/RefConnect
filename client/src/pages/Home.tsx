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
import { useEffect, useMemo, useState } from "react";
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
const RETRY_REFERRAL_MESSAGE =
  "We could not confirm whether this record was saved. You can try again.";
const UNCERTAIN_REFERRAL_MESSAGE =
  "This still hasn't been confirmed after more than one attempt. Ask an administrator to check it before trying again.";

function procedureFromUrl() {
  const id = new URLSearchParams(window.location.search).get("procedure");
  return SURGERY_TYPES.find(procedure => procedure.id === id) ?? null;
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
          stroke="#e8efec"
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
        <span className="font-[Poppins] text-base font-bold text-[#1d3a35]">
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
    <span className="inline-flex items-center gap-1.5 text-xs text-[#59726b]">
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
  isDemonstration,
  demoReferralUnavailable,
  onCompare,
  onRefer,
}: {
  hospital: Hospital;
  surgeryId: string;
  rank: number;
  compared: boolean;
  isDemonstration: boolean;
  demoReferralUnavailable: boolean;
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
    <article className="spotlight-card surface-shadow flex flex-col gap-5 rounded-[1.35rem] border border-[#dfe9e5] bg-white p-5 transition-shadow hover:shadow-[0_18px_44px_-26px_rgba(13,60,51,0.38)] md:flex-row md:items-start">
      <ReadinessRing score={score} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs uppercase tracking-[0.08em] text-[#416b60]">
                Rank {rank}
              </span>
              {hospital.isIllustrative && (
                <span className="rounded-full bg-[#f4f0e7] px-2 py-0.5 text-xs font-bold text-[#705b30]">
                  Demonstration data
                </span>
              )}
            </div>
            <h3 className="font-display text-[22px] leading-tight text-[#173d36]">
              {hospital.name}
              {hospital.shortName ? ` (${hospital.shortName})` : ""}
            </h3>
            <p className="mt-1 text-sm text-[#526e65]">
              {hospital.ownership} ·{" "}
              {hospital.grade
                ? `Grade ${hospital.grade}`
                : hospital.facilityLevel}
            </p>
          </div>
          <span
            className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-bold ring-1 ${tier ? tierStyles[tier.tone] : "bg-[#f0f7f4] text-[#526e65] ring-[#c9ddd4]"}`}
          >
            {tier?.label ?? "Score unavailable"}
          </span>
        </div>
        {hospital.description && (
          <p className="mt-3 line-clamp-2 text-sm leading-6 text-[#4f6d64]">
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
            className="min-h-11 rounded-full bg-[#0b746b] px-4 text-sm font-bold hover:bg-[#075d57]"
          >
            Prepare referral
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" aria-hidden="true" />
          </Button>
          <Button
            variant="outline"
            onClick={onCompare}
            aria-pressed={compared}
            aria-label={`${compared ? "Remove" : "Add"} ${hospital.name} ${compared ? "from" : "to"} comparison`}
            className={`min-h-11 rounded-full border-[#cfe0da] px-4 text-sm font-bold ${compared ? "bg-[#e2f0eb] text-[#0c6c5d]" : "text-[#37655b]"}`}
          >
            {compared ? (
              <Check className="mr-1.5 h-3.5 w-3.5" />
            ) : (
              <SlidersHorizontal className="mr-1.5 h-3.5 w-3.5" />
            )}
            {compared ? "Comparing" : "Compare"}
          </Button>
          <span className="ml-auto inline-flex items-center gap-1 text-sm text-[#526e65]">
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
      id="comparison-bar"
      className="surface-shadow mb-7 scroll-mt-24 rounded-2xl border border-[#c9dfd7] bg-[#f7fcfa] p-4 md:p-5"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl text-[#173d36]">
            Compare hospitals
          </h2>
        </div>
        <span className="text-xs text-[#526e65]">
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
              className="rounded-xl bg-white p-3 ring-1 ring-[#e3ece8]"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-bold text-[#244840]">
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
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[#526e65] hover:bg-[#edf5f1]"
                  aria-label={`Remove ${hospital.name} from comparison`}
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <span className="font-[Poppins] text-xl font-bold text-[#173d36]">
                  {score === null ? "—" : `${score}%`}
                </span>
                {score !== null && (
                  <Progress
                    value={score}
                    className="h-1.5 flex-1 bg-[#e9f0ed] [&>div]:bg-[#0b8d61]"
                  />
                )}
              </div>
              <p
                className={`mt-2 text-sm font-bold ${tier?.tone === "ready" ? "text-emerald-700" : tier?.tone === "conditional" ? "text-amber-700" : tier ? "text-rose-700" : "text-[#526e65]"}`}
              >
                {tier?.label ?? "Score unavailable"}
              </p>
            </div>
          );
        })}
      </div>
      <p className="mt-5 text-sm text-[#526e65] md:hidden">
        Scroll sideways to see all comparison values.
      </p>
      <div
        className="mt-2 overflow-x-auto rounded-xl border border-[#dfeae5] bg-white"
        role="region"
        aria-label="Capability comparison"
        tabIndex={0}
      >
        <table className="w-full min-w-[520px] border-collapse text-left text-sm">
          <thead className="bg-[#f0f7f4] font-mono text-xs font-bold uppercase tracking-[0.08em] text-[#52776c]">
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
          <tbody className="divide-y divide-[#edf2ef]">
            {criteria.map(([capabilityKey, weight]) => {
              const label =
                CAPABILITY_DEFINITIONS.find(
                  entry => entry.key === capabilityKey
                )?.label ?? capabilityKey;
              return (
                <tr key={capabilityKey}>
                  <th
                    scope="row"
                    className="px-3 py-2.5 font-medium text-[#365f54]"
                  >
                    {label}{" "}
                    <span className="font-mono text-xs font-normal text-[#526e65]">
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
                            : "text-[#526e65]";
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
  const [procedureSearch, setProcedureSearch] = useState("");
  const [openSpecialties, setOpenSpecialties] = useState<string[]>(() => {
    const specialty = procedureFromUrl()?.specialty;
    return specialty ? [specialty] : [];
  });
  // A procedure chosen on the landing page arrives here already selected, so
  // the full picker starts collapsed to avoid asking the user to pick again.
  // It only starts open when nothing was chosen yet.
  const [pickerOpen, setPickerOpen] = useState(() => !procedureFromUrl());
  const [comparisonIds, setComparisonIds] = useState<string[]>([]);
  const [referralHospital, setReferralHospital] = useState<Hospital | null>(
    null
  );
  const [selectedProfileId, setSelectedProfileId] = useState("");
  const [referralError, setReferralError] = useState<string | null>(null);
  // Counts consecutive "could not confirm" failures per profile+hospital+
  // procedure combination. The first failure lets the user retry; only a
  // second consecutive failure for the same combination asks them to stop
  // and involve an administrator instead.
  const [uncertainReferralCounts, setUncertainReferralCounts] = useState<
    Record<string, number>
  >({});
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
  const hasDemoProfile = profiles.some(item => item.isDemonstration);
  const referralKey =
    profile && referralHospital
      ? JSON.stringify([profile.id, referralHospital.id, selectedSurgery])
      : null;
  const uncertainReferralAttempts = referralKey
    ? (uncertainReferralCounts[referralKey] ?? 0)
    : 0;
  const referralNeedsAdminCheck = uncertainReferralAttempts >= 2;
  const compared = useMemo(
    () =>
      activeHospitals.filter(hospital => comparisonIds.includes(hospital.id)),
    [activeHospitals, comparisonIds]
  );
  const surgery = selectedSurgery
    ? (SURGERY_TYPES.find(entry => entry.id === selectedSurgery) ?? null)
    : null;
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
      [...activeHospitals].sort((a, b) => {
        const key = selectedSurgery ?? "";
        return (
          (Number.isFinite(b.scores[key]) ? b.scores[key] : -1) -
          (Number.isFinite(a.scores[key]) ? a.scores[key] : -1)
        );
      }),
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
    setOpenSpecialties(current =>
      current.includes(procedure.specialty)
        ? current
        : [...current, procedure.specialty]
    );
    setPickerOpen(false);
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

  const completeReferral = async () => {
    if (!profile || !referralHospital || !selectedSurgery) return;
    if (blockedReferral) {
      setReferralError(ILLUSTRATIVE_REFERRAL_MESSAGE);
      return;
    }
    try {
      await referralMutation.mutateAsync({
        profileId: profile.id,
        destinationHospitalId: referralHospital.id,
        surgeryTypeId: selectedSurgery,
      });
      toast.success(
        isDemoReferral
          ? "Demonstration referral record created. It has not been sent to a hospital."
          : `Referral record prepared for ${referralHospital.shortName ?? referralHospital.name}. Confirm acceptance with the hospital.`
      );
      if (referralKey) {
        setUncertainReferralCounts(current => {
          if (!(referralKey in current)) return current;
          const { [referralKey]: _removed, ...rest } = current;
          return rest;
        });
      }
      setReferralError(null);
      setReferralHospital(null);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("illustrative readiness data")
      ) {
        setReferralError(ILLUSTRATIVE_REFERRAL_MESSAGE);
      } else {
        let attempts = uncertainReferralAttempts;
        if (referralKey) {
          attempts += 1;
          setUncertainReferralCounts(current => ({
            ...current,
            [referralKey]: attempts,
          }));
        }
        setReferralError(
          attempts >= 2 ? UNCERTAIN_REFERRAL_MESSAGE : RETRY_REFERRAL_MESSAGE
        );
      }
    }
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f6faf8] text-[#173d36]">
      <a
        href="#doctor-portal"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-2 focus:z-50 focus:rounded-lg focus:bg-white focus:p-3"
      >
        Skip to procedure search
      </a>
      <header
        className={`investor-nav sticky top-0 z-30 border-b border-[#dfe9e5]/80 bg-[#f6faf8]/90 ${isScrolled ? "nav-scrolled" : ""}`}
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
            className="hidden items-center gap-5 text-xs font-bold text-[#45675e] lg:flex"
          >
            <a href="#doctor-portal" className="hover:text-[#0b746b]">
              Find a hospital
            </a>
            <a href="#contact" className="hover:text-[#0b746b]">
              Contact
            </a>
          </nav>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <span className="hidden text-xs font-semibold text-[#54746a] xl:inline">
              {user?.name || user?.email}
            </span>
            {user?.role === "admin" && (
              <Link
                href="/admin"
                className="inline-flex min-h-11 items-center rounded-full bg-[#0b746b] px-4 text-sm font-bold text-white hover:bg-[#075d57]"
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
              className="min-h-11 rounded-full border border-[#c8ddd7] bg-white px-4 text-sm font-bold text-[#2c5d52] hover:bg-[#f4faf7]"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {comparisonIds.length > 0 && (
        <a
          href="#comparison-bar"
          className="fixed bottom-4 left-4 z-50 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#0b746b] px-4 text-sm font-bold text-white shadow-lg hover:bg-[#075d57]"
        >
          <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
          {comparisonIds.length} of 3 compared
        </a>
      )}
      <div className="fixed bottom-4 right-4 z-50">
        <ThemeToggle />
      </div>
      <main>
        <section
          id="doctor-portal"
          className="container scroll-mt-24 py-7 lg:py-10"
          tabIndex={-1}
        >
          <div className="mesh-bg relative isolate overflow-hidden rounded-[1.5rem] border border-[#dbe9e3] bg-[#eaf5ef] px-5 py-7 sm:px-8 lg:px-10">
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
            <div className="inline-flex items-center gap-2 rounded-full bg-[#e9f5f1] px-3 py-1.5 font-mono text-xs font-bold uppercase tracking-[0.08em] text-[#0b746b]">
              <Stethoscope className="h-3.5 w-3.5" aria-hidden="true" />{" "}
              Referral planning
            </div>
            <h1 className="mt-3 max-w-2xl font-display text-[30px] leading-tight tracking-[-0.025em] text-[#173d36] sm:text-[36px]">
              Find a hospital by procedure
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#365e53]">
              Compare recorded capabilities and prepare a referral record.
              Demonstration scores are marked; confirm current capacity with the
              receiving hospital.
            </p>
          </div>
          <div className="mt-5 grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
            <aside className="surface-shadow rounded-2xl border border-[#d8e7e1] bg-white p-4 md:p-5">
              {pickerOpen ? (
                <>
                  <label
                    htmlFor="procedure-search"
                    className="text-sm font-bold text-[#28564a]"
                  >
                    Search procedures
                  </label>
                  <div className="relative mt-3">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#526e65]" />
                    <Input
                      id="procedure-search"
                      type="search"
                      value={procedureSearch}
                      onChange={event => setProcedureSearch(event.target.value)}
                      placeholder="Name, acronym or specialty"
                      className="h-11 border-[#cedfd8] bg-[#fbfdfc] pl-10 text-sm"
                    />
                  </div>
                  {normalizedSearch && (
                    <p role="status" className="mt-3 text-sm text-[#526e65]">
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
                    className="mt-4 border-t border-[#e4eeea]"
                  >
                    {proceduresBySpecialty.map(({ specialty, procedures }) => (
                      <AccordionItem
                        key={specialty}
                        value={specialty}
                        className="border-b-[#e4eeea]"
                      >
                        <AccordionTrigger className="min-h-11 py-3 text-left text-sm font-bold text-[#2d584d] hover:no-underline">
                          <span>{specialty}</span>
                          <span className="mr-2 rounded-full bg-[#edf6f2] px-2 py-0.5 font-mono text-xs text-[#416b60]">
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
                                className={`min-h-11 w-full rounded-lg px-3 py-2 text-left text-sm leading-5 transition-colors ${selectedSurgery === procedure.id ? "bg-[#0b746b] font-bold text-white" : "text-[#4b6b61] hover:bg-[#eff7f3] hover:text-[#173d36]"}`}
                              >
                                <span className="block">{procedure.name}</span>
                                {procedure.shortName !== procedure.name && (
                                  <span
                                    className={`mt-0.5 block font-mono text-xs ${selectedSurgery === procedure.id ? "text-white/85" : "text-[#526e65]"}`}
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
                    <div className="mt-4 rounded-xl bg-[#f5f8f7] p-4 text-center text-sm text-[#4b6b61]">
                      No matching procedure. Try a name, acronym or specialty.
                    </div>
                  )}
                </>
              ) : (
                <div>
                  <p className="text-sm font-bold text-[#28564a]">
                    Procedure
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[#526e65]">
                    You already chose a procedure. Change it if you'd like to
                    see a different list of hospitals.
                  </p>
                  <button
                    type="button"
                    onClick={() => setPickerOpen(true)}
                    className="mt-4 inline-flex min-h-11 items-center rounded-full border border-[#cedfd8] bg-[#fbfdfc] px-4 text-sm font-bold text-[#2c5d52] hover:bg-white"
                  >
                    Change procedure
                  </button>
                </div>
              )}
            </aside>
            <div className="surface-shadow rounded-2xl border border-[#d8e7e1] bg-white p-5 md:p-6">
              {surgery ? (
                <>
                  <p className="font-mono text-xs font-bold uppercase tracking-[.08em] text-[#0b746b]">
                    Selected procedure · {surgery.specialty}
                  </p>
                  <h3
                    aria-live="polite"
                    className="mt-2 font-display text-[30px] leading-tight text-[#173d36]"
                  >
                    {surgery.name}
                  </h3>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-[#526e65]">
                    {surgery.description}
                  </p>
                  {!hospitalsQuery.isLoading && !hospitalsQuery.isError && (
                    <p
                      role="status"
                      className="mt-5 rounded-xl border border-[#dbe9e4] bg-[#f7fbf9] p-4 text-sm leading-6 text-[#365e53]"
                    >
                      {rankedHospitals.length} active{" "}
                      {rankedHospitals.length === 1 ? "hospital" : "hospitals"}{" "}
                      available.
                    </p>
                  )}
                </>
              ) : (
                <div className="flex h-full flex-col items-start justify-center">
                  <p className="font-mono text-xs font-bold uppercase tracking-[.08em] text-[#0b746b]">
                    No procedure chosen yet
                  </p>
                  <h3 className="mt-2 font-display text-[26px] leading-tight text-[#173d36]">
                    Choose a procedure to see ranked hospitals
                  </h3>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-[#526e65]">
                    Pick a procedure from the list to compare hospital
                    readiness for it.
                  </p>
                </div>
              )}
            </div>
          </div>
          {hospitalsQuery.isError && (
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
          {selectedSurgery && (
            <>
              {!hospitalsQuery.isError &&
                !hospitalsQuery.isLoading &&
                rankedHospitals.length === 0 && (
                  <p className="mt-7 rounded-xl border border-[#dbe9e4] bg-white p-5 text-sm text-[#526e65]">
                    No hospitals are active for referral yet.
                  </p>
                )}
              <ComparisonBar
                hospitals={compared}
                surgeryId={selectedSurgery}
                onRemove={id =>
                  setComparisonIds(current =>
                    current.filter(item => item !== id)
                  )
                }
              />
              {hospitalsQuery.isLoading && (
                <p role="status" className="mt-7 text-sm text-[#365e53]">
                  Loading hospitals…
                </p>
              )}
              <div
                className="mt-7 grid gap-4 xl:grid-cols-2"
                aria-busy={hospitalsQuery.isLoading}
              >
                {hospitalsQuery.isLoading
                  ? Array.from({ length: 4 }).map((_, index) => (
                      <div
                        key={index}
                        className="h-64 animate-pulse rounded-2xl bg-[#e8f1ed]"
                        aria-hidden="true"
                      />
                    ))
                  : rankedHospitals.map((hospital, index) => (
                      <HospitalCard
                        key={hospital.id}
                        hospital={hospital}
                        surgeryId={selectedSurgery}
                        rank={index + 1}
                        compared={comparisonIds.includes(hospital.id)}
                        isDemonstration={
                          hospital.isIllustrative ||
                          Boolean(profile?.isDemonstration)
                        }
                        demoReferralUnavailable={
                          hospital.isIllustrative &&
                          profiles.length > 0 &&
                          !hasDemoProfile
                        }
                        onCompare={() => toggleCompare(hospital.id)}
                        onRefer={() => {
                          setReferralError(null);
                          setSelectedProfileId("");
                          setReferralHospital(hospital);
                        }}
                      />
                    ))}
              </div>
            </>
          )}
        </section>

        {inactiveHospitals.length > 0 && (
          <section
            id="network"
            className="border-y border-[#dde9e5] bg-[#edf5f1]"
          >
            <div className="container py-10 lg:py-12">
              <h2 className="font-display text-[28px] text-[#274c43]">
                Directory entries awaiting onboarding
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#526e65]">
                These facilities cannot be compared or selected for referral
                here.
              </p>
              <details className="mt-5 rounded-2xl border border-[#d6e4de] bg-white p-4">
                <summary className="cursor-pointer text-sm font-bold text-[#28564a]">
                  Browse {inactiveHospitals.length} inactive listings
                </summary>
                <p className="mt-4 flex items-center gap-2 text-sm text-[#526e65]">
                  <CircleAlert className="h-4 w-4 shrink-0 text-[#996d21]" /> A
                  directory listing does not confirm available services.
                </p>
                <div className="mt-3 grid max-h-[360px] overflow-auto sm:grid-cols-2">
                  {inactiveHospitals.map(hospital => (
                    <div
                      key={hospital.id}
                      className="flex items-center gap-3 border-b border-[#edf2f0] p-3"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#edf1ef] text-[#667f75]">
                        <Building2 className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-[#3b6055]">
                          {hospital.name}
                        </p>
                        <p className="mt-0.5 text-sm text-[#526e65]">
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

        <footer id="contact" className="border-t border-[#dce8e3] bg-[#edf5f1]">
          <div className="container grid gap-8 py-10 lg:grid-cols-[1.1fr_.9fr]">
            <div>
              <BrandLockup className="h-16 w-[230px]" />
              <p className="mt-3 max-w-xl text-sm leading-6 text-[#526e65]">
                Referral planning for healthcare centres in Nigeria.
              </p>
              <p className="mt-6 text-sm text-[#526e65]">
                © {new Date().getFullYear()} RefConnect
              </p>
            </div>
            <div className="rounded-2xl border border-[#d4e3dd] bg-white p-5">
              <h2 className="text-sm font-bold text-[#28564a]">
                About RefConnect
              </h2>
              <p className="mt-3 text-sm leading-6 text-[#42665d]">
                See how the referral planning workflow works and meet the team.
              </p>
              <Link
                href="/#about"
                className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-[#0b746b] hover:underline"
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
            setSelectedProfileId("");
            setReferralHospital(null);
          }
        }}
      >
        <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-md overflow-y-auto border-[#d7e5df] bg-[#fbfdfc]">
          <DialogHeader>
            <p className="font-mono text-xs font-bold uppercase tracking-[0.08em] text-[#0b746b]">
              Referral record
            </p>
            <DialogTitle className="font-display text-2xl text-[#173d36]">
              Prepare referral for{" "}
              {referralHospital?.shortName ?? referralHospital?.name}
            </DialogTitle>
            <DialogDescription className="pt-2 text-sm leading-6 text-[#4e6b61]">
              This saves a record in RefConnect; it does not notify the
              hospital or confirm acceptance.
            </DialogDescription>
          </DialogHeader>
          {profiles.length > 1 && !profilesQuery.isError && (
            <div className="space-y-2">
              <label
                htmlFor="referral-profile"
                className="block text-sm font-bold text-[#28564a]"
              >
                Referral profile
              </label>
              <select
                id="referral-profile"
                value={selectedProfileId}
                onChange={event => {
                  setSelectedProfileId(event.target.value);
                  setReferralError(null);
                }}
                disabled={referralMutation.isPending}
                className="min-h-11 w-full rounded-lg border border-[#cedfd8] bg-white px-3 text-sm text-[#244b41]"
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
              {blockedReferral ? (
                <p
                  role="alert"
                  className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm leading-6 text-amber-900"
                >
                  {ILLUSTRATIVE_REFERRAL_MESSAGE}
                </p>
              ) : isDemoReferral ? (
                <p className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
                  Demonstration only. This record is not for patient care and
                  will not be sent to the hospital.
                </p>
              ) : null}
              <div className="rounded-xl border border-[#d8e7e1] bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-[#244b41]">
                      {profile.displayName}
                    </p>
                    <p className="mt-1 font-mono text-sm text-[#526e65]">
                      {profile.patientReference}
                    </p>
                  </div>
                  {profile.isDemonstration && (
                    <span className="rounded-full bg-[#f6eedb] px-2 py-1 text-xs font-bold text-[#705b30]">
                      Demo profile
                    </span>
                  )}
                </div>
                {!profile.isDemonstration && (
                  <p className="mt-3 text-sm leading-6 text-[#526e65]">
                    {profile.conditionSummary}
                  </p>
                )}
              </div>
              <p className="rounded-xl border border-[#dfe9e5] bg-[#f1f8f5] p-3 text-sm leading-6 text-[#4e6b61]">
                <span className="font-bold text-[#265a4e]">Procedure:</span>{" "}
                {surgery?.name}
              </p>
              <Button
                onClick={completeReferral}
                disabled={
                  referralMutation.isPending ||
                  blockedReferral ||
                  referralNeedsAdminCheck
                }
                className="min-h-11 w-full rounded-full bg-[#0b746b] text-sm font-bold hover:bg-[#075d57]"
              >
                <ClipboardCheck className="mr-2 h-4 w-4" aria-hidden="true" />
                {referralMutation.isPending
                  ? "Saving referral…"
                  : referralNeedsAdminCheck
                    ? "Awaiting status check"
                    : "Prepare referral record"}
              </Button>
              {referralError && (
                <p role="alert" className="text-sm text-rose-700">
                  {referralError}
                </p>
              )}
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
                      : "No referral profile is available for your account. Ask an administrator to create one for you."}
              </p>
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
