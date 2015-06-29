'use strict';

/* jasmine specs for controllers go here */

describe('Social controllers', function () {
    beforeEach(module('social.controllers'));
    beforeEach(module('social.services'));
    beforeEach(module('social.webservices'));
    beforeEach(module('social.fakeREST'));

    beforeEach(function () {
        this.addMatchers({
            toEqualData: function (expected) {
                return angular.equals(this.actual, expected);
            }
        });
    });

    var scope, ctrl;
    describe('ChirpController', function () {
        beforeEach(inject(function ($rootScope, $controller) {
            scope = $rootScope.$new();
            ctrl = $controller("ChirpCtrl", {$scope: scope});
        }));

        it('pull tags from text', inject(function () {
            var arr = scope.getTags("My test #string has #two tags");
            expect(arr.length).toBe(2);
            expect(arr).toEqualData(["#string", "#two"]);
        }));
    });

    describe('LinkAnalysisController', function () {
        var LAMock;
        beforeEach(inject(function ($rootScope, $controller, LAHelper) {
                scope = $rootScope.$new();
                var nodes = ["northkorea", "southkorea", "china", "india", "jordan", "mali", "france"];

                LAMock = {
                    refreshCalled: false,
                    getChirpGraph: function () {
                        return {
                            selection: function () {
                                return ["china", "barry"]
                            },
                            each: function (filter, callback) {
                                for (var i = 0; i < nodes.length; i++) callback({'id': nodes[i]});
                            },
                            combo: function () {
                                return {
                                    isCombo: function () {
                                        return false;
                                    }
                                }
                            },
                            zoom: function () {
                            }
                        };
                    },
                    setChirpGraph: function (graph) {
                    },
                    buildGraphData: function (chirps, useExistingCounts) {
                        return LAHelper.buildGraphData(chirps, false);
                    },
                    resizeResults: function () {
                    },
                    refreshGraph: function (options, graphData, clear, callback) {
                        this.refreshCalled = true;
                        if (callback) {
                            callback();
                        }
                    }
                }

                ctrl = $controller("LinkAnalysisCtrl", {$scope: scope, LAHelper: LAMock});
            })
        );

        it('Add new hashtags should refresh the graph', inject(function ($timeout) {
            expect(scope.currentHashtags.length).toBe(0);
            var timeout = $timeout;
            scope.graphNewHashTag = 'barry';
            scope.addNewHashtag();
            timeout(function () {
                expect(LAMock.refreshCalled).toBe(true);
            });
            timeout.flush();
        }));

        it('Add existing hashtags should not refresh the graph', inject(function () {
            expect(scope.currentHashtags.length).toBe(0);
            scope.graphNewHashTag = 'india';
            scope.addNewHashtag();
            expect(LAMock.refreshCalled).toBe(false);
        }));

        it('Add pins', inject(function (PinService) {
            var currentPins = jQuery.extend([], PinService.getPins());
            for (var i = 0; i < currentPins.length; i++) {
                PinService.deletePin(currentPins[i]);
            }
            scope.pin();
            //Make sure our 2 selected nodes have been pinned
            expect(PinService.getPins().length).toBe(2);

            //Now add the pins back
            for (var i = 0; i < currentPins.length; i++) {
                PinService.addPin(currentPins[i]);
            }
        }));

        it('Resetting graph should clear existing hashtags and chirps', inject(function () {
            expect(LAMock.refreshCalled).toBe(false);
            scope.currentHashtags = ["#barry", "#don", "#wes", '#jason'];
            scope.currentChirps = ["testing reset graph", "testing #barry", "testing #don", "testing #wes", 'testing #jason'];
            expect(scope.currentHashtags.length).toBe(4);
            expect(scope.currentChirps.length).toBe(5);
            scope.resetGraph();
            expect(scope.currentHashtags.length).toBe(0);
            expect(scope.currentChirps.length).toBe(0);
            expect(LAMock.refreshCalled).toBe(true);
        }));

    })

    describe('HomeCtrl', function () {
        beforeEach(inject(function ($rootScope, $controller) {
            scope = $rootScope.$new();
            ctrl = $controller("HomeCtrl", {$scope: scope});
            scope.initializeController();
            scope.chirp.text = "test";
            scope.$digest();
        }));

        it('post classified chirp', inject(function () {
            scope.customClassification.classification = "classification";
            // Test a post success condition does not clear scope.chirp.text
            scope.postChirp();
            //expect(scope.chirp.text).toBe("");

            // Test a post failure condition does not clear scope.chirp.text
            var text = "no-classification";
            scope.chirp.text = text;
            scope.$digest();
            scope.postChirp("")
            //expect(scope.chirp.text).toBe(text);
        }));

        it('post custom classified chirp', inject(function () {
            // Test a post success condition does not clear scope.chirp.text
            scope.postChirp("classification", "FOUO", "USA")
            //expect(scope.chirp.text).toBe("");

            // Test a post failure condition does not clear scope.chirp.text
            var text = "no-classification";
            scope.chirp.text = text;
            scope.$digest();
            scope.postChirp("", "", "")
            //expect(scope.chirp.text).toBe(text);
        }));
    })

    describe('rechirp tests', function () {
        beforeEach(inject(function ($rootScope, $controller) {
            scope = $rootScope.$new();
            ctrl = $controller('HomeCtrl', {$scope: scope});
            scope.user = {'screen_name': 'currence.yusir'};
            scope.initializeController();
            scope.$digest();
        }));
        it('test a minimal reponse', function () {
            scope.chirpReply({id: 0, user: {'screen_name': 'mctee'}, text: 'please respond'});
            expect(scope.chirp.text).toBe('@mctee ');
            expect(scope.chirp.status_id).toBe(0);
        });
        it('test an exchange', function () {
            scope.chirpReply({id: 1, user: {'screen_name': 'mctee'}, text: '@currence.yusir please respond'});
            expect(scope.chirp.text).toBe('@mctee ');
            expect(scope.chirp.status_id).toBe(1);
        });
        it('test multi-party exchange', function () {
            scope.chirpReply({
                id: 2,
                user: {'screen_name': 'mctee'},
                text: '@currence.yusir @user1 @user2 please respond'
            });
            expect(scope.chirp.text).toBe('@mctee @user1 @user2 ');
            expect(scope.chirp.status_id).toBe(2);
        });
        it('test self-response', function () {
            scope.chirpReply({id: 3, user: {'screen_name': 'currence.yusir'}, text: 'please respond'});
            expect(scope.chirp.text).toBe('');
            expect(scope.chirp.status_id).toBe(undefined);
        });
        it('test regex for parsing user names', function () {
            scope.chirpReply({
                id: 4,
                user: {'screen_name': 'currence.yusir'},
                text: '@user1 @user2 test@user3 please respond @user4'
            });
            expect(scope.chirp.text).toBe('@user1 @user2 @user4 ');
            expect(scope.chirp.status_id).toBe(4);
            scope.chirpReply({id: 5, user: {'screen_name': 'mctee'}, text: '@user5'});
            expect(scope.chirp.text).toBe('@mctee @user5 ');
            expect(scope.chirp.status_id).toBe(5);
        });
    });
});