const d1 = new Date('2026-02-28T10:00:00.000Z');
const d2 = new Date('2026-02-28');
const d3 = new Date(d1);
console.log(typeof d1, d1.getTime(), d2.getTime(), d1 === d2)
