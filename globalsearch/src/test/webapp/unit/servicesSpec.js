'use strict';

/* jasmine specs for services go here */

describe('services', function () {
    beforeEach(module('social.services'));
    beforeEach(module('social.webservices'));
    beforeEach(module('social.fakeREST'));

    describe('CurrentState services tests', function () {
        it('setSearchFilter should update chirps', inject(function (CurrentState, $timeout) {
            CurrentState.setSearchFilter("mali");
            //setting the chirps is async, so we need to let the digest process before checking the value
            //in the real controller, this is done through a watch
            $timeout(function () {
                expect(CurrentState.getUserChirps().length).toBe(1);
            });
            CurrentState.setSearchFilter("china");
            $timeout(function () {
                expect(CurrentState.getUserChirps().length).toBe(2);
            });
        }));

        it('getSearchFilter should return what was set', inject(function (CurrentState) {
            CurrentState.setSearchFilter("test");
            expect(CurrentState.getSearchFilter()).toBe("test");
        }));

        it('loadAllIfEmpty should load timeline the chirps if null', inject(function (CurrentState, $rootScope, $timeout) {
            CurrentState.setUserChirps(null);
            CurrentState.loadAllIfEmpty();
            $rootScope.$apply();
            $timeout(function () {
                expect(CurrentState.getUserChirps().length).toBe(1);
            });
        }));

        it('loadAllIfEmpty should load all the chirps if null and no friends or groups', inject(function (CurrentState, User, $q, $rootScope) {
            CurrentState.setUserChirps(null);
            User.getUser(1, function (data) {
                data.friends_count = 0;
                data.groups = [];
                User.getCurrentUser = function () {
                    var deferred = $q.defer();
                    var currentUser = deferred.promise;
                    deferred.resolve(data);
                    return currentUser;
                };
                CurrentState.loadAllIfEmpty();
                $rootScope.$apply();
                expect(CurrentState.getUserChirps().length).toBe(2);
            })
        }));

        it('loadAllIfEmpty should load timeline if no friends but has groups', inject(function (CurrentState, User, $q, $rootScope) {
            CurrentState.setUserChirps(null);
            User.getUser(1, function (data) {
                data.friends_count = 0;
                data.groups = ["My Group"];
                User.getCurrentUser = function () {
                    var deferred = $q.defer();
                    var currentUser = deferred.promise;
                    deferred.resolve(data);
                    return currentUser;
                };
                CurrentState.loadAllIfEmpty();
                $rootScope.$apply();
                expect(CurrentState.getUserChirps().length).toBe(1);
            })
        }));

        it('loadAllIfEmpty should load timeline if friends but no groups', inject(function (CurrentState, User, $q, $rootScope) {
            CurrentState.setUserChirps(null);
            User.getUser(1, function (data) {
                data.friends_count = 1;
                data.groups = [];
                User.getCurrentUser = function () {
                    var deferred = $q.defer();
                    var currentUser = deferred.promise;
                    deferred.resolve(data);
                    return currentUser;
                };
                CurrentState.loadAllIfEmpty();
                $rootScope.$apply();
                expect(CurrentState.getUserChirps().length).toBe(1);
            })
        }));

        it('loadAllIfEmpty should do nothing after chirps have already been loaded', inject(function (CurrentState) {
            CurrentState.setUserChirps([]);
            CurrentState.loadAllIfEmpty();
            expect(CurrentState.getUserChirps().length).toBe(0);
        }));
    });

    describe('ChirpHelper service tests', function () {
        it('recent chirps returns nothing', inject(function (ChirpHelper) {
            var recent = ChirpHelper.recentChirps([{id: 2, created_at: "Fri May 24 13:14:12 2011"}, {
                id: 1,
                created_at: "Fri May 24 13:10:12 2011"
            }, {id: 3, created_at: "Fri May 24 16:15:12 2011"}], 2);
            expect(recent.length).toBe(0);
        }));

        it('recent chirps returns some', inject(function (ChirpHelper) {
            var currentDate = new Date().toGMTString();
            var recent = ChirpHelper.recentChirps([{id: 2, created_at: currentDate}, {
                id: 1,
                created_at: "Fri May 24 13:10:12 2011"
            }, {id: 3, created_at: "Fri May 24 16:15:12 2011"}], 2);
            expect(recent.length).toBe(1);
        }));

        it('merging two empty lists', inject(function (ChirpHelper) {
            var mergedList = ChirpHelper.mergeChirps([], []);
            expect(mergedList.length).toBe(0);
        }));

        it('merging left list with an empty', inject(function (ChirpHelper) {
            var mergedList = ChirpHelper.mergeChirps([{created_at: "Fri May 24 13:17:12 2013"}, {created_at: "Fri May 24 13:14:12 2013"}], []);
            expect(mergedList.length).toBe(2);
        }));

        it('merging right list with an empty', inject(function (ChirpHelper) {
            var mergedList = ChirpHelper.mergeChirps([], [{created_at: "Fri May 24 13:17:12 2013"}, {created_at: "Fri May 24 13:14:12 2013"}]);
            expect(mergedList.length).toBe(2);
        }));

        it('merging equal size lists', inject(function (ChirpHelper) {
            var mergedList = ChirpHelper.mergeChirps([{id: 1, created_at: "Fri May 24 13:17:12 2013"}, {
                id: 4,
                created_at: "Fri May 24 13:14:12 2013"
            }], [{id: 2, created_at: "Fri May 24 13:16:12 2013"}, {id: 3, created_at: "Fri May 24 13:15:12 2013"}]);
            expect(mergedList.length).toBe(4);
            var expectedIndex = 1;
            for (var i = 0; i < mergedList.length; i++) {
                expect(mergedList[i].id).toBe(expectedIndex);
                ++expectedIndex;
            }
        }));

        it('merging bigger left list', inject(function (ChirpHelper) {
            var mergedList = ChirpHelper.mergeChirps([{id: 2, created_at: "Fri May 24 13:17:12 2013"}, {
                id: 3,
                created_at: "Fri May 24 13:14:12 2013"
            }], [{id: 1, created_at: "Fri May 24 13:18:12 2013"}]);
            expect(mergedList.length).toBe(3);
            var expectedIndex = 1;
            for (var i = 0; i < mergedList.length; i++) {
                expect(mergedList[i].id).toBe(expectedIndex);
                ++expectedIndex;
            }
        }));

        it('merging bigger right list', inject(function (ChirpHelper) {
            var mergedList = ChirpHelper.mergeChirps([{id: 2, created_at: "Fri May 24 13:14:12 2013"}], [{
                id: 1,
                created_at: "Fri May 24 16:15:12 2013"
            }, {id: 3, created_at: "Fri May 24 13:10:12 2013"}]);
            expect(mergedList.length).toBe(3);
            var expectedIndex = 1;
            for (var i = 0; i < mergedList.length; i++) {
                expect(mergedList[i].id).toBe(expectedIndex);
                ++expectedIndex;
            }
        }));

        it('pull groups from text', inject(function (ChirpHelper) {
            var matches = ChirpHelper.pullGroupsFromText('my !group test and !Another', true);
            expect(matches.length).toBe(2);
            expect(matches[0]).toBe('!group');
            expect(matches[1]).toBe('!another');
        }));

        it('pull random from text', inject(function (ChirpHelper) {
            var matches = ChirpHelper.pullFromText('my @group test and @Another', true, '@');
            expect(matches.length).toBe(2);
            expect(matches[0]).toBe('@group');
            expect(matches[1]).toBe('@another');
        }));
    });
});
