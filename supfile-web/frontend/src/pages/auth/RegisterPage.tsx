import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../../styles/auth.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function RegisterPage() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOk(null);

    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }

    if (password !== confirm) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        // erreurs backend possibles (selon ton backend)
        if (data?.error === "EMAIL_ALREADY_USED") {
          setError("Cet email est déjà utilisé.");
        } else if (data?.error === "VALIDATION_ERROR") {
          setError("Veuillez vérifier les champs (email/mot de passe).");
        } else {
          setError(data?.error || "Erreur d'inscription.");
        }
        return;
      }

      setOk("Compte créé. Tu peux maintenant te connecter.");
      setTimeout(() => nav("/login", { replace: true }), 800);
    } catch {
      setError("Erreur serveur.");
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
              gap: "24px",
              position: "relative",
              zIndex: 1,
              paddingTop: "10px",
              paddingBottom: "10px",
            }}
          >
            <img
              src="/logo-supfile.png"
              alt="SUPFILE Logo"
              style={{
                width: "220px",
                maxWidth: "70%",
                objectFit: "contain",
                filter: "drop-shadow(0 20px 40px rgba(59,130,246,0.45))",
              }}
            />

            <p
              style={{
                maxWidth: "460px",
                margin: "0 auto",
                color: "rgba(255,255,255,0.68)",
                lineHeight: 1.65,
              }}
            >
              Crée ton compte SUPFILE pour accéder à un espace de stockage
              moderne et organiser tes fichiers facilement, avec un partage
              simple et rapide.
            </p>
          </div>
        </section>

        {/* RIGHT PANEL */}
        <section className="glass right-panel">
          <h2 className="card-title">Inscription</h2>

          {error && <div className="error">{error}</div>}

          {ok && (
            <div
              className="error"
              style={{
                borderColor: "rgba(59,130,246,0.35)",
                background: "rgba(59,130,246,0.10)",
              }}
            >
              {ok}
            </div>
          )}

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

            <div className="row">
              <div>
                <div className="label">Mot de passe</div>
                <input
                  className="input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 8 caractères"
                  required
                  autoComplete="new-password"
                />
              </div>

              <div>
                <div className="label">Confirmer</div>
                <input
                  className="input"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Retape le mot de passe"
                  required
                  autoComplete="new-password"
                />
              </div>
            </div>

            <div className="actions">
              <Link className="link" to="/login">
                Déjà un compte ? Se connecter
              </Link>

              <button className="btn btn-primary" type="submit" disabled={loading}>
                {loading ? "Création..." : "Créer le compte"}
              </button>
            </div>

            <button className="btn" type="button" onClick={() => nav("/login")}>
              Retour connexion
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}