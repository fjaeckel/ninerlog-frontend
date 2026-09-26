import { useTranslation } from 'react-i18next';
import { MapPin, PlaneLanding, PlaneTakeoff, TriangleAlert } from 'lucide-react';
import type { IgcFlightPreview } from '../../../hooks/useFlightFiles';
import { useFormatPrefs } from '../../../hooks/useFormatPrefs';
import { DataTile, DataTileGrid } from '../../ui/DataTile';
import { confidenceLevel, describePlace, launchMethodKey } from '../../../lib/igc';

interface IgcSummaryProps {
  preview: IgcFlightPreview;
  filename: string;
}

/** The flight an IGC file describes, as the preview reports it. */
export function IgcSummary({ preview, filename }: IgcSummaryProps) {
  const { t, i18n } = useTranslation('flights');
  const { fmtDateLong, fmtDuration, fmtTimeOfDay } = useFormatPrefs();
  const num = (value: number, digits = 0) =>
    value.toLocaleString(i18n.language, { minimumFractionDigits: digits, maximumFractionDigits: digits });

  const launch =
    preview.launchMethod === 'unknown'
      ? t('igc.launchUnknown')
      : t('igc.launchDetected', {
          method: t(`launchMethods.${launchMethodKey(preview.launchMethod)}`),
          confidence: t(`igc.confidence.${confidenceLevel(preview.launchMethodConfidence)}`),
        });

  const glider = [preview.gliderRegistration, preview.gliderType].filter(Boolean).join(' · ');

  return (
    <section aria-labelledby="igc-summary-title" data-testid="igc-summary">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 id="igc-summary-title" className="section-title min-w-0 break-words">
          {t('igc.summaryTitle', { name: filename })}
        </h2>
        {preview.outlanding && (
          <span className="badge-expiring gap-1" data-testid="igc-outlanding">
            <TriangleAlert className="h-3 w-3" aria-hidden="true" />
            {t('igc.outlanding')}
          </span>
        )}
      </div>

      <DataTileGrid>
        <DataTile className="col-span-2" label={t('igc.date')} value={fmtDateLong(preview.date)} />
        <DataTile
          icon={<PlaneTakeoff className="h-3 w-3" />}
          label={t('igc.takeoff')}
          value={t('igc.utcTime', { time: fmtTimeOfDay(preview.takeoffTime) })}
          mono
        />
        <DataTile
          icon={<PlaneLanding className="h-3 w-3" />}
          label={t('igc.landing')}
          value={t('igc.utcTime', { time: fmtTimeOfDay(preview.landingTime) })}
          hint={preview.landingDetected ? undefined : t('igc.landingNotDetected')}
          mono
        />
        <DataTile label={t('igc.duration')} value={fmtDuration(preview.durationMinutes)} mono emphasis />
        <DataTile label={t('igc.launch')} value={launch} />
        {preview.releaseHeightM != null && (
          <DataTile label={t('igc.releaseHeight')} value={t('igc.metres', { value: num(preview.releaseHeightM) })} mono />
        )}
        <DataTile label={t('igc.maxAltitude')} value={t('igc.metresMsl', { value: num(preview.maxAltitudeM) })} mono />
        <DataTile label={t('igc.freeDistance')} value={t('igc.km', { value: num(preview.freeDistanceKm, 1) })} mono />
        <DataTile
          label={t('igc.outAndReturn')}
          value={t('igc.km', { value: num(preview.outAndReturnDistanceKm, 1) })}
          hint={t('igc.outAndReturnHint')}
          mono
        />
        <Place label={t('igc.departure')} place={preview.departure} />
        <Place label={t('igc.arrival')} place={preview.arrival} />
        {glider && <DataTile label={t('igc.glider')} value={glider} />}
        {preview.pilot && <DataTile label={t('igc.pilot')} value={preview.pilot} />}
      </DataTileGrid>
    </section>
  );
}

function Place({ label, place }: { label: string; place: IgcFlightPreview['departure'] }) {
  const { code, name, coordinates } = describePlace(place);
  const airport = [code, name].filter(Boolean).join(' ');
  return (
    <DataTile
      icon={<MapPin className="h-3 w-3" />}
      label={label}
      value={airport || <span className="font-mono text-sm tabular-nums">{coordinates}</span>}
      hint={airport ? coordinates : undefined}
    />
  );
}
