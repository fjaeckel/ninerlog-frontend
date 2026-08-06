import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useExchangeOidcCode } from '../../hooks/useAuth';
import { APP_NAME } from '../../lib/config';
import { LogoMark } from '../../components/ui/Logo';

type Status = 'exchanging' | 'error';

/** Coarse error codes the API appends as ?oidc_error=… — detail stays in the server log. */
const KNOWN_ERRORS = [
  'provider_error',
  'provider_unavailable',
  'invalid_state',
  'email_missing',
  'email_conflict',
  'account_disabled',
  'login_failed',
] as const;

/**
 * Landing page for OIDC_POST_LOGIN_REDIRECT. The API redirects here after the
 * provider callback, carrying either a single-use handoff code (?oidc_code=…)
 * to swap for a token pair, or a coarse error code (?oidc_error=…).
 */
export default function OidcCallbackPage() {
  const { t } = useTranslation('auth');
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const exchange = useExchangeOidcCode();
  const ranRef = useRef(false);
  // Capture params once: the URL is scrubbed immediately below, and the
  // handoff code must never be retried from a stale query string.
  const [code] = useState(() => params.get('oidc_code'));
  const [errorCode] = useState(() => params.get('oidc_error'));
  const [status, setStatus] = useState<Status>(code ? 'exchanging' : 'error');

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    // Scrub the single-use code (or error) from the address bar and history so
    // a reload or back-navigation never replays it.
    window.history.replaceState(null, '', '/auth/callback');

    if (!code) {
      if (!errorCode) navigate('/', { replace: true });
      return;
    }

    exchange
      .mutateAsync(code)
      .then(() => {
        navigate('/dashboard', { replace: true });
      })
      .catch(() => {
        setStatus('error');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const errorMessage = () => {
    if (errorCode && (KNOWN_ERRORS as readonly string[]).includes(errorCode)) {
      return t(`auth:oidc.errors.${errorCode}`);
    }
    // No params at all, an unrecognized code, or a failed/expired exchange.
    return t('auth:oidc.errors.login_failed');
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-slate-50 dark:bg-slate-900 px-4 py-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(60rem 36rem at 50% -10%, rgba(37,99,235,0.18), transparent 60%), radial-gradient(40rem 28rem at 100% 110%, rgba(30,58,95,0.20), transparent 60%)',
        }}
      />
      <div className="relative w-full max-w-[400px] space-y-6">
        <div className="text-center">
          <div className="inline-flex items-center justify-center mb-3">
            <LogoMark size={64} className="drop-shadow-md" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-gradient-brand">{APP_NAME}</h1>
        </div>

        <div className="card p-6 space-y-4 text-center" data-testid="oidc-callback-card">
          {status === 'exchanging' ? (
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {t('auth:oidc.completingSignIn')}
            </p>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {t('auth:oidc.signInFailed')}
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">{errorMessage()}</p>
              <p className="text-center text-sm">
                <Link
                  to="/login"
                  className="font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  {t('auth:oidc.backToSignIn')}
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
