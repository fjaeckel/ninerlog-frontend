import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { CheckCircle2 } from 'lucide-react';
import { LogoMark } from '../../components/ui/Logo';
import { APP_NAME } from '../../lib/config';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthProviders, useRequestPasswordReset } from '../../hooks/useAuth';
import { createLogger } from '../../lib/logger';

const log = createLogger('ResetPassword');

const resetSchema = z.object({
  email: z.string().email('Invalid email address'),
});

type ResetFormData = z.infer<typeof resetSchema>;

export default function ResetPasswordPage() {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();
  const requestReset = useRequestPasswordReset();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Password resets live at the identity provider in OIDC mode.
  const providers = useAuthProviders();
  useEffect(() => {
    if (providers.data?.mode === 'oidc') navigate('/login', { replace: true });
  }, [providers.data, navigate]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetFormData>({
    resolver: zodResolver(resetSchema),
  });

  const onSubmit = async (data: ResetFormData) => {
    try {
      setError(null);
      await requestReset.mutateAsync(data);
      setSuccess(true);
    } catch (err: unknown) {
      log.error('reset request failed', { err });
      const message =
        (err && typeof err === 'object' && 'error' in err && typeof (err as Record<string, unknown>).error === 'string')
          ? (err as Record<string, unknown>).error as string
          : t('auth:resetPassword.sendFailed');
      setError(message);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 px-4">
        <div className="w-full max-w-[400px]">
          <div className="card p-6 text-center">
            <CheckCircle2
              className="w-12 h-12 mx-auto mb-4 text-green-600 dark:text-green-400"
              strokeWidth={1.5}
              aria-hidden="true"
            />
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">{t('auth:resetPassword.checkEmail')}</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-6">
              {t('auth:resetPassword.resetSent')}
            </p>
            <Link to="/login" className="btn-primary inline-flex">
              {t('auth:resetPassword.backToLogin')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 px-4">
      <div className="w-full max-w-[400px] space-y-8">
        <div className="text-center">
          <div className="inline-flex items-center justify-center mb-3">
            <LogoMark size={64} className="drop-shadow-md" />
          </div>
          <p className="text-3xl font-bold tracking-tight text-gradient-brand">{APP_NAME}</p>
          <h1 className="mt-3 text-lg font-semibold text-slate-800 dark:text-slate-100">{t('auth:resetPassword.title')}</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {t('auth:resetPassword.description')}
          </p>
        </div>

        <form className="card p-6 space-y-5" onSubmit={handleSubmit(onSubmit)}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="form-label">
              {t('auth:resetPassword.email')}
            </label>
            <input
              {...register('email')}
              type="email"
              id="email"
              autoComplete="email"
              className={`input ${errors.email ? 'input-error' : ''}`}
              placeholder="pilot@example.com"
            />
            {errors.email && (
              <p className="form-error">{errors.email.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting || requestReset.isPending}
            className="btn-primary w-full btn-lg"
          >
            {isSubmitting || requestReset.isPending ? t('auth:resetPassword.sending') : t('auth:resetPassword.sendResetLink')}
          </button>

          <p className="text-center text-sm text-slate-500 dark:text-slate-400">
            {t('auth:resetPassword.rememberPassword')}{' '}
            <Link to="/login" className="link">
              {t('auth:resetPassword.logIn')}
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
