'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createLoader } = require('./test-helpers.cjs');
const { parseJakimResponse, JakimParseError } = createLoader()('src/main/services/prayer-time/jakim-parser.ts');

function yearlyData(months) {
  return {
    status: 'OK!',
    prayerTime: Array.from({ length: 365 }, (_, index) => {
      const date = new Date(Date.UTC(2026, 0, index + 1));
      return {
        date: `${String(date.getUTCDate()).padStart(2, '0')}-${months[date.getUTCMonth()]}-2026`,
        fajr: '05:49:00', dhuhr: '13:00:00', asr: '16:00:00', maghrib: '19:00:00', isha: '20:00:00',
      };
    }),
  };
}

for (const [language, months] of [
  ['English', 'Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec'],
  ['Malay', 'Jan Feb Mac Apr Mei Jun Jul Ogo Sep Okt Nov Dis'],
]) {
  test(`parses a full year with ${language} month abbreviations`, () => {
    const rows = parseJakimResponse(yearlyData(months.split(' ')), 'WLY01', 2026);
    assert.equal(rows.length, 365);
    for (let index = 0; index < rows.length; index++) {
      assert.equal(rows[index].date, new Date(Date.UTC(2026, 0, index + 1)).toISOString().slice(0, 10));
      assert.equal(rows[index].zone_code, 'WLY01');
      assert.equal(rows[index].fajr, '05:49');
    }
  });
}

test('still rejects unknown month abbreviations', () => {
  const data = yearlyData('Jan Feb Mac Apr Mei Jun Jul Ogo Sep Okt Nov Dis'.split(' '));
  data.prayerTime[59].date = '01-Unknown-2026';
  assert.throws(() => parseJakimResponse(data, 'WLY01', 2026), JakimParseError);
});
