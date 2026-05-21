/* D²nAI catalog — client-side filtering by status (live/dev/idea) or category (Data/Digital/AI) */
(function () {
  var cat = document.querySelector('.dnai-catalog');
  if (!cat) return;
  var btns = cat.querySelectorAll('.dnai-f');
  var cards = cat.querySelectorAll('.dnai-card');

  function apply(f) {
    cards.forEach(function (c) {
      var show = (f === 'all') || (c.getAttribute('data-status') === f) || (c.getAttribute('data-cat') === f);
      c.classList.toggle('dnai-hide', !show);
    });
  }
  btns.forEach(function (b) {
    b.addEventListener('click', function () {
      btns.forEach(function (x) { x.classList.remove('active'); });
      b.classList.add('active');
      apply(b.getAttribute('data-f'));
    });
  });
})();
