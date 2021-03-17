'use strict';

const Spinner = require('cli-spinner').Spinner

function isObject(o) {
    return Object.prototype.toString.call(o) === '[object Object]';
}

function spinnerStart(msg = 'loading..', loadingString = '|/-\\') {
    const spinner = new Spinner(msg + ' %s');
    spinner.setSpinnerString(loadingString);
    spinner.start();
    return spinner;
}

function sleep(timeout) {
    return new Promise(resolve => setTimeout(resolve, timeout))
}

module.exports = {
    isObject,
    spinnerStart,
    sleep
};