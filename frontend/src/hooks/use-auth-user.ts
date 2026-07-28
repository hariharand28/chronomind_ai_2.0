import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "@/lib/firebase";

interface AuthUserState {
  user: User | null;
  loading: boolean;
}

/**
 * Subscribes to Firebase auth state and keeps it in sync everywhere it's used.
 * No mock data — reflects exactly what Firebase reports.
 */
export function useAuthUser(): AuthUserState {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return { user, loading };
}