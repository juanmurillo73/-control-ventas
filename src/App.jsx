import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient.js';
import Dashboard from './Dashboard.jsx';

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = cargando, null = sin sesión
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const sendMagicLink = async (e) => {
    e.preventDefault();
    setError('');
    setSending(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    setSending(false);
    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  if (session === undefined) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'var(--text-secondary)' }}>
        Cargando...
      </div>
    );
  }

  if (!session) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '1rem' }}>
        <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 12, padding: '2rem', maxWidth: 380, width: '100%' }}>
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: '0 0 6px' }}>Control de Ventas</h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '0 0 20px' }}>
            Entra con tu correo, sin contraseña.
          </p>
          {sent ? (
            <p style={{ fontSize: 14 }}>
              Te enviamos un link de acceso a <strong>{email}</strong>. Ábrelo desde este mismo navegador para entrar.
            </p>
          ) : (
            <form onSubmit={sendMagicLink} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input
                type="email"
                required
                placeholder="tu@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <button type="submit" disabled={sending} style={{ background: 'var(--accent-bg)', color: 'var(--accent)', fontWeight: 500 }}>
                {sending ? 'Enviando...' : 'Enviar link de acceso'}
              </button>
              {error && <p style={{ fontSize: 13, color: 'var(--danger)', margin: 0 }}>{error}</p>}
            </form>
          )}
        </div>
      </div>
    );
  }

  return <Dashboard session={session} onLogout={logout} />;
}
