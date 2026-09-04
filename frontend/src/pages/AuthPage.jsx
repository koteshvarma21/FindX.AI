import { useState } from 'react';
import { registerUser, loginUser } from '../api/client';

export default function AuthPage({ onAuthSuccess }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ username: '', email: '', password: '', fullName: '', phone: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result = mode === 'register' ? await registerUser(form) : await loginUser(form.username, form.password);
      localStorage.setItem('token', result.token);
      onAuthSuccess?.(result.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <h1>{mode === 'register' ? 'Create an account' : 'Log in'}</h1>
      {error && <p role="alert">{error}</p>}
      <form onSubmit={handleSubmit}>
        <input placeholder="Username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
        {mode === 'register' && <input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />}
        <input placeholder="Password" type="password" minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        <button type="submit" disabled={loading}>{loading ? 'Please wait...' : mode === 'register' ? 'Sign up' : 'Log in'}</button>
      </form>
      <button type="button" onClick={() => setMode(mode === 'register' ? 'login' : 'register')}>
        {mode === 'register' ? 'Log in' : 'Sign up'}
      </button>
    </main>
  );
}