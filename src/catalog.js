document.addEventListener("DOMContentLoaded", function () {
  const imageContainer = document.getElementById("imageContainer");
  const clickLayer = document.getElementById("clickLayer");
  const loader = document.getElementById("loader");
  const counter = document.getElementById("counter");

  // Базовый путь к изображениям
  const basePath =
    "https://raw.githubusercontent.com/akarak/catalogs/refs/heads/main/src/assets/data/K3519/pages";

  // Константы для генерации имен изображений
  const FIRST_INDEX = 1;
  const LAST_INDEX = 77;
  const TOTAL_IMAGES = LAST_INDEX - FIRST_INDEX + 1;

  // Функция для получения URL изображения по индексу
  function getImageUrl(index) {
    // Дополняем индекс нулями слева до 4 знаков
    const paddedIndex = index.toString().padStart(4, "0");
    const fileName = `K3519_${paddedIndex}.webp`;
    return `${basePath}/${fileName}`;
  }

  let currentIndex = 0; // Относительный индекс (0-based)
  let images = []; // Массив для хранения загруженных изображений
  let isLoading = false;
  let currentAnimation = null; // Текущая анимация GSAP
  let zoomLevels = new Map(); // Хранит информацию о масштабе для каждого изображения
  let naturalSizes = new Map(); // Хранит натуральные размеры изображений

  // Функция для преобразования относительного индекса в абсолютный
  function getAbsoluteIndex(relativeIndex) {
    return relativeIndex + FIRST_INDEX;
  }

  // Функция для обновления счетчика
  function updateCounter() {
    const absoluteIndex = getAbsoluteIndex(currentIndex);
    counter.textContent = `${absoluteIndex} из ${LAST_INDEX}`;
  }

  // Функция для загрузки изображения
  function loadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        // Сохраняем натуральные размеры изображения
        naturalSizes.set(img, {
          width: img.naturalWidth,
          height: img.naturalHeight,
        });
        // Инициализируем уровень зума для этого изображения
        zoomLevels.set(img, 1);
        resolve(img);
      };
      img.onerror = () => {
        console.warn("Не удалось загрузить изображение:", url);
        reject(new Error("Failed to load image"));
      };
      img.src = url;
      img.className = "image";
      img.style.visibility = "hidden"; // Сразу скрываем загружаемые изображения
    });
  }

  // Функция для создания элемента изображения
  function createImageElement() {
    const img = document.createElement("img");
    img.className = "image";
    img.style.visibility = "hidden"; // Новые элементы создаются скрытыми
    return img;
  }

  // Функция для обновления тени
  function updateShadow() {
    // Убираем тень со всех изображений
    images.forEach((img) => {
      img.classList.remove("with-shadow");
    });

    // Добавляем тень только к активному изображению
    const activeImage = images[currentIndex];
    if (activeImage) {
      activeImage.classList.add("with-shadow");
    }
  }

  // Функция для установки активного изображения
  function setActiveImage(index) {
    // Скрываем все изображения
    images.forEach((img) => {
      img.classList.remove("active", "next");
      img.style.display = "none";
      img.style.visibility = "hidden"; // Скрываем visibility
    });

    // Показываем активное изображение
    if (images[index]) {
      images[index].classList.add("active");
      images[index].style.display = "block";
      images[index].style.visibility = "visible"; // Делаем видимым
    }

    updateShadow();
  }

  // Функция для расчета максимального зума (до натурального размера)
  function getMaxZoomLevel(image) {
    const naturalSize = naturalSizes.get(image);
    if (!naturalSize) return 3; // Возвращаем разумное значение по умолчанию

    const containerWidth = imageContainer.clientWidth;
    const containerHeight = imageContainer.clientHeight;

    // Рассчитываем, во сколько раз натуральный размер больше контейнера
    const widthRatio = naturalSize.width / containerWidth;
    const heightRatio = naturalSize.height / containerHeight;

    // Берем максимальное отношение, чтобы изображение полностью заполнило экран
    const maxZoom = Math.max(widthRatio, heightRatio, 3);
    return maxZoom;
  }

  // Функция для применения зума к изображению
  function applyZoom(image, zoomLevel) {
    const maxZoom = getMaxZoomLevel(image);
    const clampedZoom = Math.max(1, Math.min(zoomLevel, maxZoom));

    // Сохраняем текущий уровень зума
    zoomLevels.set(image, clampedZoom);

    // Применяем трансформацию
    image.style.transform = `scale(${clampedZoom})`;

    return clampedZoom;
  }

  // Функция для сброса зума
  function resetZoom(image) {
    zoomLevels.set(image, 1);
    image.style.transform = "scale(1)";
  }

  // Функция для обработки колеса мыши
  function handleWheel(event) {
    if (isLoading) {
      return; // Не обрабатываем зум во время анимации перехода
    }

    const activeImage = images[currentIndex];
    if (!activeImage) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const delta = -Math.sign(event.deltaY); // Инвертируем для интуитивного поведения
    const currentZoom = zoomLevels.get(activeImage) || 1;
    const zoomStep = 0.2; // Шаг изменения зума

    let newZoom = currentZoom + delta * zoomStep;

    // Применяем зум с ограничениями
    applyZoom(activeImage, newZoom);
  }

  // Функция для асинхронной загрузки следующих/предыдущих изображений
  async function loadAdjacentImages(currentRelativeIndex, isRightClick) {
    const indicesToLoad = new Set();

    // Загружаем 3 следующих или предыдущих изображения в зависимости от направления
    for (let i = 1; i <= 3; i++) {
      const relativeIndex = isRightClick
        ? (currentRelativeIndex + i) % TOTAL_IMAGES
        : (currentRelativeIndex - i + TOTAL_IMAGES) % TOTAL_IMAGES;

      // Проверяем, что изображение еще не было загружено
      if (!images[relativeIndex].src || images[relativeIndex].src === "") {
        indicesToLoad.add(relativeIndex);
      }
    }

    // Загружаем изображения, которые еще не загружены
    const loadPromises = [];
    for (const relativeIndex of indicesToLoad) {
      loadPromises.push(preloadImage(relativeIndex));
    }

    // Запускаем загрузку в фоновом режиме, не ждем завершения
    if (loadPromises.length > 0) {
      Promise.all(loadPromises)
        .then(() => {
          console.log(
            "Фоновая загрузка завершена для индексов:",
            Array.from(indicesToLoad)
          );
        })
        .catch((error) => {
          console.warn("Ошибка фоновой загрузки:", error);
        });
    }
  }

  // Функция для анимированной смены изображения с GSAP
  async function performAnimation(isRightClick) {
    const oldIndex = currentIndex;
    const newIndex = isRightClick
      ? (currentIndex + 1) % TOTAL_IMAGES
      : (currentIndex - 1 + TOTAL_IMAGES) % TOTAL_IMAGES;

    const currentImage = images[oldIndex];
    const nextImage = images[newIndex];

    if (!currentImage || !nextImage) return;

    // СБРАСЫВАЕМ ЗУМ перед анимацией перелистывания
    resetZoom(currentImage);

    // Запускаем асинхронную загрузку следующих/предыдущих изображений
    loadAdjacentImages(newIndex, isRightClick);

    // 1. Сначала показываем следующее изображение под текущим (прозрачное, но с тенью)
    nextImage.classList.add("next");
    nextImage.style.display = "block";
    nextImage.style.visibility = "visible"; // Делаем видимым
    nextImage.classList.add("with-shadow"); // Сразу добавляем тень

    // Настраиваем начальное состояние для следующего изображения - прозрачное
    gsap.set(nextImage, {
      opacity: 0,
    });

    // 2. Запускаем анимацию появления следующего изображения (фейд за 0.3 секунды)
    const nextImageAnimation = gsap.to(nextImage, {
      duration: 0.3,
      opacity: 1,
      onComplete: () => {
        // После появления следующего изображения запускаем анимацию ухода текущего
        startCurrentImageAnimation(
          isRightClick,
          currentImage,
          nextImage,
          newIndex
        );
      },
    });
  }

  // Функция для анимации ухода текущего изображения
  function startCurrentImageAnimation(
    isRightClick,
    currentImage,
    nextImage,
    newIndex
  ) {
    // Добавляем класс анимации к текущему изображению
    currentImage.classList.add("animating");

    // Определяем параметры анимации в зависимости от направления
    let shiftX, rotation, transformOrigin;

    if (isRightClick) {
      // Уход направо: сдвиг вправо, поворот против часовой стрелки вокруг правого верхнего угла
      shiftX = "30%";
      rotation = -30;
      transformOrigin = "right top";
    } else {
      // Уход налево: сдвиг влево, поворот по часовой стрелке вокруг левого верхнего угла
      shiftX = "-30%";
      rotation = 30;
      transformOrigin = "left top";
    }

    // Устанавливаем точку вращения
    gsap.set(currentImage, { transformOrigin: transformOrigin });

    // Настраиваем параметры анимации для текущего изображения
    const animationParamsCurrent = {
      duration: 0.4, // Общая длительность анимации 0.7 секунд (0.3 + 0.4)
      ease: "power2.in", // Медленно в начале, быстро в конце
      x: shiftX, // Сдвиг в сторону
      scale: 0.7, // Уменьшение на 30% (100% - 30% = 70%)
      rotation: rotation, // Поворот на 30 градусов
      opacity: 0, // Полное исчезновение (начинается с начала)
      onComplete: () => {
        // После завершения анимации устанавливаем новое активное изображение
        currentIndex = newIndex;
        setActiveImage(currentIndex);
        updateCounter();

        isLoading = false;
        currentAnimation = null;

        // Сбрасываем трансформации текущего изображения
        gsap.set(currentImage, {
          x: 0,
          scale: 1,
          opacity: 1,
          rotation: 0,
          transformOrigin: "center center",
        });
        currentImage.classList.remove("animating");

        // Загружаем следующие изображения для плавности
        // Загружаем только в направлении нажатия
        loadAdjacentImages(currentIndex, isRightClick);
      },
    };

    // Запускаем анимацию ухода текущего изображения
    currentAnimation = gsap.to(currentImage, animationParamsCurrent);
  }

  // Инициализация изображений
  function initializeImages() {
    images = [];

    // Создаем элементы для всех изображений
    for (let i = 0; i < TOTAL_IMAGES; i++) {
      const img = createImageElement();
      imageContainer.appendChild(img);
      images.push(img);
    }

    // Загружаем и устанавливаем первое изображение
    loadInitialImage();
  }

  // Функция для загрузки начального изображения
  async function loadInitialImage() {
    loader.style.display = "block";

    try {
      const firstImageUrl = getImageUrl(getAbsoluteIndex(0));
      const loadedImage = await loadImage(firstImageUrl);

      // Заменяем пустой элемент на загруженное изображение
      const oldElement = images[0];
      imageContainer.replaceChild(loadedImage, oldElement);
      images[0] = loadedImage;

      // Делаем первое изображение видимым
      loadedImage.style.visibility = "visible";

      // Устанавливаем активное изображение
      setActiveImage(0);
      updateCounter();

      // Загружаем соседние изображения (оба направления при инициализации)
      loadAdjacentImages(0, true); // Загружаем следующие
      loadAdjacentImages(0, false); // Загружаем предыдущие
    } catch (error) {
      console.error("Ошибка загрузки начального изображения:", error);
    } finally {
      loader.style.display = "none";
    }
  }

  // Функция для предзагрузки одного изображения
  async function preloadImage(relativeIndex) {
    if (relativeIndex < 0 || relativeIndex >= TOTAL_IMAGES) return;

    if (!images[relativeIndex].src || images[relativeIndex].src === "") {
      try {
        const imageUrl = getImageUrl(getAbsoluteIndex(relativeIndex));
        const loadedImage = await loadImage(imageUrl);

        // Заменяем пустой элемент на загруженное изображение
        const oldElement = images[relativeIndex];
        imageContainer.replaceChild(loadedImage, oldElement);
        images[relativeIndex] = loadedImage;

        // Сохраняем классы и стили, включая visibility: hidden
        loadedImage.className = oldElement.className;
        loadedImage.style.display = oldElement.style.display;
        loadedImage.style.visibility = "hidden"; // Сохраняем скрытое состояние
      } catch (error) {
        console.warn(
          "Не удалось загрузить изображение",
          getAbsoluteIndex(relativeIndex),
          error
        );
      }
    }
  }

  // Основная функция для смены изображения
  async function changeImage(isRightClick) {
    // Если уже выполняется анимация, игнорируем новый клик
    if (isLoading) {
      return;
    }

    // Определяем индекс следующего изображения
    const newIndex = isRightClick
      ? (currentIndex + 1) % TOTAL_IMAGES
      : (currentIndex - 1 + TOTAL_IMAGES) % TOTAL_IMAGES;

    // Проверяем, загружено ли следующее изображение
    const nextImage = images[newIndex];
    if (!nextImage.src || nextImage.src === "") {
      // Показываем индикатор загрузки
      loader.style.display = "block";

      // Ждем загрузки изображения
      await preloadImage(newIndex);

      // Скрываем индикатор загрузки
      loader.style.display = "none";
    }

    // Запускаем анимацию перехода
    isLoading = true;
    performAnimation(isRightClick);
  }

  // Обработчик клика на слой с зонами
  clickLayer.addEventListener("click", function (e) {
    const direction = e.target.getAttribute("data-direction");
    if (direction) {
      // Правая зона - увеличиваем индекс (следующее изображение)
      // Левая зона - уменьшаем индекс (предыдущее изображение)
      changeImage(direction === "right");
    }
  });

  // Обработчик нажатия клавиш на клавиатуре
  document.addEventListener("keydown", function (e) {
    // Стрелка влево - предыдущее изображение
    if (e.key === "ArrowLeft") {
      e.preventDefault(); // Предотвращаем прокрутку страницы
      changeImage(false);
    }
    // Стрелка вправо - следующее изображение
    else if (e.key === "ArrowRight") {
      e.preventDefault(); // Предотвращаем прокрутку страницы
      changeImage(true);
    }
  });

  // Обработчик колеса мыши для зума
  document.addEventListener("wheel", handleWheel, { passive: false });

  // Запрещаем контекстное меню (правый клик)
  document.addEventListener("contextmenu", function (e) {
    e.preventDefault();
    return false;
  });

  // Инициализируем изображения
  initializeImages();
});
