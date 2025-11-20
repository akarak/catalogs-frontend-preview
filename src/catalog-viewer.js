const ChangeImageAnimationDirection = {
  Default: "Default",
  Left: "Left",
  Right: "Right",
};

class CatalogSpreadsViewer extends HTMLElement {
  static get observedAttributes() {
    return ["base-path", "current-spread", "total-spreads", "first-spread"];
  }

  constructor() {
    super();

    // Состояние компонента
    this._currentSpread = 0;
    this._images = [];
    this._isLoading = false;
    this._currentAnimation = null;

    // Привязываем контекст методов
    this.handleClick = this.handleClick.bind(this);
    this.handleKeydown = this.handleKeydown.bind(this);

    // Не используем Shadow DOM
  }

  get basePath() {
    return this.getAttribute("base-path") || "";
  }

  set basePath(value) {
    this.setAttribute("base-path", value);
  }

  get totalSpreads() {
    return parseInt(this.getAttribute("total-spreads")) || 0;
  }

  set totalSpreads(value) {
    this.setAttribute("total-spreads", value.toString());
  }

  get firstSpread() {
    return parseInt(this.getAttribute("first-spread")) || 1;
  }

  set firstSpread(value) {
    this.setAttribute("first-spread", value.toString());
  }

  get currentSpread() {
    return this._currentSpread;
  }

  set currentSpread(value) {
    this._currentSpread = value;
    this.setAttribute("current-spread", value.toString());
    this.dispatchEvent(
      new CustomEvent("current-spread-change", {
        detail: {
          spreadNumber: value,
          absoluteSpreadNumber: this.getAbsoluteIndex(value),
        },
      })
    );
  }

