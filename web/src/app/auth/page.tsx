"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { createClient } from "@/lib/supabase/client";


export default function AuthPage() {
  const router =
    useRouter();

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [loading, setLoading] =
    useState(false);


  // Sign up a new user.
  async function handleSignUp() {
    setLoading(true);
    setMessage("");

    const supabase =
      createClient();

    const { error } =
      await supabase.auth.signUp({
        email,
        password,

        options: {
          emailRedirectTo:
            `${window.location.origin}/auth/callback`
        }
      });


    if (error) {
      setMessage(
        error.message
      );
    } else {
      setMessage(
        "Account created. Check your email and confirm your account."
      );
    }

    setLoading(false);
  }


  // Log in an existing confirmed user.
  async function handleLogin() {
    setLoading(true);
    setMessage("");

    const supabase =
      createClient();

    const { error } =
      await supabase.auth.signInWithPassword({
        email,
        password
      });


    if (error) {
      setMessage(
        error.message
      );

      setLoading(false);

      return;
    }


    // Send the authenticated user to the dashboard.
    router.replace("/");
  }


  return (
    <main className="app-page flex min-h-[calc(100vh-73px)] items-center justify-center">

      <div className="w-full max-w-md">

        <div className="app-card p-8">

          <h1 className="mb-2 text-3xl font-bold tracking-normal text-slate-950 dark:text-white">
            Accountability Tracker
          </h1>

          <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
            Sign up or log in
          </p>


          <form className="space-y-4">

            <div>

              <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                Email
              </label>

              <input
                type="email"
                value={email}
                onChange={
                  (event) =>
                    setEmail(
                      event.target.value
                    )
                }
                className="w-full rounded-lg border px-4 py-3"
                placeholder="you@example.com"
                required
              />

            </div>


            <div>

              <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                Password
              </label>

              <input
                type="password"
                value={password}
                onChange={
                  (event) =>
                    setPassword(
                      event.target.value
                    )
                }
                className="w-full rounded-lg border px-4 py-3"
                placeholder="Enter password"
                required
              />

            </div>


            <div className="grid grid-cols-2 gap-3">

              <button
                type="button"
                onClick={handleLogin}
                disabled={loading}
                className="app-button-primary"
              >
                {loading
                  ? "Please wait..."
                  : "Log In"}
              </button>


              <button
                type="button"
                onClick={handleSignUp}
                disabled={loading}
                className="app-button-secondary"
              >
                Sign Up
              </button>

            </div>

          </form>


          {message && (
            <p className="mt-4 rounded-lg border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-800 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-200">
              {message}
            </p>
          )}

        </div>

      </div>

    </main>
  );
}
