import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../../styles/auth.css";
import { loginMock } from "../../services/mockAuth";

export default function LoginPage() {
  const nav = useNavigate();
  const [email, setEmail] = useState("alexidika@gmail.com");
  const [password, setPassword] = useState("0987654321");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const hint = useMemo(
    () => `Démo (mock) : alexidika@gmail.com / 0987654321`,
    []
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await new Promise((r) => setTimeout(r, 450));
      loginMock(email, password);
      nav("/dashboard");
    } catch (err: any) {
      setError(err?.message ?? "Erreur de connexion.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="supfile-auth">
      <div className="auth-shell">
        {/* LEFT PANEL */}
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
                fontWeight: 400,
              }}
            >
              Bienvenue sur SUPFILE une plateforme moderne de stockage et de
              partage de fichiers conçue pour offrir une expérience fluide
              sécurisée et intuitive.
            </p>
          </div>
        </section>

        {/* RIGHT PANEL */}
        <section className="glass right-panel">
          <h2 className="card-title">Connexion</h2>
          <p className="card-sub">
            Connecte-toi pour accéder à ton espace. <br />
            <span style={{ color: "rgba(255,255,255,0.55)" }}>{hint}</span>
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
                placeholder="ex: alexidika@gmail.com"
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
                placeholder="••••••••••"
                required
                autoComplete="current-password"
              />
            </div>

            <div className="actions">
              <Link className="link" to="/register">
                Créer un compte
              </Link>

              <button className="btn btn-primary" type="submit" disabled={loading}>
                {loading ? "Connexion..." : "Se connecter"}
              </button>
            </div>

            <button
              className="btn"
              type="button"
              onClick={() => {
                setEmail("alexidika@gmail.com");
                setPassword("0987654321");
              }}
            >
              Remplir identifiants démo
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}