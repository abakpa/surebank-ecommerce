import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { loginRequest, clearError } from '../redux/slices/authSlice';

const Login = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '';
  const sessionExpired = searchParams.get('sessionExpired') === '1';

  const { loading, error, isAuthenticated } = useSelector((state) => state.auth);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    phone: '',
    password: '',
  });

  useEffect(() => {
    if (isAuthenticated) {
      navigate(redirect ? `/${redirect}` : '/');
    }
    return () => {
      dispatch(clearError());
    };
  }, [isAuthenticated, navigate, redirect, dispatch]);

  const handleSubmit = (event) => {
    event.preventDefault();
    dispatch(loginRequest({ ...formData, navigate, redirect }));
  };

  return (
    <div className="min-h-[70vh] bg-orange-50 px-4 py-10">
      <div className="mx-auto w-full max-w-md overflow-hidden rounded-xl">
        <div className="px-4 pb-4">
          <h2 className="text-2xl font-bold text-gray-900">Create a Free Account</h2>
          <p className="mt-1 text-sm text-gray-600">
            Welcome! Create your account in seconds and start paying small small for the things you love.
          </p>

          <div className="mt-4 rounded-xl bg-white p-4">
            <div className="mb-4 flex items-center gap-2">
              <span className="text-sm text-gray-600">Don't have an Account?</span>
              <Link
                to={`/register${redirect ? `?redirect=${redirect}` : ''}`}
                className="text-sm font-medium text-orange-500 hover:text-orange-600"
              >
                Sign Up
              </Link>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              {sessionExpired && (
                <div className="rounded-lg bg-amber-100 p-3 text-sm text-amber-800">
                  Your login session has expired. Please login again to continue.
                </div>
              )}

              <input
                type="tel"
                placeholder="Phone Number"
                value={formData.phone}
                onChange={(event) => setFormData({ ...formData, phone: event.target.value })}
                className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-orange-500"
                required
              />
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  value={formData.password}
                  onChange={(event) => setFormData({ ...formData, password: event.target.value })}
                  className="w-full rounded-lg border border-gray-200 px-4 py-3 pr-10 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-orange-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  )}
                </button>
              </div>

              <div className="text-right">
                <Link
                  to="/forgot-password"
                  className="text-xs font-medium text-orange-500 hover:text-orange-600"
                >
                  Forgot Password?
                </Link>
              </div>

              {error && (
                <div className="rounded-lg bg-red-100 p-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <p className="text-center text-xs text-gray-500">
                By clicking Log In, you agree to our <span className="text-orange-500">Terms and Conditions</span> and{' '}
                <span className="text-orange-500">Privacy Policy</span>.
              </p>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-orange-500 py-3 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50"
              >
                {loading ? 'Please wait...' : 'Log In'}
              </button>
            </form>

            <p className="mt-4 text-center text-sm">
              Don't have an Account?{' '}
              <Link
                to={`/register${redirect ? `?redirect=${redirect}` : ''}`}
                className="font-medium text-orange-500 hover:text-orange-600"
              >
                Sign Up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
