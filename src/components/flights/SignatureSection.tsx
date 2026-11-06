import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import QRCode from 'qrcode';
import { PenLine, Mail, Link as LinkIcon, ShieldCheck, Copy, Check, History, ChevronDown, ChevronRight } from 'lucide-react';
import type { components } from '../../api/schema';
import {
  useFlightSignatures,
  useSignFlightLive,
  useCreateSignatureRequest,
  useResendSignatureRequest,
  useRevokeSignatureRequest,
  useVoidFlightSignature,
  useFlightSignatureImageUrl,
} from '../../hooks/useSignatures';
import { Dialog } from '../ui/Dialog';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { SignatureCanvas, type SignatureCanvasHandle } from '../SignatureCanvas';
import { extractApiError } from '../../lib/errors';
import { useFormatPrefs } from '../../hooks/useFormatPrefs';

type Flight = components['schemas']['Flight'];

const EXPIRY_OPTIONS: { hours: number; labelKey: string }[] = [
  { hours: 24, labelKey: 'expiry.hours24' },
  { hours: 72, labelKey: 'expiry.days3' },
  { hours: 168, labelKey: 'expiry.days7' },
  { hours: 720, labelKey: 'expiry.days30' },
];

export function SignatureSection({ flight }: { flight: Flight }) {
  const { t } = useTranslation('signatures');
  const { fmtDateTime } = useFormatPrefs();
  const { data: signatures } = useFlightSignatures(flight.id);

  const [showLiveDialog, setShowLiveDialog] = useState(false);
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [showVoidDialog, setShowVoidDialog] = useState(false);

  const activeSignature = flight.signatureId
    ? signatures?.find((s) => s.id === flight.signatureId)
    : undefined;
  const pendingRequest = signatures?.find((s) => s.status === 'pending');
  const voidedSignatures = signatures?.filter((s) => s.status === 'voided') ?? [];

  const imageUrl = useFlightSignatureImageUrl(flight.id, activeSignature?.id);

  return (
    <div className="card">
      <h2 className="section-title mb-4 flex items-center gap-2">
        <ShieldCheck className="w-4 h-4" />
        {t('section.title')}
      </h2>

      {flight.signatureId && activeSignature ? (
        <div className="space-y-3">
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 text-sm text-green-800 dark:text-green-300">
            {t('section.lockedBanner')}
          </div>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500 dark:text-slate-400">
                {t('section.signedBy', {
                  name: activeSignature.instructorName || '—',
                  date: activeSignature.signedAt ? fmtDateTime(activeSignature.signedAt) : '',
                })}
              </dt>
            </div>
          </dl>
          {imageUrl.data ? (
            <img
              src={imageUrl.data}
              alt={t('signaturePad.ariaLabel')}
              className="border border-slate-200 dark:border-slate-700 rounded-lg bg-white max-w-full h-auto max-h-40 object-contain"
            />
          ) : imageUrl.isLoading ? (
            <div className="h-40 w-64 max-w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 animate-pulse" />
          ) : imageUrl.isError ? (
            <p className="text-xs text-slate-400 dark:text-slate-500">{t('section.noSignature')}</p>
          ) : null}
          <button onClick={() => setShowVoidDialog(true)} className="btn-secondary text-sm">
            {t('section.voidAction')}
          </button>
        </div>
      ) : pendingRequest ? (
        <PendingRequestPanel flightId={flight.id} pendingRequest={pendingRequest} />
      ) : (
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setShowLiveDialog(true)} className="btn-secondary text-sm">
            <PenLine className="w-4 h-4" />
            {t('section.signNow')}
          </button>
          <button onClick={() => setShowRequestDialog(true)} className="btn-secondary text-sm">
            <Mail className="w-4 h-4" />
            {t('section.requestByEmail')}
          </button>
        </div>
      )}

      {voidedSignatures.length > 0 && (
        <SignatureAuditTrail flightId={flight.id} voidedSignatures={voidedSignatures} />
      )}

      {showLiveDialog && (
        <LiveSignDialog flightId={flight.id} onClose={() => setShowLiveDialog(false)} />
      )}
      {showRequestDialog && (
        <RequestSignatureDialog flightId={flight.id} onClose={() => setShowRequestDialog(false)} />
      )}
      {activeSignature && showVoidDialog && (
        <VoidSignatureDialog
          flightId={flight.id}
          signatureId={activeSignature.id}
          onClose={() => setShowVoidDialog(false)}
        />
      )}
    </div>
  );
}

