let requestId = 0;
let initialized = false;

export async function loadPrayerSchedule(year?: number): Promise<void> {
  const yearSelect = document.getElementById('schedule-year') as HTMLSelectElement;
  const refresh = document.getElementById('schedule-refresh') as HTMLButtonElement;
  const body = document.getElementById('schedule-body')!;
  const summary = document.getElementById('schedule-summary')!;
  const message = document.getElementById('schedule-message')!;
  const region = document.querySelector<HTMLElement>('.schedule-scroll')!;
  if (!initialized) {
    yearSelect.addEventListener('change', () => void loadPrayerSchedule(Number(yearSelect.value)));
    refresh.addEventListener('click', () => void loadPrayerSchedule(yearSelect.value ? Number(yearSelect.value) : undefined));
    initialized = true;
  }
  const id = ++requestId;
  yearSelect.disabled = true;
  refresh.disabled = true;
  region.setAttribute('aria-busy', 'true');
  message.textContent = 'Membaca data lokal...';
  try {
    const data = await window.myAzan.getPrayerSchedule(year);
    if (id !== requestId) return;
    document.getElementById('schedule-zone')!.textContent = data.zoneCode
      ? `${data.zoneCode}${data.zoneName ? ` · ${data.zoneName}` : ''}` : 'Tiada zon aktif';
    yearSelect.replaceChildren(...data.years.map((value) => new Option(String(value), String(value), false, value === data.year)));
    body.replaceChildren();
    const fragment = document.createDocumentFragment();
    for (const row of data.rows) {
      const tr = document.createElement('tr');
      for (const value of [row.date, row.dayLabel, row.hijri, row.imsak, row.fajr, row.syuruk, row.dhuha, row.dhuhr, row.asr, row.maghrib, row.isha]) {
        const td = document.createElement('td');
        td.textContent = value ?? '—';
        tr.append(td);
      }
      fragment.append(tr);
    }
    body.append(fragment);
    const expected = new Date(data.year, 1, 29).getMonth() === 1 ? 366 : 365;
    summary.textContent = `${data.rows.length} rekod / ${expected} hari (${data.year})${data.rows.length ? ` · ${data.rows[0].date} hingga ${data.rows[data.rows.length - 1].date}` : ''}`;
    message.textContent = !data.zoneCode ? 'Pilih zon dan simpan di Tetapan terlebih dahulu.'
      : !data.rows.length ? 'Tiada data tersimpan untuk tahun ini. Semak muat turun zon di Tetapan.'
      : data.rows.length !== expected ? 'Bilangan rekod berbeza daripada jumlah hari setahun. Semak tarikh dalam jadual.' : '';
  } catch {
    if (id !== requestId) return;
    body.replaceChildren();
    summary.textContent = 'Data tidak dapat dipaparkan.';
    message.textContent = 'Gagal membaca jadual lokal. Tekan Muat semula untuk cuba lagi.';
  } finally {
    if (id === requestId) {
      region.setAttribute('aria-busy', 'false');
      yearSelect.disabled = yearSelect.options.length === 0;
      refresh.disabled = false;
    }
  }
}
