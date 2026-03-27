import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../../styles/auth.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function LoginPage() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGithubLogin = () => {
    window.location.href = "http://localhost:4000/auth/oauth/github";
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data?.error || "Erreur de connexion.");
        return;
      }

      if (!data?.accessToken || !data?.refreshToken) {
        setError("Tokens manquants dans la réponse du serveur.");
        return;
      }

      localStorage.setItem("accessToken", data.accessToken);
      localStorage.setItem("refreshToken", data.refreshToken);

      nav("/dashboard", { replace: true });
    } catch {
      setError("Erreur serveur.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="supfile-auth">
      <div className="auth-shell">
        <section className="glass left-panel">
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              height: "100%",
              gap: "28px",
              position: "relative",
              zIndex: 1,
              paddingTop: "20px",
              paddingBottom: "20px",
            }}
          >
            <img
              src="/logo-supfile.png"
              alt="SUPFILE Logo"
              style={{
                width: "260px",
                maxWidth: "80%",
                objectFit: "contain",
                filter: "drop-shadow(0 25px 50px rgba(59,130,246,0.45))",
              }}
            />

            <p
              style={{
                maxWidth: "520px",
                margin: "0 auto",
                color: "rgba(255,255,255,0.70)",
                fontSize: "18px",
                lineHeight: 1.7,
              }}
            >
              Bienvenue sur SUPFILE, une plateforme moderne de stockage et de
              partage de fichiers conçue pour offrir une expérience fluide,
              sécurisée et intuitive.
            </p>
          </div>
        </section>

        <section className="glass right-panel">
          <h2 className="card-title">Connexion</h2>
          <p className="card-sub">
            Connecte-toi pour accéder à ton espace.
          </p>

          {error && <div className="error">{error}</div>}

          <form className="form" onSubmit={onSubmit}>
            <div>
              <div className="label">Adresse email</div>
              <input
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ex: email@supfile.com"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <div className="label">Mot de passe</div>
              <input
                className="input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>

            <div className="actions">
              <Link className="link" to="/register">
                Créer un compte
              </Link>

              <button
                className="btn btn-primary"
                type="submit"
                disabled={loading}
              >
                {loading ? "Connexion..." : "Se connecter"}
              </button>
            </div>

            <button
              className="btn"
              type="button"
              onClick={handleGithubLogin}
              style={{ marginTop: "12px", width: "100%" }}
            >
              Continuer avec GitHub
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}