import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLogin } from '../../hooks/useAuth';
import { useLogin2FA } from '../../hooks/useTwoFactor';
import { useAuthStore } from '../../stores/authStore';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const login = useLogin();
  const login2FA = useLogin2FA();
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
      setError(err.response?.data?.message || 'Invalid email or password.');
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
      navigate('/dashboard');
    } catch {
      setError('Invalid 2FA code. Try again.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 px-4">
      <div className="w-full max-w-[400px] space-y-8">
        {/* Logo & Tagline */}
        <div className="text-center">
          <div className="text-4xl mb-2">✈</div>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">PilotLog</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Your digital logbook, always current.
          </p>
        </div>

        {twoFactorToken ? (
          // 2FA Code Entry
          <div className="card p-6 space-y-5">
            <div className="text-center">
              <span className="text-3xl">🔐</span>
              <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mt-2">Two-Factor Authentication</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Enter the 6-digit code from your authenticator app
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="twoFACode" className="form-label">Authentication Code</label>
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
                Or enter a recovery code
              </p>
            </div>

            <button
              onClick={handleTwoFactorSubmit}
              disabled={twoFACode.length < 6 || login2FA.isPending}
              className="btn-primary w-full btn-lg"
            >
              {login2FA.isPending ? 'Verifying...' : 'Verify'}
            </button>

            <button
              onClick={() => { setTwoFactorToken(null); setTwoFACode(''); setError(null); }}
              className="text-sm text-slate-500 dark:text-slate-400 hover:text-blue-600 w-full text-center"
            >
              ← Back to login
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
              Email
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

          <div>
            <label htmlFor="password" className="form-label">
              Password
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
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || login.isPending}
            className="btn-primary w-full btn-lg"
          >
            {isSubmitting || login.isPending ? 'Signing in...' : 'Log In'}
          </button>

          <p className="text-center text-sm text-slate-500 dark:text-slate-400">
            Don't have an account?{' '}
            <Link
              to="/register"
              className="font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Create one
            </Link>
          </p>
        </form>
        )}
      </div>
    </div>
  );
}
