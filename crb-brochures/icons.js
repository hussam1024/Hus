// مكتبة الأيقونات المشتركة (SVG sprite) – أيقونات القطاعات والبرامج بنفس أسلوب التقرير
const S = (id, body, vb = 48) => `<symbol id="${id}" viewBox="0 0 ${vb} ${vb}">${body}</symbol>`;
const L = (d, w = 3) => `<g fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round">${d}</g>`;

module.exports = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
${/* ===== أيقونات القطاعات (مصمتة) ===== */''}
${S('s-food', `<g fill="currentColor"><path d="M5 33h54c0 12.5-12 22-27 22S5 45.5 5 33z"/><rect x="22" y="56" width="20" height="4" rx="2"/>
  <g transform="rotate(-24 32 20)"><ellipse cx="17" cy="14" rx="4.6" ry="2.3"/><ellipse cx="27" cy="14" rx="4.6" ry="2.3"/><ellipse cx="37" cy="14" rx="4.6" ry="2.3"/><ellipse cx="47" cy="14" rx="4.6" ry="2.3"/>
  <ellipse cx="22" cy="21" rx="4.6" ry="2.3"/><ellipse cx="32" cy="21" rx="4.6" ry="2.3"/><ellipse cx="42" cy="21" rx="4.6" ry="2.3"/><ellipse cx="52" cy="21" rx="4.6" ry="2.3"/>
  <rect x="6" y="26" width="14" height="2.6" rx="1.3"/><rect x="24" y="27" width="20" height="2.6" rx="1.3"/></g></g>`, 64)}
${S('s-shelter', `<path d="M9 27L32 9l23 18v28H9z" fill="none" stroke="currentColor" stroke-width="6" stroke-linejoin="round"/>
  <g fill="currentColor"><circle cx="32" cy="24" r="5"/><path d="M25.5 32h13v11h-2.6v12h-7.8V43h-2.6z"/></g>`, 64)}
${S('s-wash', `<path fill="currentColor" fill-rule="evenodd" d="M9 5h46l-6.5 37h-33z M32 14c-4.5 6.4-7.2 10.4-7.2 14a7.2 7.2 0 0 0 14.4 0c0-3.6-2.7-7.6-7.2-14z"/>
  <path fill="currentColor" d="M27 45h10v6h6.5L32 61 20.5 51H27z"/>`, 64)}
${S('s-edu', `<path fill="currentColor" fill-rule="evenodd" d="M12 5h40v54H12z M18 5h3.4v54H18z M28 24h17v4H28z M28 33h17v4H28z M39 5h8v13l-4-3-4 3z"/>`, 64)}
${S('s-health', `<path fill="currentColor" d="M25 6h14a2 2 0 0 1 2 2v15h15a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H41v15a2 2 0 0 1-2 2H25a2 2 0 0 1-2-2V41H8a2 2 0 0 1-2-2V25a2 2 0 0 1 2-2h15V8a2 2 0 0 1 2-2z"/>
  <path d="M10 33h11l4-8 6 15 5-10 3 3h15" fill="none" stroke="#00A54F" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>`, 64)}
${S('s-prot', `<circle cx="32" cy="16" r="8.5" fill="currentColor"/><g fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">
  <path d="M10 17v17c0 7 5 12 12 14v11"/><path d="M54 17v17c0 7-5 12-12 14v11"/><path d="M15 36l9 6"/><path d="M49 36l-9 6"/></g>`, 64)}

