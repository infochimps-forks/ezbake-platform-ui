'use strict';

/* jasmine specs for filters go here */

describe('filter', function () {
    beforeEach(module('social.filters'));
    beforeEach(module('social.services'));
    it('should format Just Now time', inject(function (howOldFilter) {
        var currentDate = new Date();
        currentDate.setSeconds(currentDate.getSeconds() - 1);
        expect(howOldFilter(currentDate.toGMTString())).toEqual("Just Now");
    }));

    it('should format time using Minutes', inject(function (howOldFilter) {
        var currentDate = new Date();
        currentDate.setMinutes(currentDate.getMinutes() - 10);
        expect(howOldFilter(currentDate.toGMTString())).toEqual("10m");
    }));

    it('should format time using Hours', inject(function (howOldFilter) {
        var currentDate = new Date();
        currentDate.setHours(currentDate.getHours() - 10);
        expect(howOldFilter(currentDate.toGMTString())).toEqual("10h");
    }));

    it('should format time using day and month', inject(function (howOldFilter) {
        //This is the format currently returned by the eChirp service
        expect(howOldFilter("Sun Apr 28 20:17:14 +0000 2013")).toEqual("28 Apr 13");
    }));

    it('should format time using day and month -Non GMT', inject(function (howOldFilter) {
        //This is the format currently returned by the eChirp service
        expect(howOldFilter("Sun Apr 28 20:17:14 -4000 2013")).toEqual("28 Apr 13");
    }))

    it('should format time using day and month +Non GMT', inject(function (howOldFilter) {
        //This is the format currently returned by the eChirp service
        expect(howOldFilter("Sun Apr 28 20:17:14 +4000 2013")).toEqual("28 Apr 13");
    }))
});

