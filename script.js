/**
 * ============================================================================
 * ТАЙМЕР ДО ВАЖНОГО СОБЫТИЯ
 * ----------------------------------------------------------------------------
 * Весь код обёрнут в один IIFE (Immediately Invoked Function Expression),
 * чтобы ни одна переменная или функция не попала в глобальную область
 * видимости window. Это позволяет открывать index.html двойным кликом
 * (протокол file://) без сервера и без риска конфликтов с другими скриптами.
 * ============================================================================
 */
(function () {
  "use strict";

  /* ==========================================================================
     1. КОНСТАНТЫ И "БАЗА ДАННЫХ" В ПАМЯТИ (без реальной БД — просто массивы)
     ========================================================================== */

  // Ключ, под которым выбранное событие хранится в localStorage
  const STORAGE_KEY = "countdown_app_event_v1";

  // Готовые (пресетные) варианты событий.
  // Для дня рождения/каникул дату должен указать сам пользователь,
  // поэтому здесь только название и подсказка placeholder для поля даты.
  const PRESETS = {
    birthday: { name: "Мой день рождения", hint: "Выберите дату дня рождения" },
    vacation: { name: "Каникулы", hint: "Выберите дату начала каникул" },
    newyear: { name: "Новый год", hint: "" }, // дата вычисляется автоматически
    custom: { name: "", hint: "Введите своё событие" }
  };

  // Список интересных фактов. Один факт показывается на весь день —
  // выбирается по номеру дня в году, поэтому у всех, кто откроет сайт
  // в один и тот же день, факт будет одинаковым.
  const FACTS = [
    "Мёд практически никогда не портится — археологи находили съедобный мёд возрастом более 3000 лет.",
    "Осьминоги имеют три сердца и голубую кровь.",
    "Один год на Венере короче, чем один день на Венере.",
    "Бананы — это ягоды, а клубника — нет.",
    "Человеческий нос способен различать более триллиона разных запахов.",
    "Эйфелева башня летом становится выше примерно на 15 см из-за расширения металла от жары.",
    "Улитки могут спать до трёх лет подряд.",
    "Самая долгая зафиксированная гроза длилась более 24 часов.",
    "Сердце синего кита настолько большое, что человек может проплыть по его артериям.",
    "На Земле больше деревьев, чем звёзд в нашей галактике.",
    "Акулы существуют на Земле дольше, чем деревья.",
    "У жирафов и людей одинаковое количество шейных позвонков — по семь.",
    "Молния в 5 раз горячее, чем поверхность Солнца.",
    "Пингвины делают друг другу предложение с помощью красивого камешка.",
    "Октябрь, ноябрь и декабрь получили свои названия от латинских слов «восемь», «девять» и «десять».",
    "Отпечатки языка у коал уникальны, как отпечатки пальцев у людей.",
    "Первое в мире электронное письмо было отправлено в 1971 году.",
    "Космонавты на орбите видят около 16 восходов и закатов в сутки.",
    "Слово «алфавит» происходит от первых двух букв греческого алфавита — альфа и бета.",
    "Самая длинная в мире радуга наблюдалась над Британией и длилась почти 9 часов."
  ];

  // Список цитат/фраз дня — мотивационных и с юмором.
  // Смещение выбора отличается от FACTS, чтобы факт и цитата не менялись синхронно.
  const QUOTES = [
    "Лучшее время посадить дерево было 20 лет назад. Второе лучшее — сейчас.",
    "Считай не дни, а то, что успел сделать за эти дни.",
    "Даже самый долгий отсчёт когда-нибудь доходит до нуля.",
    "Секунды складываются в минуты, минуты — в мечты, которые сбываются.",
    "Хорошее планирование — это когда волнуешься заранее, а не в последний момент.",
    "Каждая минута ожидания — шаг ближе к празднику.",
    "Терпение — это тоже суперсила, просто без плаща.",
    "Не жди идеального момента — таймер всё равно тикает.",
    "Сегодняшний день тоже когда-то был «тем самым важным событием».",
    "Считать дни веселее, если знаешь, ради чего.",
    "Маленькие шаги каждый день — большой результат к нужной дате.",
    "Даже черепаха доходит до финиша, если не останавливается.",
    "Хорошее ожидание — это предвкушение, а не тревога.",
    "Время летит быстрее, когда есть повод считать дни.",
    "Пока таймер тикает — у тебя есть время подготовиться и улыбнуться."
  ];

  /* ==========================================================================
     2. ССЫЛКИ НА DOM-ЭЛЕМЕНТЫ
     ========================================================================== */

  const el = {
    chips: document.querySelectorAll(".chip"),
    form: document.getElementById("eventForm"),
    nameInput: document.getElementById("eventNameInput"),
    dateInput: document.getElementById("eventDateInput"),

    eventNameOutput: document.getElementById("eventNameOutput"),
    eventDateOutput: document.getElementById("eventDateOutput"),
    eventPassedMsg: document.getElementById("eventPassedMsg"),
    flipBoard: document.getElementById("flipBoard"),

    digitsDays: document.getElementById("digits-days"),
    digitsHours: document.getElementById("digits-hours"),
    digitsMinutes: document.getElementById("digits-minutes"),
    digitsSeconds: document.getElementById("digits-seconds"),

    factText: document.getElementById("factText"),
    quoteText: document.getElementById("quoteText"),
    dayImage: document.getElementById("dayImage"),

    overlay: document.getElementById("confirmOverlay"),
    modalText: document.getElementById("modalText"),
    modalCancelBtn: document.getElementById("modalCancelBtn"),
    modalConfirmBtn: document.getElementById("modalConfirmBtn")
  };

  /* ==========================================================================
     3. ВНУТРЕННЕЕ СОСТОЯНИЕ МОДУЛЯ
     ========================================================================== */

  // Текущее выбранное событие: { name: string, date: ISO-строка }
  let currentEvent = null;

  // Событие, которое ожидает подтверждения в модальном окне
  let pendingEvent = null;

  // Идентификатор setInterval, чтобы можно было его остановить/перезапустить
  let tickIntervalId = null;

  // Запоминаем предыдущие значения цифр, чтобы анимировать только те,
  // которые реально изменились (а не перерисовывать всё табло каждую секунду)
  let previousDigits = {};

  /* ==========================================================================
     4. УТИЛИТЫ ДЛЯ ДАТ
     ========================================================================== */

  // Номер дня в году (1-366) — нужен, чтобы выбрать "факт/цитату дня"
  function getDayOfYear(date) {
    const start = new Date(date.getFullYear(), 0, 0);
    const diffMs = date - start;
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }

  // Дата в формате YYYY-MM-DD (локальное время) — используется как "сид"
  // для картинки дня, чтобы каждый день показывалась новая картинка
  function getDateSeed(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  // Красивое форматирование даты события для вывода пользователю
  function formatEventDate(dateObj) {
    return dateObj.toLocaleString("ru-RU", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  // Ближайшее 1 января (00:00) от текущего момента — для пресета "Новый год"
  function getNextNewYearDate() {
    const now = new Date();
    const year = now.getMonth() === 0 && now.getDate() === 1 && now.getHours() === 0
      ? now.getFullYear()
      : now.getFullYear() + 1;
    const ny = new Date(year, 0, 1, 0, 0, 0);
    return ny;
  }

  /* ==========================================================================
     5. РАБОТА С localStorage
     ========================================================================== */

  function saveEventToStorage(eventData) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(eventData));
    } catch (err) {
      // localStorage может быть недоступен (приватный режим и т.п.) —
      // приложение всё равно должно продолжать работать в рамках сессии
      console.warn("Не удалось сохранить событие в localStorage:", err);
    }
  }

  function loadEventFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && parsed.name && parsed.date) return parsed;
      return null;
    } catch (err) {
      console.warn("Не удалось прочитать событие из localStorage:", err);
      return null;
    }
  }

  /* ==========================================================================
     6. ФЛИП-ТАБЛО: ПОСТРОЕНИЕ И ОБНОВЛЕНИЕ ЦИФР
     ========================================================================== */

  // Создаёт (или обновляет) набор "флип-карточек" для одного блока (дни/часы/...)
  // valueStr — строка с цифрами, например "07" или "128"
  function renderDigitGroup(container, unitKey, valueStr) {
    const chars = valueStr.split("");
    const prevChars = previousDigits[unitKey] || [];

    // Если количество цифр изменилось (например, дни перешли с 9 на 10),
    // пересоздаём всю группу карточек с нуля
    if (chars.length !== container.children.length) {
      container.innerHTML = "";
      chars.forEach((ch) => {
        const card = document.createElement("div");
        card.className = "flip-card";
        const span = document.createElement("span");
        span.textContent = ch;
        card.appendChild(span);
        container.appendChild(card);
      });
    } else {
      // Иначе точечно обновляем только те цифры, которые реально изменились
      chars.forEach((ch, i) => {
        if (prevChars[i] !== ch) {
          const card = container.children[i];
          const span = card.querySelector("span");
          span.textContent = ch;

          // Перезапускаем CSS-анимацию "переворота" на изменившейся цифре
          card.classList.remove("is-flipping");
          // eslint-disable-next-line no-unused-expressions
          void card.offsetWidth; // форсируем reflow, чтобы анимация сыграла заново
          card.classList.add("is-flipping");
        }
      });
    }

    previousDigits[unitKey] = chars;
  }

  /* ==========================================================================
     7. ОСНОВНОЙ ЦИКЛ ОБРАТНОГО ОТСЧЁТА
     ========================================================================== */

  function tick() {
    if (!currentEvent) return;

    const target = new Date(currentEvent.date);
    const now = new Date();
    const diffMs = target - now;

    if (diffMs <= 0) {
      // Событие уже наступило — показываем сообщение и обнуляем табло
      el.eventPassedMsg.hidden = false;
      el.flipBoard.style.opacity = "0.35";
      renderDigitGroup(el.digitsDays, "days", "00");
      renderDigitGroup(el.digitsHours, "hours", "00");
      renderDigitGroup(el.digitsMinutes, "minutes", "00");
      renderDigitGroup(el.digitsSeconds, "seconds", "00");
      return;
    }

    el.eventPassedMsg.hidden = true;
    el.flipBoard.style.opacity = "1";

    const totalSeconds = Math.floor(diffMs / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    // Дни выводим без ведущего нуля (могут быть трёх-четырёхзначными),
    // часы/минуты/секунды — всегда по 2 цифры
    renderDigitGroup(el.digitsDays, "days", String(days).padStart(2, "0"));
    renderDigitGroup(el.digitsHours, "hours", String(hours).padStart(2, "0"));
    renderDigitGroup(el.digitsMinutes, "minutes", String(minutes).padStart(2, "0"));
    renderDigitGroup(el.digitsSeconds, "seconds", String(seconds).padStart(2, "0"));
  }

  function startTicking() {
    if (tickIntervalId) clearInterval(tickIntervalId);
    previousDigits = {}; // сбрасываем, чтобы табло перерисовалось с нуля
    tick();
    tickIntervalId = setInterval(tick, 1000);
  }

  /* ==========================================================================
     8. ПРИМЕНЕНИЕ СОБЫТИЯ (после подтверждения)
     ========================================================================== */

  function applyEvent(eventData) {
    currentEvent = eventData;
    saveEventToStorage(eventData);

    el.eventNameOutput.textContent = eventData.name;
    el.eventDateOutput.textContent = formatEventDate(new Date(eventData.date));

    startTicking();
  }

  /* ==========================================================================
     9. МОДАЛЬНОЕ ОКНО ПОДТВЕРЖДЕНИЯ
     ========================================================================== */

  function openConfirmModal(eventData) {
    pendingEvent = eventData;
    el.modalText.textContent =
      `Установить отсчёт до события «${eventData.name}» ` +
      `(${formatEventDate(new Date(eventData.date))})?`;
    el.overlay.hidden = false;
  }

  function closeConfirmModal() {
    el.overlay.hidden = true;
    pendingEvent = null;
  }

  el.modalConfirmBtn.addEventListener("click", function () {
    if (pendingEvent) {
      applyEvent(pendingEvent);
    }
    closeConfirmModal();
  });

  el.modalCancelBtn.addEventListener("click", closeConfirmModal);

  // Клик по тёмной подложке тоже закрывает окно (как отмена)
  el.overlay.addEventListener("click", function (e) {
    if (e.target === el.overlay) closeConfirmModal();
  });

  // Закрытие модального окна по клавише Escape
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !el.overlay.hidden) closeConfirmModal();
  });

  /* ==========================================================================
     10. ВЫБОР ПРЕСЕТА (чипы)
     ========================================================================== */

  function activateChip(chip) {
    el.chips.forEach((c) => c.classList.remove("is-active"));
    chip.classList.add("is-active");
  }

  el.chips.forEach((chip) => {
    chip.addEventListener("click", function () {
      const presetKey = chip.dataset.preset;
      const preset = PRESETS[presetKey];

      activateChip(chip);
      el.form.classList.add("is-visible");

      el.nameInput.value = preset.name;
      el.dateInput.placeholder = preset.hint;

      if (presetKey === "newyear") {
        // Для Нового года дату можно вычислить сразу — пользователю
        // остаётся только нажать кнопку подтверждения
        const ny = getNextNewYearDate();
        el.dateInput.value = toDatetimeLocalValue(ny);
      } else {
        el.dateInput.value = "";
      }

      el.nameInput.focus();
    });
  });

  // Переводит объект Date в строку, понятную полю <input type="datetime-local">
  function toDatetimeLocalValue(date) {
    const pad = (n) => String(n).padStart(2, "0");
    return (
      date.getFullYear() +
      "-" + pad(date.getMonth() + 1) +
      "-" + pad(date.getDate()) +
      "T" + pad(date.getHours()) +
      ":" + pad(date.getMinutes())
    );
  }

  /* ==========================================================================
     11. ОТПРАВКА ФОРМЫ (создание/смена события)
     ========================================================================== */

  el.form.addEventListener("submit", function (e) {
    e.preventDefault();

    const name = el.nameInput.value.trim();
    const dateValue = el.dateInput.value;

    if (!name) {
      el.nameInput.focus();
      return;
    }
    if (!dateValue) {
      el.dateInput.focus();
      return;
    }

    const dateObj = new Date(dateValue);
    if (isNaN(dateObj.getTime())) {
      el.dateInput.focus();
      return;
    }

    // Всегда запрашиваем подтверждение перед сменой события
    openConfirmModal({
      name: name,
      date: dateObj.toISOString()
    });
  });

  /* ==========================================================================
     12. ФАКТ ДНЯ / ЦИТАТА ДНЯ / КАРТИНКА ДНЯ
     ========================================================================== */

  function renderDailyContent() {
    const today = new Date();
    const dayOfYear = getDayOfYear(today);

    const fact = FACTS[dayOfYear % FACTS.length];
    // Смещение на 7, чтобы индекс цитаты не совпадал с индексом факта
    const quote = QUOTES[(dayOfYear + 7) % QUOTES.length];

    el.factText.textContent = fact;
    el.quoteText.textContent = `«${quote}»`;

    const seed = getDateSeed(today);
    el.dayImage.src = `https://picsum.photos/seed/${seed}/600/400`;
    el.dayImage.alt = `Случайная тематическая картинка дня (${seed})`;

    // Если картинка не загрузилась (например, нет интернета) —
    // подставляем аккуратную заглушку через встроенный SVG,
    // чтобы блок не выглядел сломанным
    el.dayImage.addEventListener("error", function onError() {
      el.dayImage.removeEventListener("error", onError);
      el.dayImage.src =
        "data:image/svg+xml;utf8," +
        encodeURIComponent(
          '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400">' +
          '<rect width="100%" height="100%" fill="#232a5c"/>' +
          '<text x="50%" y="50%" fill="#9498c4" font-family="sans-serif" ' +
          'font-size="20" text-anchor="middle" dominant-baseline="middle">' +
          "Картинка недоступна офлайн</text></svg>"
        );
    });
  }

  /* ==========================================================================
     13. ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ
     ========================================================================== */

  function init() {
    renderDailyContent();

    const saved = loadEventFromStorage();

    if (saved) {
      // Восстанавливаем ранее сохранённое событие без модального окна —
      // подтверждение нужно только при осознанной смене события пользователем
      currentEvent = saved;
      el.eventNameOutput.textContent = saved.name;
      el.eventDateOutput.textContent = formatEventDate(new Date(saved.date));
      startTicking();
    } else {
      // Событие ещё не выбрано — показываем форму и просим выбрать
      el.form.classList.add("is-visible");
      el.eventDateOutput.textContent = "Выберите событие выше, чтобы начать отсчёт";
    }
  }

  // Ждём полной загрузки DOM (на случай, если скрипт когда-либо переместят в <head>)
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
