import { headers } from "next/headers";
import Link from "next/link";
import { BUILT_IN_AREAS } from "@/lib/awasabu/areas";
import { authenticateOperator } from "@/lib/awasabu/operator-auth";
import { OperatorClient } from "./operator-client";

export const dynamic = "force-dynamic";

export default async function OperatorPage() {
  const auth = authenticateOperator(await headers());

  if (!auth.ok) {
    return (
      <main className="operator-shell">
        <Link className="operator-back" href="/">← Kembali ke Awas Abu</Link>
        <section className="operator-denied">
          <p className="eyebrow">AKSES TERBATAS</p>
          <h1>Halaman operator</h1>
          <p>Masuk dengan akun ChatGPT operator yang telah diizinkan untuk menerbitkan buletin.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="operator-shell">
      <Link className="operator-back" href="/">← Kembali ke Awas Abu</Link>
      <header className="operator-heading">
        <p className="eyebrow">OPERATOR TERVERIFIKASI</p>
        <h1>Terbitkan buletin resmi</h1>
        <p>
          Salin hanya isi yang dinyatakan oleh sumber resmi. Sistem menyimpan
          sumber, waktu pengamatan, masa berlaku, dan wilayah yang dipilih.
        </p>
      </header>
      <OperatorClient areas={BUILT_IN_AREAS.map(({ code, name, regency, province }) => ({ code, name, regency, province }))} />
    </main>
  );
}
