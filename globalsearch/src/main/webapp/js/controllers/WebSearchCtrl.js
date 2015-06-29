'use strict';

var controllerModule = angular.module('globalsearch.controllers', ['ui.bootstrap']);

controllerModule.controller('WebSearchCtrl', ['$scope', '$rootScope', '$window', '$location', '$route', '$timeout', '$interval', '$modal', 'Search', 'Chloe', 'ErrorService', 'Map', 'SavedSearch',
    function ($scope, $rootScope, $window, $location, $route, $timeout, $interval, $modal, Search, Chloe, ErrorService, Map, SavedSearch) {

        var isFacetedQuery = false;

        $scope.initializeController = function () {
            $scope.resultObject = {};
            $scope.savedSearchStatus = {};

            if ($route.current.params.query) {
                $scope.searchText = decodeURIComponent($route.current.params.query);
                $scope.search($route.current.params.page);
            } else {
                $scope.searchText = '';
            }

            $scope.$on('search', function () {
                isFacetedQuery = true;
                $scope.search();
            });

            $scope.$on('dropHandled', function (event, ui) {
                $scope.clearSelections();
            });

            $rootScope.$on('infiniteScroll', function (event, obj) {
                $scope.$apply(function () {
                    if (obj.id == 'imageResults') {
                        $scope.search();
                    }
                });
            });
        };

        // Translates the value returned from the async search request into an object that the web app understands
        var processData = function (data, page) {
            var processedData = {};

            processedData.searchDetails = {};
            processedData.searchDetails.total_results = data.totalHits;
            processedData.searchDetails.page_results = data.pageSize;
            processedData.searchDetails.web_page = page;
            processedData.searchDetails.web_pages = Math.ceil(data.totalHits / data.pageSize);
            if (data.matchingRecords) {
                processedData.searchDetails.web_results = data.matchingRecords.length;
            }
            processedData.searchDetails.time = 1;

            processedData.webResults = [];
            processedData.mapResults = [];
            processedData.imageResults = [];
            processedData.videoResults = [];

            if (data.matchingRecords) {
                for (var i = 0; i < data.matchingRecords.length; i++) {
                    var record = data.matchingRecords[i];
                    if (!record.id) {
                        record.id = record.uri;
                    }
                    var processedRecord = {};
                    // Use !== to compare with undefined rather than !=
                    processedRecord.title = (record.title !== undefined) ? record.title : record.uri;
                    processedRecord.description = record.snippet;
                    processedRecord.links = [];
                    processedRecord.links.push(record.uri);
                    processedRecord.relevance = 0;
                    processedRecord.prefix = record.prefix;
                    processedRecord.portionMarking = record.portionMarking;
                    processedRecord.fullTextVisibility = record.fullTextVisibility;
                    // webApplicationLinks is an array of key/value pairs
                    // containing "appName" and "webUrl".
                    processedRecord.webApplicationLinks = record.webApplicationLinks;
                    processedRecord.selected = false;
                    processedRecord.viewerUrl = "viewer.html?uri=" + encodeURIComponent(record.uri);

                    var updatedDate = new Date(1900, 0, 1, 0, 0);
                    if (record.resultDate) {
                        updatedDate = new Date(record.resultDate.date.year,
                            record.resultDate.date.month - 1,
                            record.resultDate.date.day,
                            record.resultDate.time ? record.resultDate.time.hour : 0,
                            record.resultDate.time ? record.resultDate.time.minute : 0);
                    }

                    processedRecord.updated = updatedDate.toDateString();
                    processedRecord.id = record.id;

                    processedData.webResults.push(processedRecord);

                    if (record.coordinate) {
                        //"point": ["18.28125","-2.109375"]
                        processedRecord.latitude = record.coordinate.latitude;
                        processedRecord.longitude = record.coordinate.longitude;
                        processedData.mapResults.push(processedRecord);
                    }
                }
            }

            Map.initMap();
            Map.updateMap(processedData.mapResults);

            // facets
            if (data.facets && !isFacetedQuery) {
                var facets = {};
                for (var key in data.facets) {
                    var field = data.facets[key].field;
                    if (data.facets[key].facetValues.length > 0) {
                        facets[key] = [];
                        for (var index = 0; index < data.facets[key].facetValues.length; index++) {
                            facets[key].push({
                                'label': data.facets[key].facetValues[index].label,
                                'count': data.facets[key].facetValues[index].count,
                                'rawValue': data.facets[key].facetValues[index].value,
                                'field': field,
                                'selected': false
                            });
                        }
                    }
                }
                processedData.facets = facets;
            } else {
                // If this search was the result of clicking on a facet, keep the previous facet information so that we
                // can display which facets are active
                processedData.facets = $scope.resultObject.facets;
            }

            Chloe.setData(data.matchingRecords);
            Chloe.clearSelectedIDs();

            return processedData;
        };

        // This is the function that is set as the handler for some of the the "ng-click" bindings in web-result.html
        $scope.openWithViewer = function (ssr) {
            localStorage[ssr.id] = JSON.stringify(Chloe.getSSR(ssr.id));
            $window.open(ssr.viewerUrl);
        };

        $scope.openWithApp = function (ssr, url, statAction, statActionParams) {
            var stat = Stats.createStatFromTemplate();
            stat.action = statAction;
            stat.actionParams = JSON.stringify(statActionParams);
            Stats.pushStat(stat);

            if (url === ssr.viewerUrl) {
                localStorage[ssr.id] = JSON.stringify(Chloe.getSSR(ssr.id));
            }

            $window.open(url);
        };

        $scope.searchRedirect = function () {
            if (!$scope.searchText) {
                $scope.searchText = '';
            }
            $location.path('search/' + encodeURIComponent($scope.searchText));
        };

        $scope.search = function (page) {
            // performing regular search now. clear saved search status
            $scope.savedSearchStatus = {};

            var query = $scope.searchText; // $route.current.params.query;
            page = page ? page : 1;

            // apply facets
            var filters = {};
            query += ' ';
            for (var category in $scope.resultObject.facets) {
                filters[category] = [];
                for (var key in $scope.resultObject.facets[category]) {
                    if ($scope.resultObject.facets[category][key].selected) {
                        var field = $scope.resultObject.facets[category][key].field;
                        var rawValue = $scope.resultObject.facets[category][key].rawValue;
                        var filter = {};
                        if (typeof $scope.resultObject.facets[category][key].rawValue.stringValue === 'string') {
                            filter["term"] = {};
                            filter["term"][field] = rawValue.stringValue;
                            filters[category].push(filter);
                        } else if (typeof $scope.resultObject.facets[category][key].rawValue.doubleValue != 'undefined') {
                            filter["range"] = {};
                            filter["range"][field] = {"gte": rawValue.doubleValue};
                            filters[category].push(filter);
                        }
                    }
                }
            }

            query = {
                "query_string": {
                    "query": query.trim()
                }
            };

            if (isFacetedQuery) {
                query = {
                    "filtered": {
                        "query": query
                    }
                };

                query["filtered"]["filter"] = {
                    "bool": {
                        "must": []
                    }
                };

                for (var type in filters) {
                    if (filters[type].length > 0) {
                        query["filtered"]["filter"]["bool"]["must"].push({
                            "bool": {
                                "should": filters[type]
                            }
                        });
                    }
                }
            }

            Search.performSearch(query, page).
                success(function (data, status, headers, config) {
                    // this callback will be called asynchronously
                    // when the response is available
                    $scope.resultObject = processData(data, page);
                }).
                error(function (data, status, headers, config) {
                    // called asynchronously if an error occurs
                    // or server returns response with an error status.
                    var displayErrMsg = data;
                    // TODO: Ensure this case is handled everywhere.  The server-side
                    // should return JSON error objects, however it does not in all cases.
                    if (headers()["content-type"].indexOf("text/html") > -1) {
                        displayErrMsg = "An unexpected error occurred performing search!";
                    }
                    ErrorService.showError(displayErrMsg, data);
                });
        };

        // Highlight and unhighlight selected results
        $scope.select = function (ssr) {
            ssr.selected = !ssr.selected;
            if (ssr.selected) {
                Chloe.addSelectedID(ssr.id.toString());
            } else {
                Chloe.removeSelectedID(ssr.id.toString());
            }
        };

        $scope.clearSelections = function () {
            for (var i = 0; i < $scope.resultObject.webResults.length; i++) {
                $scope.resultObject.webResults[i].selected = false;
            }
            Chloe.clearSelectedIDs();
        };

        // Faceting
        $scope.toggleFacet = function (category, index) {
            var currentValue = $scope.resultObject.facets[category][index].selected;
            $scope.resultObject.facets[category][index].selected = !currentValue;
            $scope.$emit('search');
        };

        $scope.showMap = function () {
            $timeout(function () {
                var evt = document.createEvent('UIEvents');
                evt.initUIEvent('resize', true, false, window, 0);
                window.dispatchEvent(evt);
            }, 250);
        };


        // saved searches
        $scope.savedSearch = {show: false, updateCount: 0, results: []};
        var getSavedSearch = function () {
            SavedSearch.getSavedSearch(function (data) {
                $scope.savedSearch.results = data;
                updateSavedSearchUpdateCount();
            });
        };

        // run immediately and every hour
        getSavedSearch();
        var refreshSavedSearch = $interval(function () {
            getSavedSearch();
        }, 60 * 60 * 1000);

        $scope.$on('$destroy', function () {
            $interval.cancel(refreshSavedSearch);
        });

        $scope.addSavedSearch = function () {
            var item = {searchTerm: $scope.searchText};
            var title = "Add to Saved Search";

            // do not allow empty search text
            if (!$.trim(item.searchTerm)) {
                ErrorService.showError("The search text cannot be empty", "Add saved search");
                return;
            }

            // do not allow duplicate query
            if (queryAlreadySaved(item.searchTerm)) {
                ErrorService.showError("This query has been saved before", "Add saved search");
                return;
            }

            var modalInstance = $modal.open({
                templateUrl: "partials/modal-saved-search.html",
                controller: SavedSearchModalCtrl,
                resolve: {
                    item: function () {
                        return item;
                    }, title: function () {
                        return title;
                    }
                }
            });
            modalInstance.result.then(function (item) {
                var query = {
                    "query": {
                        "query_string": {
                            "query": item.searchTerm
                        }
                    }
                };
                SavedSearch.addSavedSearch({
                    name: item.name,
                    searchTerm: item.searchTerm,
                    query: query
                }, function (data) {
                    insertSavedSearch(data);
                });
            });
        };

        // sort by name
        var insertSavedSearch = function (data) {
            var len = $scope.savedSearch.results.length;
            var index = len;
            for (var i = 0; i < len; i++) {
                if ($scope.savedSearch.results[i].name > data.name) {
                    index = i;
                    break;
                }
            }
            $scope.savedSearch.results.splice(index, 0, data);
            updateSavedSearchUpdateCount();
        };

        // test if a search term already exist in saved searches
        var queryAlreadySaved = function(term) {
            var count = $scope.savedSearch.results.length;
            var index = -1;
            for (var i = 0; i < count; i++) {
                if ($scope.savedSearch.results[i].searchTerm === term) {
                    index = i;
                    break;
                }
            }
            return index >= 0;
        };

        $scope.updateSavedSearch = function(record) {
            var item = {id: record.id, name: record.name, searchTerm: record.searchTerm};
            var title = "Update Saved Search";

            var modalInstance = $modal.open({
                templateUrl: "partials/modal-saved-search.html",
                controller: SavedSearchModalCtrl,
                resolve: {
                    item: function() {
                        return item;
                    }, title: function() {
                        return title;
                    }
                }
            });
            modalInstance.result.then(function(item) {
                var record = {id: item.id, name: item.name};
                SavedSearch.updateSavedSearch(record, function(result) {
                    if (result.success) {
                        var count = $scope.savedSearch.results.length;
                        var index = -1;
                        for (var i = 0; i < count; i++) {
                            if ($scope.savedSearch.results[i].id === record.id) {
                                index = i;
                                break;
                            }
                        }
                        if (index !== -1) {
                            var newRecord = $scope.savedSearch.results[index];
                            newRecord.name = record.name;
                            // delete and re-insert to ensure order
                            $scope.savedSearch.results.splice(index, 1);
                            insertSavedSearch(newRecord);
                        }
                    }
                });
            });
        };

        $scope.deleteSavedSearch = function(record) {
            // confirmation first
            var title = "Delete Saved Search";
            var message = "Are you sure to delete this record?";

            var modalInstance = $modal.open({
                templateUrl: "partials/modal-confirm-dialog.html",
                controller: ConfirmDialogModalCtrl,
                resolve: {
                    title: function() {
                        return title;
                    }, message: function() {
                        return message;
                    }
                }
            });
            modalInstance.result.then(function() {
                SavedSearch.deleteSavedSearch(record, function(result) {
                    if (result.success) {
                        var index = $scope.savedSearch.results.indexOf(record);
                        if (index !== -1) {
                            $scope.savedSearch.results.splice(index, 1);
                            updateSavedSearchUpdateCount();
                        }
                    }
                });
            });
        };

        $scope.performSavedSearch = function (record) {
            if (record.hasUpdates) {
                SavedSearch.getSavedSearchUpdates(record, function (data) {
                    isFacetedQuery = false;
                    $scope.searchText = record.searchTerm;
                    $scope.resultObject = processData(data, 1);
                    $scope.savedSearchStatus = {active: true, name: record.name, exceedsLimit: data.exceedsLimit, lastFlushed: data.lastFlushed};

                    // inbox flushed
                    record.hasUpdates = false;
                    var count = $scope.savedSearch.results.length;
                    var index = -1;
                    for (var i = 0; i < count; i++) {
                        if ($scope.savedSearch.results[i].id === record.id) {
                            index = i;
                            break;
                        }
                    }
                    if (index !== -1) {
                        $scope.savedSearch.results[index] = record;
                        updateSavedSearchUpdateCount();
                    }
                });
            } else {
                $scope.searchText = record.searchTerm;
                $scope.searchRedirect();
            }

            $timeout(function () {
                $scope.savedSearch.show = false;
            });
        };

        var updateSavedSearchUpdateCount = function () {
            var recordCount = $scope.savedSearch.results.length;
            var updateCount = 0;
            for (var i = 0; i < recordCount; i++) {
                if ($scope.savedSearch.results[i].hasUpdates) {
                    updateCount++;
                }
            }
            $scope.savedSearch.updateCount = updateCount;
        };


        var SavedSearchModalCtrl = function ($scope, $modalInstance, $window, item, title) {
            $scope.record = item;
            $scope.title = title;

            $scope.ok = function () {
                $modalInstance.close($scope.record);
            };

            $scope.cancel = function () {
                $modalInstance.dismiss('cancel');
            };
        };

        var ConfirmDialogModalCtrl = function ($scope, $modalInstance, $window, title, message) {
            $scope.title = title;
            $scope.message = message;

            $scope.ok = function () {
                $modalInstance.close();
            };

            $scope.cancel = function () {
                $modalInstance.dismiss('cancel');
            };
        };
    }]);

