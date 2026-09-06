import type { Level } from "./status";

export type SafetyStep = {
  title: string;
  detail: string;
};

export type SafetyGuidance = {
  title: string;
  summary: string;
  steps: SafetyStep[];
  medical: string;
};

const ASH_STEPS: SafetyStep[] = [
  {
    title: "Masuk ke dalam ruangan",
    detail: "Bawa anak-anak dan orang dengan penyakit pernapasan atau penyakit kronis ke dalam.",
  },
  {
    title: "Tutup jalan masuk abu",
    detail: "Tutup pintu, jendela, ventilasi, serta tempat makanan dan sumber air.",
  },
  {
    title: "Lindungi napas dan mata",
    detail: "Jika harus keluar, pakai masker yang rapat, kacamata pelindung, dan pakaian tertutup.",
  },
  {
    title: "Hindari berkendara",
    detail: "Jarak pandang dapat turun dan abu dapat merusak kendaraan. Tunggu sampai kondisi membaik.",
  },
];

export function getSafetyGuidance(level: Level): SafetyGuidance | null {
  if (level === "AMAN") return null;

  if (level === "WASPADA") {
    return {
      title: "Abu mungkin mencapai wilayah Anda",
      summary: "Siapkan perlindungan dan pantau pembaruan resmi. Kondisi dapat berubah mengikuti arah angin.",
      steps: [
        {
          title: "Siapkan masker dan kacamata",
          detail: "Letakkan di tempat yang mudah dijangkau oleh seluruh anggota keluarga.",
        },
        {
          title: "Lindungi air dan makanan",
          detail: "Tutup penampungan air, sumur terbuka, makanan, dan pakan hewan.",
        },
        {
          title: "Pantau sumber resmi",
          detail: "Periksa waktu pembaruan dan ikuti arahan pemerintah atau petugas setempat.",
        },
      ],
      medical: "Siapkan obat rutin, terutama bagi orang dengan asma atau penyakit kronis.",
    };
  }

  if (level === "BAHAYA") {
    return {
      title: "Bahaya — ikuti arahan resmi sekarang",
      summary: "Dahulukan perintah evakuasi atau pembatasan wilayah dari petugas. Jangan memasuki zona terlarang.",
      steps: [
        {
          title: "Ikuti perintah petugas",
          detail: "Gunakan jalur dan lokasi aman yang ditetapkan pemerintah atau BPBD setempat.",
        },
        ...ASH_STEPS.slice(0, 3),
      ],
      medical: "Jika mengalami sesak napas, batuk berat, atau iritasi mata dan kulit, segera cari bantuan di fasilitas kesehatan terdekat.",
    };
  }

  return {
    title: "Abu terdeteksi — lindungi diri sekarang",
    summary: "Abu vulkanik dapat mengiritasi saluran pernapasan, mata, dan kulit.",
    steps: ASH_STEPS,
    medical: "Jika mengalami sesak napas, batuk berat, atau iritasi mata dan kulit, segera cari bantuan di fasilitas kesehatan terdekat.",
  };
}

