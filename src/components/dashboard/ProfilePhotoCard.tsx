"use client";

import { useState } from "react";
import AvatarPicker from "../AvatarPicker";
import { Card, CardTitle } from "./ui";
import { updateProfilePhoto, type AppUser } from "@/lib/auth";
import { syncMentorPhoto } from "@/lib/mentors";

/** Change the account's profile photo: pick an image, crop it freely, Save. */
export default function ProfilePhotoCard({ user, id = "photo" }: { user: AppUser; id?: string }) {
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async (photo: string) => {
    setSaving(true);
    setMessage(null);
    try {
      await updateProfilePhoto(photo);
      if (user.role === "mentor") await syncMentorPhoto(user.uid, photo);
      setMessage({ ok: true, text: photo ? "Profile photo saved." : "Profile photo removed." });
    } catch {
      setMessage({ ok: false, text: "Couldn't save your photo. Check your connection and try again." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card id={id}>
      <CardTitle title="Profile photo" />
      <div className="mt-4">
        <AvatarPicker value={user.photo ?? ""} onChange={save} label="Your photo" optional={false} />
      </div>
      {saving && <p className="mt-3 text-sm text-slate-500">Saving…</p>}
      {message && <p className={`mt-3 text-sm font-medium ${message.ok ? "text-forest-700" : "text-red-600"}`}>{message.text}</p>}
    </Card>
  );
}