// Select App Modal

var ModalCtrl = function ($scope, $modal, $window, Chloe) {
    $scope.open = function () {
        var show = true;

        if ($.cookie('preferences')) {
            var preferences = JSON.parse($.cookie('preferences'));
            if (preferences.urls[$scope.currentResult.value.prefix]) {
                $window.open(preferences.urls[$scope.currentResult.value.prefix]);
                show = false;
            }
        }

        if (show) {
            localStorage[$scope.currentResult.value.id] = JSON.stringify(Chloe.getSSR($scope.currentResult.value.id));
            var modalInstance = $modal.open({
                templateUrl: "partials/modal-select-app.html",
                controller: ModalInstanceCtrl,
                resolve: {
                    item: function () {
                        return $scope.currentResult.value;
                    }
                }
            });
        }
    };
};

/**
 *
 * This controller establishes some business logic for the modal-select-app.html partial.
 *
 */
var ModalInstanceCtrl = function ($scope, $modalInstance, $window, item) {
    $scope.openWith = {};
    $scope.rememberSelection = {};

    if ($.cookie('preferences')) {
        $scope.preferences = JSON.parse($.cookie('preferences'));
    } else {
        $scope.preferences = {};
        $scope.preferences.urls = {};
    }

    $scope.selectedResult = {
        value: item
    };

    // The event handler for when the user selects an app of the available apps to open
    // some SSR.  
    $scope.ok = function () {
        $modalInstance.close();
        if (!$scope.openWith.url) {
            $scope.openWith.url = $scope.selectedResult.value.viewerUrl;
        }
        $scope.preferences.urls[$scope.selectedResult.value.prefix] = $scope.openWith.url;

        if ($scope.rememberSelection.value) {
            $.cookie('preferences', JSON.stringify($scope.preferences), {expires: 20 * 365});
        }

        $window.open($scope.openWith.url);
    };

    $scope.cancel = function () {
        $modalInstance.dismiss('cancel');
    };
};
