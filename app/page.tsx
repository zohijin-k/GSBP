import GsbApp from "@/components/GsbApp";
import { BrandBar, Caption } from "@/components/Frame";

export default function Page() {
  return (
    <main className="page">
      <BrandBar />
      <GsbApp />
      <Caption />
    </main>
  );
}
