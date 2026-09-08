"use client";

import { useState } from "react";

import { createClient } from "@/lib/supabase/client";


export default function AuthPage() {
  const supabase =
    createClient();

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
    window.location.href = "/";
  }


  return (
    <main className="min-h-screen bg-gray-100 p-8">

      <div className="mx-auto max-w-md">

        <div className="rounded-xl bg-white p-8 shadow">

          <h1 className="mb-2 text-3xl font-bold">
            Accountability Tracker
          </h1>

          <p className="mb-6 text-gray-600">
            Sign up or log in
          </p>


          <form className="space-y-4">

            <div>

              <label className="mb-1 block text-sm font-medium">
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

              <label className="mb-1 block text-sm font-medium">
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
                className="rounded-lg bg-black px-4 py-3 text-white disabled:opacity-50"
              >
                {loading
                  ? "Please wait..."
                  : "Log In"}
              </button>


              <button
                type="button"
                onClick={handleSignUp}
                disabled={loading}
                className="rounded-lg border px-4 py-3 disabled:opacity-50"
              >
                Sign Up
              </button>

            </div>

          </form>


          {message && (
            <p className="mt-4 text-sm text-gray-700">
              {message}
            </p>
          )}

        </div>

      </div>

    </main>
  );
}