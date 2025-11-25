class SearchForm extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.render();
    this.attachEventListeners();
  }

  render() {
    this.innerHTML = `
      <form id="search-form">
        <div class="relative">
          <input
            type="search"
            id="search-text"
            class="block w-full py-2 pl-4 pr-10 text-md bg-white rounded-2xl placeholder:truncate focus:outline-none"
            placeholder="Поиск выставок, художников, картин, мест проведения"
            required
          />
          <button
            type="submit"
            id="search-submit"
            class="absolute end-2.5 bottom-2.5 px-4 py-2.5 cursor-pointer"
          >
            <div
              class="absolute inset-y-0 start-0 flex items-center ps-2 pointer-events-none"
            >
              <svg
                class="w-5 h-5 text-gray-500"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 20 20"
              >
                <path
                  stroke="currentColor"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"
                />
              </svg>
            </div>
          </button>
        </div>
      </form>
    `;
  }

  attachEventListeners() {
    const form = this.querySelector('#search-form');
    const submitButton = this.querySelector('#search-submit');
    const searchInput = this.querySelector('#search-text');

    const handleSearch = () => {
      const searchValue = searchInput.value;

      // Вызываем кастомное событие
      this.dispatchEvent(new CustomEvent('search', {
        detail: { query: searchValue },
        bubbles: true,
        composed: true
      }));
    };

    submitButton.addEventListener('click', handleSearch);
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      handleSearch();
    });
  }

  // Свойство для получения и установки значения поиска
  get query() {
    return this.querySelector('#search-text').value;
  }

  set query(value) {
    this.querySelector('#search-text').value = value;
  }
}

if (!customElements.get('search-form')) {
  customElements.define('search-form', SearchForm);
}