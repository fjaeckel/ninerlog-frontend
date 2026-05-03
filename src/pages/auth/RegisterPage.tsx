import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRegister } from '../../hooks/useAuth';
import { APP_NAME } from '../../lib/config';
import { LogoMark } from '../../components/ui/Logo';
import { extractApiError, extractApiStatus } from '../../lib/errors';

const registerSchema = z
  .object({
    name: z.string().min(1, 'Name is required').max(255, 'Name must be less than 255 characters'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(12, 'Password must be at least 12 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();
  const registerMutation = useRegister();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    try {
      setError(null);
      await registerMutation.mutateAsync({
        email: data.email,
        password: data.password,
        name: data.name,
      });
      navigate('/dashboard');
    } catch (err: unknown) {
      const status = extractApiStatus(err);
      if (status === 409) {
        setError(t('auth:register.emailExists'));
      } else {
        setError(extractApiError(err, t('auth:register.registrationFailed')));
      }
    }
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
        {/* Logo & Tagline */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center mb-3">
            <LogoMark size={64} className="drop-shadow-md" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-gradient-brand">{APP_NAME}</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            {t('auth:register.tagline')}
          </p>
        </div>

        <form
          className="card p-6 space-y-5"
          onSubmit={handleSubmit(onSubmit)}
        >
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="name" className="form-label">
              {t('auth:register.fullName')} <span className="text-red-500">*</span>
            </label>
            <input
              {...register('name')}
              type="text"
              id="name"
              autoComplete="name"
              className={`input ${errors.name ? 'input-error' : ''}`}
              placeholder="John Doe"
            />
            {errors.name && <p className="form-error">{errors.name.message}</p>}
          </div>

          <div>
            <label htmlFor="email" className="form-label">
              {t('auth:register.email')} <span className="text-red-500">*</span>
            </label>
            <input
              {...register('email')}
              type="email"
              id="email"
              autoComplete="email"
              className={`input ${errors.email ? 'input-error' : ''}`}
              placeholder="pilot@example.com"
            />
            {errors.email && <p className="form-error">{errors.email.message}</p>}
          </div>

          <div>
            <label htmlFor="password" className="form-label">
              {t('auth:register.password')} <span className="text-red-500">*</span>
            </label>
            <input
              {...register('password')}
              type="password"
              id="password"
              autoComplete="new-password"
              className={`input ${errors.password ? 'input-error' : ''}`}
              placeholder="••••••••••••"
            />
            {errors.password && (
              <p className="form-error">{errors.password.message}</p>
            )}
            <p className="form-helper">{t('auth:register.passwordHint')}</p>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="form-label">
              {t('auth:register.confirmPassword')} <span className="text-red-500">*</span>
            </label>
            <input
              {...register('confirmPassword')}
              type="password"
              id="confirmPassword"
              autoComplete="new-password"
              className={`input ${errors.confirmPassword ? 'input-error' : ''}`}
              placeholder="••••••••••••"
            />
            {errors.confirmPassword && (
              <p className="form-error">{errors.confirmPassword.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting || registerMutation.isPending}
            className="btn-primary w-full btn-lg"
          >
            {isSubmitting || registerMutation.isPending ? t('auth:register.creatingAccount') : t('auth:register.createAccount')}
          </button>

          <p className="text-center text-sm text-slate-500 dark:text-slate-400">
            {t('auth:register.haveAccount')}{' '}
            <Link
              to="/login"
              className="font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              {t('auth:register.logIn')}
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
