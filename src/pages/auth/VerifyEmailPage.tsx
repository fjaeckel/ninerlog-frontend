import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useVerifyEmail } from '../../hooks/useAuth';
import { APP_NAME } from '../../lib/config';
import { LogoMark } from '../../components/ui/Logo';

type Status = 'verifying' | 'success' | 'invalid';

export default function VerifyEmailPage() {
  const { t } = useTranslation('auth');
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const verifyMutation = useVerifyEmail();
  const [status, setStatus] = useState<Status>('verifying');
  const ranRef = useRef(false);

  const token = params.get('token') ?? '';

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    if (!token) {
      setStatus('invalid');
      return;
    }

    verifyMutation
      .mutateAsync(token)
      .then(() => {
        setStatus('success');
        setTimeout(() => navigate('/dashboard'), 1200);
      })
      .catch(() => {
        setStatus('invalid');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

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

        <div className="card p-6 space-y-4 text-center" data-testid="verify-email-card">
          {status === 'verifying' && (
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {t('auth:verifyEmail.verifying')}
            </p>
          )}
          {status === 'success' && (
            <>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {t('auth:verifyEmail.success')}
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {t('auth:verifyEmail.redirecting')}
              </p>
            </>
          )}
          {status === 'invalid' && (
            <>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {t('auth:verifyEmail.invalidOrExpired')}
              </h2>
              <p className="text-center text-sm text-slate-500 dark:text-slate-400">
                <Link
                  to="/login"
                  className="font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  {t('auth:register.logIn')}
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
