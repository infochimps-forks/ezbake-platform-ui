'use strict';

angular.module('chloe.webservices', ['ngResource']).factory('Chloe', ['$rootScope', '$http', '$q', function ($rootScope, $http, $q) {
    var data = [];

    // Array of IDs of the selected SSRs
    var selectedIDs = [];

    var shared = {};
    var me = null;

    var onclickCallback = null;

    var getShared = function (scope) {
        var deferred = $q.defer();

        setTimeout(function () {
            scope.$apply(function () {
                deferred.resolve(
                    shared
                );
            });
        }, 10);

        return deferred.promise;
    };

    var getApps = function (scope) {
        var promise = $http.get("api/chloe/").success(function (data) {
        });

        return promise;
    };

    return {
        getSharedTabs: function (scope) {
            return getShared(scope);
        },
        setSharedTabs: function (data) {
            shared = data;
        },
        getMyId: function () {
            return me;
        },
        setMyId: function (id) {
            me = id;
        },
        getChloeApps: function (scope) {
            return getApps(scope);
        },
        setData: function (value) {
            data = value;
        },
        getData: function () {
            return data;
        },
        clearSelectedIDs: function () {
            selectedIDs = [];
        },
        addSelectedID: function (id) {
            selectedIDs.push(id);
        },
        removeSelectedID: function (id) {
            var index;
            for (var i = 0; i < selectedIDs.length; i++) {
                if (id === selectedIDs[i]) {
                    index = i;
                    break;
                }
            }
            if (typeof index !== "undefined") {
                selectedIDs.splice(index, 1);
            }
        },
        getSelected: function () {
            var selected = {SSRs: []};
            for (var i = 0; i < data.length; i++) {
                if ($.inArray(data[i].id.toString(), selectedIDs) > -1) {
                    selected.SSRs.push(data[i]);
                }
            }
            return selected;
        },
        isSelected: function (id) {
            return id && $.inArray(id.toString(), selectedIDs) > -1;
        },
        getSSR: function (id) {
            var ssr;
            for (var i = 0; i < data.length; i++) {
                if (data[i].id == id) {
                    ssr = data[i];
                    break;
                }
            }
            return ssr;
        },
        setOnclickCallback: function (callback) {
            onclickCallback = callback;
        },
        getOnclickCallback: function () {
            return onclickCallback;
        }
    };
}]);


angular.module('chloe.directives', []).
    directive('draggable', ['$rootScope', 'Chloe', function ($rootScope, Chloe) {
        return {
            restrict: 'A',
            link: function (scope, element, attrs) {
                element.prepend('<div class="drag-handle"></div>');
                element.draggable({
                    cursor: 'crosshair',
                    revert: true,
                    revertDuration: 0,
                    helper: 'clone',
                    scroll: false,
                    start: function (event, ui) {
                        $rootScope.$broadcast('dragStart');

                        var selected = Chloe.getSelected();
                        var id = element.find('.id').html();
                        var count = 1;
                        if (Chloe.isSelected(id)) {
                            count = selected.SSRs.length;
                        }

                        $('.ui-draggable-dragging')
                            .css("width", "200px")
                            .css("height", "25px")
                            .css("overflow", "hidden")
                            .css("margin-top", event.offsetY)
                            .css("margin-left", event.offsetX);
                        // .css("border", "1px black solid");
                        $('.ui-draggable-dragging .drag-handle')
                            .html("MOVING " + count + " RESULT" + (count > 1 ? "S" : ""))
                            .show();

                    },
                    stop: function (event, ui) {
                        $rootScope.$broadcast('dragEnd');
                    }
                });
            }
        };
    }]).
    directive('droppable', function () {
        return {
            restrict: 'A',
            link: function (scope, element, attrs) {
                var afterDrop = scope.$eval(attrs['droppable']);
                if (!afterDrop) {
                    afterDrop = function () {
                        console.log(element.html() + " has no afterDrop function.");
                    };
                }
                element.droppable({
                    hoverClass: 'hover',
                    drop: function (event, ui) {
                        afterDrop(element, ui.draggable);
                    },
                    tolerance: 'pointer'
                });
            }
        };
    }).
    directive('dragVisible', ['$rootScope', function ($rootScope) {
        return {
            restrict: 'A',
            link: function (scope, element, attrs) {
                $rootScope.$on('dragStart', function (event) {
                    element.width(element.width() + 200);
                });
                $rootScope.$on('dragEnd', function (event) {
                    element.width(element.width() - 200);
                });
            }
        };
    }]).
    directive('chloe', ['$compile', 'Chloe', function ($compile, Chloe) {
        return {
            restrict: "A",
            link: function (scope, element, attrs) {
                var appsPanel = angular.element('<div id="appsPanel" ng-controller="ChloeCtrl" ng-mouseleave="hideOnMouseLeave(); hideSubmenu();"></div>');

                var chloeContainer = angular.element('<div drag-visible id="chloe-container" ng-mouseenter="showOnMouseEnter()">' +
                '<div class="chloe-handle"><span class="global-search-icon-publish icon"></span></div>' +
                '<div ng-show="notifications.count > 0" class="notifications-count">{{notifications.count}}</div>' +
                '</div>');
                appsPanel.append(chloeContainer);

                var appHolder = angular.element('<div drag-visible class="app-holder clearfix"></div>');
                chloeContainer.append(appHolder);

                var chloeSubmenu = angular.element('<div class="chloe-submenu"></div>');
                appsPanel.append(chloeSubmenu);

                scope.chloeApps = {};
                scope.test = {};
                Chloe.getChloeApps(scope).then(function (promise) {
                    if (promise.data.error) {
                        throw promise.data.error;
                    }
                    scope.chloeApps.apps = promise.data.apps;
                    appHolder.append('<div class="header">OPEN WITH</div>');

                    scope.onclickCallback = Chloe.getOnclickCallback();

                    var apps = '<div class="app" droppable="handleDrop" ng-click="openNewApp(app.appName, app.webUrl, onclickCallback)" ' +
                        'ng-repeat="app in chloeApps.apps">' +
                        '<div class="app-id">create new</div>' +
                        '<div class="app-thumbnail"><span class="global-search-icon-browser2 icon"></span></div>' +
                        '<div class="app-text">' +
                        '<div class="app-title">{{app.appName}}</div>' +
                        '<div class="app-uri">{{app.webUrl}}</div>' +
                        '</div>' +
                        '</div>';

                    var ele = angular.element(apps);
                    appHolder.append(ele);

                    appHolder.append('<div class="header">OPENED TABS</div>');
                    appHolder.append('<hr />');

                    $compile(appsPanel)(scope);
                    element.append(appsPanel);
                });
            }
        };
    }]);


