/* ===== Мини-панель тестировщика для внутренних экранов =====
   Задание, хиты и вкусы своей панели не имеют, а переключать тему нужно
   и с них. Собираем панель здесь — одним файлом на три страницы, чтобы
   не расходилась разметка. На главной и в чек-листе панели свои: там
   переключатель темы стоит в общем списке настроек.

   Открывается тапом по батарейке в статус-баре (как и большая панель)
   и кнопкой DEV — на случай, если статус-бар перекрыт. */

(function(){

const FAB = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
  'stroke-linecap="round"><path d="M4 6h9M19 6h1M4 12h3M13 12h7M4 18h9M19 18h1"/>' +
  '<circle cx="16" cy="6" r="3"/><circle cx="10" cy="12" r="3"/><circle cx="16" cy="18" r="3"/></svg>DEV';

function mount(){
  const phone = document.querySelector('.phone');
  if(!phone || !window.Steps || document.querySelector('.dt-panel')) return;

  const fab = document.createElement('button');
  fab.className = 'dt-fab'; fab.title = 'DEV MOD — настройки экрана';
  fab.innerHTML = FAB;

  const scrim = document.createElement('div');
  scrim.className = 'dt-scrim';

  const panel = document.createElement('div');
  panel.className = 'dt-panel';
  panel.innerHTML =
    '<div class="grab"></div><h3>Панель тестировщика</h3>' +
    '<div class="row"><span>Тема</span>' +
      '<div class="dt-seg" id="dtTheme">' +
        '<button data-v="day">День</button><button data-v="night">Ночь</button>' +
      '</div></div>' +
    '<div class="hint">Тема общая для всех экранов: выбранная здесь останется ' +
      'и на главной, и в чек-листе. Панель — тап по батарейке.</div>';

  phone.append(fab, scrim, panel);

  const open = v => { scrim.classList.toggle('on', v); panel.classList.toggle('on', v) };
  fab.onclick = () => open(true);
  scrim.onclick = () => open(false);

  /* тап по батарейке — тот же жест, что и в большой панели */
  const battery = document.querySelector('.status .right');
  if(battery){ battery.style.cursor = 'pointer'; battery.onclick = () => open(true) }

  const seg = panel.querySelector('#dtTheme');
  const sync = () => [...seg.children].forEach(b =>
    b.classList.toggle('on', b.dataset.v === Steps.theme()));
  seg.onclick = e => {
    const b = e.target.closest('button'); if(!b) return;
    Steps.setTheme(b.dataset.v); Steps.applyTheme(); sync();
  };
  sync();
}

document.readyState === 'loading'
  ? addEventListener('DOMContentLoaded', mount)
  : mount();

})();
