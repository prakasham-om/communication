import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { MessageCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const GOOGLE_ENABLED = !!import.meta.env.VITE_GOOGLE_CLIENT_ID && import.meta.env.VITE_GOOGLE_CLIENT_ID !== "";

export default function Register() {
  const { register, googleLogin } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await register(form);
      navigate("/chat", { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const onGoogle = async (cred) => {
    try {
      await googleLogin(cred.credential);
      navigate("/chat", { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Google login failed");
    }
  };

  return (
    <div className="min-h-screen bg-[#111b21] flex items-center justify-center p-5">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="w-20 h-20 bg-wa-green rounded-full flex items-center justify-center mx-auto">
            <MessageCircle className="text-white" size={38} />
          </div>
          <h1 className="text-3xl font-light text-white mt-4">ChatWave</h1>
        </div>

        <form onSubmit={submit} className="bg-white rounded-xl p-7 shadow-2xl">
          <h2 className="text-xl font-semibold text-[#111b21] mb-5">Create account</h2>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 p-2.5 rounded text-sm mb-4">
              {error}
            </div>
          )}

          <div className="space-y-3">
            <input
              name="name"
              className="wa-input border border-wa-border"
              placeholder="Full name"
              value={form.name}
              onChange={change}
              required
            />
            <input
              name="email"
              type="email"
              className="wa-input border border-wa-border"
              placeholder="Email"
              value={form.email}
              onChange={change}
              required
            />
            <input
              name="password"
              type="password"
              className="wa-input border border-wa-border"
              placeholder="Password (min 6 chars)"
              value={form.password}
              onChange={change}
              minLength={6}
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-wa-green hover:bg-wa-darkGreen text-white py-2.5 rounded-lg font-medium disabled:opacity-60"
            >
              {loading ? "Creating..." : "Create Account"}
            </button>
          </div>

          {GOOGLE_ENABLED && (
            <>
              <div className="my-4 flex items-center gap-3">
                <div className="flex-1 h-px bg-wa-border" />
                <span className="text-xs text-wa-time">OR</span>
                <div className="flex-1 h-px bg-wa-border" />
              </div>
              <div className="flex justify-center">
                <GoogleLogin onSuccess={onGoogle} />
              </div>
            </>
          )}

          <p className="text-center text-sm text-wa-time mt-5">
            Have an account?{" "}
            <Link to="/login" className="text-wa-green font-semibold">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
