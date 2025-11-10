class CatalogSpreadsViewer extends HTMLElement {
  static get observedAttributes() {
    return ["current-spread", "base-path", "total-spreads"];
  }

  constructor() {
    super();

    // Константы по умолчанию
    this.FIRST_INDEX = 1;

    // Состояние компонента
    this._currentSpread = 0;
    this._images = [];
    this._isLoading = false;
    this._currentAnimation = null;
    this._componentClasses = "";

    // Привязываем контекст методов
    this.handleClick = this.handleClick.bind(this);
    this.handleKeydown = this.handleKeydown.bind(this);

    this.attachShadow({ mode: "open" });
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

  get currentSpread() {
    return this._currentSpread;
  }

  set currentSpread(value) {
    this._currentSpread = value;
    this.setAttribute("current-spread", value);
    this.dispatchEvent(
      new CustomEvent("current-spread-change", {
        detail: { spreadNumber: value },
      })
    );
  }

  connectedCallback() {
    this._componentClasses = this.getAttribute("class") || "";

    this.render();
    this.initializeComponents();
    this.loadInitialImage();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      // Переинициализируем компонент при изменении важных атрибутов
      if (this.isConnected) {
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
    this.shadowRoot.innerHTML = `
                    <div class="${this._componentClasses}">
                        <div id="imageContainer" class="flex flex-col items-center justify-center pointer-events-none bg-yellow-200/50">
                        </div>

                        <div id="loader" class="absolute w-12 h-12 border-4 border-gray-400 rounded-full border-t-gray-200 animate-spin z-40 hidden"></div>

                        <div id="clickLayer" class="absolute w-full h-full flex z-50" tabindex="-1">
                            <div class="w-1/2 left-0 cursor-pointer bg-red-500/50" data-direction="left"></div>
                            <div class="w-1/2 right-0 cursor-pointer bg-green-500/50" data-direction="right"></div>
                        </div>
                    </div>
                `;
  }

  initializeComponents() {
    this._imageContainer = this.shadowRoot.getElementById("imageContainer");
    this._clickLayer = this.shadowRoot.getElementById("clickLayer");
    this._loader = this.shadowRoot.getElementById("loader");

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
    return this.FIRST_INDEX + relativeIndex;
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
  setActiveImage(index) {
    this._images.forEach((img) => {
      img.classList.remove("active", "animating");
      img.style.opacity = "0";
      img.style.transform = "translateX(0) scale(1) rotate(0deg)";
      img.classList.remove("z-10", "z-20", "z-30");
      img.classList.add("z-0");
    });

    if (this._images[index]) {
      this._images[index].classList.add("active");
      this._images[index].style.opacity = "1";
      this._images[index].classList.remove("z-0");
      this._images[index].classList.add("z-10");
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
  startCurrentImageAnimation(isRightClick, currentImage, nextImage, newIndex) {
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
        this.currentSpread = newIndex;
        this.setActiveImage(this.currentSpread);

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

        this.loadAdjacentImages(this.currentSpread, isRightClick);
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
    this._loader.classList.remove("hidden");

    try {
      const firstImageUrl = this.getImageUrl(this.getAbsoluteIndex(0));
      const loadedImage = await this.loadImage(firstImageUrl);

      const oldElement = this._images[0];
      this._imageContainer.replaceChild(loadedImage, oldElement);
      this._images[0] = loadedImage;

      this.currentSpread = 0;
      this.setActiveImage(0);
      this.loadAdjacentImages(0, true);
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
        const imageUrl = this.getImageUrl(this.getAbsoluteIndex(relativeIndex));
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
  async changeImageByIndex(targetIndex) {
    if (this._isLoading) return;

    const normalizedIndex =
      (targetIndex + this.totalSpreads) % this.totalSpreads;
    if (normalizedIndex === this.currentSpread) return;

    const isRightClick =
      (normalizedIndex > this.currentSpread &&
        normalizedIndex - this.currentSpread <= this.totalSpreads / 2) ||
      (normalizedIndex < this.currentSpread &&
        this.currentSpread - normalizedIndex > this.totalSpreads / 2);

    const targetImage = this._images[normalizedIndex];
    if (!targetImage?.src || targetImage.src === "") {
      try {
        this._loader.classList.remove("hidden");
        await this.preloadImage(normalizedIndex);
      } finally {
        this._loader.classList.add("hidden");
      }
    }

    this._isLoading = true;

    const oldIndex = this.currentSpread;
    const currentImage = this._images[oldIndex];
    const nextImage = this._images[normalizedIndex];

    if (!currentImage || !nextImage) {
      this._isLoading = false;
      return;
    }

    this.loadAdjacentImages(normalizedIndex, isRightClick);

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
          normalizedIndex
        );
      },
    });
  }

  // Смена изображения по направлению
  async changeImageByDirection(isRightClick) {
    const nextIndex = isRightClick
      ? (this.currentSpread + 1) % this.totalSpreads
      : (this.currentSpread - 1 + this.totalSpreads) % this.totalSpreads;

    this.changeImageByIndex(nextIndex);
  }

  // Публичные методы для управления компонентом
  next() {
    this.changeImageByDirection(true);
  }

  previous() {
    this.changeImageByDirection(false);
  }

  goTo(index) {
    this.changeImageByIndex(index);
  }

  get currentAbsoluteIndex() {
    return this.getAbsoluteIndex(this.currentSpread);
  }
}
