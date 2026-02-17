"use client";

import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { LogOut, User, Loader2 } from "lucide-react";
import Link from "next/link";

export function UserButton() {
  const { user, loading, signOut } = useAuth();

  if (loading) {
    return <Loader2 className="h-4 w-4 animate-spin text-purple-400" />;
  }

  if (!user) {
    return (
      <Link href="/login">
        <Button
          size="sm"
          className="bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 shadow-md shadow-purple-500/25"
        >
          Sign In
        </Button>
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 text-sm text-purple-200">
        <User className="h-4 w-4" />
        <span className="hidden sm:inline">{user.email}</span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => signOut()}
        className="text-purple-300 hover:text-white hover:bg-purple-500/20"
      >
        <LogOut className="h-4 w-4" />
      </Button>
    </div>
  );
}
