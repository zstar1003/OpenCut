import { redirect } from "next/navigation";
import { nanoid } from "nanoid";

export default function Home() {
  redirect(`/editor/${nanoid()}`);
}