function VoidSignatureDialog({
  flightId,
  signatureId,
  onClose,
}: {
  flightId: string;
  signatureId: string;
  onClose: () => void;
}) {
  const { t } = useTranslation('signatures');
  const voidSignature = useVoidFlightSignature(flightId);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await voidSignature.mutateAsync({ signatureId, reason });
      onClose();
    } catch (err) {
      setError(extractApiError(err));
    }
  };

  return (
    <Dialog open onClose={onClose} title={t('section.voidDialogTitle')} description={t('section.voidDialogDescription')}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400 px-3 py-2 rounded-lg text-sm">
            {error}
          </div>
        )}
        <div>
          <label htmlFor="void-reason" className="form-label">
            {t('section.voidReasonLabel')}
          </label>
          <textarea
            id="void-reason"
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t('section.voidReasonPlaceholder') ?? undefined}
            className="input"
            rows={3}
          />
        </div>
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose} className="btn-secondary" disabled={voidSignature.isPending}>
            {t('common:cancel', { defaultValue: 'Cancel' })}
          </button>
          <button type="submit" className="btn-danger" disabled={voidSignature.isPending || !reason.trim()}>
            {voidSignature.isPending ? t('section.voiding') : t('section.voidConfirm')}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

function SignatureAuditTrail({
  flightId,
  voidedSignatures,
}: {
  flightId: string;
  voidedSignatures: components['schemas']['FlightSignature'][];
}) {
  const { t } = useTranslation('signatures');
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
      >
        <span className="flex items-center gap-1.5">
          <History className="w-3.5 h-3.5" />
          {t('audit.title')} ({voidedSignatures.length})
        </span>
        {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
      </button>

      {isOpen && (
        <div className="mt-3 space-y-3">
          {voidedSignatures.map((sig) => (
            <VoidedSignatureEntry key={sig.id} flightId={flightId} signature={sig} />
          ))}
        </div>
      )}
    </div>
  );
}

