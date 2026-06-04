"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { authService } from "@/services/auth.service";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/button";
import { FormGroup, Label, Input, Select, FormError } from "@/components/ui/Form";
import { Activity } from "lucide-react";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("PATIENT");
  const [caretakerToken, setCaretakerToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const payload = {
        name,
        email,
        password,
        role,
        ...(role === "CARETAKER" && caretakerToken ? { caretakerToken } : {})
      };

      const data = await authService.register(payload);
      if (data && data.token && data.user) {
        login(data.token, data.user);
      } else {
        throw new Error("Invalid response received from registration server.");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during registration.");
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
        
        {/* Logo and Headings */}
        <div className="flex flex-col items-center gap-2">
          <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-500/30 text-white animate-bounce-slow">
            <Activity className="h-6 w-6 stroke-[2.5]" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            MedAlert
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">
            Join the smart healthcare tracking ecosystem
          </p>
        </div>

        <Card className="border border-white/60 dark:border-zinc-800/80 bg-white/75 dark:bg-zinc-900/80 backdrop-blur-md shadow-xl p-8 rounded-2xl">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mb-6 text-center">
            Create Account
          </h2>
          
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <FormGroup>
              <Label htmlFor="signup-name" required>Full Name</Label>
              <Input
                id="signup-name"
                name="name"
                type="text"
                autoComplete="name"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={loading}
              />
            </FormGroup>

            <FormGroup>
              <Label htmlFor="signup-email" required>Email Address</Label>
              <Input
                id="signup-email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="john@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </FormGroup>

            <FormGroup>
              <Label htmlFor="signup-role" required>Account Type</Label>
              <Select
                id="signup-role"
                name="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                disabled={loading}
              >
                <option value="PATIENT">Patient (tracks active doses)</option>
                <option value="CARETAKER">Caretaker (monitors a patient)</option>
              </Select>
            </FormGroup>

            {/* Dynamic Caretaker Token linking input */}
            {role === "CARETAKER" && (
              <FormGroup className="animate-in slide-in-from-top-2 duration-300">
                <Label htmlFor="signup-caretaker-token">Patient Caretaker Token (Optional)</Label>
                <Input
                  id="signup-caretaker-token"
                  name="caretakerToken"
                  type="text"
                  placeholder="e.g. MEDA3B2A4"
                  value={caretakerToken}
                  onChange={(e) => setCaretakerToken(e.target.value)}
                  disabled={loading}
                />
                <span className="text-[10px] text-zinc-400 font-medium">
                  Enter the unique Caretaker token from the patient&apos;s dashboard settings to link immediately.
                </span>
              </FormGroup>
            )}

            <FormGroup>
              <Label htmlFor="signup-password" required>Password</Label>
              <Input
                id="signup-password"
                name="password"
                type="password"
                autoComplete="new-password"
                placeholder="Minimum 6 characters"
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
              {loading ? "Registering account..." : "Sign Up"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-zinc-500 dark:text-zinc-400 font-medium">
            Already have an account?{" "}
            <Link 
              href="/login" 
              className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
            >
              Login
            </Link>
          </p>
        </Card>
      </div>
    </main>
  );
}

