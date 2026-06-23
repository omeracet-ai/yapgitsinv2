import { redirect } from "next/navigation";

// Phase 528 (M1 fix) — Static prerender devre dışı. Next 16'da default
// redirect()'li sayfa SSG'ye düşüp `Cache-Control: s-maxage=31536000` (1y)
// dönüyordu; bu da landing değişince CDN purge zorunlu kılıyordu.
// `dynamic = 'force-dynamic'` + `revalidate = 0` → her istek server-side.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function Root() {
  redirect("/dashboard");
}
