import { useAuth } from "@/_core/hooks/useAuth";
import { AdminRoleManagement } from "@/components/AdminRoleManagement";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import {
  CAPABILITY_DEFINITIONS,
  capabilityLabel,
  readinessTier,
  SURGERY_TYPES,
} from "@shared/readiness";
import { LockKeyhole, Save } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";

type Hospital = {
  id: string;
  name: string;
  shortName: string | null;
  ownership: string;
  facilityLevel: string;
  grade: number | null;
  description: string | null;
  active: boolean;
  capabilities: Record<string, number>;
  scores: Record<string, number>;
};
type ProfileDraft = {
  grade: string;
  facilityLevel: string;
  ownership: string;
  description: string;
};
type ProfileErrors = Partial<Record<keyof ProfileDraft, string>>;

const levelStyle: Record<number, string> = {
  0: "border-rose-200 bg-rose-50 text-rose-700",
  1: "border-amber-200 bg-amber-50 text-amber-700",
  2: "border-emerald-200 bg-emerald-50 text-emerald-700",
};
const hospitalLabel = (hospital: Pick<Hospital, "name" | "shortName">) =>
  hospital.shortName
    ? `${hospital.name} (${hospital.shortName})`
    : hospital.name;
const profileFromHospital = (hospital: Hospital): ProfileDraft => ({
  grade: String(hospital.grade ?? 3),
  facilityLevel: hospital.facilityLevel,
  ownership: hospital.ownership,
  description: hospital.description ?? "",
});
const isProfileChanged = (draft: ProfileDraft, hospital: Hospital) =>
  Number(draft.grade) !== (hospital.grade ?? 3) ||
  draft.facilityLevel !== hospital.facilityLevel ||
  draft.ownership !== hospital.ownership ||
  draft.description !== (hospital.description ?? "");
const validateProfile = (draft: ProfileDraft): ProfileErrors => {
  const errors: ProfileErrors = {};
  const grade = Number(draft.grade);
  if (!Number.isInteger(grade) || grade < 1 || grade > 5) {
    errors.grade = "Enter a grade from 1 to 5.";
  }
  for (const field of ["facilityLevel", "ownership"] as const) {
    const length = draft[field].trim().length;
    if (length < 2 || length > 128) {
      errors[field] =
        "Enter 2 to 128 characters, excluding spaces at the ends.";
    }
  }
  const descriptionLength = draft.description.trim().length;
  if (descriptionLength < 10 || descriptionLength > 2000) {
    errors.description =
      "Enter 10 to 2,000 characters, excluding spaces at the ends.";
  }
  return errors;
};
const isPermissionError = (error: unknown) => {
  if (!error || typeof error !== "object" || !("data" in error)) return false;
  const data = error.data;
  return (
    !!data &&
    typeof data === "object" &&
    "code" in data &&
    data.code === "FORBIDDEN"
  );
};

