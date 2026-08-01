import { useState, type ReactNode } from "react";
import { useParams, useNavigate, useLocation } from "react-router";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Plane,
  PlaneTakeoff,
  PlaneLanding,
  ShieldCheck,
} from "lucide-react";
import { useFlight, useDeleteFlight } from "../../hooks/useFlights";
import FlightForm from "../../components/flights/FlightForm";
import FlightRouteCard from "../../components/flights/FlightRouteCard";
import FlightRouteHeading from "../../components/flights/FlightRouteHeading";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { SignatureSection } from "../../components/flights/SignatureSection";
import { SkeletonCard } from "../../components/ui/Skeleton";
import { ErrorState } from "../../components/ui/ErrorState";
import { DataTile, DataTileGrid } from "../../components/ui/DataTile";
import { useFormatPrefs } from "../../hooks/useFormatPrefs";
import { formatAirportLabel, splitAirportLabel } from "../../lib/airport";
import { cn } from "../../lib/cn";

export default function FlightDetailPage() {
  const { flightId } = useParams<{ flightId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  // The list passes its query string along so going back keeps the search,
  // filters, sort and page the user came from.
  const listSearch =
    (location.state as { listSearch?: string } | null)?.listSearch ?? "";
  const flightsListPath = `/flights${listSearch}`;
  const { t } = useTranslation("flights");
  const { data: flight, isLoading, error } = useFlight(flightId || "");
  const deleteFlight = useDeleteFlight();
  const [showEditForm, setShowEditForm] = useState(false);
  const { fmtDateTime, fmtDateLong, fmtDuration } = useFormatPrefs();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (isLoading) {
    return (
      <div
        className="max-w-[960px] mx-auto px-4 py-8"
        role="status"
        aria-label={t("detail.loadingFlightDetails")}
      >
        <div className="animate-pulse space-y-6">
          <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded" />
          <div className="h-8 w-64 bg-slate-200 dark:bg-slate-700 rounded" />
          <div className="h-4 w-48 bg-slate-200 dark:bg-slate-700 rounded" />
          <div className="grid gap-6 md:grid-cols-2">
            <SkeletonCard className="h-64" />
            <SkeletonCard className="h-64" />
            <SkeletonCard className="h-48" />
            <SkeletonCard className="h-32" />
          </div>
        </div>
        <span className="sr-only">{t("detail.loadingFlightDetails")}</span>
      </div>
    );
  }

  if (error || !flight) {
    return (
      <div className="max-w-[960px] mx-auto px-4 py-8">
        <ErrorState
          title={t("detail.flightNotFound")}
          message={t("detail.flightNotFoundMessage")}
          onRetry={() => navigate(flightsListPath)}
        />
      </div>
    );
  }

  const totalLandings = flight.allLandings;
  const totalTakeoffs = flight.takeoffsDay + flight.takeoffsNight;

  // Airport names are resolved by the API and are null for off-airport sites,
  // in which case the raw stored location is shown.
  const departureLabel = formatAirportLabel(
    flight.departureIcao,
    flight.departureAirportName,
  );
  const arrivalLabel = formatAirportLabel(
    flight.arrivalIcao,
    flight.arrivalAirportName,
  );
  const departure = splitAirportLabel(
    flight.departureIcao,
    flight.departureAirportName,
  );
  const arrival = splitAirportLabel(
    flight.arrivalIcao,
    flight.arrivalAirportName,
  );

  const pilotFunction = flight.isPic
    ? "PIC"
    : flight.isDual
      ? "Dual"
      : (flight.sicTime || 0) > 0
        ? "SIC"
        : "—";

  const hasInstrumentData =
    (flight.ifrTime ?? 0) > 0 ||
    (flight.actualInstrumentTime ?? 0) > 0 ||
    (flight.simulatedInstrumentTime ?? 0) > 0 ||
    (flight.holds ?? 0) > 0 ||
    (flight.approachesCount ?? 0) > 0 ||
    (flight.approaches && flight.approaches.length > 0) ||
    !!flight.isIpc;

  const hasTrainingData =
    (flight.simulatedFlightTime ?? 0) > 0 ||
    (flight.groundTrainingTime ?? 0) > 0 ||
    (flight.multiPilotTime ?? 0) > 0 ||
    !!flight.fstdType ||
    !!flight.isFlightReview ||
    !!flight.isProficiencyCheck;

  const hasRemarksData =
    !!flight.remarks ||
    !!flight.instructorName ||
    !!flight.instructorComments ||
    !!flight.endorsements;

  const handleDelete = async () => {
    await deleteFlight.mutateAsync(flight.id);
    navigate(flightsListPath);
  };

  // Only the times this flight actually logged get a tile — a grid of zeros
  // says nothing and buries the two or three figures that matter.
  const timeTiles = [
    { key: "pic", label: t("fields.picTime"), minutes: flight.picTime },
    { key: "dual", label: t("detail.dualTime"), minutes: flight.dualTime },
    { key: "solo", label: t("fields.soloTime"), minutes: flight.soloTime },
    {
      key: "crossCountry",
      label: t("detail.crossCountry"),
      minutes: flight.crossCountryTime,
    },
    { key: "night", label: t("fields.nightTime"), minutes: flight.nightTime },
    { key: "sic", label: t("detail.sicTime"), minutes: flight.sicTime ?? 0 },
    {
      key: "dualGiven",
      label: t("detail.dualGiven"),
      minutes: flight.dualGivenTime ?? 0,
    },
  ].filter((tile) => tile.minutes > 0);

  const instrumentTiles = [
    {
      key: "ifr",
      label: t("fields.ifrTime"),
      value: flight.ifrTime,
      format: fmtDuration,
    },
    {
      key: "actual",
      label: t("fields.actualInstrumentTime"),
      value: flight.actualInstrumentTime ?? 0,
      format: fmtDuration,
    },
    {
      key: "simulated",
      label: t("fields.simulatedInstrumentTime"),
      value: flight.simulatedInstrumentTime ?? 0,
      format: fmtDuration,
    },
    {
      key: "holds",
      label: t("fields.holds"),
      value: flight.holds ?? 0,
      format: String,
    },
    {
      key: "approaches",
      label: t("fields.approaches"),
      value: flight.approachesCount ?? 0,
      format: String,
    },
  ].filter((tile) => tile.value > 0);

  const trainingTiles = [
    {
      key: "sim",
      label: t("fields.simulatedFlightTime"),
      minutes: flight.simulatedFlightTime ?? 0,
    },
    {
      key: "ground",
      label: t("fields.groundTrainingTime"),
      minutes: flight.groundTrainingTime ?? 0,
    },
    {
      key: "multiPilot",
      label: t("fields.multiPilotTime"),
      minutes: flight.multiPilotTime ?? 0,
    },
  ].filter((tile) => tile.minutes > 0);

  const trainingFlags = [
    {
      key: "flightReview",
      label: t("fields.isFlightReview"),
      on: !!flight.isFlightReview,
    },
    {
      key: "proficiencyCheck",
      label: t("fields.isProficiencyCheck"),
      on: !!flight.isProficiencyCheck,
    },
  ].filter((flag) => flag.on);

  return (
    <div className="max-w-[960px] xl:max-w-[1400px] mx-auto px-4 py-6 sm:py-8">
      <button
        onClick={() => navigate(flightsListPath)}
        className="mb-3 inline-flex min-h-[44px] items-center gap-1 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
      >
        <ArrowLeft className="w-4 h-4" />
        {t("detail.backToFlights")}
      </button>

      {/* Hero — the same header the list card uses, at page scale: route, when,
          in what, as what, and the block time it all adds up to. */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="flex items-start gap-3 border-l-4 border-blue-600 bg-slate-50 px-4 py-3 dark:border-blue-500 dark:bg-slate-700/40">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
              {fmtDateLong(flight.date)}
            </p>
            <FlightRouteHeading
              as="h1"
              size="page"
              className="mt-1"
              departure={departure}
              arrival={arrival}
              title={`${departureLabel} → ${arrivalLabel}`}
            />
          </div>
          <div className="shrink-0 text-right">
            <p className="font-mono text-2xl font-bold leading-none tabular-nums text-slate-800 dark:text-slate-100">
              {fmtDuration(flight.totalTime)}
            </p>
            <span
              className={cn(
                "mt-1.5 inline-flex text-[11px] font-semibold",
                flight.isPic
                  ? "badge-info"
                  : flight.isDual
                    ? "badge-expiring"
                    : "badge-neutral",
              )}
            >
              {pilotFunction}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 px-4 py-3">
          <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs dark:bg-slate-700/60">
            <Plane
              className="h-3 w-3 shrink-0 text-slate-400 dark:text-slate-500"
              aria-hidden="true"
            />
            <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">
              {flight.aircraftReg}
            </span>
            <span className="truncate text-slate-500 dark:text-slate-400">
              {flight.aircraftType}
            </span>
          </span>
          {totalLandings > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs dark:bg-slate-700/60">
              <PlaneLanding
                className="h-3 w-3 shrink-0 text-slate-400 dark:text-slate-500"
                aria-hidden="true"
              />
              <span className="text-slate-500 dark:text-slate-400">
                {t("tableLdg")}
              </span>
              <span className="font-mono font-semibold tabular-nums text-slate-700 dark:text-slate-200">
                {totalLandings}
              </span>
            </span>
          )}
          {flight.signatureId && (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
              <ShieldCheck className="h-3 w-3" aria-hidden="true" />
              {t("signed")}
            </span>
          )}
        </div>
      </div>

      {/* Actions — full-width and thumb-reachable on a phone */}
      <div className="mt-3 mb-5 flex gap-2 sm:justify-end">
        <button
          onClick={() => setShowEditForm(true)}
          className="btn-secondary min-h-[44px] flex-1 sm:flex-none"
          aria-label={t("editFlightAriaLabel", {
            departure: flight.departureIcao,
            arrival: flight.arrivalIcao,
          })}
        >
          <Pencil className="w-4 h-4" />
          {t("detail.edit")}
        </button>
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="btn-secondary min-h-[44px] flex-1 sm:flex-none hover:bg-red-50 hover:text-red-700 hover:border-red-300 dark:hover:bg-red-900/20 dark:hover:text-red-400"
          aria-label={t("deleteFlightAriaLabel", {
            departure: flight.departureIcao,
            arrival: flight.arrivalIcao,
          })}
        >
          <Trash2 className="w-4 h-4" />
          {t("detail.delete")}
        </button>
      </div>

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        open={showDeleteConfirm}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        title={t("deleteTitle")}
        description={t("deleteDescription")}
        confirmLabel={t("deleteFlight")}
        variant="danger"
        isLoading={deleteFlight.isPending}
      />

      {/* Edit Form Modal */}
      {showEditForm && (
        <div
          className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center sm:p-4 z-[1020]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-flight-title"
        >
          <div className="bg-white dark:bg-slate-800 w-full sm:rounded-xl sm:max-w-2xl h-full sm:h-auto sm:max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-4 sm:p-6">
              <div className="flex justify-between items-center mb-4 sticky top-0 bg-white dark:bg-slate-800 z-10 -mx-4 sm:-mx-6 px-4 sm:px-6 py-2 -mt-4 sm:-mt-6 pt-4 sm:pt-6 border-b border-slate-100 dark:border-slate-700 sm:border-0">
                <h2
                  id="edit-flight-title"
                  className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100"
                >
                  {t("editFlight")}
                </h2>
                <button
                  onClick={() => setShowEditForm(false)}
                  className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 text-2xl min-w-[44px] min-h-[44px] flex items-center justify-center"
                  aria-label={t("detail.close")}
                >
                  ×
                </button>
              </div>
              <FlightForm
                flightId={flight.id}
                onClose={() => setShowEditForm(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Flight Details.

          Columns rather than a grid: the panels are independent and wildly
          different heights, and grid rows stretch every panel to match its
          tallest neighbour — which is what turned "Takeoffs & Landings" into a
          mostly empty box. Multi-column flow packs them by height instead, so
          the whole flight fits on one screen with no dead space in it. */}
      <div className="columns-1 gap-4 md:columns-2 xl:columns-3">
        {/* Aircraft & Route */}
        <Panel>
          <FlightRouteCard flight={flight} />
        </Panel>

        {/* Flight Times */}
        <Panel>
          <div className="card">
            <h2 className="section-title mb-3">{t("detail.blockTimes")}</h2>
            <DataTileGrid>
              <DataTile
                label={t("detail.totalBlockTime")}
                value={fmtDuration(flight.totalTime)}
                mono
                emphasis
              />
              <DataTile
                label={t("detail.pilotFunction")}
                value={pilotFunction}
              />
              {timeTiles.map(({ key, label, minutes }) => (
                <DataTile
                  key={key}
                  label={label}
                  value={fmtDuration(minutes)}
                  mono
                />
              ))}
              {flight.picName && (
                <DataTile
                  className="col-span-2"
                  label={t("fields.picName")}
                  value={flight.picName}
                />
              )}
            </DataTileGrid>
          </div>
        </Panel>

        {/* Takeoffs & Landings */}
        <Panel>
          <div className="card">
            <h2 className="section-title mb-3">
              {t("detail.takeoffsAndLandings")}
            </h2>
            <DataTileGrid>
              <DataTile
                icon={<PlaneTakeoff className="h-3 w-3" />}
                label={t("detail.totalTakeoffs")}
                value={String(totalTakeoffs)}
                hint={t("detail.dayNightSplit", {
                  day: flight.takeoffsDay,
                  night: flight.takeoffsNight,
                })}
                mono
              />
              <DataTile
                icon={<PlaneLanding className="h-3 w-3" />}
                label={t("detail.totalLandings")}
                value={String(totalLandings)}
                hint={t("detail.dayNightSplit", {
                  day: flight.landingsDay,
                  night: flight.landingsNight,
                })}
                mono
              />
            </DataTileGrid>
          </div>
        </Panel>

        {/* Instrument & Approaches */}
        {hasInstrumentData && (
          <Panel>
            <div className="card">
              <h2 className="section-title mb-3">
                {t("detail.instrumentAndApproaches")}
              </h2>
              {instrumentTiles.length > 0 && (
                <DataTileGrid>
                  {instrumentTiles.map(({ key, label, value, format }) => (
                    <DataTile
                      key={key}
                      label={label}
                      value={format(value)}
                      mono
                    />
                  ))}
                </DataTileGrid>
              )}
              {flight.isIpc && (
                <p className="mt-3">
                  <span className="badge-info">{t("fields.isIpc")}</span>
                </p>
              )}
              {flight.approaches && flight.approaches.length > 0 && (
                <div className="mt-4 border-t border-slate-200 pt-3 dark:border-slate-700">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                    {t("fields.approaches")}
                  </p>
                  <ul className="space-y-1.5">
                    {flight.approaches.map((a, idx) => (
                      <li
                        key={idx}
                        className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-slate-700/30"
                      >
                        <span className="badge-info text-xs">
                          {t(`approachTypes.${a.type}`, {
                            defaultValue: a.type,
                          })}
                        </span>
                        <span className="font-mono tabular-nums text-slate-700 dark:text-slate-200">
                          {a.airport || "—"}
                          {a.runway ? ` · RWY ${a.runway}` : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </Panel>
        )}

        {/* Training & Currency */}
        {hasTrainingData && (
          <Panel>
            <div className="card">
              <h2 className="section-title mb-3">
                {t("detail.trainingAndCurrency")}
              </h2>
              <DataTileGrid>
                {trainingTiles.map(({ key, label, minutes }) => (
                  <DataTile
                    key={key}
                    label={label}
                    value={fmtDuration(minutes)}
                    mono
                  />
                ))}
                {flight.fstdType && (
                  <DataTile
                    label={t("fields.fstdType")}
                    value={flight.fstdType}
                  />
                )}
              </DataTileGrid>
              {trainingFlags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {trainingFlags.map(({ key, label }) => (
                    <span key={key} className="badge-info">
                      {label}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </Panel>
        )}

        {/* Remarks & Comments */}
        {hasRemarksData && (
          <Panel>
            <div className="card">
              <h2 className="section-title mb-3">
                {t("detail.remarksAndComments")}
              </h2>
              <div className="space-y-2.5">
                <TextBlock label={t("fields.remarks")} value={flight.remarks} />
                <TextBlock
                  label={t("detail.instructor")}
                  value={flight.instructorName}
                />
                <TextBlock
                  label={t("detail.instructorComments")}
                  value={flight.instructorComments}
                />
                <TextBlock
                  label={t("fields.endorsements")}
                  value={flight.endorsements}
                />
              </div>
            </div>
          </Panel>
        )}

        {/* Instructor Signature */}
        <Panel>
          <SignatureSection flight={flight} />
        </Panel>

        {/* Crew Members */}
        {flight.crewMembers && flight.crewMembers.length > 0 && (
          <Panel>
            <div className="card">
              <h2 className="section-title mb-3">{t("sections.crew")}</h2>
              <ul className="space-y-2">
                {flight.crewMembers.map((member) => (
                  <li
                    key={member.id}
                    className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-slate-700/30"
                  >
                    <span className="badge-info text-xs">{member.role}</span>
                    <span className="font-medium text-slate-700 dark:text-slate-200">
                      {member.name}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </Panel>
        )}
      </div>

      {/* Metadata */}
      <div className="mt-6 text-xs text-slate-400 dark:text-slate-500 text-center">
        {t("detail.created", { date: fmtDateTime(flight.createdAt) })}
        {flight.updatedAt !== flight.createdAt &&
          ` · ${t("detail.updated", { date: fmtDateTime(flight.updatedAt) })}`}
      </div>
    </div>
  );
}

/**
 * One panel in the column flow. `break-inside-avoid` keeps a card whole rather
 * than letting a column break split it across two.
 */
function Panel({ children }: { children: ReactNode }) {
  return <div className="mb-4 break-inside-avoid">{children}</div>;
}

/**
 * A free-text field, boxed like the tiles beside it.
 *
 * Renders nothing when the flight has no such text, so the card only ever
 * shows what was written.
 */
function TextBlock({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}): ReactNode {
  if (!value) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-700/30">
      <p className="text-[11px] font-medium uppercase leading-tight tracking-wide text-slate-400 dark:text-slate-500">
        {label}
      </p>
      <p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-700 dark:text-slate-200">
        {value}
      </p>
    </div>
  );
}
