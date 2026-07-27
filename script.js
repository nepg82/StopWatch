(() => {
  const input = document.getElementById('timeInput');
  const goBtn = document.getElementById('goBtn');
  const stopBtn = document.getElementById('stopBtn');
  const resetBtn = document.getElementById('resetBtn');

  const DEFAULT_VALUE = '00:00:00.0';

  let remainingTenths = 0;   // countdown time left, in tenths of a second
  let startValueTenths = 0;  // the value entered before Go was pressed (for Reset)
  let timerId = null;
  let running = false;

  function parseToTenths(str) {
    // Expected format HH:MM:SS.t
    const m = str.trim().match(/^(\d{1,2}):(\d{1,2}):(\d{1,2})\.(\d)$/);
    if (!m) return null;
    const [, hh, mm, ss, t] = m.map(Number);
    if (mm > 59 || ss > 59) return null;
    return ((hh * 3600) + (mm * 60) + ss) * 10 + t;
  }

  function formatFromTenths(totalTenths) {
    if (totalTenths < 0) totalTenths = 0;
    const t = totalTenths % 10;
    const totalSeconds = Math.floor(totalTenths / 10);
    const ss = totalSeconds % 60;
    const totalMinutes = Math.floor(totalSeconds / 60);
    const mm = totalMinutes % 60;
    const hh = Math.floor(totalMinutes / 60);
    const pad2 = (n) => String(n).padStart(2, '0');
    return `${pad2(hh)}:${pad2(mm)}:${pad2(ss)}.${t}`;
  }

  function setDisplay(tenths) {
    input.value = formatFromTenths(tenths);
  }

  function setState({ idle = false, active = false, done = false } = {}) {
    if (idle) {
      input.readOnly = false;
      goBtn.disabled = false;
      stopBtn.disabled = true;
      resetBtn.disabled = true;
      goBtn.classList.add('focused');
      stopBtn.classList.remove('focused');
    } else if (active) {
      input.readOnly = true;
      goBtn.disabled = true;
      stopBtn.disabled = false;
      resetBtn.disabled = true;
      stopBtn.classList.add('focused');
      goBtn.classList.remove('focused');
    } else {
      // paused or finished
      input.readOnly = true;
      goBtn.disabled = done;
      stopBtn.disabled = true;
      resetBtn.disabled = false;
      goBtn.classList.remove('focused');
      stopBtn.classList.remove('focused');
      resetBtn.classList.add('focused');
    }
  }

  function tick() {
    remainingTenths -= 1;
    if (remainingTenths <= 0) {
      remainingTenths = 0;
      setDisplay(remainingTenths);
      stopTimer();
      running = false;
      setState({ done: true });
      return;
    }
    setDisplay(remainingTenths);
  }

  function stopTimer() {
    if (timerId !== null) {
      clearInterval(timerId);
      timerId = null;
    }
  }

  function handleGo() {
    if (goBtn.disabled) return;

    if (!running && remainingTenths === 0 && input.readOnly === false) {
      // Fresh start: parse whatever is in the input
      const parsed = parseToTenths(input.value);
      if (parsed === null || parsed === 0) {
        input.focus();
        return;
      }
      startValueTenths = parsed;
      remainingTenths = parsed;
    } else if (!running && remainingTenths === 0) {
      // Nothing left to run (already finished) — do nothing until Reset
      return;
    }
    // else: resuming from a paused state, remainingTenths already holds the value

    running = true;
    setState({ active: true });
    stopTimer();
    timerId = setInterval(tick, 100);
  }

  function handleStop() {
    if (stopBtn.disabled) return;
    running = false;
    stopTimer();
    setState({ done: remainingTenths === 0 });
  }

  function handleReset() {
    if (resetBtn.disabled) return;
    running = false;
    stopTimer();
    remainingTenths = 0;
    setDisplay(startValueTenths || 0);
    input.value = formatFromTenths(startValueTenths || 0);
    if (!startValueTenths) input.value = DEFAULT_VALUE;
    setState({ idle: true });
  }

  goBtn.addEventListener('click', handleGo);
  stopBtn.addEventListener('click', handleStop);
  resetBtn.addEventListener('click', handleReset);

  // Keyboard shortcuts.
  // True OS-level Win+R / Win+S / Win+G combos are intercepted by Windows itself
  // before a browser tab ever sees them, so there's no way for a web page to
  // capture the literal Windows-key chord. Ctrl+letter is the closest browser-
  // reachable equivalent on Windows, so both Cmd (Mac) and Ctrl (Windows/Linux)
  // are wired up here.
  window.addEventListener('keydown', (e) => {
    const mod = e.metaKey || e.ctrlKey;
    if (!mod) return;
    const key = e.key.toLowerCase();
    if (key === 'g') {
      e.preventDefault();
      handleGo();
    } else if (key === 's') {
      e.preventDefault();
      handleStop();
    } else if (key === 'r') {
      e.preventDefault();
      handleReset();
    }
  });

  input.addEventListener('input', () => {
    // allow only digits and separators while editing
    input.value = input.value.replace(/[^0-9:.]/g, '');
  });

  input.addEventListener('blur', () => {
    if (input.readOnly) return;
    if (parseToTenths(input.value) === null) {
      input.value = DEFAULT_VALUE;
    }
  });

  setState({ idle: true });

  // Register service worker for installability / offline use.
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    });
  }
})();
