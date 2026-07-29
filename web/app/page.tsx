import { redirect } from "next/navigation";

/** Admin app root → dashboard. */
export default function AdminRootPage() {
  redirect("/admin");
}
