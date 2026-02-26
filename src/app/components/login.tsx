import { useState } from "react";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { TEXTS } from "@/constants/texts";
import { signInWithRole } from "@/lib/supabase";
import logo from "@/assets/e7e41f04542fce7954ea5453ee29ba88235cf6cb.png";
import adminLoginBg from "@/assets/login/admin-login-bg.jpg";

interface LoginProps {
  onSuccess: () => void;
}

export function Login({ onSuccess }: LoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const canSubmit = email.trim() && password.trim() && !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    try {
      setLoading(true);
      setError(null);
      await signInWithRole(email.trim(), password, "admin");
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de autenticación");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: `linear-gradient(rgba(0, 9, 53, 0.6), rgba(0, 9, 53, 0.55)), url(${adminLoginBg})`,
      }}
    >
      <div className="w-full max-w-md bg-white/92 backdrop-blur-[2px] rounded-2xl shadow-2xl border border-[#d9e3ee] overflow-hidden">
        <div className="px-6 py-5 bg-[#000935] text-white">
          <img src={logo} alt="ONUS" className="h-8 mb-3" />
          <h1 className="text-white text-2xl font-bold">{TEXTS.login.title}</h1>
          <p className="text-white/80 mt-1">{TEXTS.login.subtitle}</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block mb-2">{TEXTS.login.fields.email}</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666666]" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-3 py-2 bg-white border border-[#e5e5e5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00C9CE]"
                placeholder="admin@empresa.com"
                required
              />
            </div>
          </div>

          <div>
            <label className="block mb-2">{TEXTS.login.fields.password}</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666666]" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-2 bg-white border border-[#e5e5e5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00C9CE]"
                placeholder="********"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[#666666] hover:text-[#000935]"
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-[#fef2f2] border border-[#dc2626] rounded-lg text-sm text-[#dc2626]">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full px-4 py-2.5 bg-[#00C9CE] text-white rounded-lg hover:bg-[#00b3b8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? TEXTS.login.actions.loggingIn : TEXTS.login.actions.login}
          </button>
        </form>
      </div>
    </div>
  );
}