${/* ===== أيقونات عامة ===== */''}
${S('i-proj', L(`<path d="M5 11h12l4 5h20a2 2 0 0 1 2 2v19a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3z"/><path d="M12 27h13M12 33h8"/><circle cx="35" cy="30" r="4.5"/><path d="M35 22.5v2.5M35 35v2.5M27.5 30h2.5M40 30h2.5"/>`))}
${S('i-people', L(`<circle cx="24" cy="14" r="6"/><path d="M13 41v-6a11 11 0 0 1 22 0v6"/><circle cx="10" cy="19" r="4.5"/><path d="M3 39v-3a8 8 0 0 1 8-8"/><circle cx="38" cy="19" r="4.5"/><path d="M45 39v-3a8 8 0 0 0-8-8"/>`))}
${S('i-pin', L(`<path d="M24 44s14-13.2 14-24a14 14 0 0 0-28 0c0 10.8 14 24 14 24z"/><circle cx="24" cy="20" r="5"/>`))}
${S('i-cal', L(`<rect x="6" y="9" width="36" height="33" rx="3"/><path d="M6 18h36M15 5v8M33 5v8"/><path d="M15 27h4M22 27h4M29 27h4M15 34h4M22 34h4"/>`))}
${S('i-check', `<circle cx="12" cy="12" r="11" fill="currentColor"/><path d="M7 12.4l3.2 3.2L17 8.8" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`, 24)}
${S('i-loc', `<path fill="currentColor" d="M12 2a7 7 0 0 0-7 7c0 5.3 7 13 7 13s7-7.7 7-13a7 7 0 0 0-7-7zm0 9.6A2.6 2.6 0 1 1 12 6.4a2.6 2.6 0 0 1 0 5.2z"/>`, 24)}
${S('i-phone', `<path fill="currentColor" d="M6.6 10.8a15.3 15.3 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1z"/>`, 24)}
${S('i-web', `<g fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9.5"/><path d="M2.5 12h19M12 2.5c2.6 2.6 4 6 4 9.5s-1.4 6.9-4 9.5c-2.6-2.6-4-6-4-9.5s1.4-6.9 4-9.5z"/></g>`, 24)}
${S('i-fb', `<path fill="currentColor" d="M13.5 21v-7.6h2.6l.4-3h-3V8.5c0-.9.3-1.5 1.5-1.5h1.6V4.3c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.2H7.8v3h2.6V21z"/>`, 24)}
${S('i-x', `<path fill="currentColor" d="M17.8 3h3.1l-6.8 7.8L22 21h-6.2l-4.9-6.4L5.3 21H2.2l7.3-8.3L2 3h6.4l4.4 5.8zm-1.1 16.2h1.7L7.4 4.7H5.5z"/>`, 24)}
${S('i-ig', `<g fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4.2"/></g><circle cx="17.3" cy="6.7" r="1.3" fill="currentColor"/>`, 24)}
${S('i-yt', `<path fill="currentColor" d="M22 8.2c-.2-1.6-1-2.7-2.6-2.9C17 5 12 5 12 5s-5 0-7.4.3C3 5.5 2.2 6.6 2 8.2 1.8 9.5 1.8 12 1.8 12s0 2.5.2 3.8c.2 1.6 1 2.7 2.6 2.9C7 19 12 19 12 19s5 0 7.4-.3c1.6-.2 2.4-1.3 2.6-2.9.2-1.3.2-3.8.2-3.8s0-2.5-.2-3.8zM10 15V9l5.2 3z"/>`, 24)}

