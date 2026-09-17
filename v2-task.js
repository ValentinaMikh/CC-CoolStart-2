/* ===== Шапка задания во втором варианте дизайна (9215:183280) =====
   Разметка одна на три экрана заданий — task, hits и tastes, — поэтому
   собирается здесь, а не переписывается в каждом файле. Стили лежат
   рядом, в v2-task.css.

   hero({pic, tone, ttl, used, total, check}) возвращает внутренность
   блока: иллюстрацию шага, название задания и сегментную шкалу с
   подписью. Сам блок страница создаёт сама — на «хитах» и «вкусах»
   это уже существующий .hero, которому достаточно добавить класс. */

window.V2Task = (function(){

const esc = s => String(s).replace(/[&<>"]/g, c =>
  ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

function hero(o){
  const total = Math.max(1, o.total || 1);
  const used  = Math.min(Math.max(o.used || 0, 0), total);
  const segs  = Array.from({length: total}, (_, i) =>
    `<div class="seg">${i < used ? '<i></i>' : ''}</div>`).join('');
  return `<div class="v2t-body">
      <img class="pic" src="${o.pic}" alt="">
      <h1>${esc(o.ttl)}</h1>
      <div class="v2t-progress">
        <div class="scale">${segs}</div>
        <div class="done"><img src="${o.check}" alt="">` +
          `<span>Выполнено ${used} из ${total}</span></div>
      </div>
    </div>`;
}

/* Класс тона на блоке шапки: пустой — зелёный, как в макете по умолчанию */
const tone = t => 'v2t-hero' + (t ? ' is-' + t : '');

return {hero, tone};
})();
