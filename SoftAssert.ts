/** Вся работа построена на promise-like методах cypress
 * ### Необходимые методы для построения тестов:
 * 1. Включение логирования и чистки - enableLog
 * 2. Проверка существования элемента в DOM - isExist
 * 3. Проверка на видимость элемента средствами jquery - isVisible
 * 4. Проверка количества элементов - isCount
 */
 export class SoftAssert {
  /**
   * Массив, в котором содержатся сообщения передаваемые в isExist, isVisible, isCount и т.д.
   * В этот массив попадают сообщения проваленных проверок
   */
  errorsList: string[] = [];

  /**
   * Установка обработчиков на:
   * 1. fail - дополняет текущее сообщение об ошибке
   * 2. test:before:run - чистка массива errorsList
   */
  enableLog = () => {
    Cypress.addListener("fail", (error, runnalbe) => {
      error = this.getSoftAssertionErrorInterface(error);

      throw error;
    });

    Cypress.addListener("test:before:run", (obj, mocha) => {
      this.errorsList = [];
    });
  };

  /**
   * @returns {Cypress.Chainable<SoftAssert>} экземляр этого класса в promised-like
   */
  getPromisedSoft = () => {
    return cy.then(() => this);
  };

  /**
   * Пушит msg в errorsList
   * @param {string} msg сообщение упавшей проверки
   */
  addSoftError = (msg: string) => {
    this.errorsList.push(msg);
  };

  /**
   * Формирует сообщение об ошибке, в котором содержатся все упавшие проверки из errorsList
   * @param arrayErrors массив сообщений об упавших проверок
   * @returns {string} сформированное сообщение об ошибке
   */
  formErrorMessage = (arrayErrors: string[]): string => {
    let errorMessage = "\n**SOFT ASSERTIONS ERRORS**";
    errorMessage += `\nAsserts down: ${arrayErrors.length}`;
    arrayErrors.forEach((msg) => {
      errorMessage += "\n\t" + msg;
    });
    errorMessage += "\n" + "**END SOFT ASSERTIONS ERRORS**\n";
    return errorMessage;
  };

  /**
   * Парсит элементы из DOM по локатору. Локатор может быть css/xpath.
   * Внутри метода происходит проверка - если локатор начинается со знака '/', то поиск по DOM осуществляется через document.evaluate - xpath
   * Если же локатор не начинается со знака '/', то поиск по DOM осуществляется через document.querySelectorAll - css
   * @param {string} locator Css или xpath
   * @param {Document} doc документ, в котором проводится поиск
   * @returns {Node | NodeListOf<Element>} массив всех найденных элементов
   */
  parseElementsFromDOM = (
    locator: string,
    doc: Document
  ): (Node | NodeListOf<Element> | null)[] => {
    let res: (Node | null) [] = [];
    if (locator.startsWith("/")) {
      let query = document.evaluate(
        locator,
        doc,
        null,
        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
        null
      );

      for (let i = 0, length = query.snapshotLength; i < length; ++i) {
        res.push(query.snapshotItem(i));
      }
    } else {
      let query = doc.querySelectorAll(locator);
      for (let i = 0, length = query.length; i < length; ++i) {
        if (query[i] != null){
          res.push(query[i]);
        }
      }
    }
    return res;
  };

  /**
   * Проверка на существование элемента в DOM.
   * По умолчанию: если элемент НЕ найден, то сообщение проверки добавляется в errorsList
   * @param {string} locator css/xpath локатор
   * @param {string} msg сообщение проверки
   * @param {boolean} isExist по умолчанию true. true - элемент должен быть внутри DOM, false - элемента НЕ должно быть внутри DOM
   */
  isExist = (locator: string, msg: string, isExist: boolean = true) => {
    cy.document().then((doc) => {
      const elements = this.parseElementsFromDOM(locator, doc);
      if (elements.length === 0 && isExist) {
        this.addSoftError(msg);
        return;
      }
    });
  };

  /**
   * Проверка на кол-во элементов в DOM.
   * Если кол-во найденных элементов != count, то сообщение проверки добавляется в errorsList
   * @param {string} locator css/xpath локатор
   * @param {number} count количество элементов. которые должны быть в DOM
   * @param {string} msg
   */
  isCount = (locator: string, count: number, msg: string) => {
    cy.document().then((doc) => {
      const elements = this.parseElementsFromDOM(locator, doc);
      if (elements.length != count) {
        this.addSoftError(msg);
        return;
      }
    });
  };

  /**
   * Проверка на видимость элементов средствами jquery
   * По умолчанию: если элемент НЕ :visible внутри DOM, то сообщение проверки добавляется в errorsList
   * - Что означает ':visible' / ':not(:visible)' - https://api.jquery.com/visible-selector/
   * @param locator css/xpath локатор
   * @param isVisible true - ':visible', false -  ':not(:visible);'
   * @param msg сообщения проверка
   */
  isVisible = (locator: string, isVisible: boolean, msg: string) => {
    cy.document().then((doc) => {
      let elements = this.parseElementsFromDOM(locator, doc);

      if (elements.length === 0) {
        this.addSoftError(msg);
        return;
      }

      const visibleQuery = isVisible ? ":visible" : ":not(:visible)";
      const jqElements = Cypress.$(elements);
      cy.wrap(jqElements).then(($elem) => {
        if (!$elem.is(visibleQuery)) {
          this.addSoftError(msg);
        }
      });
    });
  };

  /**
   * Обязятально вызывать в конце it(...).
   * Если есть сообщения проверок в errorsList, то вызывается ошибка SoftAssertionError.
   */
  assertAll = () => {
    this.getPromisedSoft().then((thisPromisedSoft) => {
      if (thisPromisedSoft.errorsList.length === 0) {
        return;
      }

      throw new SoftAssertionError();
    });
  };

  /**
   * @returns {string} сообщение об ошибке, которые включает в себя все упавшие проверки из errorsList
   */
  getSoftAssertionsErrorMessage = (): string | undefined => {
    if (this.errorsList.length != 0) {
      return this.formErrorMessage(this.errorsList);
    }
    return "";
  };

  /**
   * Дополняет сообщение ошибки, если тип ошибке не "SoftAssertionError".
   * @param {Cypress.CypressError} error внешняя ошибка
   * @param {string} msg необязательно. Если метод вызывается не из assertAll
   * @returns {Cypress.CypressError} дополненная ошибка
   */
  getSoftAssertionErrorInterface = (
    error: Cypress.CypressError,
    msg?: string
  ): Cypress.CypressError => {
    if (msg) {
      error.name += ". STEP: " + msg;
    }

    if (error instanceof SoftAssertionError) {
      error.name = SoftAssertionError.name;
    }

    error.message += this.getSoftAssertionsErrorMessage();

    return error;
  };
}

class SoftAssertionError extends Error {
  constructor(msg?: string | undefined) {
    super(msg);
  }
}