class LogoIndex extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.innerHTML = `
      <div id="header-title">
        <p class="text-4xl font-bold text-left tracking-wider uppercase">
          Сборник каталогов
          <br />художественных<br />выставок
        </p>
        <hr class="h-1 my-3 bg-black border-0" />
        <p class="text-md font-semibold leading-4.5 text-left uppercase text-white">
          The collection of catalogs
          <br />artistic exhibitions<br />Russia-USSR XIX-XX century
        </p>
      </div>
    `;
  }
}

customElements.define('logo-index', LogoIndex);