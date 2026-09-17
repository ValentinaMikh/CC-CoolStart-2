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

/* ===== Кнопка задания =====
   Зелёная кнопка — постоянный призыв к действию, и по макету она стоит
   внизу экрана, а не в конце текста. Внутри ленты этого не добиться:
   абсолютный блок в прокручиваемом контейнере уезжает вместе с ним,
   а sticky держит кнопку только пока виден её собственный блок.
   Поэтому переносим её в .screen — там она вне прокрутки.

   Переносим только прямых детей белого тела: кнопка «Добавить в
   корзину» внутри шторки на «хитах» остаётся на месте.
   Обработчики у кнопки делегированные, на .screen, так что перенос
   их не рвёт. */
function pinCta(){
  const screen = document.querySelector('.screen'),
        main   = document.querySelector('.main');
  if(!screen || !main) return;
  const fresh = main.querySelector(':scope > .btn');
  /* Снимаем прошлую кнопку только когда тело перерисовалось и принесло
     новую: на «вкусах» кнопка лежит в разметке статически, её переносят
     один раз, и безусловная уборка убила бы её на второй отрисовке. */
  if(fresh){
    screen.querySelectorAll(':scope > .v2t-cta').forEach(b => b.remove());
    fresh.classList.add('v2t-cta');
    screen.append(fresh);
  }
  main.classList.toggle('has-cta', !!screen.querySelector(':scope > .v2t-cta'));
}

return {hero, tone, pinCta};
})();
