"use client";

import { useState } from "react";
import { createClient } from "@/utils/client";
import { useRouter } from "next/navigation";
import { Loader2, Mail, Lock, ArrowRight, Sparkles } from "lucide-react";

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setMessage(`❌ Error: ${error.message}`);
      else setMessage("✅ Welcome to Echo! Please log in to start journaling.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMessage(`❌ Error: ${error.message}`);
      else {
        setMessage("✅ Logged in! Redirecting...");
        router.push("/");
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAF9F6] p-6">
      <div className="w-full max-w-md">
        
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-white rounded-2xl shadow-sm border border-gray-100 mb-4">
            <Sparkles className="w-7 h-7 text-[#8EACA0]" />
          </div>
          <h1 className="text-4xl font-extrabold text-gray-900 mb-2 font-serif tracking-tight">Echo</h1>
          <p className="text-gray-500 text-sm">Your intelligent, reflective journaling space.</p>
        </div>

        {/* Auth Card */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-6">
            {isSignUp ? "Create your account" : "Welcome back"}
          </h2>

          <form onSubmit={handleAuth} className="space-y-5">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-[#FAF9F6] border border-gray-200 rounded-xl text-sm focus:border-[#8EACA0] focus:ring-0 transition-colors text-gray-900"
                  placeholder="alex@university.edu"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-[#FAF9F6] border border-gray-200 rounded-xl text-sm focus:border-[#8EACA0] focus:ring-0 transition-colors text-gray-900"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#8EACA0] hover:bg-[#7D9A8F] disabled:bg-gray-400 text-white font-semibold py-3.5 rounded-full flex justify-center items-center gap-2 transition-all shadow-sm mt-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>{isSignUp ? "Sign Up" : "Log In"} <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>

          {message && (
            <div className="mt-4 p-3 text-center text-xs font-medium text-gray-600 bg-[#F0EBE1] rounded-lg">
              {message}
            </div>
          )}

          <div className="mt-8 text-center">
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm text-gray-500 hover:text-[#8EACA0] transition-colors font-medium"
            >
              {isSignUp ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}