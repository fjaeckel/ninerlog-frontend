import { useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { usePublicSignatureInfo, useCompletePublicSignature } from '../hooks/useSignatures';
import { SignatureCanvas, type SignatureCanvasHandle } from '../components/SignatureCanvas';
import { formatDuration } from '../lib/duration';
import { extractApiError, extractApiStatus } from '../lib/errors';

export default function SignPage() {
  const { t } = useTranslation('signatures');
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const info = usePublicSignatureInfo(token);
  const complete = useCompletePublicSignature(token);
  const signatureRef = useRef<SignatureCanvasHandle>(null);

  const [signerName, setSignerName] = useState('');
  const [credentialNumber, setCredentialNumber] = useState('');
  const [hasDrawing, setHasDrawing] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!token) {
    return <StatusCard icon="⚠" title={t('publicPage.invalidTitle')} description={t('publicPage.invalidDescription')} />;
  }

  if (info.isLoading) {
    return <StatusCard icon="…" title={t('publicPage.loading')} description="" />;
  }

  if (info.isError) {
    const status = extractApiStatus(info.error);
    if (status === 410) {
      return <StatusCard icon="⏱" title={t('publicPage.expiredTitle')} description={t('publicPage.expiredDescription')} />;
    }
    return <StatusCard icon="⚠" title={t('publicPage.invalidTitle')} description={t('publicPage.invalidDescription')} />;
  }

  if (success) {
    return <StatusCard icon="✓" title={t('publicPage.successTitle')} description={t('publicPage.successDescription')} tone="success" />;
  }

  const flight = info.data!;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const stamp = credentialNumber.trim() ? `${t('stampPrefix')} ${credentialNumber.trim()}` : undefined;
    const signatureImage = signatureRef.current?.toBase64Png(stamp);
    if (!signatureImage) {
      setFormError(t('publicPage.signatureRequired'));
      return;
    }

    try {
      await complete.mutateAsync({
        signerName,
        credentialNumber: credentialNumber || null,
        signatureImage,
      });
      setSuccess(true);
    } catch (err) {
      setFormError(extractApiError(err));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 px-4 py-8">
      <div className="w-full max-w-[480px] space-y-6">
        <div className="text-center">
          <div className="text-4xl mb-2">✈</div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{t('publicPage.title')}</h1>
        </div>

        <div className="card p-6 space-y-6">
          <div>
            <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
              {t('publicPage.flightSummary')}
            </h2>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-slate-400 dark:text-slate-500">{t('publicPage.date')}</dt>
                <dd className="text-slate-800 dark:text-slate-100 font-medium">
                  {new Date(flight.flightDate).toLocaleDateString()}
                </dd>
              </div>
              <div>
                <dt className="text-slate-400 dark:text-slate-500">{t('publicPage.aircraft')}</dt>
                <dd className="text-slate-800 dark:text-slate-100 font-medium">
                  {flight.aircraftReg} ({flight.aircraftType})
                </dd>
              </div>
              {flight.route && (
                <div>
                  <dt className="text-slate-400 dark:text-slate-500">{t('publicPage.route')}</dt>
                  <dd className="text-slate-800 dark:text-slate-100 font-medium">{flight.route}</dd>
                </div>
              )}
              <div>
                <dt className="text-slate-400 dark:text-slate-500">{t('publicPage.totalTime')}</dt>
                <dd className="text-slate-800 dark:text-slate-100 font-medium">{formatDuration(flight.totalTime)}</dd>
              </div>
              {typeof flight.dualTime === 'number' && flight.dualTime > 0 && (
                <div>
                  <dt className="text-slate-400 dark:text-slate-500">{t('publicPage.dualTime')}</dt>
                  <dd className="text-slate-800 dark:text-slate-100 font-medium">{formatDuration(flight.dualTime)}</dd>
                </div>
              )}
            </dl>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 border-t border-slate-200 dark:border-slate-700 pt-5">
            {formError && (
              <div className="bg-red-50 border border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
                {formError}
              </div>
            )}

            <div>
              <label htmlFor="signerName" className="form-label">
                {t('publicPage.signerName')}
              </label>
              <input
                id="signerName"
                type="text"
                required
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                placeholder={t('publicPage.signerNamePlaceholder') ?? undefined}
                className="input"
              />
            </div>

            <div>
              <label htmlFor="credentialNumber" className="form-label">
                {t('publicPage.credentialNumber')}
              </label>
              <input
                id="credentialNumber"
                type="text"
                value={credentialNumber}
                onChange={(e) => setCredentialNumber(e.target.value)}
                className="input"
              />
              {credentialNumber.trim() && <p className="form-helper">{t('publicPage.credentialNumberHint')}</p>}
            </div>

            <SignatureCanvas ref={signatureRef} onChange={setHasDrawing} />

            <button
              type="submit"
              disabled={complete.isPending || !signerName || !hasDrawing}
              className="btn-primary w-full btn-lg"
            >
              {complete.isPending ? t('publicPage.submitting') : t('publicPage.submit')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function StatusCard({
  icon,
  title,
  description,
  tone = 'neutral',
}: {
  icon: string;
  title: string;
  description: string;
  tone?: 'neutral' | 'success';
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 px-4">
      <div className="w-full max-w-[400px]">
        <div className="card p-6 text-center">
          <div className={tone === 'success' ? 'text-green-600 text-5xl mb-4' : 'text-slate-400 text-5xl mb-4'}>
            {icon}
          </div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">{title}</h2>
          {description && <p className="text-slate-500 dark:text-slate-400">{description}</p>}
        </div>
      </div>
    </div>
  );
}
