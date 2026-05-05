import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  usePasskeys,
  useRegisterPasskey,
  useDeletePasskey,
  passkeysSupported,
} from '../../hooks/usePasskeys';

function formatDate(value: string | undefined, locale: string): string {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString(locale);
  } catch {
    return value;
  }
}

export function PasskeySection() {
  const { t, i18n } = useTranslation('settings');
  const supported = passkeysSupported();

  const { data: passkeys = [], isLoading } = usePasskeys();
  const registerPasskey = useRegisterPasskey();
  const deletePasskey = useDeletePasskey();

  const [label, setLabel] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async () => {
    setError(null);
    try {
      await registerPasskey.mutateAsync(label.trim() || undefined);
      setLabel('');
    } catch (err) {
      console.error(err);
      setError(t('passkeys.registerFailed'));
    }
  };

  const handleDelete = async (id: string) => {
    setError(null);
    try {
      await deletePasskey.mutateAsync(id);
    } catch (err) {
      console.error(err);
      setError(t('passkeys.deleteFailed'));
    }
  };

  return (
    <div className="card">
      <h2 className="section-title mb-2">{t('passkeys.title')}</h2>
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
        {t('passkeys.description')}
      </p>

      {!supported ? (
        <p className="text-sm text-amber-700 dark:text-amber-300">
          {t('passkeys.unsupported')}
        </p>
      ) : (
        <div className="space-y-4">
          {isLoading ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('passkeys.loading')}</p>
          ) : passkeys.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('passkeys.empty')}</p>
          ) : (
            <ul className="divide-y divide-slate-200 dark:divide-slate-700">
              {passkeys.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-3 gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                      {p.label || t('passkeys.unnamed')}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {t('passkeys.created')}: {formatDate(p.createdAt, i18n.language)}
                      {p.lastUsedAt && (
                        <> · {t('passkeys.lastUsed')}: {formatDate(p.lastUsedAt, i18n.language)}</>
                      )}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(p.id)}
                    disabled={deletePasskey.isPending}
                    className="btn-secondary text-sm text-red-600"
                  >
                    {t('passkeys.revoke')}
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="border-t border-slate-200 dark:border-slate-700 pt-4 space-y-3">
            <label htmlFor="passkey-label" className="form-label">
              {t('passkeys.labelInput')}
            </label>
            <input
              id="passkey-label"
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={t('passkeys.labelPlaceholder')}
              maxLength={100}
              className="input"
            />
            <button
              onClick={handleRegister}
              disabled={registerPasskey.isPending}
              className="btn-primary"
            >
              {registerPasskey.isPending ? t('passkeys.registering') : t('passkeys.add')}
            </button>
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
