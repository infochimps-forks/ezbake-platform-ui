wh.app.config(['$stateProvider', '$urlRouterProvider',
   function($stateProvider, $urlRouterProvider) {
   
      $urlRouterProvider.otherwise('/entries');
      
      $stateProvider.
         state('forbidden', {
            url: '/forbidden',
            templateUrl: 'forbidden.html'
         }).
         state('error', {
            url: '/error',
            templateUrl: 'partials/error.html',
            controller: 'ErrorController'
         }).
         state('gs', {
            url: '/gs?app&channel&chloeUri',
            templateUrl: 'partials/purge.html',
            controller: 'PurgeController'
         }).
         state('entry', {
            url: '/entries/{uri}',
            templateUrl: 'partials/entry.html',
            controller: 'EntryController'
         }).
         state('entry-search', {
            url: '/entries',
            templateUrl: 'partials/entry-search.html',
            controller: 'EntrySearchController'
         }).
         state('purge-status', {
            url: '/purge/status/{purgeId}',
            templateUrl: 'partials/purge-status.html',
            controller: 'PurgeStatusController'
         }).
         state('purge-status-search', {
            url: '/purge/status',
            templateUrl: 'partials/purge-status-search.html',
            controller: 'PurgeStatusSearchController'
         }).
         state('purge-initiated', {
            url: '/purge-initiated',
            templateUrl: 'partials/purge-submitted.html',
            controller: 'PurgeInitiatedController'
         }).
         state('view-Purges', {
              url: '/purge/purgesListing',
              templateUrl: 'partials/getPurges.html',
              controller: 'GetPurgesController'
         }).
          state('view-Paged-Purges', {
              url: '/purge/purgesListing/{pageNumber}',
              templateUrl: 'partials/getPurges.html',
              controller: 'GetPurgesController'
          });
      }
   ]
);

wh.app.config(['$provide', '$httpProvider', 
   function ($provide, $httpProvider) {
   
      $provide.factory('interceptor', ['$q', '$location', function ($q, $location) {
         return {
            responseError: function (responseObj) {
               if (responseObj.status == 403) {
                     window.location = "forbidden.html";
                     //$location.path('/forbidden');
                     return $q.reject(responseObj);
               }
               return $q.reject(responseObj);
            }
         };
      }]);
   
      $httpProvider.interceptors.push('interceptor');

   }]
);

wh.isInTestMode = false;
wh.app.run(['$rootScope', '$location', '$httpBackend',
   function($rootScope, $location, $httpBackend) {
   
      $httpBackend.whenGET(/^partials\/.+/).passThrough();
      $httpBackend.whenGET(/^forbidden.html/).passThrough();
      
//      $rootScope.$on('$stateChangeStart', function (ev, to, toParams, from, fromParams) {
//         if (!AuthorizationService.isAuthorized()) {
//           ev.preventDefault();
//           $location.path('/forbidden');
//         }
//       });
      
      if (wh.isInTestMode) {
         $httpBackend
            .whenGET(/^api\/ping/)
            .respond({
               status : 403
            });
         $httpBackend
            .whenGET(/^api\/entries\/.+/)
            .respond({
               uri : 'HUMANGEO://20140910/1',
               errorFetchingMetadata : false,
               versions : [
                  { classification : 'TS', timestamp : '1407453827263', securityId : '1000230A' },
                  { classification : 'U', timestamp : '1407453827263', securityId : '1000230A' }
               ],
               metadata : { 
                  'ups' : 'false',
                  'pii' : 'true', 
                  'color' : 'blue'
               }
            });
         $httpBackend
            .whenPUT(/^api\/entries/)
            .respond({});
         $httpBackend
            .whenDELETE(/^api\/entries\/.+/)
            .respond({
               "urisNotFound" : ["social://chirp/9489SJDKF38"],
               "purgeId" : "12"
            });
         $httpBackend
            .whenPOST(/^api\/purge/)
            .respond({
               "urisNotFound" : ["social://chirp/9489SJDKF38", "social://aircraftreg/9239739723992"],
               "purgeId" : "244",
               "name" : "SALAMANDER",
               "description" : "Removes irrelevant ingest data."
            });
         $httpBackend
         .whenGET(/^api\/purge\/status\/.+/)
         .respond({
            "id": 1,
            "name": "c44046b2-2065-4430-9cbc-2012717d2c48",
            "description": "c44046b2-2065-4430-9cbc-2012717d2c48",
            "user": "CN=EzbakeClient, OU=42six, O=CSC, C=US",
            "timestamp": 1409104383000,
            "resolved": true,
            "centralPurgeType": "NORMAL",
            "centralPurgeStatus": "RESOLVED_AUTOMATICALLY",
            "documentStates": [
              {
                "uri": "DEV://action/01102001/5",
                "purgeDocumentId": 101,
                "status": "PURGED"
              }
            ],
            "applicationStates": [
              {
                "applicationName": "common_services",
                "serviceStates": [
                  {
                    "serviceName": "warehaus",
                    "status": "FINISHED_COMPLETE",
                    "initiatedTimestamp": 1409104388268,
                    "lastPollTimestamp": 1409104388268
                  },
                  {
                    "serviceName": "ssrService",
                    "status": "FINISHED_COMPLETE",
                    "initiatedTimestamp": 1409104388080,
                    "lastPollTimestamp": 1409104388080
                  }
                ]
              }
            ]
          });
      } else {
         $httpBackend.whenGET(/^api\/.+/).passThrough();
         $httpBackend.whenPUT(/^api\/.+/).passThrough();
         $httpBackend.whenDELETE(/^api\/.+/).passThrough();
         $httpBackend.whenPOST(/^api\/.+/).passThrough();
      }
   }]
);
