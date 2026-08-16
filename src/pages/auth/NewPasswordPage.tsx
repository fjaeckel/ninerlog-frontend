import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { LogoMark } from '../../components/ui/Logo';
import { APP_NAME } from '../../lib/config';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useResetPassword } from '../../hooks/useAuth';
import { PasswordStrengthMeter } from '../../components/ui/PasswordStrengthMeter';
import { PASSWORD_ISSUE_KEYS, passwordIssue } from '../../lib/passwordStrength';

// Messages are translation keys, resolved with `t` at render time.
const newPasswordSchema = z.object({
  // Mirrors the API's password policy; the server rejects the same set.
  newPassword: z.string().superRefine((value, ctx) => {
    const issue = passwordIssue(value);
    if (issue) {
      ctx.addIssue({
        code: 'custom',
        message: `auth:newPassword.${PASSWORD_ISSUE_KEYS[issue]}`,
      });
    }
  }),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'auth:newPassword.passwordsNoMatch',
  path: ['confirmPassword'],
});

type NewPasswordFormData = z.infer<typeof newPasswordSchema>;

export default function NewPasswordPage() {
  const { t } = useTranslation('auth');
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const resetPassword = useResetPassword();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<NewPasswordFormData>({
    resolver: zodResolver(newPasswordSchema),
  });

  // Drives the live strength meter as the user types.
  const newPasswordValue = useWatch({ control, name: 'newPassword' }) ?? '';

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 px-4">
        <div className="w-full max-w-[400px]">
          <div className="card p-6 text-center">
            <AlertTriangle
              className="w-12 h-12 mx-auto mb-4 text-red-600 dark:text-red-400"
              strokeWidth={1.5}
              aria-hidden="true"
            />
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">{t('auth:newPassword.invalidLink')}</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-6">
              {t('auth:newPassword.invalidLinkDescription')}
            </p>
            <Link to="/reset-password" className="btn-primary inline-flex">
              {t('auth:newPassword.requestNewLink')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

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
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">{t('auth:newPassword.success')}</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-6">
              {t('auth:newPassword.successDescription')}
            </p>
            <Link to="/login" className="btn-primary inline-flex">
              {t('auth:newPassword.backToLogin')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const onSubmit = async (data: NewPasswordFormData) => {
    try {
      setError(null);
      await resetPassword.mutateAsync({ token, newPassword: data.newPassword });
      setSuccess(true);
    } catch (err: any) {
      setError(err?.error || t('auth:newPassword.resetFailed'));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 px-4">
      <div className="w-full max-w-[400px] space-y-8">
        <div className="text-center">
          <div className="inline-flex items-center justify-center mb-3">
            <LogoMark size={64} className="drop-shadow-md" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-gradient-brand">{APP_NAME}</h1>
          <p className="mt-3 text-lg font-semibold text-slate-800 dark:text-slate-100">{t('auth:newPassword.title')}</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {t('auth:newPassword.description')}
          </p>
        </div>

        <form className="card p-6 space-y-5" onSubmit={handleSubmit(onSubmit)}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="newPassword" className="form-label">
              {t('auth:newPassword.newPassword')}
            </label>
            <input
              {...register('newPassword')}
              type="password"
              id="newPassword"
              autoComplete="new-password"
              aria-describedby="password-strength"
              className={`input ${errors.newPassword ? 'input-error' : ''}`}
            />
            {errors.newPassword && (
              <p className="form-error">{t(errors.newPassword.message ?? '')}</p>
            )}
            {newPasswordValue ? (
              <PasswordStrengthMeter id="password-strength" password={newPasswordValue} />
            ) : (
              <p className="form-helper" id="password-strength">
                {t('auth:passwordStrength.requirements')}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="form-label">
              {t('auth:newPassword.confirmPassword')}
            </label>
            <input
              {...register('confirmPassword')}
              type="password"
              id="confirmPassword"
              autoComplete="new-password"
              className={`input ${errors.confirmPassword ? 'input-error' : ''}`}
            />
            {errors.confirmPassword && (
              <p className="form-error">{t(errors.confirmPassword.message ?? '')}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting || resetPassword.isPending}
            className="btn-primary w-full btn-lg"
          >
            {isSubmitting || resetPassword.isPending ? t('auth:newPassword.resetting') : t('auth:newPassword.resetPassword')}
          </button>
        </form>
      </div>
    </div>
  );
}
