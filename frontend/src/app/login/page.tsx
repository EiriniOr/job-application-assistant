"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/auth-context";
import { Loader2, Mail, Lock, LogIn } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { signIn } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await signIn(email, password);
    if (error) {
      setError(error.message);
    } else {
      router.push("/");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <Card className="w-full max-w-md border border-purple-500/30 shadow-xl shadow-purple-500/20 bg-slate-900/80 backdrop-blur">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
            Welcome Back
          </CardTitle>
          <p className="text-sm text-purple-300 mt-2">
            Sign in to continue to your dashboard
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-900/30 border border-red-500/50 rounded-lg text-red-300 text-sm">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium text-purple-200">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-purple-400" />
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 bg-slate-800/50 border-purple-500/30 text-white placeholder:text-purple-300/50 focus-visible:ring-fuchsia-500"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-purple-200">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-purple-400" />
                <Input
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 bg-slate-800/50 border-purple-500/30 text-white placeholder:text-purple-300/50 focus-visible:ring-fuchsia-500"
                  required
                  minLength={6}
                />
              </div>
            </div>
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 shadow-md shadow-purple-500/25"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <LogIn className="h-4 w-4 mr-2" />
              )}
              Sign In
            </Button>
          </form>
          <div className="mt-6 text-center">
            <p className="text-xs text-purple-400">
              This app is invite-only. Contact the admin for access.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
