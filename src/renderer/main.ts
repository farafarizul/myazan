import type { AppInfo } from '../shared/types';

declare global {
  interface Window {
    myAzan: {
      getAppInfo: () => Promise<AppInfo>;
    };
  }
}

/** Navigasi halaman ringkas menggunakan data atribut. */
function initNavigation(): void {
  const navBtns = document.querySelectorAll<HTMLButtonElement>('.nav-btn');
  const pages = document.querySelectorAll<HTMLElement>('.page');

  navBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetPage = btn.dataset['page'];

      navBtns.forEach((b) => b.classList.remove('active'));
      pages.forEach((p) => p.classList.remove('active'));

      btn.classList.add('active');

      const pageEl = document.getElementById(`page-${targetPage}`);
      pageEl?.classList.add('active');
    });
  });
}

/** Muatkan maklumat pembangun pada halaman Tentang. */
async function loadAboutPage(): Promise<void> {
  const container = document.getElementById('tentang-info');
  if (!container) return;

  try {
    const info = await window.myAzan.getAppInfo();

    container.innerHTML = `
      <h3>${info.name}</h3>
      <p><span class="label">Versi</span><br>${info.version}</p>
      <p><span class="label">Objektif</span><br>${info.objective}</p>
      <hr style="margin: 16px 0; border-color: var(--warna-border);" />
      <p><span class="label">Pembangun</span><br>${info.author}</p>
      <p><span class="label">E-mel</span><br><a href="mailto:${info.email}">${info.email}</a></p>
      <p><span class="label">Telefon</span><br>${info.phone}</p>
      <div class="tentang-lesen">⚠️ ${info.license}</div>
    `;
  } catch (err) {
    console.error('[tentang] gagal muatkan maklumat:', err);
    container.innerHTML = '<p class="info-teks">Gagal memuatkan maklumat.</p>';
  }
}

/** Inisialisasi halaman utama — paparan waktu solat placeholder. */
function initHalamanUtama(): void {
  const list = document.getElementById('waktu-solat-list');
  if (!list) return;

  // Placeholder — akan digantikan pada Fasa 2 dengan data sebenar dari database
  list.innerHTML = `
    <p class="info-teks">
      Data waktu solat akan dipaparkan di sini selepas zon dan data JAKIM dikonfigurasi.
    </p>
  `;
}

async function main(): Promise<void> {
  initNavigation();
  initHalamanUtama();
  await loadAboutPage();
}

main().catch((err) => {
  console.error('[renderer] ralat semasa inisialisasi:', err);
});
