# CypressSoftAssert
Вся работа построена на promised-like методах cypress. 
Также код написан на typescript, при необходимости можно самостоятельно скомпилировать ts -> js через tsc.

### Установка и правила использования:
  1. Загрузить soft-assert.ts себе в репозиторий
  2. Внутри теста импортировать класс SoftAssert из soft-assert.ts
  
  `import { SoftAssert } from "../../../support/SoftAssert";`
  
  1. Создать экземпляр класса
  
  `let softAssert = new SoftAssert()`
  
  4. Внутри before(...) добавить обработчики на события 'fail', 'test:before:run' с помощью метода .enableLog()
  
  `
  before( () => {
    softAssert.enableLog()
  })
  `
  
  5. В конце `it(...)` **обязательно** вызывать `softAssert.assertAll()`
  
### Методы:
  1. `isExist(locator: string, msg: string, isExist: boolean = true)` - проверка на существование элемента в DOM.
  2. `isVisible(locator: string, isVisible: boolean, msg: string)` - проверка на то, что элемент виден в понимании jquery в DOM. https://api.jquery.com/visible-selector/
  3. `isCount(locator: string, count: number, msg: string)` - проверка на то, что количество элементов в DOM === `count`
p.s.: `locator` - может быть `xpath` / `css selector`, определяется по наличию знака `/` в начале локатора. 
  
### Использование в тесте:
```
it ('test1', () => {

  cy.visit('/')

  softAssert.isExist('div', '1. Try exist div by css') // pass

  softAssert.isVisible('//bodyup', true ,'2. Try visible bodyup by xpath') // fail
            
  softAssert.isExist('body', '3. Try exist body by css') // pass

  softAssert.isCount('//div[@class="Tab"]', 4, '4. Try count tabs by xpath') // fail

  softAssert.assertAll()
})
```
Output log, если тест упал на `softAssert.assertAll()`:

![image](https://user-images.githubusercontent.com/78767328/206909652-e7e20dcb-1ea5-4515-80d6-a30e9e6e21b0.png)


Output log, если тест упал не из-за `softAssert.assertAll()`:

![image](https://user-images.githubusercontent.com/78767328/206909902-3876ab43-de57-4ec4-af08-2065bf54281d.png)


### Использование совместно с кастом логированием в overwrite методах:
Добавить свой интерфейс:
```
interface MyLog {
    message: string | undefined,
    soft: SoftAssert,
}
```
В commands.ts сделать overwrite нужного метода:
```
Cypress.Commands.overwrite('get', (origin, selector, options) => {
    
    if (options?.message === undefined) return origin(selector, options)
    
    Cypress.removeAllListeners('fail')
    Cypress.on('fail', (err, runnable) => {
        if (options?.soft != undefined){ 
            err = options.soft.getSoftAssertErrorInterface(err, options.message)
        }
        else{
            err.name += '. STEP: ' + options?.message
        }
        throw err
    })
    return origin(selector, options)
})
```

В command.ts в global.Cypress.Chainable:
```
get(selector: any, options?: Partial<globalThis.Cypress.Loggable & globalThis.Cypress.Timeoutable & globalThis.Cypress.Withinable & globalThis.Cypress.Shadow & MyLog> | undefined ): Chainable
```

В тесте вызывать:

`
 cy.get('someElement', {soft: softAssert, message: 'Try get some element'})
`

Output log:

![image](https://user-images.githubusercontent.com/78767328/206910431-0267c9b9-4fbc-4924-b6b7-d82c34f8e9d2.png)
