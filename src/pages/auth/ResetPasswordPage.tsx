import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useResetPassword } from '../../hooks/useAuth';

// ⚠️ WARNING: /auth/reset-password is NOT in the OpenAPI spec
// This page will fail until the backend implements this endpoint
// See: ninerlog-project/api-spec/openapi.yaml

const resetSchema = z.object({
  email: z.string().email('Invalid email address'),
});

type ResetFormData = z.infer<typeof resetSchema>;

export default function ResetPasswordPage() {
  const resetPassword = useResetPassword();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      await resetPassword.mutateAsync(data);
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send reset email. Please try again.');
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 px-4">
        <div className="w-full max-w-[400px]">
          <div className="card p-6 text-center">
            <div className="text-green-600 text-5xl mb-4">✓</div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">Check your email</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-6">
              We've sent a password reset link to your email address. It expires in 1 hour.
            </p>
            <Link to="/login" className="btn-primary inline-flex">
              Back to login
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
          <div className="text-4xl mb-2">✈</div>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Reset Password</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Enter your email and we'll send you a reset link
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

          <button
            type="submit"
            disabled={isSubmitting || resetPassword.isPending}
            className="btn-primary w-full btn-lg"
          >
            {isSubmitting || resetPassword.isPending ? 'Sending...' : 'Send Reset Link'}
          </button>

          <p className="text-center text-sm text-slate-500 dark:text-slate-400">
            Remember your password?{' '}
            <Link
              to="/login"
              className="font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Log in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