  connectedCallback() {
    // Получаем начальное значение current-spread из атрибута
    const initialSpread = this.getAttribute("current-spread");
    if (initialSpread !== null) {
      this._currentSpread = parseInt(initialSpread) || this.firstSpread;
    } else {
      this._currentSpread = this.firstSpread;
    }

    this.render();
    this.initializeComponents();
    this.loadInitialImage();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue && this.isConnected) {
      if (name === "current-spread" && newValue !== null) {
        // Если меняется current-spread, переходим к указанному изображению
        const newSpread = parseInt(newValue) || this.firstSpread;
        if (newSpread !== this._currentSpread) {
          this._currentSpread = newSpread;
          this.goTo(newSpread);
        }
      } else if (name === "first-spread" && newValue !== null) {
        // При изменении first-spread пересчитываем currentSpread
        const newFirstSpread = parseInt(newValue) || 1;
        const relativeCurrentIndex = this.getRelativeIndex(this._currentSpread);
        this._currentSpread = newFirstSpread + relativeCurrentIndex;
        this.render();
        this.initializeComponents();
        this.loadInitialImage();
      } else if (name === "base-path" || name === "total-spreads") {
        // Переинициализируем компонент при изменении base-path или total-spreads
        this.render();
        this.initializeComponents();
        this.loadInitialImage();
      }
    }
  }

  disconnectedCallback() {
    this.removeEventListeners();
  }

  render() {
    this.innerHTML = `
      <div class="${this.getAttribute("class") || ""} relative">
        <div id="clickLayer" class="absolute w-full h-full flex z-50" tabindex="-1">
          <div class="w-1/2 left-0 cursor-pointer bg-red-500/0" data-direction="left"></div>
          <div class="w-1/2 right-0 cursor-pointer bg-green-500/0" data-direction="right"></div>
        </div>

        <div id="imageContainer" class="flex flex-col items-center justify-center pointer-events-none bg-yellow-200/0 relative w-full h-full">
        </div>

        <div id="loader" class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-12 h-12 border-4 border-gray-400 rounded-full border-t-gray-200 animate-spin z-40 hidden"></div>
      </div>
    `;
  }

  initializeComponents() {
    // Используем querySelector вместо getElementById
    this._imageContainer = this.querySelector("#imageContainer");
    this._clickLayer = this.querySelector("#clickLayer");
    this._loader = this.querySelector("#loader");

    this.addEventListeners();
    this.initializeImages();
  }

  addEventListeners() {
    this._clickLayer.addEventListener("click", this.handleClick);
    this._clickLayer.addEventListener("keydown", this.handleKeydown);
  }

  removeEventListeners() {
    this._clickLayer.removeEventListener("click", this.handleClick);
    this._clickLayer.removeEventListener("keydown", this.handleKeydown);
  }

  handleClick(e) {
    const direction = e.target.getAttribute("data-direction");
    if (direction) {
      this.changeImageByDirection(direction === "right");
    }
  }

  handleKeydown(e) {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      this.changeImageByDirection(false);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      this.changeImageByDirection(true);
    }
  }

  // Функция для получения URL изображения по индексу
  getImageUrl(index) {
    const paddedIndex = index.toString().padStart(4, "0");
    return `${this.basePath}_${paddedIndex}.webp`;
  }

  // Функция для преобразования относительного индекса в абсолютный
  getAbsoluteIndex(relativeIndex) {
    return this.firstSpread + relativeIndex;
  }

  // Функция для преобразования абсолютного индекса в относительный
  getRelativeIndex(absoluteIndex) {
    return absoluteIndex - this.firstSpread;
  }

  // Функция для загрузки изображения
  loadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => {
        console.warn("Не удалось загрузить изображение:", url);
        reject(new Error("Failed to load image"));
      };
      img.src = url;
      img.classList.add("drop-shadow-image-md");
    });
  }

  // Функция для создания элемента изображения
  createImageElement() {
    const img = document.createElement("img");
    img.className = "absolute drop-shadow-image-md z-0";
    img.style.opacity = "0";
    return img;
  }

  // Функция для установки активного изображения
  setActiveImage(relativeIndex) {
    this._images.forEach((img) => {
      img.classList.remove("active", "animating");
      img.style.opacity = "0";
      img.style.transform = "translateX(0) scale(1) rotate(0deg)";
      img.classList.remove("z-10", "z-20", "z-30");
      img.classList.add("z-0");
    });

    if (this._images[relativeIndex]) {
      this._images[relativeIndex].classList.add("active");
      this._images[relativeIndex].style.opacity = "1";
      this._images[relativeIndex].classList.remove("z-0");
      this._images[relativeIndex].classList.add("z-10");
    }
  }

  // Функция для асинхронной загрузки следующих/предыдущих изображений
  async loadAdjacentImages(currentRelativeIndex, isRightClick) {
    const indicesToLoad = new Set();

    for (let i = 1; i <= 3; i++) {
      const relativeIndex = isRightClick
        ? (currentRelativeIndex + i) % this.totalSpreads
        : (currentRelativeIndex - i + this.totalSpreads) % this.totalSpreads;

      if (
        !this._images[relativeIndex]?.src ||
        this._images[relativeIndex].src === ""
      ) {
        indicesToLoad.add(relativeIndex);
      }
    }

    const loadPromises = Array.from(indicesToLoad).map((index) =>
      this.preloadImage(index)
    );

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

  // Функция для анимации ухода текущего изображения
  startCurrentImageAnimation(
    isRightClick,
    currentImage,
    nextImage,
    newRelativeIndex
  ) {
    let shiftX, rotation, transformOrigin;

    if (isRightClick) {
      shiftX = "30%";
      rotation = -30;
      transformOrigin = "right top";
    } else {
      shiftX = "-30%";
      rotation = 30;
      transformOrigin = "left top";
    }

    const animationParamsCurrent = {
      duration: 0.4,
      ease: "power2.in",
      transformOrigin: transformOrigin,
      x: shiftX,
      scale: 0.7,
      rotation: rotation,
      opacity: 0,
      onComplete: () => {
        // Устанавливаем новый currentSpread (абсолютный индекс)
        this.currentSpread = this.getAbsoluteIndex(newRelativeIndex);
        this.setActiveImage(newRelativeIndex);

        gsap.set(currentImage, {
          x: 0,
          scale: 1,
          opacity: 1,
          rotation: 0,
          transformOrigin: "center center",
        });
        currentImage.classList.remove("animating");
        currentImage.classList.remove("z-30");
        currentImage.classList.add("z-0");

        this._isLoading = false;
        this._currentAnimation = null;

        this.loadAdjacentImages(newRelativeIndex, isRightClick);
      },
    };

    this._currentAnimation = gsap.to(currentImage, animationParamsCurrent);
  }

  // Инициализация изображений
  initializeImages() {
    // Очищаем контейнер перед инициализацией
    this._imageContainer.innerHTML = "";
    this._images = [];

    for (let i = 0; i < this.totalSpreads; i++) {
      const img = this.createImageElement();
      this._imageContainer.appendChild(img);
      this._images.push(img);
    }
  }

  // Функция для загрузки начального изображения
  async loadInitialImage() {
    if (this.totalSpreads === 0) return;

    this._loader.classList.remove("hidden");

    try {
      // Получаем относительный индекс для текущего спреда
      const relativeIndex = this.getRelativeIndex(this.currentSpread);

      // Загружаем изображение с текущим абсолютным индексом
      const initialImageUrl = this.getImageUrl(this.currentSpread);
      const loadedImage = await this.loadImage(initialImageUrl);

      const oldElement = this._images[relativeIndex];
      this._imageContainer.replaceChild(loadedImage, oldElement);
      this._images[relativeIndex] = loadedImage;

      // Устанавливаем активное изображение по относительному индексу
      this.setActiveImage(relativeIndex);

      // Загружаем соседние изображения
      this.loadAdjacentImages(relativeIndex, true);
    } catch (error) {
      console.error("Ошибка загрузки начального изображения:", error);
    } finally {
      this._loader.classList.add("hidden");
    }
  }

  // Функция для предзагрузки одного изображения
  async preloadImage(relativeIndex) {
    if (relativeIndex < 0 || relativeIndex >= this.totalSpreads) return;

    if (
      !this._images[relativeIndex]?.src ||
      this._images[relativeIndex].src === ""
    ) {
      try {
        // Получаем абсолютный индекс для загрузки
        const absoluteIndex = this.getAbsoluteIndex(relativeIndex);
        const imageUrl = this.getImageUrl(absoluteIndex);
        const loadedImage = await this.loadImage(imageUrl);

        const oldElement = this._images[relativeIndex];
        this._imageContainer.replaceChild(loadedImage, oldElement);
        this._images[relativeIndex] = loadedImage;

        loadedImage.className = oldElement.className;
        loadedImage.classList.value = oldElement.classList.value;
        loadedImage.style.opacity = oldElement.style.opacity;
      } catch (error) {
        console.warn(
          "Не удалось загрузить изображение",
          this.getAbsoluteIndex(relativeIndex),
          error
        );
      }
    }
  }

  // Основная функция для смены изображения по индексу
  async changeImage(targetAbsoluteIndex, animationDirection) {
    if (this._isLoading || this.totalSpreads === 0) return;

    const targetRelativeIndex =
      (this.getRelativeIndex(targetAbsoluteIndex) + this.totalSpreads) %
      this.totalSpreads;
    const currentRelativeIndex = this.getRelativeIndex(this.currentSpread);

    if (targetRelativeIndex === currentRelativeIndex) return;

    var isRightClick =
      animationDirection === ChangeImageAnimationDirection.Right;
    if (animationDirection === ChangeImageAnimationDirection.Default) {
      isRightClick =
        targetRelativeIndex > currentRelativeIndex &&
        !(
          targetRelativeIndex === 0 &&
          currentRelativeIndex === this.totalSpreads - 1
        );
    }

    const targetImage = this._images[targetRelativeIndex];
    if (!targetImage?.src || targetImage.src === "") {
      try {
        this._loader.classList.remove("hidden");
        await this.preloadImage(targetRelativeIndex);
      } finally {
        this._loader.classList.add("hidden");
      }
    }

    this._isLoading = true;

    const currentImage = this._images[currentRelativeIndex];
    const nextImage = this._images[targetRelativeIndex];

    if (!currentImage || !nextImage) {
      this._isLoading = false;
      return;
    }

    this.loadAdjacentImages(targetRelativeIndex, isRightClick);

    currentImage.classList.remove("z-0", "z-10");
    currentImage.classList.add("z-30", "animating");

    nextImage.classList.remove("z-0");
    nextImage.classList.add("z-20", "animating");

    const nextImageAnimation = gsap.to(nextImage, {
      duration: 0.2,
      opacity: 1,
      onComplete: () => {
        this.startCurrentImageAnimation(
          isRightClick,
          currentImage,
          nextImage,
          targetRelativeIndex
        );
      },
    });
  }

  async changeImageByIndex(targetAbsoluteIndex) {
    return this.changeImage(
      targetAbsoluteIndex,
      ChangeImageAnimationDirection.Default
    );
  }

  // Смена изображения по направлению
  async changeImageByDirection(isRightClick) {
    // Получаем текущий относительный индекс
    const currentRelativeIndex = this.getRelativeIndex(this.currentSpread);

    const nextRelativeIndex = isRightClick
      ? (currentRelativeIndex + 1) % this.totalSpreads
      : (currentRelativeIndex - 1 + this.totalSpreads) % this.totalSpreads;

    // Преобразуем относительный индекс обратно в абсолютный для вызова changeImageByIndex
    const nextAbsoluteIndex = this.getAbsoluteIndex(nextRelativeIndex);
    this.changeImage(
      nextAbsoluteIndex,
      isRightClick
        ? ChangeImageAnimationDirection.Right
        : ChangeImageAnimationDirection.Left
    );
  }

  // Публичные методы для управления компонентом
  next() {
    this.changeImageByDirection(true);
  }

  previous() {
    this.changeImageByDirection(false);
  }

  goTo(absoluteIndex) {
    this.changeImageByIndex(absoluteIndex);
  }

  get currentAbsoluteIndex() {
    return this.currentSpread;
  }

  get currentRelativeIndex() {
    return this.getRelativeIndex(this.currentSpread);
  }
}

if (!customElements.get("catalog-spreads-viewer")) {
  customElements.define("catalog-spreads-viewer", CatalogSpreadsViewer);
}
