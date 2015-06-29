'use strict';

/* Filters */

angular.module('globalsearch.filters', []).
    filter('filter', function () {
        return function () {
        };
    }).
    filter('startAt', function () {
        return function (input, start) {
            if (input) {
                start = +start;
                return input.slice(start);
            }
        };
    }).
    filter('characters', function () {
        return function (input, max) {
            if (isNaN(max)) return input;
            if (max <= 0) return '';
            if (input && input.length > max) {
                input = input.substring(0, max);

                var lastSpace = input.lastIndexOf(' ');
                if (lastSpace !== -1) {
                    input = input.substr(0, lastSpace);
                }

                input = input + '...';
            }
            return input;
        };
    })
    .filter('words', function () {
        return function (input, words) {
            if (isNaN(words)) return input;
            if (words <= 0) return '';
            if (input) {
                var inputWords = input.split(/\s+/);
                if (inputWords.length > words) {
                    input = inputWords.slice(0, words).join(' ') + '...';
                }
            }
            return input;
        };
    });