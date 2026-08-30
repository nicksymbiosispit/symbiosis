import { useState } from 'react';

export default function AuthPanel({ status, loading, onSignIn, onSignUp }) {
  const [login, setLogin] = useState({ email: '', password: '' });
  const [signup, setSignup] = useState({ username: '', email: '', password: '' });

  return <main className="guest-page">
    <section className="guest-splash">
      <div className="splash-copy"><p className="eyebrow">A PLACE FOR FRIENDS</p><h1>Meet people.<br/>Share everything.</h1>
        <p>Symbiosis is your space on the web. Sign in, join the lobby and stay connected.</p></div>
      <div className="signin-box">
        <div className="box-title">Member Login</div>
        <form onSubmit={(event) => { event.preventDefault(); onSignIn(login.email.trim(), login.password); }}>
          <label>Email:<input type="email" required autoComplete="email" value={login.email} onChange={(e) => setLogin({...login, email:e.target.value})}/></label>
          <label>Password:<input type="password" required autoComplete="current-password" value={login.password} onChange={(e) => setLogin({...login, password:e.target.value})}/></label>
          <button className="web-button" disabled={loading}>LOGIN</button>
        </form>
      </div>
    </section>
    <section className="join-box">
      <div className="section-heading orange">Join Symbiosis Today!</div>
      <form className="join-form" onSubmit={(event) => { event.preventDefault(); onSignUp(signup.username, signup.email.trim(), signup.password); }}>
        <label>Username<input maxLength="24" required value={signup.username} onChange={(e) => setSignup({...signup, username:e.target.value})}/></label>
        <label>Email<input type="email" required autoComplete="email" value={signup.email} onChange={(e) => setSignup({...signup, email:e.target.value})}/></label>
        <label>Password<input type="password" minLength="8" required autoComplete="new-password" value={signup.password} onChange={(e) => setSignup({...signup, password:e.target.value})}/></label>
        <button className="web-button orange-button" disabled={loading}>SIGN ME UP!</button>
      </form>
      <p className="status" role="status">{status}</p>
    </section>
  </main>;
}
