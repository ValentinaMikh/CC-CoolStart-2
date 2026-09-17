/* ===== Микро-анимации прототипа =====
   Помощники, которыми пользуются экраны. Всё через Web Animations API:
   анимация не оставляет за собой инлайновых стилей и не конфликтует с
   CSS-переходами нажатия. При prefers-reduced-motion каждый метод —
   мгновенный no-op, состояние всё равно меняется. */
window.Micro = (function(){

const RM = matchMedia('(prefers-reduced-motion: reduce)');
const reduced = () => RM.matches;
const EASE = 'cubic-bezier(.2,.8,.3,1)';
const BACK = 'cubic-bezier(.34,1.4,.5,1)';

/* Макет отрисован в масштабе (#stage { transform: scale(k) }), поэтому
   размеры из getBoundingClientRect надо делить на k, чтобы попасть
   в собственные координаты «телефона». */
function scaleOf(host){
  const r = host.getBoundingClientRect();
  return (host.offsetWidth && r.width / host.offsetWidth) || 1;
}

/* ===== Полноэкранный режим на телефоне =====
   На сенсорном экране мокап убираем и растягиваем макет на весь экран.
   Масштабируем по ширине: внутри всё свёрстано в фиксированных 375px
   (карточки 343, товар 164), и подгонка по ширине кладёт их ровно по краям.
   Высоту «телефона» задаём в единицах макета — сколько поместилось в экран,
   поэтому снизу нет ни обрезки, ни чёрной полосы. */
const COARSE = matchMedia('(pointer: coarse)');
const isFull = () => COARSE.matches;
const MIN_H  = 560;   /* меньше макет становится нечитаемым (альбомная ориентация) */

if(isFull()) document.documentElement.classList.add('mc-full');

function fitFull(w){
  if(!isFull()) return false;
  const stage = document.getElementById('stage');
  const phone = document.querySelector('.phone');
  if(!stage || !phone) return false;
  const k = Math.min(innerWidth / w, innerHeight / MIN_H);
  stage.style.transform = `scale(${k})`;
  phone.style.height = Math.round(innerHeight / k) + 'px';
  return true;
}

/* Панель адреса в мобильном браузере то прячется, то возвращается — событие
   приходит только в visualViewport, а страницы слушают обычный resize. */
if(isFull() && window.visualViewport)
  visualViewport.addEventListener('resize', ()=>dispatchEvent(new Event('resize')));

/* ===== Появление блоков при скролле ===== */
const marked = new WeakSet();
const observers = new WeakMap();

function observerFor(scroller){
  let io = observers.get(scroller);
  if(io) return io;
  let batch = [], flush = 0;
  io = new IntersectionObserver(entries=>{
    entries.forEach(e=>{
      if(!e.isIntersecting) return;
      io.unobserve(e.target);
      batch.push(e.target);
    });
    if(!batch.length) return;
    /* Кадром позже — чтобы собрать всё, что въехало разом, и пустить каскадом */
    clearTimeout(flush);
    flush = setTimeout(()=>{
      /* Позицию читаем по разу на элемент: сортировка вызывала
         getBoundingClientRect на каждое сравнение — лишние обращения
         к раскладке ровно в тот момент, когда идёт прокрутка. */
      batch.map(el=>({el, top:el.getBoundingClientRect().top}))
           .sort((a,b)=>a.top - b.top)
           .map(x=>x.el)
           .forEach((el,i)=>{
             const a = el.animate(
               [{opacity:0, transform:'translateY(12px)'},{opacity:1, transform:'none'}],
               {duration:560, delay:Math.min(i*50,240), easing:EASE, fill:'backwards'});
             el.classList.remove('mc-rv');
             a.finished.catch(()=>{});
           });
      batch = [];
    }, 0);
  }, {root:scroller, rootMargin:'5000px 0px 0px 0px', threshold:0});
  observers.set(scroller, io);
  return io;
}

/* Блоки проявляются один раз — при первом показе экрана. Дальше экран
   перерисовывается на каждый чих (выбрали подарок, добавили в корзину),
   и повторный каскад читался бы как моргание, поэтому по умолчанию
   следующие вызовы ничего не делают. force:true — там, где содержимое
   действительно сменилось: переключили вкладку.
   rootMargin сверху заведомо больше экрана: всё, что оказалось выше вьюпорта
   (пролистнули рывком, вернулись назад), показывается сразу — «проявление»
   имеет смысл только для того, что въезжает снизу. */
const intro = new WeakSet();

function reveal(selector, opts){
  opts = opts || {};
  const scroller = opts.scroller || document.querySelector('.scroll');
  if(!scroller || reduced() || !('IntersectionObserver' in window)) return;
  if(intro.has(scroller) && !opts.force) return;
  intro.add(scroller);
  const io = observerFor(scroller);
  scroller.querySelectorAll(selector).forEach(el=>{
    if(marked.has(el)) return;
    marked.add(el);
    el.classList.add('mc-rv');
    io.observe(el);
  });
}

/* ===== Перелёт элемента в цель =====
   Клон летит по дуге в центр target и схлопывается в точку.
   Оригинал не трогаем — его убирает из потока flip(). */
function flyTo(el, target, opts){
  opts = opts || {};
  if(!el || !target || reduced()) return Promise.resolve();

  const host = el.closest('.screen') || el.closest('.phone') || document.body;
  const hr = host.getBoundingClientRect();
  const k  = scaleOf(host);
  const er = el.getBoundingClientRect();
  const tr = target.getBoundingClientRect();

  const fly = el.cloneNode(true);
  fly.classList.add('mc-fly');
  fly.classList.remove('mc-rv');
  fly.style.left   = (er.left - hr.left) / k + 'px';
  fly.style.top    = (er.top  - hr.top ) / k + 'px';
  fly.style.width  = er.width  / k + 'px';
  fly.style.height = er.height / k + 'px';
  host.appendChild(fly);

  const dx = (tr.left + tr.width /2 - er.left - er.width /2) / k;
  const dy = (tr.top  + tr.height/2 - er.top  - er.height/2) / k;

  const a = fly.animate([
    {transform:'none', opacity:1, offset:0},
    {transform:`translate(${dx*.5}px,${dy*.5}px) scale(.5) rotate(-3deg)`, opacity:.95, offset:.55},
    {transform:`translate(${dx}px,${dy}px) scale(.06) rotate(0deg)`, opacity:0, offset:1}
  ], {duration:opts.duration||620, delay:opts.delay||0,
      easing:'cubic-bezier(.4,.06,.3,1)', fill:'backwards'});

  return a.finished.then(()=>fly.remove(), ()=>fly.remove());
}

/* Список закрывает дыру после улетевшей карточки.
   Раньше это была анимация высоты самой карточки — то есть пересчёт
   раскладки на каждом кадре, от которого дрожал весь список ниже.
   Теперь FLIP: разметку меняем один раз, а соседей двигаем трансформом.

   mutate() должна убрать элементы из потока. Вложенность учитываем:
   карточка внутри уехавшей секции уже сдвинута родителем, поэтому из её
   дельты вычитаем родительскую — иначе сдвиг удвоился бы. */
function flip(host, mutate, opts){
  opts = opts || {};
  if(!host || reduced()){ mutate(); return Promise.resolve() }

  const sel   = opts.select || '.sect, .item';
  const scope = host.closest('.screen') || host;
  const k     = scaleOf(scope);
  const nodes = [...host.querySelectorAll(sel)];          /* в порядке DOM: предки раньше */
  const before = new Map();
  nodes.forEach(el=>before.set(el, el.getBoundingClientRect().top));

  mutate();

  const applied = new Map();
  const anims = [];
  nodes.forEach(el=>{
    if(!el.isConnected || !el.offsetParent) return;       /* убранные из потока пропускаем */
    let inherited = 0;
    applied.forEach((d, anc)=>{ if(anc.contains(el)) inherited = d });
    const dy = (before.get(el) - el.getBoundingClientRect().top) / k - inherited;
    applied.set(el, inherited + dy);
    if(Math.abs(dy) < .5) return;
    anims.push(el.animate(
      [{transform:`translateY(${dy}px)`}, {transform:'none'}],
      {duration:opts.duration||420, easing:EASE}));
  });
  return Promise.all(anims.map(a=>a.finished.catch(()=>{})));
}

/* ===== Акценты ===== */
function bump(el, kind){
  if(!el || reduced()) return;
  const big = kind === 'pop';
  el.animate([{transform:'scale(1)'},
              {transform:`scale(${big?1.3:1.14})`, offset:.38},
              {transform:'scale(1)'}],
             {duration:big?360:420, easing:BACK});
}

/* Мигание фоном — для строки прогресса и счётчиков */
function flash(el, color){
  if(!el || reduced()) return;
  el.animate([{backgroundColor:'transparent'},
              {backgroundColor:color||'rgba(128,186,39,.22)', offset:.3},
              {backgroundColor:'transparent'}],
             {duration:700, easing:'ease-out'});
}

/* ===== Бегунок сегмент-контрола ===== */
function pill(seg){
  if(!seg || seg.classList.contains('mc-has-pill')) return;
  const p = document.createElement('i');
  p.className = 'mc-pill';
  seg.classList.add('mc-has-pill');
  seg.insertBefore(p, seg.firstChild);

  let placed = false;
  const sync = ()=>{
    const on = seg.querySelector('button.on') || seg.querySelector('button');
    if(!on) return;
    /* ширина у всех кнопок одна, меняется только при resize — ставим её
       без перехода, анимируем исключительно сдвиг */
    if(!placed) p.classList.add('mc-jump');
    p.style.width = on.offsetWidth + 'px';
    p.style.transform = `translateX(${on.offsetLeft}px)`;
    if(!placed){
      placed = true;
      requestAnimationFrame(()=>p.classList.remove('mc-jump'));
    }
  };
  /* Активная кнопка помечается классом из render() экрана — следим за классами,
     а не за кликом, тогда бегунок едет и при программной смене вкладки.
     Переключение меняет класс сразу у двух кнопок, поэтому пересчёт
     откладываем в кадр: иначе два подряд чтения offsetLeft форсируют
     раскладку дважды. */
  let queued = 0;
  const schedule = ()=>{ if(queued) return;
    queued = requestAnimationFrame(()=>{ queued = 0; sync() }) };
  new MutationObserver(schedule).observe(seg,
    {subtree:true, attributes:true, attributeFilter:['class']});
  addEventListener('resize', schedule);
  requestAnimationFrame(sync);
  seg.mcSync = schedule;
}

/* ===== Смена содержимого вкладки =====
   Гасим старое, перерисовываем, новое въезжает каскадом через reveal(). */
function swap(host, fn){
  if(!host || reduced()){ fn(); return }
  const out = host.animate([{opacity:1},{opacity:0}], {duration:110, easing:'ease-in'});
  out.finished.then(fn, fn);
}

return {reduced, full:isFull, fitFull, reveal, flyTo, flip, bump, flash, pill, swap};
})();
