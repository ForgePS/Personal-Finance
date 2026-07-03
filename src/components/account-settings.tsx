"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  changeEmail,
  changePassword,
  formatAuthError,
  isFirebaseAuthConfigured,
} from "@/lib/auth-client";

export function AccountSettings() {
  const [email, setEmail] = useState<string | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [newEmail, setNewEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailMessage, setEmailMessage] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  const firebaseConfigured = isFirebaseAuthConfigured();
  const devBypass = process.env.NEXT_PUBLIC_AUTH_BYPASS === "true";

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.email) setEmail(data.email);
      })
      .finally(() => setLoadingProfile(false));
  }, []);

  const handlePasswordChange = async (event: React.FormEvent) => {
    event.preventDefault();
    setPasswordError(null);
    setPasswordMessage(null);

    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    setPasswordBusy(true);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordMessage("Password updated successfully.");
    } catch (err) {
      setPasswordError(formatAuthError(err));
    } finally {
      setPasswordBusy(false);
    }
  };

  const handleEmailChange = async (event: React.FormEvent) => {
    event.preventDefault();
    setEmailError(null);
    setEmailMessage(null);

    const trimmed = newEmail.trim();
    if (!trimmed || !trimmed.includes("@")) {
      setEmailError("Please enter a valid email address.");
      return;
    }
    if (trimmed.toLowerCase() === email?.toLowerCase()) {
      setEmailError("That is already your email address.");
      return;
    }

    setEmailBusy(true);
    try {
      await changeEmail(emailPassword, trimmed);
      setEmail(trimmed);
      setNewEmail("");
      setEmailPassword("");
      setEmailMessage("Email updated. Use your new email next time you sign in.");
    } catch (err) {
      setEmailError(formatAuthError(err));
    } finally {
      setEmailBusy(false);
    }
  };

  if (loadingProfile) {
    return <div className="text-slate-500">Loading account...</div>;
  }

  if (devBypass) {
    return (
      <Card>
        <CardHeader
          title="Account"
          subtitle="Auth bypass is enabled in development — email and password changes are not available."
        />
      </Card>
    );
  }

  if (!firebaseConfigured) {
    return (
      <Card>
        <CardHeader
          title="Account"
          subtitle="Firebase Auth is not configured for this environment."
        />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="Signed in as" subtitle={email ?? "Unknown"} />
      </Card>

      <Card>
        <CardHeader
          title="Change password"
          subtitle="Enter your current password, then choose a new one."
        />
        <form onSubmit={handlePasswordChange} className="space-y-4 px-6 pb-6">
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Current password</span>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">New password</span>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Confirm new password</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            />
          </label>
          {passwordError && (
            <p className="text-sm text-red-600">{passwordError}</p>
          )}
          {passwordMessage && (
            <p className="text-sm text-emerald-700">{passwordMessage}</p>
          )}
          <Button type="submit" disabled={passwordBusy}>
            {passwordBusy ? "Updating…" : "Update password"}
          </Button>
        </form>
      </Card>

      <Card>
        <CardHeader
          title="Change email"
          subtitle="Your sign-in email will be updated. Household invites use this address."
        />
        <form onSubmit={handleEmailChange} className="space-y-4 px-6 pb-6">
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">New email</span>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Current password (to confirm)</span>
            <input
              type="password"
              value={emailPassword}
              onChange={(e) => setEmailPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            />
          </label>
          {emailError && <p className="text-sm text-red-600">{emailError}</p>}
          {emailMessage && <p className="text-sm text-emerald-700">{emailMessage}</p>}
          <Button type="submit" disabled={emailBusy}>
            {emailBusy ? "Updating…" : "Update email"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
