import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Home() {
  return (
    <div>
      <h2>Home</h2>
      <div>
        <Link href={"/convert"}>
          <Button>Convert</Button>
        </Link>
      </div>
    </div>
  );
}
