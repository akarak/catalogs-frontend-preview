class LogoSmall extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.innerHTML = `
      <div id="header-title">
        <a href="index.html" class="float-left">
          <p class="text-md pr-4 font-semibold leading-4.5 uppercase text-black">
            Сборник каталогов
            <br />художественных<br />выставок
          </p>
          <hr class="h-0.5 my-3 bg-black border-0" />
        </a>
        <a href="index.html" class="float-left">
          <p class="text-md font-semibold leading-4.5 uppercase text-white">
            The collection of catalogs
            <br />artistic exhibitions<br />Russia-USSR XIX-XX century
          </p>
          <hr class="h-0.5 my-3 bg-white border-0" />
        </a>
      </div>
    `;
  }
}

customElements.define('logo-small', LogoSmall);