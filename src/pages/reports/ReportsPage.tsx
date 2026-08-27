import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BarChart3,
  Clock,
  Plane,
  ArrowDownToLine,
  MapPin,
  Globe2,
  Route,
  Moon,
  Gauge,
  CalendarClock,
  Trophy,
  Flame,
  Timer,
  Navigation,
} from 'lucide-react';
import {
  ANALYTICS_RANGES,
  DEFAULT_ANALYTICS_MONTHS,
  useAnalytics,
  type AnalyticsAircraftRow,
  type AnalyticsAirportRow,
  type AnalyticsBucketRow,
  type AnalyticsCountryRow,
  type AnalyticsFlightRef,
  type AnalyticsGroupRow,
  type AnalyticsPersonRow,
  type AnalyticsRouteRow,
  type FlightAnalytics,
} from '../../hooks/useAnalytics';
import { useFormatPrefs } from '../../hooks/useFormatPrefs';
import { exportAnalyticsToCSV, exportAnalyticsToPDF } from '../../lib/exportReports';
import { SkeletonList } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import { PageWrapper } from '../../components/ui/PageWrapper';
import { EmptyState } from '../../components/ui/EmptyState';
import { useChartTheme } from '../../components/reports/chartTheme';
import { SectionNav, ReportSectionBlock, type ReportSection } from '../../components/reports/SectionNav';
import {
  Meter,
  RankedBars,
  ReportCard,
  StatTile,
  type TableColumn,
} from '../../components/reports/primitives';
import {
  CumulativeHoursChart,
  MonthlyHoursChart,
  PatternChart,
  RoleCompositionChart,
} from '../../components/reports/charts';

