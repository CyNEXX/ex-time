
let currentOperation = null;
let newInput = true;
let characterLimitReached = false;
let historyVisible = false;
const numberPattern = /^-?([0]?\.{1}[0-9]*)$|^-?([1-9]+\.?[0-9]*)$|^(0){1}$/;
const operationsHistory = [];
let errorState = false;
let operation = null;
let operationPreview = null;
let resultSoFar = 0;
let priorityOps = ['yPercent', 'inverseX', 'xPowerY', 'sqrt'];
let memoryStorage = 0;
let activeCard = 'card-buttons'; // current active viewed card
const availableCards = ['card-buttons', 'card-operations-history', 'card-memory-history'];
const memories = []; // old memories :)

class Operation {
    #x = null;
    #y = null;
    #operationType = null; // int - type of current op
    #result = null;
    #xLabel = null; // adapted label from value plus additional sign if sqrt, 1/x etc
    #yLabel = null; // same
    #locked = true; // if locked, some operations will not be executed

    static operationTypes = [
        { name: 'none', type: -1 },
        { name: 'add', sign: '+', type: 0, pending: null, operate: (a, b) => a + b },
        { name: 'substract', sign: '-', type: 1, pending: null, operate: (a, b) => a - b },
        { name: 'multiply', sign: 'x', type: 2, pending: null, operate: (a, b) => a * b },
        { name: 'divide', sign: '÷', type: 3, pending: null, operate: (a, b) => a / b },
        { name: 'sqrt', sign: 'sqrt', type: 4, pending: null, operate: (a) => Math.sqrt(a) },
        { name: 'xPowerY', sign: '^2', type: 5, pending: null, operate: (a) => a * a },
        { name: 'inverseX', sign: '1/x', type: 6, pending: null, operate: (a) => 1 / a },
        { name: 'yPercent', sign: '%', type: 7, pending: null, operate: (a, b) => a * b / 100 }
    ];

    static getOperationByName(nameString) {
        return Operation.operationTypes.find(op => op.name == nameString);
    }

    static getLabelFromValueAndOp(number, extras = null) {
        if (extras === null)
            return number;
        else {
            switch (extras) {
                case 'sqrt': {
                    return `&radic;(${number})`;
                }
                case 'xPowerY': {
                    return `(${number})^2`;
                }
                case 'inverseX': {
                    return `1/(${number})`;

                }
                case 'yPercent': {
                    return `${number}%`;
                }
                default: return number;
            }
        }
    }

    constructor(name = null, x = null, y = null, result = null) {
        this.#operationType = name !== null ? this.constructor.operationTypes.find(op => op.name == name).type : null;
        this.#x = x;
        this.#y = y;
        this.#xLabel = x;
        this.#yLabel = y;
        this.#result = result;
    };

