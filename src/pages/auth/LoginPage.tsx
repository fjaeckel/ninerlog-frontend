import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { useLogin } from '../../hooks/useAuth';
import { useLogin2FA } from '../../hooks/useTwoFactor';
import { useLoginWithPasskey, passkeysSupported } from '../../hooks/usePasskeys';
import { useAuthStore } from '../../stores/authStore';
import i18n from '../../i18n';
import { APP_NAME } from '../../lib/config';
import { LogoMark } from '../../components/ui/Logo';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();
  const login = useLogin();
  const login2FA = useLogin2FA();
  const passkeyLogin = useLoginWithPasskey();
  // Separate mutation instance so the conditional/autofill ceremony's pending
  // state never drives the explicit "Sign in with passkey" button.
  const passkeyConditional = useLoginWithPasskey();
  const passkeyAvailable = passkeysSupported();
  const { setAuth } = useAuthStore();
  const [error, setError] = useState<string | null>(null);
  const [twoFactorToken, setTwoFactorToken] = useState<string | null>(null);
  const [twoFACode, setTwoFACode] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      setError(null);
      const result = await login.mutateAsync(data);

      // Check if 2FA is required
      if ((result as any).requiresTwoFactor) {
        setTwoFactorToken((result as any).twoFactorToken);
        return;
      }

      navigate('/dashboard');
    } catch (err: any) {
      const msg = err?.error || err?.message || err?.response?.data?.error || '';
      if (msg.toLowerCase().includes('too many requests')) {
        setError(t('auth:login.rateLimited'));
      } else if (msg.toLowerCase().includes('disabled')) {
        setError(t('auth:login.accountDisabled'));
      } else if (msg.toLowerCase().includes('locked')) {
        setError(msg);
      } else {
        setError(msg || t('auth:login.invalidCredentials'));
      }
    }
  };

  const handleTwoFactorSubmit = async () => {
    try {
      setError(null);
      if (!twoFactorToken) return;

      const result = await login2FA.mutateAsync({
        twoFactorToken,
        code: twoFACode,
      });

      setAuth(result.user, result.accessToken, result.refreshToken, result.expiresIn);
      if (result.user?.preferredLocale && result.user.preferredLocale !== i18n.language) {
        i18n.changeLanguage(result.user.preferredLocale);
      }
      navigate('/dashboard');
    } catch {
      setError(t('auth:twoFactor.invalidCode'));
    }
  };

  const handlePasskeyLogin = async () => {
    setError(null);
    try {
      await passkeyLogin.mutateAsync({});
      navigate('/dashboard');
    } catch (err) {
      // Surface a generic message — most failures are user cancellation.
      const msg = (err as { error?: string; message?: string })?.error
        ?? (err as { message?: string })?.message
        ?? '';
      if (msg.toLowerCase().includes('not allowed') || msg.toLowerCase().includes('aborted')) {
        // user cancelled — stay silent
        return;
      }
      setError(t('auth:login.passkeyFailed'));
    }
  };

  // Trigger conditional / autofill UI on supported browsers.
  useEffect(() => {
    if (!passkeyAvailable || twoFactorToken) return;
    let cancelled = false;
    (async () => {
      try {
        // Only attempt conditional mediation if the browser actually supports
        // it. Otherwise startAuthentication() will hang indefinitely waiting
        // for an autofill suggestion that can never be produced, leaving the
        // mutation in a permanent "pending" state.
        const PKC = (window as unknown as { PublicKeyCredential?: { isConditionalMediationAvailable?: () => Promise<boolean> } }).PublicKeyCredential;
        if (!PKC?.isConditionalMediationAvailable) return;
        const supported = await PKC.isConditionalMediationAvailable();
        if (!supported || cancelled) return;
        await passkeyConditional.mutateAsync({ conditional: true });
        if (!cancelled) navigate('/dashboard');
      } catch {
        // Conditional UI may simply be unavailable — silently ignore.
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-slate-50 dark:bg-slate-900 px-4 py-10">
      {/* Aviation atmosphere — subtle radial brand glow, hidden in reduced-motion is fine because static */}
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
            {t('auth:login.tagline')}
          </p>
        </div>

        {twoFactorToken ? (
          // 2FA Code Entry
          <div className="card p-6 space-y-5">
            <div className="text-center">
              <span className="text-3xl">🔐</span>
              <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mt-2">{t('auth:twoFactor.title')}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {t('auth:twoFactor.enterCode')}
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="twoFACode" className="form-label">{t('auth:twoFactor.codeLabel')}</label>
              <input
                id="twoFACode"
                type="text"
                value={twoFACode}
                onChange={(e) => setTwoFACode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="input font-mono text-center text-2xl tracking-[0.5em]"
                placeholder="000000"
                maxLength={6}
                inputMode="numeric"
                autoFocus
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                {t('auth:twoFactor.recoveryHint')}
              </p>
            </div>

            <button
              onClick={handleTwoFactorSubmit}
              disabled={twoFACode.length < 6 || login2FA.isPending}
              className="btn-primary w-full btn-lg"
            >
              {login2FA.isPending ? t('auth:twoFactor.verifying') : t('auth:twoFactor.verify')}
            </button>

            <button
              onClick={() => { setTwoFactorToken(null); setTwoFACode(''); setError(null); }}
              className="text-sm text-slate-500 dark:text-slate-400 hover:text-blue-600 w-full text-center"
            >
              ← {t('auth:twoFactor.backToLogin')}
            </button>
          </div>
        ) : (
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
            <label htmlFor="email" className="form-label">
              {t('auth:login.email')}
            </label>
            <input
              {...register('email')}
              type="email"
              id="email"
              autoComplete="email webauthn"
              className={`input ${errors.email ? 'input-error' : ''}`}
              placeholder="pilot@example.com"
            />
            {errors.email && (
              <p className="form-error">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="form-label">
              {t('auth:login.password')}
            </label>
            <input
              {...register('password')}
              type="password"
              id="password"
              autoComplete="current-password"
              className={`input ${errors.password ? 'input-error' : ''}`}
              placeholder="••••••••"
            />
            {errors.password && (
              <p className="form-error">{errors.password.message}</p>
            )}
          </div>

          <div className="text-right">
            <Link
              to="/reset-password"
              className="text-sm text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors"
            >
              {t('auth:login.forgotPassword')}
            </Link>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || login.isPending}
            className="btn-primary w-full btn-lg"
          >
            {isSubmitting || login.isPending ? t('auth:login.signingIn') : t('auth:login.logIn')}
          </button>

          {passkeyAvailable && (
            <>
              <div className="flex items-center gap-3 text-xs text-slate-400">
                <span className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                <span>{t('auth:login.or')}</span>
                <span className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
              </div>
              <button
                type="button"
                onClick={handlePasskeyLogin}
                disabled={passkeyLogin.isPending}
                className="btn-secondary w-full btn-lg"
              >
                {passkeyLogin.isPending ? t('auth:login.passkeySigningIn') : t('auth:login.signInWithPasskey')}
              </button>
            </>
          )}

          <p className="text-center text-sm text-slate-500 dark:text-slate-400">
            {t('auth:login.noAccount')}{' '}
            <Link
              to="/register"
              className="font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              {t('auth:login.createOne')}
            </Link>
          </p>
        </form>
        )}
      </div>
    </div>
  );
}
