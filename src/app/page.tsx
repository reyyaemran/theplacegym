/**
 * Home Page - Redirects to Login
 */

import { redirect } from "next/navigation";

export default function Home() {
  redirect("/login");
}