export default function ReportsPage() {
  const { t, i18n } = useTranslation('reports');
  const [months, setMonths] = useState<number>(DEFAULT_ANALYTICS_MONTHS);
  const { data, isLoading, isFetching, error } = useAnalytics(months);
  const { fmtDuration, fmtDate, dateFormatPref } = useFormatPrefs();
  const theme = useChartTheme();

  const num = useMemo(
    () => (v: number, digits = 0) =>
      v.toLocaleString(i18n.language, { maximumFractionDigits: digits, minimumFractionDigits: digits }),
    [i18n.language]
  );
  const nm = (v: number) => `${num(Math.round(v))} NM`;

  const sections: ReportSection[] = [
    { id: 'overview', label: t('sections.overview') },
    { id: 'experience', label: t('sections.experience') },
    { id: 'aircraft', label: t('sections.aircraft') },
    { id: 'places', label: t('sections.places') },
    { id: 'instrument', label: t('sections.instrument') },
    { id: 'patterns', label: t('sections.patterns') },
    { id: 'records', label: t('sections.records') },
  ];

  if (isLoading) {
    return (
      <PageWrapper maxWidth="list">
        <SkeletonList rows={4} />
      </PageWrapper>
    );
  }

  if (error || !data) {
    return (
      <PageWrapper maxWidth="list">
        <ErrorState title={t('failedToLoad')} message={t('failedToLoadMessage')} />
      </PageWrapper>
    );
  }

  const { totals, records } = data;
  // Totals carry the initial-hours snapshot.
  const empty = totals.totalFlights === 0 && totals.totalMinutes === 0;

  // Role composition per year, folded from the monthly series (it carries
  // the SIC split).
  const roleByYear = foldRoleByYear(data);

  const rangeLabel = data.range.allTime
    ? t('range.allTimeDescription')
    : t('range.windowDescription', {
        from: data.range.from ? fmtDate(data.range.from) : '',
        to: data.range.to ? fmtDate(data.range.to) : '',
      });

  return (
    <PageWrapper maxWidth="list">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="page-title">{t('title')}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{rangeLabel}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="segmented" role="group" aria-label={t('timeRange')}>
            {ANALYTICS_RANGES.map((m) => (
              <button key={m} onClick={() => setMonths(m)} aria-pressed={months === m} className="segment">
                {m === 0 ? t('allTime') : t('range.months', { count: m })}
              </button>
            ))}
          </div>
          <button
            onClick={() => exportAnalyticsToCSV(data)}
            className="btn-secondary btn-sm text-xs"
            disabled={empty}
          >
            {t('exportCsv')}
          </button>
          <button
            onClick={() => exportAnalyticsToPDF(data, dateFormatPref)}
            className="btn-secondary btn-sm text-xs"
            disabled={empty}
          >
            {t('exportPdf')}
          </button>
        </div>
      </div>

      {empty ? (
        <EmptyState
          icon={BarChart3}
          title={t('empty.title')}
          description={t('empty.description')}
        />
      ) : (
        <>
          <SectionNav sections={sections} />

          {/* Previous render at reduced opacity while refetching */}
          <div className={isFetching ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
            {/* ── Overview ── */}
            <ReportSectionBlock id="overview" title={t('sections.overview')} description={t('sections.overviewHint')}>
              <div className="hero-greeting mb-4">
                <div className="relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium uppercase tracking-wider text-blue-100/80">
                      {t('hero.totalTime')}
                    </p>
                    <p className="text-4xl sm:text-5xl font-bold text-white mt-1 leading-none">
                      {fmtDuration(totals.totalMinutes)}
                    </p>
                    <p className="text-sm text-blue-100/80 mt-2">
                      {t('hero.acrossFlights', { count: totals.totalFlights })}
                      {totals.firstFlightDate && ` · ${t('hero.since', { date: fmtDate(totals.firstFlightDate) })}`}
                    </p>
                    {/* Initial-hours snapshot note */}
                    {data.baseline && (
                      <p className="text-xs text-blue-100/80 mt-1">
                        {t('hero.includesBaseline', {
                          time: fmtDuration(data.baseline.totalMinutes),
                          date: fmtDate(data.baseline.baselineDate),
                        })}
                      </p>
                    )}
                  </div>
                  <dl className="flex gap-6 text-white/90">
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-blue-100/70">{t('hero.pic')}</dt>
                      <dd className="text-xl font-semibold">{fmtDuration(totals.picMinutes)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-blue-100/70">{t('hero.distance')}</dt>
                      <dd className="text-xl font-semibold">{nm(totals.distanceNm)}</dd>
                    </div>
                  </dl>
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <StatTile
                  label={t('kpi.flights')}
                  value={num(totals.totalFlights)}
                  detail={t('kpi.activeMonths', { count: records.activeMonths })}
                  icon={<Plane className="w-4 h-4" />}
                  accent="blue"
                />
                <StatTile
                  label={t('kpi.landings')}
                  value={num(totals.landingsDay + totals.landingsNight)}
                  detail={t('kpi.dayNight', { day: totals.landingsDay, night: totals.landingsNight })}
                  icon={<ArrowDownToLine className="w-4 h-4" />}
                  accent="amber"
                />
                <StatTile
                  label={t('kpi.airports')}
                  value={num(totals.distinctAirports)}
                  detail={t('kpi.countries', { count: totals.distinctCountries })}
                  icon={<MapPin className="w-4 h-4" />}
                  accent="green"
                />
                <StatTile
                  label={t('kpi.lastFlight')}
                  value={
                    records.daysSinceLastFlight != null
                      ? t('kpi.daysAgo', { count: records.daysSinceLastFlight })
                      : '—'
                  }
                  detail={totals.lastFlightDate ? fmtDate(totals.lastFlightDate) : undefined}
                  icon={<CalendarClock className="w-4 h-4" />}
                  accent="violet"
                />
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <ReportCard
                  title={t('chart.careerHours')}
                  hint={t('chart.careerHoursHint')}
                  table={{
                    rows: data.monthly,
                    columns: [
                      { key: 'month', header: t('table.month'), numeric: false, render: (r) => r.month },
                      { key: 'time', header: t('table.blockTime'), render: (r) => fmtDuration(r.totalMinutes) },
                      { key: 'ldg', header: t('table.landings'), render: (r) => r.landingsDay + r.landingsNight },
                      { key: 'flights', header: t('flights'), render: (r) => r.flights },
                      { key: 'cum', header: t('table.career'), render: (r) => fmtDuration(r.cumulativeMinutes) },
                    ],
                  }}
                >
                  <CumulativeHoursChart
                    data={data.monthly}
                    theme={theme}
                    fmtDuration={fmtDuration}
                    emptyLabel={t('noData')}
                  />
                </ReportCard>

                <ReportCard
                  title={t('chart.monthlyHours')}
                  hint={t('chart.monthlyHoursHint')}
                  table={{
                    rows: data.monthly,
                    columns: [
                      { key: 'month', header: t('table.month'), numeric: false, render: (r) => r.month },
                      { key: 'time', header: t('table.blockTime'), render: (r) => fmtDuration(r.totalMinutes) },
                      { key: 'ldg', header: t('table.landings'), render: (r) => r.landingsDay + r.landingsNight },
                      { key: 'flights', header: t('flights'), render: (r) => r.flights },
                    ],
                  }}
                >
                  <MonthlyHoursChart
                    data={data.monthly}
                    theme={theme}
                    fmtDuration={fmtDuration}
                    emptyLabel={t('noData')}
                  />
                </ReportCard>
              </div>
            </ReportSectionBlock>

            {/* ── Experience ── */}
            <ReportSectionBlock
              id="experience"
              title={t('sections.experience')}
              description={t('sections.experienceHint')}
            >
              <div className="grid gap-4 lg:grid-cols-2 mb-4">
                <ReportCard title={t('chart.timeBreakdown')} hint={t('chart.timeBreakdownHint')}>
                  <div className="space-y-3">
                    {(
                      [
                        ['role.pic', totals.picMinutes],
                        ['role.picus', totals.picusMinutes],
                        ['role.spic', totals.spicMinutes],
                        ['role.sic', totals.sicMinutes],
                        ['role.relief', totals.reliefMinutes],
                        ['role.dual', totals.dualMinutes],
                        ['role.dualGiven', totals.dualGivenMinutes],
                        ['role.examiner', totals.examinerMinutes],
                        ['role.solo', totals.soloMinutes],
                        ['role.multiPilot', totals.multiPilotMinutes],
                        ['role.night', totals.nightMinutes],
                        ['role.ifr', totals.ifrMinutes],
                        ['role.crossCountry', totals.crossCountryMinutes],
                      ] as const
                    )
                      .filter(([, v]) => v > 0)
                      .map(([key, value]) => (
                        <Meter
                          key={key}
                          label={t(key)}
                          value={value}
                          total={totals.totalMinutes}
                          formatted={fmtDuration(value)}
                          color={theme.accent}
                        />
                      ))}
                  </div>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-4">{t('chart.overlapNote')}</p>
                  {data.baseline && (
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{t('chart.baselineNote')}</p>
                  )}
                </ReportCard>

                <ReportCard
                  title={t('chart.roleByYear')}
                  hint={t('chart.roleByYearHint')}
                  table={{
                    rows: data.yearly,
                    columns: [
                      { key: 'year', header: t('table.year'), numeric: false, render: (r) => r.year },
                      { key: 'time', header: t('table.blockTime'), render: (r) => fmtDuration(r.totalMinutes) },
                      { key: 'ldg', header: t('table.landings'), render: (r) => r.landings },
                      { key: 'flights', header: t('flights'), render: (r) => r.flights },
                      { key: 'pic', header: t('role.pic'), render: (r) => fmtDuration(r.picMinutes) },
                      { key: 'dual', header: t('role.dual'), render: (r) => fmtDuration(r.dualMinutes) },
                      { key: 'night', header: t('role.night'), render: (r) => fmtDuration(r.nightMinutes) },
                      { key: 'dist', header: t('table.distance'), render: (r) => nm(r.distanceNm) },
                    ],
                  }}
                >
                  <RoleCompositionChart
                    data={roleByYear}
                    theme={theme}
                    fmtDuration={fmtDuration}
                    emptyLabel={t('noData')}
                  />
                </ReportCard>
              </div>

              {(data.byInstructor.length > 0 || data.byCrew.length > 0) && (
                <div className="grid gap-4 lg:grid-cols-2">
                  {data.byInstructor.length > 0 && (
                    <ReportCard
                      title={t('chart.instructors')}
                      hint={t('chart.instructorsHint')}
                      table={{ rows: data.byInstructor, columns: personColumns(t, fmtDuration, fmtDate) }}
                    >
                      <RankedBars
                        color={theme.accent}
                        emptyLabel={t('noData')}
                        rows={data.byInstructor.map((p) => ({
                          key: p.name,
                          label: p.name,
                          value: p.totalMinutes,
                          formatted: fmtDuration(p.totalMinutes),
                          meta: t('flightCount', { count: p.flights }),
                        }))}
                      />
                    </ReportCard>
                  )}
                  {data.byCrew.length > 0 && (
                    <ReportCard
                      title={t('chart.crew')}
                      hint={t('chart.crewHint')}
                      table={{ rows: data.byCrew, columns: personColumns(t, fmtDuration, fmtDate, true) }}
                    >
                      <RankedBars
                        color={theme.accent}
                        emptyLabel={t('noData')}
                        rows={data.byCrew.map((p) => ({
                          key: `${p.name}-${p.role ?? ''}`,
                          label: p.name,
                          subLabel: p.role,
                          value: p.totalMinutes,
                          formatted: fmtDuration(p.totalMinutes),
                          meta: t('flightCount', { count: p.flights }),
                        }))}
                      />
                    </ReportCard>
                  )}
                </div>
              )}
            </ReportSectionBlock>

            {/* ── Aircraft ── */}
            <ReportSectionBlock id="aircraft" title={t('sections.aircraft')} description={t('sections.aircraftHint')}>
              <div className="grid gap-4 lg:grid-cols-2 mb-4">
                <ReportCard
                  title={t('chart.byType')}
                  hint={t('chart.byTypeHint', { count: totals.distinctTypes })}
                  table={{ rows: data.byAircraftType, columns: aircraftColumns(t, fmtDuration, fmtDate, nm) }}
                >
                  <RankedBars
                    color={theme.accent}
                    emptyLabel={t('noData')}
                    rows={data.byAircraftType.map((a) => ({
                      key: a.label,
                      label: a.label,
                      subLabel: a.subLabel,
                      value: a.totalMinutes,
                      formatted: fmtDuration(a.totalMinutes),
                      meta: <BarMeta landings={a.landings} flights={a.flights} t={t} />,
                    }))}
                  />
                </ReportCard>

                <ReportCard
                  title={t('chart.byRegistration')}
                  hint={t('chart.byRegistrationHint', { count: totals.distinctRegistrations })}
                  table={{ rows: data.byRegistration, columns: aircraftColumns(t, fmtDuration, fmtDate, nm) }}
                >
                  <RankedBars
                    color={theme.accent}
                    emptyLabel={t('noData')}
                    rows={data.byRegistration.map((a) => ({
                      key: a.label,
                      label: a.label,
                      subLabel: a.subLabel,
                      value: a.totalMinutes,
                      formatted: fmtDuration(a.totalMinutes),
                      meta: <BarMeta landings={a.landings} flights={a.flights} t={t} />,
                    }))}
                  />
                </ReportCard>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <ReportCard
                  title={t('chart.byClass')}
                  hint={t('chart.byClassHint')}
                  table={{ rows: data.byClass, columns: groupColumns(t, fmtDuration) }}
                >
                  <RankedBars
                    color={theme.accent}
                    emptyLabel={t('noData')}
                    rows={data.byClass.map((g) => ({
                      key: g.label,
                      label: t(`classLabels.${g.label}`, { defaultValue: g.label.replace(/_/g, ' ') }),
                      value: g.totalMinutes,
                      formatted: fmtDuration(g.totalMinutes),
                      meta: <BarMeta landings={g.landings} flights={g.flights} t={t} />,
                    }))}
                  />
                </ReportCard>

                <ReportCard
                  title={t('chart.byCategory')}
                  hint={t('chart.byCategoryHint')}
                  table={{ rows: data.byCategory, columns: groupColumns(t, fmtDuration) }}
                >
                  <RankedBars
                    color={theme.accent}
                    emptyLabel={t('noCategoryData')}
                    rows={data.byCategory.map((g) => ({
                      key: g.label,
                      label: t(`categoryLabels.${g.label}`, { defaultValue: g.label }),
                      value: g.totalMinutes,
                      formatted: fmtDuration(g.totalMinutes),
                      meta: <BarMeta landings={g.landings} flights={g.flights} t={t} />,
                    }))}
                  />
                </ReportCard>
              </div>
            </ReportSectionBlock>

            {/* ── Places ── */}
            <ReportSectionBlock id="places" title={t('sections.places')} description={t('sections.placesHint')}>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <StatTile
                  label={t('kpi.distanceFlown')}
                  value={nm(totals.distanceNm)}
                  icon={<Route className="w-4 h-4" />}
                  accent="blue"
                />
                <StatTile
                  label={t('kpi.airportsVisited')}
                  value={num(totals.distinctAirports)}
                  icon={<MapPin className="w-4 h-4" />}
                  accent="green"
                />
                <StatTile
                  label={t('kpi.countriesVisited')}
                  value={num(totals.distinctCountries)}
                  icon={<Globe2 className="w-4 h-4" />}
                  accent="violet"
                />
                <StatTile
                  label={t('kpi.homeBase')}
                  value={records.homeBase ?? '—'}
                  detail={data.byAirport[0]?.name ?? undefined}
                  icon={<Navigation className="w-4 h-4" />}
                  accent="amber"
                />
              </div>

              <div className="grid gap-4 lg:grid-cols-2 mb-4">
                <ReportCard
                  title={t('chart.topAirports')}
                  hint={t('chart.topAirportsHint')}
                  table={{ rows: data.byAirport, columns: airportColumns(t) }}
                >
                  <RankedBars
                    color={theme.accent}
                    emptyLabel={t('noAirportData')}
                    rows={data.byAirport.slice(0, 12).map((a) => ({
                      key: a.icao,
                      label: a.icao,
                      subLabel: a.name,
                      value: a.flights,
                      formatted: num(a.flights),
                      meta: t('flightsShort'),
                    }))}
                  />
                </ReportCard>

                <ReportCard
                  title={t('chart.countries')}
                  hint={t('chart.countriesHint')}
                  table={{ rows: data.byCountry, columns: countryColumns(t) }}
                >
                  <RankedBars
                    color={theme.accent}
                    emptyLabel={t('noAirportData')}
                    rows={data.byCountry.slice(0, 12).map((c) => ({
                      key: c.country,
                      label: countryName(c.country, i18n.language),
                      subLabel: c.country,
                      value: c.flights,
                      formatted: num(c.flights),
                      meta: t('airportCount', { count: c.airports }),
                    }))}
                  />
                </ReportCard>
              </div>

              <ReportCard
                title={t('chart.topRoutes')}
                hint={t('chart.topRoutesHint')}
                table={{ rows: data.byRoute, columns: routeColumns(t, fmtDuration, nm) }}
              >
                <RankedBars
                  color={theme.accent}
                  emptyLabel={t('noAirportData')}
                  rows={data.byRoute.slice(0, 10).map((r) => ({
                    key: `${r.departureIcao}-${r.arrivalIcao}`,
                    label: `${r.departureIcao} → ${r.arrivalIcao}`,
                    subLabel: r.distanceNm > 0 ? nm(r.distanceNm) : null,
                    value: r.flights,
                    formatted: num(r.flights),
                    meta: t('flightsShort'),
                  }))}
                />
              </ReportCard>
            </ReportSectionBlock>

            {/* ── Instrument ── */}
            <ReportSectionBlock
              id="instrument"
              title={t('sections.instrument')}
              description={t('sections.instrumentHint')}
            >
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <StatTile
                  label={t('kpi.ifrTime')}
                  value={fmtDuration(totals.ifrMinutes)}
                  detail={t('kpi.ofTotal', {
                    pct: pct(totals.ifrMinutes, totals.totalMinutes),
                  })}
                  icon={<Gauge className="w-4 h-4" />}
                  accent="blue"
                />
                <StatTile
                  label={t('kpi.approaches')}
                  value={num(totals.approaches)}
                  detail={t('kpi.holds', { count: totals.holds })}
                  icon={<Navigation className="w-4 h-4" />}
                  accent="violet"
                />
                <StatTile
                  label={t('kpi.nightTime')}
                  value={fmtDuration(totals.nightMinutes)}
                  detail={t('kpi.nightLandings', { count: totals.landingsNight })}
                  icon={<Moon className="w-4 h-4" />}
                  accent="slate"
                />
                <StatTile
                  label={t('kpi.actualInstrument')}
                  value={fmtDuration(totals.actualInstrumentMinutes)}
                  detail={t('kpi.simulatedInstrument', {
                    time: fmtDuration(totals.simulatedInstrumentMinutes),
                  })}
                  icon={<Clock className="w-4 h-4" />}
                  accent="green"
                />
              </div>

              <ReportCard
                title={t('chart.approachTypes')}
                hint={t('chart.approachTypesHint')}
                table={{
                  rows: data.approachTypes,
                  columns: [
                    { key: 'type', header: t('table.approachType'), numeric: false, render: (r) => r.type },
                    { key: 'count', header: t('table.count'), render: (r) => r.count },
                  ],
                }}
              >
                <RankedBars
                  color={theme.accent}
                  emptyLabel={t('noApproachData')}
                  rows={data.approachTypes.map((a) => ({
                    key: a.type,
                    label: a.type === 'Unspecified' ? t('approach.unspecified') : a.type,
                    value: a.count,
                    formatted: num(a.count),
                  }))}
                />
              </ReportCard>
            </ReportSectionBlock>

            {/* ── Patterns ── */}
            <ReportSectionBlock id="patterns" title={t('sections.patterns')} description={t('sections.patternsHint')}>
              <div className="grid gap-4 lg:grid-cols-2">
                <ReportCard
                  title={t('chart.dayOfWeek')}
                  hint={t('chart.dayOfWeekHint')}
                  table={{ rows: data.dayOfWeek, columns: bucketColumns(t, fmtDuration, (r) => dayName(r.key, i18n.language)) }}
                >
                  <PatternChart
                    data={data.dayOfWeek}
                    theme={theme}
                    labelFor={(r) => dayName(r.key, i18n.language)}
                    fmtValue={(v) => num(v)}
                    emptyLabel={t('noData')}
                  />
                </ReportCard>

                <ReportCard
                  title={t('chart.hourOfDay')}
                  hint={t('chart.hourOfDayHint')}
                  table={{ rows: data.hourOfDay, columns: bucketColumns(t, fmtDuration, (r) => `${r.label}:00`) }}
                >
                  <PatternChart
                    data={data.hourOfDay}
                    theme={theme}
                    labelFor={(r) => (r.key % 3 === 0 ? r.label : '')}
                    fmtValue={(v) => num(v)}
                    emptyLabel={t('noTimeData')}
                  />
                </ReportCard>

                <ReportCard
                  title={t('chart.seasonality')}
                  hint={t('chart.seasonalityHint')}
                  table={{
                    rows: data.monthOfYear,
                    columns: bucketColumns(t, fmtDuration, (r) => monthName(r.key, i18n.language)),
                  }}
                >
                  <PatternChart
                    data={data.monthOfYear}
                    theme={theme}
                    labelFor={(r) => monthName(r.key, i18n.language)}
                    fmtValue={(v) => num(v)}
                    emptyLabel={t('noData')}
                  />
                </ReportCard>

                <ReportCard
                  title={t('chart.flightLength')}
                  hint={t('chart.flightLengthHint')}
                  table={{ rows: data.durationBuckets, columns: bucketColumns(t, fmtDuration, (r) => r.label) }}
                >
                  <PatternChart
                    data={data.durationBuckets}
                    theme={theme}
                    labelFor={(r) => r.label}
                    fmtValue={(v) => num(v)}
                    emptyLabel={t('noData')}
                  />
                </ReportCard>
              </div>
            </ReportSectionBlock>

            {/* ── Records ── */}
            <ReportSectionBlock id="records" title={t('sections.records')} description={t('sections.recordsHint')}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <RecordCard
                  icon={<Timer className="w-4 h-4" />}
                  label={t('records.longestFlight')}
                  value={records.longestFlight ? fmtDuration(records.longestFlight.totalMinutes) : '—'}
                  detail={records.longestFlight ? flightRefLabel(records.longestFlight, fmtDate) : undefined}
                />
                <RecordCard
                  icon={<Route className="w-4 h-4" />}
                  label={t('records.longestDistance')}
                  value={records.longestDistanceFlight ? nm(records.longestDistanceFlight.distanceNm) : '—'}
                  detail={
                    records.longestDistanceFlight
                      ? flightRefLabel(records.longestDistanceFlight, fmtDate)
                      : undefined
                  }
                />
                <RecordCard
                  icon={<Navigation className="w-4 h-4" />}
                  label={t('records.farthestAirport')}
                  value={records.farthestAirport?.icao ?? '—'}
                  detail={
                    records.farthestAirport
                      ? `${records.farthestAirport.name ?? ''}${
                          records.farthestAirportNm ? ` · ${nm(records.farthestAirportNm)}` : ''
                        }`
                      : undefined
                  }
                />
                <RecordCard
                  icon={<Plane className="w-4 h-4" />}
                  label={t('records.busiestDay')}
                  value={records.busiestDayFlights > 0 ? t('flightCount', { count: records.busiestDayFlights }) : '—'}
                  detail={records.busiestDay ? fmtDate(records.busiestDay) : undefined}
                />
                <RecordCard
                  icon={<Trophy className="w-4 h-4" />}
                  label={t('records.busiestMonth')}
                  value={records.busiestMonthMinutes ? fmtDuration(records.busiestMonthMinutes) : '—'}
                  detail={records.busiestMonth ? longMonth(records.busiestMonth, i18n.language) : undefined}
                />
                <RecordCard
                  icon={<Flame className="w-4 h-4" />}
                  label={t('records.streak')}
                  value={t('records.monthCount', { count: records.currentStreakMonths })}
                  detail={t('records.longestStreak', { count: records.longestStreakMonths })}
                />
              </div>
            </ReportSectionBlock>
          </div>
        </>
      )}
    </PageWrapper>
  );
}

/** Counts beside a ranked bar: landings always, the flight count from `sm` up. */
function BarMeta({ landings, flights, t }: { landings: number; flights: number; t: Translate }) {
  return (
    <>
      {t('landingCount', { count: landings })}
      <span className="hidden sm:inline"> · {t('flightCount', { count: flights })}</span>
    </>
  );
}

/** A single personal best. Not a chart — the number is the whole story. */
function RecordCard({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="card hover-lift">
      <div className="flex items-center gap-2 mb-2">
        <span
          className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300 shrink-0"
          aria-hidden="true"
        >
          {icon}
        </span>
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
      </div>
      <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 leading-none">{value}</p>
      {detail && <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 truncate">{detail}</p>}
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────

type Translate = (key: string, opts?: Record<string, unknown>) => string;

function pct(value: number, total: number) {
  return total > 0 ? Math.round((value / total) * 100) : 0;
}

function flightRefLabel(ref: AnalyticsFlightRef, fmtDate: (d: string) => string) {
  const route = [ref.departureIcao, ref.arrivalIcao].filter(Boolean).join(' → ');
  return [fmtDate(ref.date), ref.aircraftReg, route].filter(Boolean).join(' · ');
}

/** Groups the monthly series into calendar years. */
function foldRoleByYear(data: FlightAnalytics) {
  const byYear = new Map<string, { year: string; picMinutes: number; sicMinutes: number; dualMinutes: number }>();
  for (const m of data.monthly) {
    const year = m.month.slice(0, 4);
    const row = byYear.get(year) ?? { year, picMinutes: 0, sicMinutes: 0, dualMinutes: 0 };
    row.picMinutes += m.picMinutes;
    row.sicMinutes += m.sicMinutes;
    row.dualMinutes += m.dualMinutes;
    byYear.set(year, row);
  }
  return [...byYear.values()];
}

function countryName(code: string, locale: string) {
  try {
    return new Intl.DisplayNames([locale], { type: 'region' }).of(code) ?? code;
  } catch {
    return code;
  }
}

function dayName(isoDow: number, locale: string) {
  // ISO day 1..7 mapped onto the week of 2024-01-01, a Monday.
  const date = new Date(Date.UTC(2024, 0, isoDow));
  return date.toLocaleDateString(locale, { weekday: 'short' });
}

function monthName(month: number, locale: string) {
  return new Date(Date.UTC(2024, month - 1, 1)).toLocaleDateString(locale, { month: 'short' });
}

/** Renders an API `YYYY-MM` key as a readable month and year. */
function longMonth(month: string, locale: string) {
  const [y, m] = month.split('-');
  return new Date(Date.UTC(Number(y), Number(m) - 1, 1)).toLocaleDateString(locale, {
    month: 'long',
    year: 'numeric',
  });
}

function aircraftColumns(
  t: Translate,
  fmtDuration: (m: number) => string,
  fmtDate: (d: string) => string,
  nm: (v: number) => string
): TableColumn<AnalyticsAircraftRow>[] {
  return [
    { key: 'label', header: t('table.aircraft'), numeric: false, render: (r) => r.label },
    { key: 'time', header: t('table.blockTime'), render: (r) => fmtDuration(r.totalMinutes) },
    { key: 'ldg', header: t('table.landings'), render: (r) => r.landings },
    { key: 'flights', header: t('flights'), render: (r) => r.flights },
    { key: 'pic', header: t('role.pic'), render: (r) => fmtDuration(r.picMinutes) },
    { key: 'dual', header: t('role.dual'), render: (r) => fmtDuration(r.dualMinutes) },
    { key: 'night', header: t('role.night'), render: (r) => fmtDuration(r.nightMinutes) },
    { key: 'dist', header: t('table.distance'), render: (r) => nm(r.distanceNm) },
    { key: 'last', header: t('table.lastFlight'), render: (r) => (r.lastFlightDate ? fmtDate(r.lastFlightDate) : '—') },
  ];
}

function groupColumns(t: Translate, fmtDuration: (m: number) => string): TableColumn<AnalyticsGroupRow>[] {
  return [
    { key: 'label', header: t('table.group'), numeric: false, render: (r) => r.label.replace(/_/g, ' ') },
    { key: 'time', header: t('table.blockTime'), render: (r) => fmtDuration(r.totalMinutes) },
    { key: 'ldg', header: t('table.landings'), render: (r) => r.landings },
    { key: 'flights', header: t('flights'), render: (r) => r.flights },
    { key: 'pic', header: t('role.pic'), render: (r) => fmtDuration(r.picMinutes) },
    { key: 'dual', header: t('role.dual'), render: (r) => fmtDuration(r.dualMinutes) },
  ];
}

function airportColumns(t: Translate): TableColumn<AnalyticsAirportRow>[] {
  return [
    { key: 'icao', header: t('table.airport'), numeric: false, render: (r) => r.icao },
    { key: 'name', header: t('table.name'), numeric: false, render: (r) => r.name ?? '—' },
    { key: 'country', header: t('table.country'), numeric: false, render: (r) => r.country ?? '—' },
    { key: 'dep', header: t('table.departures'), render: (r) => r.departures },
    { key: 'arr', header: t('table.arrivals'), render: (r) => r.arrivals },
    { key: 'flights', header: t('flights'), render: (r) => r.flights },
  ];
}

function countryColumns(t: Translate): TableColumn<AnalyticsCountryRow>[] {
  return [
    { key: 'country', header: t('table.country'), numeric: false, render: (r) => r.country },
    { key: 'airports', header: t('table.airports'), render: (r) => r.airports },
    { key: 'flights', header: t('flights'), render: (r) => r.flights },
  ];
}

function routeColumns(
  t: Translate,
  fmtDuration: (m: number) => string,
  nm: (v: number) => string
): TableColumn<AnalyticsRouteRow>[] {
  return [
    { key: 'from', header: t('table.from'), numeric: false, render: (r) => r.departureIcao },
    { key: 'to', header: t('table.to'), numeric: false, render: (r) => r.arrivalIcao },
    { key: 'flights', header: t('flights'), render: (r) => r.flights },
    { key: 'time', header: t('table.blockTime'), render: (r) => fmtDuration(r.totalMinutes) },
    { key: 'dist', header: t('table.distance'), render: (r) => (r.distanceNm > 0 ? nm(r.distanceNm) : '—') },
  ];
}

function personColumns(
  t: Translate,
  fmtDuration: (m: number) => string,
  fmtDate: (d: string) => string,
  withRole = false
): TableColumn<AnalyticsPersonRow>[] {
  const cols: TableColumn<AnalyticsPersonRow>[] = [
    { key: 'name', header: t('table.name'), numeric: false, render: (r) => r.name },
  ];
  if (withRole) {
    cols.push({ key: 'role', header: t('table.role'), numeric: false, render: (r) => r.role ?? '—' });
  }
  cols.push(
    { key: 'flights', header: t('flights'), render: (r) => r.flights },
    { key: 'time', header: t('table.blockTime'), render: (r) => fmtDuration(r.totalMinutes) },
    { key: 'last', header: t('table.lastFlight'), render: (r) => (r.lastFlightDate ? fmtDate(r.lastFlightDate) : '—') }
  );
  return cols;
}

function bucketColumns(
  t: Translate,
  fmtDuration: (m: number) => string,
  label: (row: AnalyticsBucketRow) => string
): TableColumn<AnalyticsBucketRow>[] {
  return [
    { key: 'bucket', header: t('table.bucket'), numeric: false, render: (r) => label(r) },
    { key: 'flights', header: t('flights'), render: (r) => r.flights },
    { key: 'time', header: t('table.blockTime'), render: (r) => fmtDuration(r.totalMinutes) },
  ];
}
