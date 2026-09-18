/* ===== Tab Bar (9215:38638 → 8046:25793) =====
   Один ряд вкладок на все экраны прототипа: иконка 20, подпись 10/12
   Semibold, активная вкладка — Primary. Раньше ряд собирала каждая
   страница по-своему, и на заданиях стоял старый набор иконок: домик,
   сетка, жирный процент, пакет, человек без круга.

   Иконки — выгрузка из макета (Icon (Union) → Export), лежат в
   ресурсах файлами. В файле зашит свой цвет (#808080 у неактивных,
   #80BA27 у клевера), перекрасить его в теге img нельзя, поэтому
   рисуем их маской: форма берётся из файла, цвет — currentColor от
   вкладки. Так активная вкладка красит иконку вместе с подписью, а
   ночная тема не требует инверсии. */

window.TabBar = (function(){

const RES = 'Resurses%20coolstart/';

/* Подпись, файл иконки, адрес. Работает только «Главная» — остальные
   разделы каталога в прототипе не собраны. */
const ITEMS = [
  ['Главная', 'ic-tab-home.svg',    'index.html'],
  ['Каталог', 'ic-tab-catalog.svg', ''],
  ['Акции',   'ic-tab-promo.svg',   ''],
  ['Корзина', 'ic-tab-cart.svg',    ''],
  ['Профиль', 'ic-tab-profile.svg', '']];

/* active — индекс активной вкладки; на главной это 0, а -1 снимает
   подсветку совсем. Счётчик корзины по макету — 13. */
function html(active){
  const at = active === undefined ? 0 : active;
  return '<div class="tab-panel">' + ITEMS.map(([ttl, file, href], i) =>
      `<a class="tab${i === at ? ' active' : ''}"${href ? ` href="${href}"` : ''}>` +
        `<span class="ic" style="--ic:url('${RES}${file}')"></span>` +
        `<span class="lbl">${ttl}</span>` +
        (file === 'ic-tab-cart.svg' ? '<span class="badge">13</span>' : '') +
      '</a>').join('') + '</div>' +
    '<div class="home-ind-wrap"><i></i></div>';
}

/* Ряд статичный, так что страницы просто зовут mount один раз. */
function mount(active, host){
  const el = host || document.getElementById('tabbar');
  if(el) el.innerHTML = html(active);
}

return {ITEMS, html, mount};
})();
