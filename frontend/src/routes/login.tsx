import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { signInWithPopup } from "firebase/auth";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { auth, googleProvider } from "@/lib/firebase";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.28 1.48-1.13 2.73-2.4 3.58v2.98h3.88c2.27-2.09 3.54-5.17 3.54-8.8z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-2.98c-1.08.72-2.45 1.15-4.05 1.15-3.11 0-5.75-2.1-6.69-4.93H1.3v3.09C3.28 21.3 7.31 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.31 14.33A7.2 7.2 0 0 1 4.9 12c0-.81.14-1.6.38-2.33V6.58H1.3A11.97 11.97 0 0 0 0 12c0 1.93.46 3.76 1.3 5.42l4.01-3.09z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.94 1.19 15.24 0 12 0 7.31 0 3.28 2.7 1.3 6.58l4.01 3.09C6.25 6.85 8.89 4.75 12 4.75z"
      />
    </svg>
  );
}

function LoginPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setError(null);
    setIsLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      navigate({ to: "/dashboard" });
    } catch (err) {
      console.error("Google sign-in failed:", err);
      setError("Sign-in failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <div className="flex w-full max-w-sm flex-col items-center gap-6 text-center">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-semibold text-zinc-50">Welcome back</h1>
          <p className="text-sm text-zinc-400">Sign in to continue</p>
        </div>

        <Button
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          variant="secondary"
          size="lg"
          className="w-full gap-2 bg-zinc-100 text-zinc-900 hover:bg-zinc-200"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <GoogleIcon />
          )}
          Continue with Google
        </Button>

        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>
    </div>
  );
}