${/* ===== أيقونات البرامج (خطية) ===== */''}
${S('i-soup', L(`<path d="M5 25h38c0 9-8.5 15-19 15S5 34 5 25z"/><path d="M14 44h20"/><path d="M17 7c-2.4 3 2.4 5 0 9M24 5c-2.4 3 2.4 5 0 9M31 7c-2.4 3 2.4 5 0 9"/><path d="M34 25l9-14"/>`, 3.2))}
${S('i-moon', `<g fill="currentColor"><path d="M27 5a19 19 0 1 0 16 29A16 16 0 0 1 27 5z"/><path d="M36 9l1.6 3.4 3.7.5-2.7 2.6.7 3.7-3.3-1.8-3.3 1.8.7-3.7-2.7-2.6 3.7-.5z"/></g>`)}
${S('i-grow', L(`<path d="M3 42h8l9 2.5 15-5.5c3-1.2 2-5-1-4.6l-10 1.8"/><path d="M3 33h8l8.5-2 6.5 3.4"/><path d="M21 22l7-7 5 5 10-11"/><path d="M37 8h6v6"/><circle cx="11" cy="14" r="6"/><path d="M11 11v6"/>`))}
${S('i-sack', `<path fill="currentColor" d="M17 4h14l-3.6 7.2C35.5 15.5 41 23.6 41 32c0 7.6-7.4 11-17 11S7 39.6 7 32c0-8.4 5.5-16.5 13.6-20.8z"/><g fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"><path d="M24 38V22"/><path d="M24 26c-3.4-.4-5.4-2.4-5.6-5.6 3.2.2 5.2 2.2 5.6 5.6zM24 26c3.4-.4 5.4-2.4 5.6-5.6-3.2.2-5.2 2.2-5.6 5.6zM24 32.5c-3.4-.4-5.4-2.4-5.6-5.6 3.2.2 5.2 2.2 5.6 5.6zM24 32.5c3.4-.4 5.4-2.4 5.6-5.6-3.2.2-5.2 2.2-5.6 5.6z"/></g>`)}
${S('i-meat', `<path fill="currentColor" d="M9 16c5-9 21-11 29-4.5s6.5 19.5-5 23.5S6 37 6 28c0-4.5 1.3-8.5 3-12z"/><g fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"><circle cx="31" cy="21" r="4.4"/><path d="M13 22l6-6M15 28l8-8M19 31l6-6"/></g>`)}
${S('i-tent', L(`<path d="M4 41L24 7l20 34z"/><path d="M24 7v34"/><path d="M17 41l7-12 7 12"/>`))}
${S('i-kit', L(`<path d="M6 15l18-8 18 8v19l-18 8-18-8z"/><path d="M6 15l18 8 18-8M24 23v19"/><path d="M15 11l18 8"/>`))}
${S('i-house', L(`<path d="M5 23L24 7l19 16"/><path d="M10 19v23h28V19"/><path d="M20 42V31h8v11"/>`))}
${S('i-village', L(`<path d="M3 27l11-9 11 9"/><path d="M6 25v16h16V25"/><path d="M23 20l11-10 11 10"/><path d="M26 18v23h16V18"/><path d="M31 41v-8h6v8"/><path d="M11 41v-6h6v6"/>`))}
${S('i-access', L(`<circle cx="20" cy="7" r="3.5"/><path d="M20 13v14h12l5 10"/><path d="M20 20h10"/><path d="M14 22a11 11 0 1 0 15 14"/>`))}
${S('i-truck', L(`<rect x="3" y="13" width="26" height="17" rx="8.5"/><path d="M29 18h8l7 8v10H29z"/><path d="M3 36h41"/><circle cx="11" cy="38" r="4"/><circle cx="35" cy="38" r="4"/><path d="M16 9v4"/>`))}
${S('i-tank', L(`<rect x="10" y="5" width="28" height="30" rx="5"/><path d="M10 15h28"/><path d="M16 35v8M32 35v8M11 43h26"/><path d="M38 25h5v8"/>`))}
${S('i-tap', `<g fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 15h20a6 6 0 0 1 6 6v5"/><path d="M5 10v10"/><path d="M15 15V9M10 8h10"/></g><path fill="currentColor" d="M31 32c-3 4-4.5 6.2-4.5 8.3a4.5 4.5 0 0 0 9 0c0-2.1-1.5-4.3-4.5-8.3z"/>`)}
${S('i-soap', L(`<rect x="5" y="25" width="30" height="16" rx="6"/><circle cx="33" cy="12" r="5.5"/><circle cx="20" cy="15" r="3.2"/><circle cx="43" cy="22" r="2.6"/>`))}
${S('i-well', L(`<path d="M8 44V25h32v19"/><path d="M8 32h32M8 38h32M16 25v7M32 25v7M24 32v6M16 38v6M32 38v6"/><path d="M4 18L24 7l20 11"/><path d="M12 18v7M36 18v7"/>`))}
${S('i-drill', L(`<path d="M17 34l7-30 7 30"/><path d="M19.5 25h9M21.5 15h5"/><rect x="5" y="34" width="38" height="8" rx="2"/><path d="M24 34v-4"/>`))}
${S('i-tower', L(`<rect x="11" y="4" width="26" height="14" rx="2"/><path d="M15 18l-4 26M33 18l4 26M13.5 30h21M12 40h24"/><path d="M18 11h12"/>`))}
${S('i-pipe', L(`<path d="M4 12h17a6 6 0 0 1 6 6v8a6 6 0 0 0 6 6h11"/><path d="M4 6v12M44 26v12"/><path d="M14 9v6M36 29v6"/>`))}
${S('i-sewer', L(`<ellipse cx="24" cy="31" rx="18" ry="9"/><path d="M10 27.5h28M8 33h32M15 37.5h18"/><path d="M24 4v14M19 13l5 5 5-5"/>`))}
${S('i-toilet', L(`<path d="M9 44V15l15-9 15 9v29z"/><path d="M19 44V27h10v17"/><path d="M21 17h6"/>`))}
${S('i-bag', L(`<path d="M15 16a9 9 0 0 1 18 0"/><rect x="10" y="16" width="28" height="28" rx="6"/><rect x="16" y="28" width="16" height="10" rx="2"/><path d="M20 10V6h8v4"/>`))}
${S('i-cash', L(`<rect x="4" y="12" width="40" height="24" rx="3"/><circle cx="24" cy="24" r="6"/><path d="M10 18v12M38 18v12"/>`))}
${S('i-school', L(`<path d="M4 44h40"/><path d="M8 44V22l16-10 16 10v22"/><path d="M24 12V4l7 3-7 3"/><path d="M20 44v-9h8v9"/><path d="M13 27h5M30 27h5M13 34h5M30 34h5"/>`))}
${S('i-desk', L(`<rect x="6" y="4" width="36" height="20" rx="2"/><path d="M12 11h12M12 17h18"/><path d="M8 32h32M12 32v12M36 32v12"/>`))}
${S('i-code', L(`<path d="M16 14L6 24l10 10M32 14l10 10-10 10M27 9l-6 30"/>`))}
${S('i-train', L(`<rect x="20" y="6" width="24" height="18" rx="2"/><path d="M26 12h12M26 18h8"/><circle cx="10" cy="12" r="4"/><path d="M4 44V27a6 6 0 0 1 12 0v17"/><path d="M15 24l7-5"/>`))}
${S('i-ambulance', L(`<path d="M4 13h26v23H4z"/><path d="M30 19h8l6 8v9H30"/><circle cx="12" cy="38" r="4"/><circle cx="36" cy="38" r="4"/><path d="M17 18v12M11 24h12"/>`))}
${S('i-pills', L(`<path d="M8 30l14-14a7.8 7.8 0 0 1 11 11L19 41A7.8 7.8 0 0 1 8 30z"/><path d="M15 23l11 11"/><circle cx="37" cy="37" r="7"/><path d="M32 32l10 10"/>`))}
${S('i-clinic', L(`<path d="M7 44V19h34v25"/><path d="M4 44h40"/><path d="M14 19V8h20v11"/><path d="M20 44v-9h8v9"/><path d="M24 10v6M21 13h6"/><path d="M12 26h5M31 26h5"/>`))}
${S('i-child', L(`<path d="M18 15h12v26a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4z"/><path d="M20 15l1-6h6l1 6"/><path d="M18 24h5M18 31h5M18 38h5"/>`))}
${S('i-virus', L(`<circle cx="24" cy="24" r="10"/><path d="M24 4v6M24 38v6M4 24h6M38 24h6M10 10l4 4M34 34l4 4M38 10l-4 4M14 34l-4 4"/><circle cx="21" cy="21" r="1.4"/><circle cx="27" cy="27" r="1.4"/>`))}
${S('i-monitor', L(`<rect x="4" y="7" width="40" height="27" rx="3"/><path d="M10 22h7l3-7 5 13 3-6h10"/><path d="M17 42h14M24 34v8"/>`))}
${S('i-pulse', L(`<path d="M24 42S6 31 6 18a9 9 0 0 1 18-3 9 9 0 0 1 18 3c0 13-18 24-18 24z"/><path d="M10 25h8l3-5 4 9 3-4h10"/>`))}
${S('i-kids', L(`<circle cx="15" cy="9" r="4"/><circle cx="33" cy="9" r="4"/><path d="M15 15v13M9 20h12M15 28l-5 14M15 28l5 14"/><path d="M33 15v13M27 20h12M33 28l-5 14M33 28l5 14"/>`))}
${S('i-heart-hands', L(`<path d="M24 26s-8.5-5-8.5-10.6a4.6 4.6 0 0 1 8.5-2.5 4.6 4.6 0 0 1 8.5 2.5C32.5 21 24 26 24 26z"/><path d="M3 29l9 11h12"/><path d="M45 29l-9 11H24"/>`))}
${S('i-park', L(`<circle cx="35" cy="15" r="9"/><path d="M35 24v20"/><path d="M4 31h20M6 31v11M22 31v11M4 25h20"/>`))}
${S('i-shirt', L(`<path d="M17 6L5 14l5 8 5-3v24h18V19l5 3 5-8-12-8c0 4-3.5 7-7 7s-7-3-7-7z"/>`))}
${S('i-book', L(`<path d="M5 10c6.5-2 12.5-1 19 3 6.5-4 12.5-5 19-3v28c-6.5-2-12.5-1-19 3-6.5-4-12.5-5-19-3z"/><path d="M24 13v28"/>`))}
${S('i-family', `<g fill="currentColor"><circle cx="10" cy="11" r="4"/><circle cx="38" cy="11" r="4"/><circle cx="20" cy="22" r="3"/><circle cx="28" cy="22" r="3"/><path d="M6 18h8v26h-3V31H9v13H6zM34 18h8v26h-3V31h-2v13h-3zM17 27h6v17h-6zM25 27h6v17h-6z"/></g>`)}
</defs></svg>`;
