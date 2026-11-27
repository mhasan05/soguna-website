import type { Metadata } from "next";
import { ProfileView } from "./profile-view";

export const metadata: Metadata = { title: "আমার প্রোফাইল" };

export default function ProfilePage() {
  return <ProfileView />;
}
