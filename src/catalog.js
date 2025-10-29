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
        resolve(img);
      };
      img.onerror = () => {
        console.warn("Не удалось загрузить изображение:", url);
        reject(new Error("Failed to load image"));
      };
      img.src = url;
      img.classList.add("drop-shadow-image-md");
    });
  }

  // Функция для создания элемента изображения
  function createImageElement() {
    const img = document.createElement("img");
    img.className = "absolute drop-shadow-image-md z-0";
    img.style.opacity = "0";
    return img;
  }

  // Функция для установки активного изображения
  function setActiveImage(index) {
    // Скрываем все изображения через opacity
    images.forEach((img) => {
      img.classList.remove("active", "animating");
      img.style.opacity = "0";
      // Сбрасываем позицию
      img.style.transform = "translateX(0) scale(1) rotate(0deg)";
      // Сбрасываем z-index к базовому
      img.classList.remove("z-10", "z-20", "z-30");
      img.classList.add("z-0");
    });

    // Показываем активное изображение
    if (images[index]) {
      images[index].classList.add("active");
      images[index].style.opacity = "1";
      // Устанавливаем z-index для активного изображения
      images[index].classList.remove("z-0");
      images[index].classList.add("z-10");
    }
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
      if (
        !images[relativeIndex] ||
        !images[relativeIndex].src ||
        images[relativeIndex].src === ""
      ) {
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

    // Запускаем асинхронную загрузку следующих/предыдущих изображений
    loadAdjacentImages(newIndex, isRightClick);

    // Устанавливаем высокий z-index для обоих анимируемых изображений
    currentImage.classList.remove("z-0", "z-10");
    currentImage.classList.add("z-30", "animating");

    nextImage.classList.remove("z-0");
    nextImage.classList.add("z-20", "animating");

    // Запускаем анимацию появления следующего изображения
    const nextImageAnimation = gsap.to(nextImage, {
      duration: 0.2,
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

    // Настраиваем параметры анимации для текущего изображения
    const animationParamsCurrent = {
      duration: 0.4,
      ease: "power2.in", // Медленно в начале, быстро в конце
      transformOrigin: transformOrigin,
      x: shiftX,
      scale: 0.7,
      rotation: rotation,
      opacity: 0,
      onComplete: () => {
        // После завершения анимации устанавливаем новое активное изображение
        currentIndex = newIndex;
        setActiveImage(currentIndex);
        updateCounter();

        // Сбрасываем трансформации текущего изображения
        gsap.set(currentImage, {
          x: 0,
          scale: 1,
          opacity: 1,
          rotation: 0,
          transformOrigin: "center center",
        });
        currentImage.classList.remove("animating");
        // Возвращаем базовый z-index
        currentImage.classList.remove("z-30");
        currentImage.classList.add("z-0");

        isLoading = false;
        currentAnimation = null;

        // Загружаем следующие изображения в направлении нажатия
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
  }

  // Функция для загрузки начального изображения
  async function loadInitialImage() {
    loader.classList.remove("hidden");

    try {
      const firstImageUrl = getImageUrl(getAbsoluteIndex(0));
      const loadedImage = await loadImage(firstImageUrl);

      // Заменяем пустой элемент на загруженное изображение
      const oldElement = images[0];
      imageContainer.replaceChild(loadedImage, oldElement);
      images[0] = loadedImage;

      // Устанавливаем активное изображение
      setActiveImage(0);
      updateCounter();

      // Загружаем соседние изображения
      loadAdjacentImages(0, true);
    } catch (error) {
      console.error("Ошибка загрузки начального изображения:", error);
    } finally {
      loader.classList.add("hidden");
    }
  }

  // Функция для предзагрузки одного изображения
  async function preloadImage(relativeIndex) {
    if (relativeIndex < 0 || relativeIndex >= TOTAL_IMAGES) return;

    if (
      !images[relativeIndex] ||
      !images[relativeIndex].src ||
      images[relativeIndex].src === ""
    ) {
      try {
        const imageUrl = getImageUrl(getAbsoluteIndex(relativeIndex));
        const loadedImage = await loadImage(imageUrl);

        // Заменяем пустой элемент на загруженное изображение
        const oldElement = images[relativeIndex];
        imageContainer.replaceChild(loadedImage, oldElement);
        images[relativeIndex] = loadedImage;

        // Сохраняем классы
        loadedImage.className = oldElement.className;
        loadedImage.classList.value = oldElement.classList.value;
        // Сохраняем opacity
        loadedImage.style.opacity = oldElement.style.opacity;
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
    if (isLoading) return;

    // Определяем индекс следующего изображения
    const nextIndex = isRightClick
      ? (currentIndex + 1) % TOTAL_IMAGES
      : (currentIndex - 1 + TOTAL_IMAGES) % TOTAL_IMAGES;

    // Проверяем, загружено ли следующее изображение
    const nextImage = images[nextIndex];
    if (!nextImage || !nextImage.src || nextImage.src === "") {
      try {
        loader.classList.remove("hidden");
        await preloadImage(nextIndex);
      } finally {
        loader.classList.add("hidden");
      }
    }

    // Запускаем анимацию перехода
    isLoading = true;
    performAnimation(isRightClick);
  }

  // Обработчик клика по слою с зонами
  clickLayer.addEventListener("click", function (e) {
    const direction = e.target.getAttribute("data-direction");
    // Правая зона - увеличиваем индекс (следующее изображение)
    // Левая зона - уменьшаем индекс (предыдущее изображение)
    if (direction) {
      changeImage(direction === "right");
    }
  });

  // Обработчик нажатия клавиш на клавиатуре
  // Стрелка влево - предыдущее изображение
  // Стрелка вправо - следующее изображение
  clickLayer.addEventListener("keydown", function (e) {
    if (e.key === "ArrowLeft") {
      e.preventDefault(); // Предотвращаем прокрутку страницы
      changeImage(false);
    } else if (e.key === "ArrowRight") {
      e.preventDefault(); // Предотвращаем прокрутку страницы
      changeImage(true);
    }
  });

  // Запрещаем контекстное меню (правый клик)
  //document.addEventListener("contextmenu", function (e) {
  //  e.preventDefault();
  //  return false;
  //});

  initializeImages();
  loadInitialImage();
});