function AdminBody() {
  const { user } = useAuth();
  const hospitalsQuery = trpc.showcase.hospitals.useQuery();
  const updateCapabilities = trpc.admin.updateCapabilities.useMutation();
  const updateProfile = trpc.admin.updateHospitalProfile.useMutation();
  const utils = trpc.useUtils();
  const activeHospitals = useMemo(
    () =>
      ((hospitalsQuery.data ?? []) as Hospital[]).filter(
        hospital => hospital.active
      ),
    [hospitalsQuery.data]
  );
  const [drafts, setDrafts] = useState<Record<string, Record<string, number>>>(
    {}
  );
  const [profileDrafts, setProfileDrafts] = useState<
    Record<string, ProfileDraft>
  >({});
  const [selectedHospitalId, setSelectedHospitalId] = useState("");
  const [mobileHospitalId, setMobileHospitalId] = useState("");
  const [selectedProcedureId, setSelectedProcedureId] = useState(
    SURGERY_TYPES[0]?.id ?? ""
  );
  const [savingLedger, setSavingLedger] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [ledgerSaveError, setLedgerSaveError] = useState("");
  const [profileSaveErrors, setProfileSaveErrors] = useState<
    Record<string, string>
  >({});
  const [profileValidationAttempted, setProfileValidationAttempted] = useState<
    Record<string, boolean>
  >({});

  const selectedHospital =
    activeHospitals.find(hospital => hospital.id === selectedHospitalId) ??
    activeHospitals[0];
  const mobileHospital =
    activeHospitals.find(hospital => hospital.id === mobileHospitalId) ??
    activeHospitals[0];
  const profileDraft = selectedHospital
    ? (profileDrafts[selectedHospital.id] ??
      profileFromHospital(selectedHospital))
    : null;
  const selectedProcedure =
    SURGERY_TYPES.find(procedure => procedure.id === selectedProcedureId) ??
    SURGERY_TYPES[0];
  const changedHospitalIds = useMemo(
    () =>
      activeHospitals
        .filter(hospital =>
          CAPABILITY_DEFINITIONS.some(
            ({ key }) =>
              drafts[hospital.id]?.[key] !== undefined &&
              drafts[hospital.id][key] !== (hospital.capabilities[key] ?? 0)
          )
        )
        .map(hospital => hospital.id),
    [activeHospitals, drafts]
  );
  const profileChanged =
    !!selectedHospital &&
    !!profileDraft &&
    isProfileChanged(profileDraft, selectedHospital);
  const profileErrors =
    selectedHospital &&
    profileDraft &&
    profileValidationAttempted[selectedHospital.id]
      ? validateProfile(profileDraft)
      : {};
  const hasOtherProfileChanges = activeHospitals.some(hospital => {
    if (hospital.id === selectedHospital?.id) return false;
    const draft = profileDrafts[hospital.id];
    return !!draft && isProfileChanged(draft, hospital);
  });

  const saveErrorMessage = async (error: unknown, fallback: string) => {
    if (isPermissionError(error)) {
      await utils.auth.me.invalidate();
      return "Your administrator access has changed. Refresh to see your current permissions.";
    }
    return fallback;
  };

  const editProfile = (field: keyof ProfileDraft, value: string) => {
    if (!selectedHospital || !profileDraft) return;
    setProfileDrafts(previous => ({
      ...previous,
      [selectedHospital.id]: { ...profileDraft, [field]: value },
    }));
    setProfileSaveErrors(previous => ({
      ...previous,
      [selectedHospital.id]: "",
    }));
  };

  const saveLedger = async () => {
    if (!changedHospitalIds.length || savingLedger || hospitalsQuery.error)
      return;
    setLedgerSaveError("");
    setSavingLedger(true);
    try {
      const results = await Promise.allSettled(
        changedHospitalIds.map(hospitalId => {
          const hospital = activeHospitals.find(
            item => item.id === hospitalId
          )!;
          return updateCapabilities.mutateAsync({
            hospitalId,
            capabilities: { ...hospital.capabilities, ...drafts[hospitalId] },
          });
        })
      );
      await utils.showcase.hospitals.invalidate();
      const savedIds = changedHospitalIds.filter(
        (_, index) => results[index].status === "fulfilled"
      );
      setDrafts(previous => {
        const next = { ...previous };
        savedIds.forEach(id => {
          delete next[id];
        });
        return next;
      });
      const failed = results.find(result => result.status === "rejected");
      if (failed?.status === "rejected") {
        const failedCount = results.filter(
          result => result.status === "rejected"
        ).length;
        setLedgerSaveError(
          await saveErrorMessage(
            failed.reason,
            `Changes for ${failedCount} hospital${failedCount === 1 ? "" : "s"} could not be confirmed.${savedIds.length ? ` ${savedIds.length} other hospital${savedIds.length === 1 ? " was" : "s were"} saved.` : ""} Reconnect and refresh hospital data before trying again.`
          )
        );
      } else {
        toast.success(
          `${savedIds.length} hospital${savedIds.length === 1 ? "" : "s"} updated.`
        );
      }
    } catch (error) {
      await utils.showcase.hospitals.invalidate();
      setLedgerSaveError(
        await saveErrorMessage(
          error,
          "Capability changes could not be confirmed. Reconnect and refresh hospital data before trying again."
        )
      );
    } finally {
      setSavingLedger(false);
    }
  };

  const saveProfile = async (form?: HTMLFormElement) => {
    if (
      !selectedHospital ||
      !profileDraft ||
      !profileChanged ||
      savingProfile ||
      hospitalsQuery.error
    )
      return;
    const hospital = selectedHospital;
    setProfileValidationAttempted(previous => ({
      ...previous,
      [hospital.id]: true,
    }));
    const firstInvalidField = Object.keys(validateProfile(profileDraft))[0];
    if (firstInvalidField) {
      const input = form?.elements.namedItem(firstInvalidField);
      if (input instanceof HTMLElement) input.focus();
      return;
    }
    setProfileSaveErrors(previous => ({ ...previous, [hospital.id]: "" }));
    setSavingProfile(true);
    try {
      await updateProfile.mutateAsync({
        hospitalId: hospital.id,
        grade: Number(profileDraft.grade),
        facilityLevel: profileDraft.facilityLevel.trim(),
        ownership: profileDraft.ownership.trim(),
        description: profileDraft.description.trim(),
      });
      await utils.showcase.hospitals.invalidate();
      setProfileDrafts(previous => {
        const next = { ...previous };
        delete next[hospital.id];
        return next;
      });
      setProfileValidationAttempted(previous => ({
        ...previous,
        [hospital.id]: false,
      }));
      toast.success(`${hospitalLabel(hospital)} profile saved.`);
    } catch (error) {
      const message = await saveErrorMessage(
        error,
        "Hospital profile changes could not be confirmed. Reconnect and refresh hospital data before trying again."
      );
      setProfileSaveErrors(previous => ({
        ...previous,
        [hospital.id]: message,
      }));
    } finally {
      setSavingProfile(false);
    }
  };

  if (user?.role !== "admin")
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center px-6 text-center">
        <LockKeyhole className="h-9 w-9 text-[#b17924]" />
        <h1 className="mt-5 font-display text-3xl text-[#173d36]">
          Administrator access required
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#496b60]">
          An administrator must grant you access to edit hospital details.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex min-h-11 items-center rounded-full bg-[#0b746b] px-5 text-sm font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0b746b] focus-visible:ring-offset-2"
        >
          Find a hospital
        </Link>
      </div>
    );
  if (hospitalsQuery.isPending)
    return (
      <div className="p-4 md:p-8" role="status">
        {hospitalsQuery.isPaused ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-700">
            Waiting for a connection to load hospital data.
          </p>
        ) : (
          <>
            <span className="sr-only">Loading hospital data…</span>
            <div
              aria-hidden="true"
              className="h-12 w-56 animate-pulse rounded-xl bg-[#e4eee9]"
            />
            <div
              aria-hidden="true"
              className="mt-7 h-[520px] animate-pulse rounded-2xl bg-[#e8f1ed]"
            />
          </>
        )}
      </div>
    );
  if (hospitalsQuery.error && !hospitalsQuery.data)
    return (
      <div className="mx-auto max-w-xl p-6">
        <h1 className="font-display text-2xl text-[#173d36]">
          Hospitals could not be loaded
        </h1>
        <p className="mt-3 text-sm text-[#496b60]">
          Check your connection and try again.
        </p>
        <Button
          type="button"
          onClick={() => hospitalsQuery.refetch()}
          className="mt-5 min-h-11"
        >
          Try again
        </Button>
      </div>
    );

  return (
    <div className="mx-auto max-w-[1560px] p-1 pb-20 md:p-5">
      <header className="mb-6">
        <h1 className="font-display text-[34px] tracking-[-0.025em] text-[#173d36]">
          Admin portal
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#496b60]">
          Update hospital capabilities and profiles. Saved changes appear in
          hospital search.
        </p>
        {user?.isOwner && (
          <a
            href="#role-management-title"
            className="mt-3 inline-flex min-h-11 items-center text-sm font-bold text-[#0b746b] underline underline-offset-4"
          >
            Manage administrators
          </a>
        )}
      </header>
      {hospitalsQuery.error && (
        <div
          role="alert"
          className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700"
        >
          Hospital data could not be refreshed. Reconnect and try again before
          saving changes.
          <Button
            type="button"
            variant="outline"
            onClick={() => hospitalsQuery.refetch()}
            className="ml-3 min-h-11 border-amber-300 text-amber-700"
          >
            Try again
          </Button>
        </div>
      )}
      {!activeHospitals.length ? (
        <div className="rounded-2xl border border-[#d7e4df] bg-white p-6 text-sm text-[#496b60]">
          No active hospitals are available to edit.
        </div>
      ) : (
        <>
          <section
            className="surface-shadow overflow-hidden rounded-2xl border border-[#d7e4df] bg-white"
            aria-labelledby="capability-title"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e6eeeb] px-5 py-4">
              <div>
                <h2
                  id="capability-title"
                  className="font-display text-xl text-[#1c4038]"
                >
                  Hospital capabilities
                </h2>
                <p className="mt-1 text-sm text-[#496b60]">
                  Choose a level for each capability. These hospital values are
                  demonstration data.
                </p>
              </div>
              <Button
                type="button"
                onClick={saveLedger}
                disabled={
                  !changedHospitalIds.length ||
                  savingLedger ||
                  !!hospitalsQuery.error
                }
                className="min-h-11 rounded-full bg-[#0b746b] px-4 text-sm font-bold hover:bg-[#075d57]"
              >
                <Save aria-hidden="true" className="mr-1.5 h-3.5 w-3.5" />
                {savingLedger
                  ? "Saving…"
                  : changedHospitalIds.length
                    ? `Save ${changedHospitalIds.length} hospital${changedHospitalIds.length === 1 ? "" : "s"}`
                    : "No changes to save"}
              </Button>
            </div>
            {ledgerSaveError && (
              <p
                role="alert"
                className="mx-5 mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700"
              >
                {ledgerSaveError}
              </p>
            )}
            <div className="px-5 py-3 md:hidden">
              <label
                className="text-sm font-bold text-[#31584e]"
                htmlFor="mobile-capability-hospital"
              >
                Hospital to edit
              </label>
              <select
                id="mobile-capability-hospital"
                value={mobileHospital.id}
                onChange={event => setMobileHospitalId(event.target.value)}
                className="mt-2 h-11 w-full rounded-lg border border-[#c5d9d1] bg-white px-3 text-sm text-[#244940] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0b746b]"
              >
                {activeHospitals.map(hospital => (
                  <option key={hospital.id} value={hospital.id}>
                    {hospitalLabel(hospital)}
                  </option>
                ))}
              </select>
            </div>
            <div
              className="overflow-x-auto"
              role="region"
              aria-label="Hospital capabilities table"
              tabIndex={0}
            >
              <table className="w-full border-collapse text-left md:min-w-[1120px]">
                <thead className="bg-[#f2f7f5]">
                  <tr>
                    <th
                      scope="col"
                      className="sticky left-0 z-20 w-[50%] min-w-[130px] border-b border-r border-[#dde9e5] bg-[#f2f7f5] px-3 py-4 text-sm font-bold text-[#31584e] md:w-auto md:min-w-[230px] md:px-5"
                    >
                      Capability
                    </th>
                    {activeHospitals.map(hospital => (
                      <th
                        scope="col"
                        key={hospital.id}
                        className={`w-[50%] min-w-[150px] border-b border-[#dde9e5] px-2 py-4 md:w-auto md:min-w-[175px] md:px-4 ${hospital.id !== mobileHospital.id ? "hidden md:table-cell" : ""}`}
                      >
                        <span className="text-sm font-bold leading-5 text-[#244940]">
                          {hospitalLabel(hospital)}
                        </span>
                        <span className="mt-1 block text-xs font-normal text-[#496b60]">
                          {hospital.grade
                            ? `Grade ${hospital.grade}`
                            : hospital.facilityLevel}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {CAPABILITY_DEFINITIONS.map((capability, rowIndex) => (
                    <tr
                      key={capability.key}
                      className={rowIndex % 2 ? "bg-[#fbfdfc]" : "bg-white"}
                    >
                      <th
                        scope="row"
                        className={`sticky left-0 z-10 border-b border-r border-[#edf2ef] px-3 py-3 md:px-5 ${rowIndex % 2 ? "bg-[#fbfdfc]" : "bg-white"}`}
                      >
                        <span className="text-sm font-bold text-[#31584e]">
                          {capability.label}
                        </span>
                        <span className="mt-0.5 block text-xs text-[#496b60]">
                          {capability.group}
                        </span>
                      </th>
                      {activeHospitals.map(hospital => {
                        const value =
                          drafts[hospital.id]?.[capability.key] ??
                          hospital.capabilities[capability.key] ??
                          0;
                        return (
                          <td
                            key={hospital.id}
                            className={`border-b border-[#edf2ef] px-2 py-3 md:px-4 ${hospital.id !== mobileHospital.id ? "hidden md:table-cell" : ""}`}
                          >
                            <select
                              aria-label={`${capability.label} at ${hospitalLabel(hospital)}`}
                              value={value}
                              disabled={savingLedger}
                              onChange={event =>
                                setDrafts(previous => ({
                                  ...previous,
                                  [hospital.id]: {
                                    ...hospital.capabilities,
                                    ...previous[hospital.id],
                                    [capability.key]: Number(
                                      event.target.value
                                    ),
                                  },
                                }))
                              }
                              className={`min-h-11 w-full cursor-pointer rounded-lg border px-2 py-2 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0b746b] disabled:cursor-wait ${levelStyle[value] ?? levelStyle[0]}`}
                            >
                              <option value={0}>{capabilityLabel(0)}</option>
                              <option value={1}>{capabilityLabel(1)}</option>
                              <option value={2}>{capabilityLabel(2)}</option>
                            </select>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <div className="mt-6 grid gap-6 xl:grid-cols-[.8fr_1.2fr]">
            <section
              className="surface-shadow rounded-2xl border border-[#d7e4df] bg-white p-5"
              aria-labelledby="score-title"
            >
              <h2
                id="score-title"
                className="font-display text-2xl text-[#1c4038]"
              >
                Readiness scores
              </h2>
              <p className="mt-1 text-sm leading-5 text-[#496b60]">
                Scores show saved values. Save capability edits to update them.
              </p>
              <label
                className="mt-5 block text-sm font-bold text-[#31584e]"
                htmlFor="score-procedure"
              >
                Procedure
              </label>
              <select
                id="score-procedure"
                value={selectedProcedure?.id ?? ""}
                onChange={event => setSelectedProcedureId(event.target.value)}
                className="mt-2 h-11 w-full rounded-lg border border-[#c5d9d1] bg-white px-3 text-sm text-[#244940] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0b746b]"
              >
                {SURGERY_TYPES.map(procedure => (
                  <option key={procedure.id} value={procedure.id}>
                    {procedure.name}
                  </option>
                ))}
              </select>
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {activeHospitals.map(hospital => {
                  const score = hospital.scores[selectedProcedure?.id ?? ""];
                  const tier = Number.isFinite(score)
                    ? readinessTier(score)
                    : null;
                  const color =
                    tier?.tone === "ready"
                      ? "text-emerald-700"
                      : tier?.tone === "conditional"
                        ? "text-amber-700"
                        : tier
                          ? "text-rose-700"
                          : "text-[#496b60]";
                  return (
                    <div
                      key={hospital.id}
                      className="rounded-lg bg-[#f5f9f7] px-3 py-3"
                    >
                      <p className="break-words text-sm font-medium leading-5 text-[#496b60]">
                        {hospital.name}
                      </p>
                      <p className={`mt-2 text-lg font-bold ${color}`}>
                        {tier ? `${score}%` : "Unavailable"}
                      </p>
                      {tier && (
                        <p className={`text-sm ${color}`}>{tier.label}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
            {selectedHospital && profileDraft && (
              <section
                className="surface-shadow rounded-2xl border border-[#d7e4df] bg-white p-5"
                aria-labelledby="profile-title"
              >
                <h2
                  id="profile-title"
                  className="font-display text-2xl text-[#1c4038]"
                >
                  Hospital profile
                </h2>
                <form
                  noValidate
                  onSubmit={event => {
                    event.preventDefault();
                    void saveProfile(event.currentTarget);
                  }}
                >
                  <label
                    className="mt-5 block text-sm font-bold text-[#31584e]"
                    htmlFor="profile-hospital"
                  >
                    Hospital
                  </label>
                  <select
                    id="profile-hospital"
                    value={selectedHospital.id}
                    onChange={event =>
                      setSelectedHospitalId(event.target.value)
                    }
                    disabled={savingProfile}
                    className="mt-2 h-11 w-full rounded-lg border border-[#c5d9d1] bg-white px-3 text-sm text-[#244940] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0b746b]"
                  >
                    {activeHospitals.map(hospital => (
                      <option key={hospital.id} value={hospital.id}>
                        {hospitalLabel(hospital)}
                      </option>
                    ))}
                  </select>
                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <label className="text-sm font-bold text-[#31584e]">
                      Resource grade (1 to 5)
                      <Input
                        type="number"
                        name="grade"
                        min="1"
                        max="5"
                        required
                        value={profileDraft.grade}
                        onChange={event =>
                          editProfile("grade", event.target.value)
                        }
                        aria-invalid={!!profileErrors.grade}
                        aria-describedby={
                          profileErrors.grade
                            ? "profile-grade-error"
                            : undefined
                        }
                        disabled={savingProfile}
                        className="mt-2 h-11 border-[#c5d9d1]"
                      />
                      {profileErrors.grade && (
                        <span
                          id="profile-grade-error"
                          className="mt-1 block font-normal text-rose-700"
                        >
                          {profileErrors.grade}
                        </span>
                      )}
                    </label>
                    <label className="text-sm font-bold text-[#31584e]">
                      Care level
                      <Input
                        name="facilityLevel"
                        minLength={2}
                        maxLength={128}
                        required
                        value={profileDraft.facilityLevel}
                        onChange={event =>
                          editProfile("facilityLevel", event.target.value)
                        }
                        aria-invalid={!!profileErrors.facilityLevel}
                        aria-describedby={
                          profileErrors.facilityLevel
                            ? "profile-level-error"
                            : undefined
                        }
                        disabled={savingProfile}
                        className="mt-2 h-11 border-[#c5d9d1]"
                      />
                      {profileErrors.facilityLevel && (
                        <span
                          id="profile-level-error"
                          className="mt-1 block font-normal text-rose-700"
                        >
                          {profileErrors.facilityLevel}
                        </span>
                      )}
                    </label>
                    <label className="text-sm font-bold text-[#31584e] sm:col-span-2">
                      Ownership
                      <Input
                        name="ownership"
                        minLength={2}
                        maxLength={128}
                        required
                        value={profileDraft.ownership}
                        onChange={event =>
                          editProfile("ownership", event.target.value)
                        }
                        aria-invalid={!!profileErrors.ownership}
                        aria-describedby={
                          profileErrors.ownership
                            ? "profile-ownership-error"
                            : undefined
                        }
                        disabled={savingProfile}
                        className="mt-2 h-11 border-[#c5d9d1]"
                      />
                      {profileErrors.ownership && (
                        <span
                          id="profile-ownership-error"
                          className="mt-1 block font-normal text-rose-700"
                        >
                          {profileErrors.ownership}
                        </span>
                      )}
                    </label>
                    <label className="text-sm font-bold text-[#31584e] sm:col-span-2">
                      Description
                      <Textarea
                        name="description"
                        minLength={10}
                        maxLength={2000}
                        required
                        value={profileDraft.description}
                        onChange={event =>
                          editProfile("description", event.target.value)
                        }
                        aria-invalid={!!profileErrors.description}
                        aria-describedby={
                          profileErrors.description
                            ? "profile-description-error"
                            : undefined
                        }
                        disabled={savingProfile}
                        className="mt-2 min-h-28 border-[#c5d9d1] text-sm leading-5"
                      />
                      {profileErrors.description && (
                        <span
                          id="profile-description-error"
                          className="mt-1 block font-normal text-rose-700"
                        >
                          {profileErrors.description}
                        </span>
                      )}
                    </label>
                  </div>
                  {profileSaveErrors[selectedHospital.id] && (
                    <p
                      role="alert"
                      className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700"
                    >
                      {profileSaveErrors[selectedHospital.id]}
                    </p>
                  )}
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <p className="text-sm text-[#496b60]">
                      {hasOtherProfileChanges
                        ? "Edits for other hospitals are kept until you save them."
                        : ""}
                    </p>
                    <Button
                      type="submit"
                      disabled={
                        !profileChanged ||
                        savingProfile ||
                        !!hospitalsQuery.error
                      }
                      className="min-h-11 rounded-full bg-[#173d36] px-4 text-sm font-bold hover:bg-[#0b746b]"
                    >
                      <Save aria-hidden="true" className="mr-1.5 h-3.5 w-3.5" />
                      {savingProfile ? "Saving…" : "Save profile"}
                    </Button>
                  </div>
                </form>
              </section>
            )}
          </div>
        </>
      )}
      {user?.isOwner && (
        <div className="mt-6">
          <AdminRoleManagement />
        </div>
      )}
    </div>
  );
}

export default function AdminPortal() {
  return (
    <DashboardLayout>
      <AdminBody />
    </DashboardLayout>
  );
}