    getOperation() {
        return Operation.operationTypes.find(op => op.type === this.#operationType);
    }

    setOperationByName(name) {
        this.#operationType = name !== null ? Operation.getOperationByName(name).type : null;
    }

    getOperationType() {
        return this.#operationType;
    }

    getOperationName() {
        return Operation.operationTypes[this.#operationType].name;
    }

    getResult() {
        return this.#result;
    }

    setResult(result) {
        this.#result = result;
    }

    setX(x) {
        this.#x = x;
    }

    getX() {
        return this.#x;
    }

    getXLabel() {
        return this.#xLabel;
    }

    setXLabel(labelString) {
        this.#xLabel = labelString;
    }

    setY(y) {
        this.#y = y;
    }

    getY() {
        return this.#y;
    }

    getYLabel() {
        return this.#yLabel;
    }

    setYLabel(labelString) {
        this.#yLabel = labelString;
    }

    getSign() {
        return this.getOperation().sign ? this.getOperation().sign : null;
    }

    isLocked() {
        return this.#locked === true;
    }

    lock(value = true) {
        this.#locked = value;
    }

}

Operation.prototype.hasX = function () {
    return this.getX() !== null;
}

Operation.prototype.hasY = function () {
    return this.getY() !== null;
}

Operation.prototype.hasResult = function () {
    return this.getResult() !== null;
}

Operation.prototype.computeOperation = function () {
    return this.getOperation().operate(this.getX(), this.getY());
}

Operation.prototype.reset = function () {
    this.setOperationByName(null);
    this.setX(0);
    this.setY(null);
    this.setXLabel(null);
    this.setYLabel(null);
    this.setResult(null)
    this.lock();
}

Operation.prototype.toString = function () {
    let stringResult = '';
    if (this.hasX() || this.getXLabel() !== null) {
        stringResult = `${this.getXLabel() || this.getX()}`;
    }
    if (this.getOperationType() !== null) {
        stringResult += ` ${this.getSign()} `;
    }
    if (this.hasY() || this.getYLabel() !== null) {
        stringResult += this.getYLabel() || this.getY();
    }
    if (this.hasResult()) {
        stringResult += ` = ${this.getResult()}`;
    }
    return stringResult;
}

const addToHistory = (operation) => operationsHistory.splice(0, 0, operation.toString());

const formatNumber = (num) => {
    let numParts = ('' + num).split('.');
    return numParts[0].split('').reverse().reduce(((acc, value, index) => {
        return value + ((index % 3 === 0 && index !== 0) ? ',' : '') + acc;
    }), '') + (numParts[1] != null ? `.${numParts[1]}` : '');
}

const getDisplayString = () => document.querySelector('.digits-calc').innerHTML;

const getDisplayNumber = () => Number(getDisplayString().replace(/,/g, ''));

const resetDisplayString = () => document.querySelector('.digits-calc').innerHTML = '';

const getOperationSnapShot = operation => JSON.parse(JSON.stringify(operation));

const reset = (all) => {
    if (all) {
        resultSoFar = 0;
        characterLimitReached = false;
        errorState = false;
        operation.reset();
        operationPreview.reset();
        operationsHistory.length = 0;;
        operation.setX(0);
        operation.setOperationByName('add');
        operation.lock();
        operationPreview.setX(0);
        updateDisplay(0);
    }
    resetDisplayString();
    newInput = true;
    updateDisplay(getDisplayNumber());
};

const switchSign = (number) => -number;


const showCard = (cardToShow) => {
    cardToShow = activeCard == cardToShow ? 'card-buttons' : cardToShow;
    availableCards.forEach((aCard) => {
        if (aCard == cardToShow) {
            showElement(true, cardToShow);
        } else {
            showElement(false, aCard)
        }
    });
    activeCard = cardToShow;
};

const updateDisplay = (stringData) => {

    stringData = '' + stringData;
    if (stringData.length > 15) {
        stringData = stringData.substr(0, 15);
        errorState = true;
        characterLimitReached = true;
    } else {
        characterLimitReached = false;
    }
    stringData = stringData.replace(/\,/g, '');
    const validNumber = isValidNumber(stringData);
    const currentDisplay = document.querySelector('.digits-calc');
    currentDisplay.innerHTML = formatNumber(validNumber ? stringData : stringData.slice(0, -1));
    clearListElement('history-scroller');
    updateHistoryElement(operationsHistory);
    showElement(errorState, 'error');
    updatePreviewElement(operationPreview.toString() || 0);
};

const isValidNumber = (stringToTest) => numberPattern.test(stringToTest);

const showElement = (value, classNameIdentifier) => {
    const elementToDisplay = document.querySelector('.' + classNameIdentifier);
    if (value) {
        elementToDisplay.classList.remove('hidden');
    } else {
        elementToDisplay.classList.add('hidden');
    }
};

const disableButtons = (value, exceptionList) => {
    const buttonsToDisable = [...document.querySelectorAll('button')];
    BUTTON_LOOP:
    for (let i = 0; i < buttonsToDisable.length; i++) {
        const buttonToCheck = buttonsToDisable[i];
        const buttonClasses = buttonToCheck.className.split(" ");
        for (let j = 0; j < exceptionList.length; j++) {
            if (buttonClasses.indexOf(exceptionList[j]) !== -1) {
                continue BUTTON_LOOP;
            }
        }
        buttonToCheck.disabled = value;
    }

};

const clearHistoryElement = () => {
    const history = document.querySelector('.history-scroller');
    while (history.firstChild) {
        history.removeChild(history.lastChild);
    }
}

const clearListElement = (elementClassName) => {
    const history = document.querySelector(`.${elementClassName}`);
    while (history.firstChild) {
        history.removeChild(history.lastChild);
    }
}

const updateHistoryElement = (operationsHistory) => {
    const operationsHistoryContainer = document.querySelector('.history-scroller');
    operationsHistory.forEach(h => {
        const historyElement = document.createElement('div');
        historyElement.innerHTML = h;
        operationsHistoryContainer.appendChild(historyElement);
    });
}

const updateMemoryElement = (memoriesHistory) => {
    const memoriesHistoryContainer = document.querySelector('.memory-scroller');
    console.log('-->', memoriesHistoryContainer);
    memoriesHistory.forEach(m => {
        const historyElement = document.createElement('div');
        historyElement.innerHTML = m;
        memoriesHistoryContainer.appendChild(historyElement);
    });
};

const updatePreviewElement = (operation) => document.querySelector('.operation-so-far').innerHTML = operation;

const makeOperation = (operationName) => {
    /* if (errorState) return; */
    console.log(`MO: ------------------------ ${operationName}`, getOperationSnapShot(operation));
    if (priorityOps.indexOf(operationName) === -1) {
        if (!operation.isLocked() && operation.hasX()) {
            operation.setY(getDisplayNumber());
            operation.setResult(compute(operation));
            // here to update (correct format for history)
            addToHistory(operation);
            operationPreview.reset();
            operationPreview.setXLabel(Operation.getLabelFromValueAndOp(operation.getResult(), operationName));
            resultSoFar = operation.getResult();
        } else {
            operation.setX(getDisplayNumber());
            if (operation.hasResult()) {
                operationPreview.reset();
            }
            operationPreview.setY(null);
            operationPreview.setYLabel(null);
            operationPreview.setXLabel(operationPreview.getXLabel() || operation.getX());
            resultSoFar = operation.getX();
        }
        operation.setX(resultSoFar);
        operation.setY(null);
        operation.lock();
        operation.setOperationByName(operationName);
        operationPreview.setOperationByName(operationName);

    } else {
        const tempOperation = new Operation();
        if (operationName === 'yPercent') {
            tempOperation.setX(operation.getX() || 0);
            tempOperation.setY(getDisplayNumber());
            tempOperation.setOperationByName(operationName);
            tempOperation.setResult(compute(tempOperation));
        } else {
            tempOperation.setX(getDisplayNumber());
            tempOperation.setOperationByName(operationName);
            tempOperation.setResult(compute(tempOperation));
            if (operation.getX() === null) {
                console.log('B1');
                operationPreview.setXLabel(Operation.getLabelFromValueAndOp(tempOperation.getX(), operationName));
                operationPreview.setX(tempOperation.getResult());
                operation.setX(tempOperation.getResult());
                operation.lock();
            } else {
                console.log('B2');
                /*    if (operationName === 'yPercent') {
                       operationPreview.setYLabel(Operation.getLabelFromValueAndOp(tempOperation.getX(), operationName));
                   } */
                operationPreview.setYLabel(Operation.getLabelFromValueAndOp(tempOperation.getX(), operationName));
                operationPreview.setY(tempOperation.getResult());
                operation.setY(tempOperation.getResult());
            }
        }


        console.log('tempOperation', tempOperation.getResult(), operation.getX());

        resultSoFar = tempOperation.getResult();

    }
    newInput = true;
    updateDisplay(resultSoFar);
}

const equalsAction = () => {
    /* if (errorState) return; */
    if (operation.getX() !== null) {
        /* console.log(`EQ: ------------------------ ${operation.getOperation()}`, operation); */
        if (operation.getY() === null || !operation.isLocked()) {
            console.log('C1');
            operation.setY(getDisplayNumber());
            operation.setResult(compute(operation));
            if (operationPreview.getYLabel() === null) {
                operationPreview.setYLabel(getDisplayNumber());
            }
        } else {
            console.log('C2');
            operation.setX(getDisplayNumber());
            operationPreview.setXLabel(getDisplayNumber());
            operation.setResult(compute(operation));
            operationPreview.setResult(operation.getResult());
        }
        operationPreview.setResult(operation.getResult());
        addToHistory(operationPreview);
        updateDisplay(operation.getResult());
    }

    console.log('operationPreview', operationPreview.toString());
    operation.lock();
    newInput = true;
};

const backSpace = (original) => {
    updateDisplay(original.substr(0, original.length - 1));
};

const memoryStore = (value) => {
    console.log('value to store: ', value);
    memoryStorage = value;
    memories.splice(0, 0, value);
    clearListElement('memory-scroller');
    updateMemoryElement(memories);
    newInput = true;
    console.log(memories);
};

const memoryAdd = (value) => {
    console.log('memories', memories);
    if (memoryStorage === null) memoryStorage = 0;
    memoryStorage += value;
    memories[0] = memoryStorage;
    clearListElement('memory-scroller');
    updateMemoryElement(memories);
    newInput = true;
    console.log(memories);
};

const memorySubstract = (value) => {
    if (memoryStorage === null) memoryStorage = 0;
    memoryStorage -= value;
    memories[0] = memoryStorage;
    clearListElement('memory-scroller');
    updateMemoryElement(memories);
    newInput = true;
    console.log(memories);
};

const memoryClear = () => {
    memoryStorage = null;
    memories.length = 0;
    clearListElement('memory-scroller');
    updateMemoryElement(memories);
    newInput = true;
};

const memoryRecall = () => {
    newInput = true;
    updateDisplay(memoryStorage);
};

const memoryHistory = () => { };

const compute = (operation) => operation.computeOperation();

const onKeyPress = (e) => {
    if (!isNaN(+e.key)) {
        document.querySelector(`.type-num-${+e.key}`).click();
    } else if (e.key == 'Backspace') {
        document.querySelector('.type-bkspc').click();
    }
    else if (e.key == 'Enter') {
        document.querySelector('.type-op-e').click();
    }
    else if (e.key == '.') {
        document.querySelector('.type-dot').click();
    }
    else if (['+', '-', '*', '/'].indexOf(e.key) !== -1) {
        switch (e.key) {
            case '+': { document.querySelector('.type-op-a').click(); break; }
            case '-': { document.querySelector('.type-op-s').click(); break; }
            case '*': { document.querySelector('.type-op-m').click(); break; }
            case '/': { document.querySelector('.type-op-d').click(); break; }
        }
    }
};

const clickedButton = (e) => {
    e.preventDefault();
    const id = e.target.id;
    const buttonClasses = e.target.classList.value;
    if (id.includes('num') || buttonClasses.indexOf('num-') !== -1) {
        const buttonNumberValue = buttonClasses.split(' ')
            .filter((elem) => elem.includes('type-num-'))
            .map(elem => elem.charAt(9))[0];

        const currentDisplayString = getDisplayString();
        updateDisplay(newInput || currentDisplayString == '0' ? buttonNumberValue : currentDisplayString + buttonNumberValue);
        operation.lock(false);
        newInput = false;
    } else {
        const buttonType = buttonClasses.split(' ').filter((elem) => elem.includes('type-'))[0].replace('type-', '');
        switch (buttonType) {
            case 'm-c': { memoryClear(); break; }
            case 'm-r': { memoryRecall(); break; }
            case 'm-a': { memoryAdd(getDisplayNumber()); break; }
            case 'm-s': { memorySubstract(getDisplayNumber()); break; }
            case 'm-st': { memoryStore(getDisplayNumber()); break; }
            case 'm-h': { showCard('card-memory-history'); break; }
            case 'h': { showCard('card-operations-history'); break; }
            case 'op-p': { makeOperation('yPercent'); break; }
            case 'op-ce': { reset(); break; }
            case 'op-c': { reset(true); break; }
            case 'bkspc': { backSpace(getDisplayString()); break; }
            case 'op-1px': { makeOperation('inverseX'); break; }
            case 'op-xpow2': { makeOperation('xPowerY'); break; }
            case 'op-sqrt': { makeOperation('sqrt'); break; }
            case 'op-d': { makeOperation('divide'); break; }
            case 'op-m': { makeOperation('multiply'); break; }
            case 'op-s': { makeOperation('substract'); break; }
            case 'op-a': { makeOperation('add'); break; }
            case 'chs': { updateDisplay(switchSign(getDisplayNumber())); break; }
            case 'dot': { updateDisplay(getDisplayString() + '.'); break; }
            case 'op-e': { equalsAction(currentOperation); break; }
            default: { }
        }
    }
};

const initButtons = (() => {
    const allButtons = document.querySelectorAll('button');
    allButtons.forEach((button, index) => {
        button.addEventListener('click', clickedButton);
    });
    document.addEventListener('keydown', onKeyPress);
    operation = new Operation();
    operationPreview = new Operation();
    operation.setX(null);
    operation.setOperationByName('add');
    operation.lock();
    operationPreview.setX(0);
    updateDisplay(0);
})();