angular.module('chloe.controllers', []).controller('ChloeCtrl',
    ["$scope", "$compile", "$window", "Chloe", "ErrorService", "EzBakeWebServices",
        function ($scope, $compile, $window, Chloe, ErrorService, EzBakeWebServices) {

            $scope.showOnMouseEnter = function () {
                $("#chloe-container").css("width", "231px");
                $(".app-holder").css("width", "200px");
                // $(".app-holder").css("border-left", "1px solid #d5d5d5");
            };

            $scope.hideOnMouseLeave = function () {
                $("#chloe-container").css("width", "31px");
                $(".app-holder").css("width", "0px");
                // $(".app-holder").css("border-left", "none");
            };

            $scope.share = function (channel, appTitle, ownerId) {
                ws.send(JSON.stringify({
                    channel: channel,
                    app: appTitle,
                    status: 'sharing',
                    users: $scope.selectedUsers,
                    ownerId: ownerId !== "undefined" ? ownerId : Chloe.getMyId()
                }));
            };

            $scope.acceptShare = function (channel, appTitle, ownerId) {
                $scope.closeNotification(ownerId + "_" + channel);

                var appUri;
                var chloeApps = $("#appsPanel .app");
                for (var i = 0; i < chloeApps.length; i++) {
                    var appText = $(chloeApps[i]).find(".app-text");
                    if (appTitle === appText.find(".app-title").text()) {
                        appUri = appText.find(".app-uri").text();
                        break;
                    }
                }
                $scope.openApp(channel, appTitle, appUri, ownerId);
            };

            $scope.dismissShare = function (channel, appTitle, ownerId) {
                $scope.closeNotification(ownerId + "_" + channel);
            };

            $scope.closeNotification = function (id) {
                var notification = $("#" + id);
                if (notification.length > 0) {
                    notification.remove();
                    $scope.notifications.count--;
                }
            };

            $scope.notifications = {count: 0};
            $scope.selectedUsers = [];

            $scope.populateSubmenuWithUsers = function (event, channel, appTitle, ownerId) {
                Chloe.getSharedTabs($scope).then(function (promise) {
                    var element = $(".chloe-submenu");
                    element.empty();

                    $scope.users = [];
                    for (var user in promise) {
                        if (user !== Chloe.getMyId()) {
                            $scope.users.push({id: user, name: promise[user].name});
                        }
                    }

                    var header = angular.element('<div><h1><span class="global-search-icon-user icon"></span></h1><h2>TEAM UP WITH</h2></div>');
                    $compile(header)($scope);
                    element.append(header);

                    var userSelect = angular.element('<select chosen multiple id="userSelect" data-placeholder="Type to find users" ng-model="selectedUsers" ng-options="user.name for user in users track by user.id" />');
                    $compile(userSelect)($scope);
                    element.append(userSelect);

                    var doneButton = angular.element('<button ng-click="share(\'' + channel + '\', \'' + appTitle + '\', \'' + ownerId + '\')">DONE</button>');
                    $compile(doneButton)($scope);
                    element.append(doneButton);

                    element.css('margin-top', event.currentTarget.offsetTop - 32);
                });
            };

            $scope.showSubmenu = function () {
                var element = $(".chloe-submenu");
                element.fadeIn();
            };

            $scope.hideSubmenu = function () {
                var element = $(".chloe-submenu");
                element.fadeOut();
            };

            $scope.closeApp = function (appTitle, channel, ownerId) {
                var msg = {app: appTitle, channel: channel, status: "closing"};
                if (ownerId && ownerId !== "undefined") {
                    msg["ownerId"] = ownerId;
                }
                ws.send(JSON.stringify(msg));
            };

            var promisedConfig = EzBakeWebServices.getConfiguration();
            var ws = null;
            var chloeUri;
            var configureWSClient = promisedConfig.then(function (data) {
                    if (typeof data["web.application.chloe.wss.url"] === "string") {
                        chloeUri = data["web.application.chloe.wss.url"];
                        ws = new WebSocket(chloeUri);
                    }
                    else {
                        var errMsg = 'An error occurred retrieving Chloe configuration from the EzBake web service.';
                        ErrorService.showError(errMsg, new Error(errMsg));
                    }

                    // Web socket is closed if no data is sent within 60 seconds, so we're sending the server a ping
                    // every 55 seconds to keep the web socket alive
                    if (ws) {
                        setInterval(function () {
                            if (ws.readyState === 1) {
                                ws.send(JSON.stringify({app: "globalsearch", channel: "master", status: "keep-alive"}));
                            } else if (ws.readyState === 2 || ws.readyState === 3) {
                                // If the web socket is closed or closing, reopen it
                                var onopen = ws.onopen;
                                var onmessage = ws.onmessage;
                                var onclose = ws.onclose;
                                var onerror = ws.onerror;
                                ws = new WebSocket(chloeUri);
                                ws.open = onopen;
                                ws.onmessage = onmessage;
                                ws.onclose = onclose;
                                ws.onerror = onerror;
                            }
                        }, 55000);
                    }

                    ws.onopen = function () {
                        ws.send(JSON.stringify({app: "globalsearch", channel: "master"}));
                    };

                    ws.onmessage = function (msg) {
                        var data = JSON.parse(msg.data);

                        if (data.status && data.status === "sharing") {
                            $scope.$apply(function () {
                                $scope.notifications.count++;
                            });
                            $scope.closeNotification(data.owner.id + "_" + data.channel);
                            var notification = '<div class="notification" id="' + data.owner.id + '_' + data.channel + '">' +
                                '<label>' + data.owner.name + ' would like to share ' + data.app + ' with you</label>' +
                                '<button ng-click="acceptShare(\'' + data.channel + '\', \'' + data.app + '\', \'' + data.owner.id + '\');">Accept</button>' +
                                '<button ng-click="dismissShare(\'' + data.channel + '\', \'' + data.app + '\', \'' + data.owner.id + '\');">Dismiss</button>' +
                                '</div>';
                            var ele = angular.element(notification);
                            $compile(ele)($scope);
                            $('#chloe-container > .app-holder > .header').first().before(ele);
                        } else {
                            Chloe.setSharedTabs(data.userInfo.users);
                            Chloe.setMyId(data.userInfo.me);

                            clearApps();
                            clearUsers();

                            for (var user in data.userInfo.users) {
                                if (user === data.userInfo.me) {
                                    for (var i = 0; i < data.userInfo.users[user].appInfo.length; i++) {
                                        var appInfo = data.userInfo.users[user].appInfo[i];
                                        if (appInfo.channel !== 'master') {
                                            prependApp(appInfo.channel, appInfo.appName, appInfo.channel, appInfo.ownerId);
                                        }
                                    }
                                }
                            }
                        }
                    };
                    ws.onclose = function (e) {
                        console.log("Websocket closed: ");
                        console.log(e);
                    };

                    ws.onerror = function (e) {
                        console.log("Websocket error: ");
                        console.log(e);
                    };
                },
                function (error) {
                    ErrorService.showError("An error occurred communicating with the EzBake web service.  " +
                    'Searching will work, however you will not be able to drag results to the sidebar and "OPEN IN NEW APP".', error);
                });

            var clearApps = function () {
                $('#chloe-container > .app-holder > .header').last().nextAll().remove();
            };

            var clearUsers = function () {
                $('.user').each(function () {
                    $(this).remove();
                });
            };

            var prependApp = function (channel, appTitle, subtitle, ownerId) {
                var app = '<div class="app" droppable="handleDrop" ng-mouseenter="populateSubmenuWithUsers($event, \'' + channel + '\', \'' + appTitle + '\', \'' + ownerId + '\'); showSubmenu($event);">' +
                    '<div class="app-id">' + channel + '</div>' +
                    (ownerId ? '<div class="owner-id">' + ownerId + '</div>' : '') +
                    '<div class="app-thumbnail")"><span class="global-search-icon-browser2 icon"></span></div>' +
                    '<div class="app-text">' +
                    '<div class="app-title">' + appTitle + '</div>' +
                    '<div class="app-subtitle">' + subtitle + '</div>' +
                    '</div>' +
                    '<div class="app-close">' +
                    '<span class="icon-close icon" ng-click="closeApp(\'' + appTitle + '\', \'' + channel + '\', \'' + ownerId + '\');"></span>' +
                    '</div>' +
                    '</div>';
                var ele = angular.element(app);
                $compile(ele)($scope);
                $('#chloe-container > .app-holder > .header').last().after(ele);
            };

            $scope.openNewApp = function (appTitle, appUri, callback) {
                var channel = Math.floor(Math.random() * 1000000000 + 1);

                $scope.openApp(channel, appTitle, appUri);

                if (callback && typeof callback === 'function') {
                    callback(appTitle, channel, {SSRs: Chloe.getData()}, $scope.sendSSRs);
                }

                return channel;
            };

            $scope.openApp = function (channel, appTitle, appUri, ownerId) {
                configureWSClient.then(function (data) {
                    // Send stats to Swivl to track the # of times each app is opened
                    // Per Redmine # 5223
                    var stat = Stats.createStatFromTemplate();
                    stat.action = "Open Chloe App.";
                    stat.actionParams = JSON.stringify({app: appTitle});
                    Stats.pushStat(stat);

                    var splitter = appUri.indexOf("?") > -1 ? "&" : "?";
                    $window.open("/" + appUri + splitter + "app=" + encodeURIComponent(appTitle) +
//            $window.open("http://localhost:8080/ne5/" + splitter + "app=" + encodeURIComponent(appTitle) +
                    "&channel=" + encodeURIComponent(channel) +
                    "&chloeUri=" + encodeURIComponent(chloeUri) +
                    (ownerId ? "&ownerId=" + encodeURIComponent(ownerId) : ""));
                });
            };

            $scope.sendSSRs = function (appTitle, channel, selected, ownerId) {
                configureWSClient.then(function (data) {
                    // Send stats to Swivl to track the # of search results sent to Chloe
                    // Per Redmine # 5224
                    var stat = Stats.createStatFromTemplate();
                    stat.action = "Send SSR to Chloe";
                    stat.actionParams = JSON.stringify({countSSRsSentToChloe: selected.SSRs.length});
                    Stats.pushStat(stat);

                    var message = {app: appTitle, channel: channel, SSRs: selected.SSRs};
                    if (ownerId) {
                        message["ownerId"] = ownerId;
                    }

                    ws.send(JSON.stringify(message));
                });
            };

            $scope.handleDrop = function (event, ui) {
                $scope.$apply(function () {
                    var from = ui.find('.id').html();
                    var channel = event.find('.app-id').html();
                    var appTitle = event.find('.app-title').html();
                    var ownerId = event.find('.owner-id').html();

                    var ssr = Chloe.getSSR(from);

                    // If the dropped item is one of the selected items, assume the user intends for all of the selected
                    // items to be sent. Otherwise, only the dropped item should be sent.
                    var selected;
                    if (Chloe.isSelected(ssr.id)) {
                        selected = Chloe.getSelected();
                        if (selected.SSRs.length <= 0) {
                            selected.SSRs.push(ssr);
                        }
                    } else {
                        selected = {SSRs: []};
                        selected.SSRs.push(ssr);
                    }

                    if (channel === "create new") {
                        var appUri = event.find('.app-uri').html();
                        channel = $scope.openNewApp(appTitle, appUri);
                    }

                    $scope.sendSSRs(appTitle, channel, selected, ownerId);

                    // Tells the WebSearchCtrl that it's time to deselect any SSRs that were selected
                    $scope.$emit('dropHandled');
                });
            };
        }]);
