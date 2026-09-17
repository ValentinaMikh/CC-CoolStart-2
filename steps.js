/* ===== Состояние чек-листа КуулСтарта =====
   Экраны заданий (task.html, tastes.html, hits.html) отмечают шаг выполненным,
   чек-лист (coolstart.html) это читает. Держим в sessionStorage: прототип
   открывается по file://, состояние должно пережить переход между страницами,
   но не должно тянуться в следующую сессию — панель тестировщика всё равно
   задаёт стартовые условия заново.

   fresh — шаги, отмеченные с последнего показа чек-листа. Чек-лист забирает
   их один раз и проигрывает перелёт карточки во вкладку «Выполненные». */
window.Steps = (function(){

const KEY = 'coolstart:done', FRESH = 'coolstart:fresh';

/* Условия КуулСтарта — одни на все экраны: чек-лист считает по ним прогресс,
   виджет на главной показывает те же цифры. */
const TOTAL = 10;   /* шагов в чек-листе */
const TERM  = 60;   /* дней на прохождение */

function read(key){
  try{ const v = JSON.parse(sessionStorage.getItem(key)); return Array.isArray(v) ? v : [] }
  catch(e){ return [] }
}
function write(key, list){
  try{ sessionStorage.setItem(key, JSON.stringify(list)) }catch(e){}
}

const all    = ()   => read(KEY);
const isDone = id   => read(KEY).indexOf(id) >= 0;

/* Шаг выполнен на экране задания */
function complete(id){
  if(!id) return;
  const done = read(KEY);
  if(done.indexOf(id) < 0){ done.push(id); write(KEY, done) }
  const fresh = read(FRESH);
  if(fresh.indexOf(id) < 0){ fresh.push(id); write(FRESH, fresh) }
}

/* Явная установка списка — панель тестировщика. Свежими такие шаги не считаем:
   их перелёт чек-лист показывает сразу, на своём экране. */
function set(list){ write(KEY, list.slice()); write(FRESH, []) }

/* Забрать и очистить: перелёт проигрывается один раз */
function takeFresh(){ const f = read(FRESH); write(FRESH, []); return f }

/* Небольшое состояние экрана задания — сколько покупок совершено, какие
   купоны применены. Лежит рядом со списком шагов, поэтому переживает переход
   между страницами и чистится тем же «Начать заново». */
function get(name, dflt){
  try{
    const v = sessionStorage.getItem('coolstart:' + name);
    return v === null ? dflt : JSON.parse(v);
  }catch(e){ return dflt }
}
function put(name, value){
  try{ sessionStorage.setItem('coolstart:' + name, JSON.stringify(value)) }catch(e){}
}

/* Дней с регистрации — то, что выставляют в панели тестировщика. Значение
   общее: меняем на одном экране, а видят его и чек-лист, и виджет на главной. */
const days     = () => Math.max(0, get('days', 1) | 0);
const setDays  = n  => put('days', Math.max(0, n | 0));
const daysLeft = () => Math.max(TERM - days(), 0);

/* Вариант дизайна: А1 — исходный макет, В1 — «Start Main 2» (градиент, кубок,
   нумерованные карточки). Переключается в панели тестировщика и общий для всех
   экранов, поэтому виджет на главной и чек-лист всегда в одном оформлении.
   По умолчанию В1.

   В хранилище остаются числа 1 и 2: у тех, кто уже открывал прототип, там
   лежит выбранное значение, и переезд на буквенные ключи его бы обнулил.
   Буквы — только то, что видно в панели. */
const DESIGN_NAMES = {1:'А1', 2:'В1'};
const designName   = n => DESIGN_NAMES[n] || DESIGN_NAMES[2];
const design       = () => (get('design', 2) === 1 ? 1 : 2);
const setDesign    = n  => put('design', n === 1 ? 1 : 2);
/* класс на <html> — по нему цепляется вся вёрстка второго варианта */
function applyDesign(){
  document.documentElement.classList.toggle('v2', design() === 2);
}

/* ===== «КеГЛи уже начислены» =====
   Последний этап шапки (макет 1144:2303) наступает не сразу: в день, когда
   закрылся десятый шаг, написано «начислятся завтра», и только на следующий
   день — «уже начислены». Поэтому запоминаем день закрытия и сравниваем его
   с «дней с регистрации» из панели тестировщика. Откат прогресса отметку
   стирает: иначе повторное прохождение сразу считалось бы оплаченным.
   Возвращает true, когда КеГЛи уже пришли. */
function finish(on){
  if(!on){ put('doneDay', null); return false }
  let d = get('doneDay', null);
  if(d === null){ d = days(); put('doneDay', d) }
  return days() > d;
}

/* Возврат жестом «назад» отдаёт страницу из bfcache: разметка и переменные
   остаются те же, скрипт заново не выполняется. Значит, экран покажет
   состояние на момент ухода — выполненное задание так и висело бы в списке.
   Даём странице сигнал пересобраться. */
function onRestore(fn){
  addEventListener('pageshow', e=>{ if(e.persisted) fn() });
}

/* Полный сброс: чистим все свои ключи. Экраны заданий поднимают состояние
   из этого хранилища при загрузке, так что подтверждённая почта, засчитанные
   покупки и позиция списка обнуляются вместе со списком шагов. */
function reset(){
  try{
    Object.keys(sessionStorage)
      .filter(k=>k.indexOf('coolstart:')===0)
      .forEach(k=>sessionStorage.removeItem(k));
  }catch(e){}
}

/* ===== Этап оформления по числу закрытых шагов =====
   Градиент шапки чек-листа и виджета на главной задан в макетах для 0, 2,
   4, 6, 8 и 10 шагов. Между ними интерполируем: прогресс меняется по шагу,
   а не рывками от макета к макету. Таблица — строки [шагов, ...числа];
   возвращаются те же числа без первого, посчитанные для n. */
function stage(table, n){
  let a = table[0], b = table[0];
  for(let i = 1; i < table.length; i++){
    b = table[i];
    if(n <= b[0]) break;
    a = b;
  }
  const t = b[0] === a[0] ? 0 : (Math.min(n, b[0]) - a[0]) / (b[0] - a[0]);
  return a.slice(1).map((v, i) => v + (b[i + 1] - v) * t);
}

/* Ставим класс сразу при загрузке модуля (он подключён в <head>), иначе
   первый вариант успел бы моргнуть до первой перерисовки. */
applyDesign();

return {TOTAL, TERM, all, isDone, complete, set, takeFresh, finish,
        days, setDays, daysLeft, design, setDesign, designName, applyDesign,
        get, put, onRestore, reset, stage};
})();
