"use client";

import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { LogOut, User, Loader2 } from "lucide-react";
import Link from "next/link";

export function UserButton() {
  const { user, loading, signOut } = useAuth();

  if (loading) {
    return <Loader2 className="h-4 w-4 animate-spin text-slate-400" />;
  }

  if (!user) {
    return (
      <Link href="/login">
        <Button
          size="sm"
          className="bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700"
        >
          Sign In
        </Button>
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 text-sm text-slate-600">
        <User className="h-4 w-4" />
        <span className="hidden sm:inline">{user.email}</span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => signOut()}
        className="text-slate-600 hover:text-slate-900"
      >
        <LogOut className="h-4 w-4" />
      </Button>
    </div>
  );
}
