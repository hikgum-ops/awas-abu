import { LookupClient } from "./lookup-client";

export default function Home() {
  return (
    <div className="site-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Awas Abu, beranda">
          <span className="brand-mark" aria-hidden="true">A</span>
          <span>Awas Abu</span>
        </a>
        <span className="relay-label">
          <span className="relay-dot" aria-hidden="true" /> Relai info resmi
        </span>
      </header>

      <main id="top">
        <section className="intro" aria-labelledby="page-title">
          <p className="eyebrow">CEK WILAYAH ANDA</p>
          <h1 id="page-title">Apakah ada informasi abu di sekitar saya?</h1>
          <p className="intro-copy">
            Gunakan lokasi perangkat atau cari kecamatan. Kami hanya
            meneruskan buletin resmi yang masih berlaku.
          </p>
        </section>

        <LookupClient />

        <section className="ash-help" aria-labelledby="ash-help-title">
          <div className="ash-help-intro">
            <p className="eyebrow">JIKA ABU TERDETEKSI</p>
            <h2 id="ash-help-title">Tiga tindakan pertama</h2>
            <p>Lakukan segera tanpa menunggu abu terlihat tebal.</p>
          </div>
          <ol className="ash-help-list">
            <li><span>1</span><div><strong>Masuk ke dalam</strong><p>Bawa anak-anak dan orang dengan penyakit pernapasan atau penyakit kronis.</p></div></li>
            <li><span>2</span><div><strong>Tutup pintu, jendela, dan ventilasi</strong><p>Lindungi juga makanan, air minum, dan sumur terbuka.</p></div></li>
            <li><span>3</span><div><strong>Pakai masker dan kacamata jika harus keluar</strong><p>Hindari berkendara dan ikuti arahan petugas setempat.</p></div></li>
          </ol>
          <div className="guidance-sources">
            Pedoman tindakan: <a href="https://pusatkrisis.kemkes.go.id/__pub/files34042files93316Panduan%20Abu%20Vulkanik.pdf" target="_blank" rel="noreferrer">Kementerian Kesehatan ↗</a>
            <a href="https://jdih.bnpb.go.id/download-lampiran/pedoman-nomor-3-tahun-2024" target="_blank" rel="noreferrer">BNPB ↗</a>
          </div>
        </section>

        <section className="trust-strip" aria-label="Prinsip layanan">
          <div><strong>Sumber jelas</strong><span>Setiap status menyertakan tautan dan waktu buletin.</span></div>
          <div><strong>Lokasi tidak disimpan</strong><span>Koordinat hanya dipakai sesaat untuk mencari wilayah.</span></div>
          <div><strong>Tidak menebak</strong><span>Belum ada data tidak pernah kami sebut aman.</span></div>
        </section>
      </main>

      <footer>
        <p>
          Bukan layanan peringatan resmi. Untuk keputusan keselamatan, ikuti
          arahan PVMBG, BMKG, BNPB, dan pemerintah setempat.
        </p>
        <nav aria-label="Sumber resmi">
          <a href="https://magma.esdm.go.id/" target="_blank" rel="noreferrer">MAGMA ↗</a>
          <a href="https://www.bmkg.go.id/" target="_blank" rel="noreferrer">BMKG ↗</a>
          <a href="https://bnpb.go.id/" target="_blank" rel="noreferrer">BNPB ↗</a>
        </nav>
      </footer>
    </div>
  );
}
