import { useState } from "react";
import { login, signup } from "../services/api";
import { saveAuth } from "../services/auth";

export default function LoginPage({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await login(email, password);
      if (res.user.type !== "driver") {
        setError("This app is for driver accounts only");
        setLoading(false);
        return;
      }
      saveAuth(res.token, res.user);
      onAuth(res.user);
    } catch (err) {
      setError(err.message.includes("401") ? "Invalid email or password" : err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await signup({ email, password, name, type: "driver" });
      saveAuth(res.token, res.user);
      onAuth(res.user);
    } catch (err) {
      setError(err.message.includes("409") ? "Email already registered" : err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">CR</div>
        <h1 className="login-title">CloudRun Driver</h1>

        {mode === "login" ? (
          <form onSubmit={handleLogin} className="login-form">
            <input
              className="login-input"
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
            <input
              className="login-input"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
            {error && <div className="login-error">{error}</div>}
            <button className="login-btn" type="submit" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSignup} className="login-form">
            <input
              className="login-input"
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <input
              className="login-input"
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
            <input
              className="login-input"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
            />
            {error && <div className="login-error">{error}</div>}
            <button className="login-btn" type="submit" disabled={loading}>
              {loading ? "Creating account..." : "Create Account"}
            </button>
          </form>
        )}

        <div className="login-toggle">
          {mode === "login" ? (
            <span>
              No account?{" "}
              <button className="login-link" onClick={() => { setMode("signup"); setError(""); }}>
                Sign up
              </button>
            </span>
          ) : (
            <span>
              Have an account?{" "}
              <button className="login-link" onClick={() => { setMode("login"); setError(""); }}>
                Sign in
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
