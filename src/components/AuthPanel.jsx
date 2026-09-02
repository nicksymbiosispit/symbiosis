import { useState } from 'react';

export default function AuthPanel({ status, loading, onSignIn, onSignUp }) {
  const [login, setLogin] = useState({ email: '', password: '' });
  const [signup, setSignup] = useState({ username: '', email: '', password: '' });

  return <section className="panel auth-panel"><div className="panel-title">Sign in to Symbiosis</div><div className="panel-body">
    <div className="auth-grid">
      <form onSubmit={(event) => { event.preventDefault(); onSignIn(login.email.trim(), login.password); }}><h2>Returning user</h2>
        <label>Email<input type="email" required autoComplete="email" value={login.email} onChange={(e) => setLogin({...login,email:e.target.value})}/></label>
        <label>Password<input type="password" required autoComplete="current-password" value={login.password} onChange={(e) => setLogin({...login,password:e.target.value})}/></label>
        <button className="glossy-button blue" disabled={loading}>Sign In »</button></form>
      <div className="vertical-rule"/>
      <form onSubmit={(event) => { event.preventDefault(); onSignUp(signup.username, signup.email.trim(), signup.password); }}><h2>New here?</h2>
        <label>Username<input minLength="2" maxLength="24" pattern="[A-Za-z0-9_!@]+" title="Letters, numbers, _, !, and @ only" autoComplete="username" spellCheck="false" required value={signup.username} onChange={(e) => setSignup({...signup,username:e.target.value.replace(/[^A-Za-z0-9_!@]/g,'')})}/><small>Letters, numbers, _, ! and @ only. No spaces or dots.</small></label>
        <label>Email<input type="email" required autoComplete="email" value={signup.email} onChange={(e) => setSignup({...signup,email:e.target.value})}/></label>
        <label>Password<input type="password" minLength="8" required autoComplete="new-password" value={signup.password} onChange={(e) => setSignup({...signup,password:e.target.value})}/></label>
        <button className="glossy-button orange" disabled={loading}>Create Account »</button></form>
    </div><div className="status" role="status">{status}</div>
  </div></section>;
}
