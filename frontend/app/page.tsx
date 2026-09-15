import { redirect } from "next/navigation";
/** Root → redirect to home */
export default function RootPage() {
  redirect("/home");
}