function VoidedSignatureEntry({
  flightId,
  signature,
}: {
  flightId: string;
  signature: components['schemas']['FlightSignature'];
}) {
  const { t } = useTranslation('signatures');
  const { fmtDateTime } = useFormatPrefs();
  const [showImage, setShowImage] = useState(false);
  const imageUrl = useFlightSignatureImageUrl(flightId, showImage ? signature.id : null);

  return (
    <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-xs space-y-2.5">
      {/* Pill + Signer Name + Credential */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="badge bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 font-medium">
          {t('audit.statusVoided')}
        </span>
        <span className="font-semibold text-slate-800 dark:text-slate-100">
          {signature.instructorName || t('audit.unknownSigner')}
        </span>
        {signature.instructorCredentialNumber && (
          <span className="text-slate-500 dark:text-slate-400">
            ({t('stampPrefix')} {signature.instructorCredentialNumber})
          </span>
        )}
      </div>

      {/* Strictly listed below the pill: Signed on first, then Voided on */}
      <div className="space-y-1 text-slate-600 dark:text-slate-400">
        {signature.signedAt && (
          <div>
            {t('audit.signedAt', { date: fmtDateTime(signature.signedAt) })}
          </div>
        )}
        {signature.voidedAt && (
          <div>
            {t('audit.voidedAt', { date: fmtDateTime(signature.voidedAt) })}
          </div>
        )}
      </div>

      {/* Reason box */}
      {signature.voidedReason && (
        <div className="bg-white dark:bg-slate-800 rounded p-2.5 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
          <span className="font-medium text-slate-800 dark:text-slate-200">{t('audit.reasonLabel')}: </span>
          <span className="text-slate-600 dark:text-slate-400 italic">"{signature.voidedReason}"</span>
        </div>
      )}

      {/* Image toggle */}
      <div>
        <button
          type="button"
          onClick={() => setShowImage(!showImage)}
          className="text-sky-600 dark:text-sky-400 hover:underline font-medium"
        >
          {showImage ? t('audit.hideSignature') : t('audit.viewSignature')}
        </button>
        {showImage && (
          <div className="mt-2">
            {imageUrl.data ? (
              <img
                src={imageUrl.data}
                alt={t('signaturePad.ariaLabel')}
                className="border border-slate-200 dark:border-slate-700 rounded bg-white max-w-full h-auto max-h-28 object-contain"
              />
            ) : imageUrl.isLoading ? (
              <div className="h-24 w-48 rounded border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 animate-pulse" />
            ) : (
              <p className="text-slate-400 dark:text-slate-500">{t('section.noSignature')}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function LiveSignDialog({ flightId, onClose }: { flightId: string; onClose: () => void }) {
  const { t } = useTranslation('signatures');
  const signLive = useSignFlightLive(flightId);
  const signatureRef = useRef<SignatureCanvasHandle>(null);
  const [signerName, setSignerName] = useState('');
  const [credentialNumber, setCredentialNumber] = useState('');
  const [hasDrawing, setHasDrawing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const stamp = credentialNumber.trim() ? `${t('stampPrefix')} ${credentialNumber.trim()}` : undefined;
    const signatureImage = signatureRef.current?.toBase64Png(stamp);
    if (!signatureImage) {
      setError(t('liveDialog.signatureRequired'));
      return;
    }
    try {
      await signLive.mutateAsync({ signerName, credentialNumber: credentialNumber || null, signatureImage });
      onClose();
    } catch (err) {
      setError(extractApiError(err));
    }
  };

  return (
    <Dialog open onClose={onClose} title={t('liveDialog.title')} description={t('liveDialog.description')}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400 px-3 py-2 rounded-lg text-sm">
            {error}
          </div>
        )}
        <div>
          <label htmlFor="live-signer-name" className="form-label">
            {t('liveDialog.signerName')}
          </label>
          <input
            id="live-signer-name"
            type="text"
            required
            value={signerName}
            onChange={(e) => setSignerName(e.target.value)}
            placeholder={t('liveDialog.signerNamePlaceholder') ?? undefined}
            className="input"
          />
        </div>
        <div>
          <label htmlFor="live-credential-number" className="form-label">
            {t('liveDialog.credentialNumber')}
          </label>
          <input
            id="live-credential-number"
            type="text"
            value={credentialNumber}
            onChange={(e) => setCredentialNumber(e.target.value)}
            className="input"
          />
          {credentialNumber.trim() && <p className="form-helper">{t('liveDialog.credentialNumberHint')}</p>}
        </div>
        <SignatureCanvas ref={signatureRef} onChange={setHasDrawing} />
        <button type="submit" disabled={signLive.isPending || !signerName || !hasDrawing} className="btn-primary w-full">
          {signLive.isPending ? t('liveDialog.signing') : t('liveDialog.submit')}
        </button>
      </form>
    </Dialog>
  );
}

function RequestSignatureDialog({ flightId, onClose }: { flightId: string; onClose: () => void }) {
  const { t } = useTranslation('signatures');
  const createRequest = useCreateSignatureRequest(flightId);
  const [email, setEmail] = useState('');
  const [expiresInHours, setExpiresInHours] = useState(168);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ signUrl: string; instructorEmail?: string | null } | null>(null);

  const submit = async (sendEmail: boolean) => {
    setError(null);
    try {
      const created = await createRequest.mutateAsync({
        instructorEmail: sendEmail && email ? email : null,
        expiresInHours,
      });
      setResult({ signUrl: created.signUrl, instructorEmail: created.instructorEmail });
    } catch (err) {
      setError(extractApiError(err));
    }
  };

  return (
    <Dialog open onClose={onClose} title={t('emailDialog.title')} description={t('emailDialog.description')}>
      {result ? (
        <SignUrlResult signUrl={result.signUrl} sentTo={result.instructorEmail} onDone={onClose} />
      ) : (
        <div className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400 px-3 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}
          <div>
            <label htmlFor="request-email" className="form-label">
              {t('emailDialog.email')}
            </label>
            <input
              id="request-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('emailDialog.emailPlaceholder') ?? undefined}
              className="input"
            />
          </div>
          <div>
            <label htmlFor="request-expiry" className="form-label">
              {t('emailDialog.expiresIn')}
            </label>
            <select
              id="request-expiry"
              value={expiresInHours}
              onChange={(e) => setExpiresInHours(Number(e.target.value))}
              className="input"
            >
              {EXPIRY_OPTIONS.map((opt) => (
                <option key={opt.hours} value={opt.hours}>
                  {t(opt.labelKey)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={() => submit(true)}
              disabled={createRequest.isPending || !email}
              className="btn-primary flex-1"
            >
              {createRequest.isPending ? t('emailDialog.sending') : t('emailDialog.sendNow')}
            </button>
            <button
              type="button"
              onClick={() => submit(false)}
              disabled={createRequest.isPending}
              className="btn-secondary flex-1"
            >
              <LinkIcon className="w-4 h-4" />
              {t('section.getShareableLink')}
            </button>
          </div>
        </div>
      )}
    </Dialog>
  );
}

function SignUrlResult({ signUrl, sentTo, onDone }: { signUrl: string; sentTo?: string | null; onDone: () => void }) {
  const { t } = useTranslation('signatures');
  const [qr, setQr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(signUrl, { width: 220, margin: 1 }).then((url) => {
      if (!cancelled) setQr(url);
    }).catch(() => setQr(null));
    return () => { cancelled = true; };
  }, [signUrl]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(signUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API unavailable — the text field below is still selectable
    }
  };

  return (
    <div className="space-y-4">
      {sentTo && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 text-sm text-green-800 dark:text-green-300">
          {t('section.pendingSentTo', { email: sentTo })}
        </div>
      )}
      <p className="text-sm text-slate-500 dark:text-slate-400">{t('linkDialog.description')}</p>
      {qr && (
        <div className="flex justify-center">
          <img src={qr} alt={t('linkDialog.qrAlt')} className="rounded-lg border border-slate-200 dark:border-slate-700" />
        </div>
      )}
      <div className="flex gap-2">
        <input readOnly value={signUrl} className="input flex-1 text-xs font-mono" onFocus={(e) => e.currentTarget.select()} />
        <button type="button" onClick={handleCopy} className="btn-secondary shrink-0">
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied ? t('linkDialog.copied') : t('linkDialog.copy')}
        </button>
      </div>
      <button type="button" onClick={onDone} className="btn-primary w-full">
        {t('common:done', { defaultValue: 'Done' })}
      </button>
    </div>
  );
}

type FlightSignature = components['schemas']['FlightSignature'];

function PendingRequestPanel({ flightId, pendingRequest }: { flightId: string; pendingRequest: FlightSignature }) {
  const { t } = useTranslation('signatures');
  const { fmtDateTime } = useFormatPrefs();
  const [showManage, setShowManage] = useState(false);
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);
  const revoke = useRevokeSignatureRequest(flightId);

  const handleRevoke = async () => {
    await revoke.mutateAsync(pendingRequest.id);
    setShowRevokeConfirm(false);
  };

  return (
    <div className="space-y-3">
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-sm text-amber-800 dark:text-amber-300 space-y-1">
        <p className="font-medium">{t('section.pendingStatus')}</p>
        <p>
          {pendingRequest.instructorEmail
            ? t('section.pendingSentTo', { email: pendingRequest.instructorEmail })
            : t('section.pendingNotSent')}
        </p>
        {pendingRequest.tokenExpiresAt && (
          <p>{t('section.pendingExpires', { date: fmtDateTime(pendingRequest.tokenExpiresAt) })}</p>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setShowManage(true)} className="btn-secondary text-sm">
          {t('section.resend')}
        </button>
        <button onClick={() => setShowRevokeConfirm(true)} className="btn-secondary text-sm">
          {t('section.revoke')}
        </button>
      </div>
      {showManage && (
        <ResendDialog flightId={flightId} pendingRequest={pendingRequest} onClose={() => setShowManage(false)} />
      )}
      <ConfirmDialog
        open={showRevokeConfirm}
        onConfirm={handleRevoke}
        onCancel={() => setShowRevokeConfirm(false)}
        title={t('section.resendConfirmTitle')}
        description={t('section.resendConfirmDescription')}
        confirmLabel={t('section.revoke')}
        variant="warning"
        isLoading={revoke.isPending}
      />
    </div>
  );
}

function ResendDialog({
  flightId,
  pendingRequest,
  onClose,
}: {
  flightId: string;
  pendingRequest: FlightSignature;
  onClose: () => void;
}) {
  const { t } = useTranslation('signatures');
  const resend = useResendSignatureRequest(flightId);
  const [email, setEmail] = useState(pendingRequest.instructorEmail || '');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ signUrl: string; instructorEmail?: string | null } | null>(null);

  const submit = async (sendEmail: boolean) => {
    setError(null);
    try {
      const updated = await resend.mutateAsync({
        signatureId: pendingRequest.id,
        instructorEmail: sendEmail && email ? email : null,
      });
      setResult({ signUrl: updated.signUrl, instructorEmail: updated.instructorEmail });
    } catch (err) {
      setError(extractApiError(err));
    }
  };

  return (
    <Dialog open onClose={onClose} title={t('emailDialog.title')} description={t('emailDialog.description')}>
      {result ? (
        <SignUrlResult signUrl={result.signUrl} sentTo={result.instructorEmail} onDone={onClose} />
      ) : (
        <div className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400 px-3 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}
          <div>
            <label htmlFor="resend-email" className="form-label">
              {t('emailDialog.email')}
            </label>
            <input
              id="resend-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('emailDialog.emailPlaceholder') ?? undefined}
              className="input"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={() => submit(true)}
              disabled={resend.isPending || !email}
              className="btn-primary flex-1"
            >
              {resend.isPending ? t('emailDialog.sending') : t('emailDialog.sendNow')}
            </button>
            <button type="button" onClick={() => submit(false)} disabled={resend.isPending} className="btn-secondary flex-1">
              <LinkIcon className="w-4 h-4" />
              {t('section.getShareableLink')}
            </button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
