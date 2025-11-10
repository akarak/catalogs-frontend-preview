class CatalogSpreadsNavigator extends HTMLElement {
  static get observedAttributes() {
    return ["current-spread", "image-src", "total-spreads"];
  }

  constructor() {
    super();
    this._currentSpread = 0;
    this._imageSrc = "";
    this._totalSpreads = 0;
    this._imageLoaded = false;
    this._componentClasses = "";
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

  get imageSrc() {
    return this._imageSrc;
  }

  set imageSrc(value) {
    this._imageSrc = value;
    this.setAttribute("image-src", value);
    this.loadImageAsync();
  }

  get totalSpreads() {
    return this._totalSpreads;
  }

  set totalSpreads(value) {
    this._totalSpreads = parseInt(value) || 0;
    this.setAttribute("total-spreads", this._totalSpreads);
  }

  connectedCallback() {
    this._imageSrc = this.getAttribute("image-src") || "";
    this._totalSpreads = parseInt(this.getAttribute("total-spreads")) || 0;
    this._componentClasses = this.getAttribute("class") || "";

    this.render();
    this.loadImageAsync();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "current-spread" && oldValue !== newValue) {
      this._currentSpread = parseInt(newValue) || 0;
    } else if (name === "image-src" && oldValue !== newValue) {
      this._imageSrc = newValue;
      this.loadImageAsync();
    } else if (name === "total-spreads" && oldValue !== newValue) {
      this._totalSpreads = parseInt(newValue) || 0;
    }
  }

  renderLoadingState() {
    return `
                    <div class="flex justify-center items-center ${this._componentClasses} bg-gray-200">
                        <div class="text-gray-500">Загрузка изображения...</div>
                    </div>
                `;
  }

  renderErrorState() {
    return `
                    <div class="flex justify-center items-center ${this._componentClasses} bg-red-100">
                        <div class="text-red-500">Ошибка загрузки изображения</div>
                    </div>
                `;
  }

  async loadImageAsync() {
    if (!this._imageSrc) return;

    const spreadsImageContainer = this.querySelector("#spreadsImageContainer");
    if (!spreadsImageContainer) return;

    // Показываем индикатор загрузки
    spreadsImageContainer.innerHTML = this.renderLoadingState();

    try {
      // Асинхронная загрузка изображения
      await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () =>
          reject(new Error("Не удалось загрузить изображение"));
        img.src = this._imageSrc;
      });

      // После загрузки отображаем изображение
      this.renderImage();
      this._imageLoaded = true;
      this.attachEventListeners();
    } catch (error) {
      console.error("Ошибка загрузки изображения:", error);
      spreadsImageContainer.innerHTML = this.renderErrorState();
    }
  }

  render() {
    this.innerHTML = `
                    <div id="spreadsImageContainer" class="flex justify-center">
                        ${this.renderLoadingState()}
                    </div>
                `;
  }

  renderImage() {
    const spreadsImageContainer = this.querySelector("#spreadsImageContainer");

    if (spreadsImageContainer) {
      spreadsImageContainer.innerHTML = `
                        <img 
                            id="spreadsImage"
                            src="${this._imageSrc}"
                            alt="Навигатор по разворотам"
                            class="object-fill cursor-pointer ${this._componentClasses}"
                        >
                    `;
    }
  }

  attachEventListeners() {
    const image = this.querySelector("#spreadsImage");
    if (!image) return;

    const getSpreadNumber = (clientX) => {
      const rect = image.getBoundingClientRect();
      const x = clientX - rect.left;
      const spreadWidth = rect.width / this._totalSpreads;
      const spreadIndex = Math.floor(x / spreadWidth);

      return Math.min(Math.max(spreadIndex, 0), this._totalSpreads - 1) + 1;
    };

    image.addEventListener("mousemove", (event) => {
      if (this._imageLoaded) {
        this.currentSpread = getSpreadNumber(event.clientX);
        this.updateTooltipPosition(event.clientX);
      }
    });

    image.addEventListener("click", (event) => {
      if (this._imageLoaded) {
        const clickedSpread = getSpreadNumber(event.clientX);

        // Генерируем кастомное событие
        this.dispatchEvent(
          new CustomEvent("spread-click", {
            detail: { spreadNumber: clickedSpread },
            bubbles: true,
          })
        );
      }
    });
  }

  updateTooltipPosition(clientX) {
    const tooltip = document.getElementById("spreadTooltip");
    const rect = this.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();

    // Вычисляем позицию тултипа относительно компонента
    const relativeX = clientX - rect.left;
    const tooltipX = relativeX - tooltipRect.width / 2;

    // Ограничиваем позицию, чтобы тултип не выходил за границы компонента
    const minX = 0;
    const maxX = rect.width - tooltipRect.width;
    const clampedX = Math.max(minX, Math.min(tooltipX, maxX));

    tooltip.style.left = `${clampedX}px`;
  }
}

customElements.define("catalog-spreads-navigator", CatalogSpreadsNavigator);
