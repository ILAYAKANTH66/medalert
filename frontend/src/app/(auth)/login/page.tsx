"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { authService } from "@/services/auth.service";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/button";
import { FormGroup, Label, Input, FormError } from "@/components/ui/Form";
import { Activity } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const data = await authService.login({ email, password });
      if (data && data.token && data.user) {
        login(data.token, data.user);
      } else {
        throw new Error("Invalid response received from server.");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during login.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center p-6 bg-slate-50 dark:bg-zinc-950 relative overflow-hidden select-none">
      {/* Decorative backdrop blobs */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full bg-indigo-500/10 blur-[80px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[350px] h-[350px] rounded-full bg-teal-500/10 blur-[80px] pointer-events-none" />

      <div className="w-full max-w-[420px] flex flex-col gap-6 z-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* App Logo & Branding */}
        <div className="flex flex-col items-center gap-2">
          <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-500/30 text-white animate-bounce-slow">
            <Activity className="h-6 w-6 stroke-[2.5]" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            MedAlert
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">
            Smart dosage tracking & caretaker sync
          </p>
        </div>

        <Card className="border border-white/60 dark:border-zinc-800/80 bg-white/75 dark:bg-zinc-900/80 backdrop-blur-md shadow-xl p-8 rounded-2xl">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mb-6 text-center">
            Welcome Back
          </h2>
          
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <FormGroup>
              <Label htmlFor="login-email" required>Email Address</Label>
              <Input
                id="login-email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </FormGroup>

            <FormGroup>
              <Label htmlFor="login-password" required>Password</Label>
              <Input
                id="login-password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </FormGroup>

            {error && <FormError>{error}</FormError>}

            <Button
              type="submit"
              variant="default"
              className="w-full mt-2 py-6 rounded-xl font-semibold shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/20 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200"
              disabled={loading}
            >
              {loading ? "Authenticating..." : "Login"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-zinc-500 dark:text-zinc-400 font-medium">
            New to MedAlert?{" "}
            <Link 
              href="/signup" 
              className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
            >
              Create Account
            </Link>
          </p>
        </Card>
      </div>
    </main>
  );
}

