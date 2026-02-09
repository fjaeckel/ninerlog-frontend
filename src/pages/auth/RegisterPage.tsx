import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRegister } from '../../hooks/useAuth';

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
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 px-4 py-8">
      <div className="w-full max-w-[400px] space-y-8">
        {/* Logo & Tagline */}
        <div className="text-center">
          <div className="text-4xl mb-2">✈</div>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">PilotLog</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Create your account
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
              Full Name <span className="text-red-500">*</span>
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
              Email <span className="text-red-500">*</span>
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
              Password <span className="text-red-500">*</span>
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
            <p className="form-helper">Must be at least 12 characters</p>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="form-label">
              Confirm Password <span className="text-red-500">*</span>
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
            {isSubmitting || registerMutation.isPending ? 'Creating account...' : 'Create Account'}
          </button>

          <p className="text-center text-sm text-slate-500 dark:text-slate-400">
            Already have an account?{' '}
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
