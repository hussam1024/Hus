import { html, mount, icon, api, pageHead, empty, on, ago, fmtSize, uploadFile, pickFile, toast, fail, can } from '../lib.js';

export default async function ({ el }) {
  let rows; let q = ''; let type = '';
  const load = async () => { rows = await api('/files'); render(); };
  function render() {
    const cats = [...new Set(rows.map((f) => f.category))];
    const list = rows.filter((f) => (!type || f.category === type) && (!q || `${f.original_name} ${f.entity_label || ''}`.includes(q)));
    mount(el, html`${pageHead('الأرشيف المركزي', 'كل المستندات والمرفقات في مكان واحد: الاعتمادات، العقود، الفواتير، الكشوف، الإخلاءات…', html`<button class="btn primary" data-up>${icon('upload')} رفع مستند عام</button>`, 'folder')}
      <div class="card"><div class="card-head"><div class="row"><input class="input" style="width:260px" placeholder="ابحث باسم الملف أو المشروع…" data-q value="${q}">
        <select class="input" style="width:200px" data-type><option value="">كل التصنيفات</option>${cats.map((c) => html`<option ${c === type ? 'selected' : ''}>${c}</option>`)}</select></div><span class="badge">${list.length} ملف</span></div>
      ${list.length ? html`<div class="table-wrap"><table class="t"><thead><tr><th>الملف</th><th>التصنيف</th><th>مرتبط بـ</th><th>الحجم</th><th>رفعه</th><th></th></tr></thead><tbody>
        ${list.map((f) => html`<tr><td><b>${f.original_name}</b></td><td><span class="badge">${f.category}</span></td>
          <td>${f.entity_type === 'project' || f.entity_type === 'request' ? html`<a href="#/${f.entity_type}s/${f.entity_id}">${f.entity_label}</a>` : f.entity_label || 'عام'}</td>
          <td class="num">${fmtSize(f.size)}</td><td class="small">${f.uploaded_by_name}<div class="muted">${ago(f.created_at)}</div></td>
          <td><a class="btn sm" href="/api/files/${f.id}/download">${icon('download')}</a></td></tr>`)}
      </tbody></table></div>` : empty('لا توجد ملفات', 'folder')}</div>`);
  }
  await load();
  on(el, 'input', '[data-q]', (e, t) => { q = t.value.trim(); render(); const n = el.querySelector('[data-q]'); n.focus(); n.setSelectionRange(q.length, q.length); });
  on(el, 'change', '[data-type]', (e, t) => { type = t.value; render(); });
  on(el, 'click', '[data-up]', async () => { const f = await pickFile(); if (!f) return; try { await uploadFile(f, 'general', 0, 'مستندات عامة'); toast('تم الرفع', 'ok'); load(); } catch (e) { fail(e); } });
}
