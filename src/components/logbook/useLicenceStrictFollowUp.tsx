import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog } from '../ui/Dialog';
import { RecordsDialog } from './RecordsDialog';
import { useLogbookMode, useUpdateLogbookMode } from '../../hooks/useLogbook';
import { markStrictOffered, wasStrictOffered } from '../../lib/logbookPrompts';
import { countryName } from '../../lib/countries';
import { extractApiError } from '../../lib/errors';
import type { License } from '../../types/api';

type FollowUp = { kind: 'notice'; intro: string } | { kind: 'offer'; licence: License } | null;

/**
 * After a licence save: the strict-mode notice when the save switched strict
 * mode on, or a one-time offer when the licence only suggests it.
 */
export function useLicenceStrictFollowUp(): { onLicenceSaved: (licence: License) => void; dialogs: ReactNode } {
  const { t, i18n } = useTranslation('logbook');
  const { data: mode, refetch } = useLogbookMode();
  const updateMode = useUpdateLogbookMode();
  const [followUp, setFollowUp] = useState<FollowUp>(null);
  const [offerError, setOfferError] = useState<string | null>(null);

  const licenceLabel = (licence: License) => {
    const base = `${licence.regulatoryAuthority} ${licence.licenseType}`;
    return licence.issuingCountry ? `${base} (${countryName(licence.issuingCountry, i18n.language)})` : base;
  };

  const onLicenceSaved = (licence: License) => {
    const wasStrict = mode?.strict === true;
    void refetch().then(({ data: next }) => {
      if (!next) return;
      if (!wasStrict && next.strict) {
        setFollowUp({ kind: 'notice', intro: t('notice.byLicence', { licence: licenceLabel(licence) }) });
        return;
      }
      if (!next.strict && next.suggestedBy.some((l) => l.licenseId === licence.id) && !wasStrictOffered(licence.id)) {
        markStrictOffered(licence.id);
        setOfferError(null);
        setFollowUp({ kind: 'offer', licence });
      }
    });
  };

  const acceptOffer = async () => {
    try {
      await updateMode.mutateAsync(true);
      setFollowUp({ kind: 'notice', intro: t('notice.manual') });
    } catch (err) {
      setOfferError(extractApiError(err, t('settings.updateFailed')));
    }
  };

  const close = () => setFollowUp(null);

  const dialogs = (
    <>
      <RecordsDialog
        open={followUp?.kind === 'notice'}
        onClose={close}
        title={t('notice.title')}
        intro={followUp?.kind === 'notice' ? followUp.intro : undefined}
      />
      <Dialog open={followUp?.kind === 'offer'} onClose={close} title={t('offer.title')}>
        {followUp?.kind === 'offer' && (
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {t('offer.body', { licence: licenceLabel(followUp.licence) })}
          </p>
        )}
        {offerError && <p className="form-error mt-2">{offerError}</p>}
        <div className="mt-5 flex flex-wrap justify-end gap-3">
          <button type="button" className="btn-secondary" onClick={close} disabled={updateMode.isPending}>
            {t('offer.later')}
          </button>
          <button type="button" className="btn-primary" onClick={acceptOffer} disabled={updateMode.isPending}>
            {t('offer.enable')}
          </button>
        </div>
      </Dialog>
    </>
  );

  return { onLicenceSaved, dialogs };
}
