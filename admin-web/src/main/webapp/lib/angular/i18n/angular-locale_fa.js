/*   Copyright (C) 2013-2015 Computer Sciences Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License. */

'use strict';
angular.module("ngLocale", [], ["$provide", function($provide) {
var PLURAL_CATEGORY = {ZERO: "zero", ONE: "one", TWO: "two", FEW: "few", MANY: "many", OTHER: "other"};
$provide.value("$locale", {
  "DATETIME_FORMATS": {
    "AMPMS": [
      "\u0642\u0628\u0644\u200c\u0627\u0632\u0638\u0647\u0631",
      "\u0628\u0639\u062f\u0627\u0632\u0638\u0647\u0631"
    ],
    "DAY": [
      "\u06cc\u06a9\u0634\u0646\u0628\u0647",
      "\u062f\u0648\u0634\u0646\u0628\u0647",
      "\u0633\u0647\u200c\u0634\u0646\u0628\u0647",
      "\u0686\u0647\u0627\u0631\u0634\u0646\u0628\u0647",
      "\u067e\u0646\u062c\u0634\u0646\u0628\u0647",
      "\u062c\u0645\u0639\u0647",
      "\u0634\u0646\u0628\u0647"
    ],
    "MONTH": [
      "\u0698\u0627\u0646\u0648\u06cc\u0647\u0654",
      "\u0641\u0648\u0631\u06cc\u0647\u0654",
      "\u0645\u0627\u0631\u0633",
      "\u0622\u0648\u0631\u06cc\u0644",
      "\u0645\u0647\u0654",
      "\u0698\u0648\u0626\u0646",
      "\u0698\u0648\u0626\u06cc\u0647\u0654",
      "\u0627\u0648\u062a",
      "\u0633\u067e\u062a\u0627\u0645\u0628\u0631",
      "\u0627\u06a9\u062a\u0628\u0631",
      "\u0646\u0648\u0627\u0645\u0628\u0631",
      "\u062f\u0633\u0627\u0645\u0628\u0631"
    ],
    "SHORTDAY": [
      "\u06cc\u06a9\u0634\u0646\u0628\u0647",
      "\u062f\u0648\u0634\u0646\u0628\u0647",
      "\u0633\u0647\u200c\u0634\u0646\u0628\u0647",
      "\u0686\u0647\u0627\u0631\u0634\u0646\u0628\u0647",
      "\u067e\u0646\u062c\u0634\u0646\u0628\u0647",
      "\u062c\u0645\u0639\u0647",
      "\u0634\u0646\u0628\u0647"
    ],
    "SHORTMONTH": [
      "\u0698\u0627\u0646\u0648\u06cc\u0647\u0654",
      "\u0641\u0648\u0631\u06cc\u0647\u0654",
      "\u0645\u0627\u0631\u0633",
      "\u0622\u0648\u0631\u06cc\u0644",
      "\u0645\u0647\u0654",
      "\u0698\u0648\u0626\u0646",
      "\u0698\u0648\u0626\u06cc\u0647\u0654",
      "\u0627\u0648\u062a",
      "\u0633\u067e\u062a\u0627\u0645\u0628\u0631",
      "\u0627\u06a9\u062a\u0628\u0631",
      "\u0646\u0648\u0627\u0645\u0628\u0631",
      "\u062f\u0633\u0627\u0645\u0628\u0631"
    ],
    "fullDate": "EEEE d MMMM y",
    "longDate": "d MMMM y",
    "medium": "d MMM y H:mm:ss",
    "mediumDate": "d MMM y",
    "mediumTime": "H:mm:ss",
    "short": "yyyy/M/d H:mm",
    "shortDate": "yyyy/M/d",
    "shortTime": "H:mm"
  },
  "NUMBER_FORMATS": {
    "CURRENCY_SYM": "Rial",
    "DECIMAL_SEP": "\u066b",
    "GROUP_SEP": "\u066c",
    "PATTERNS": [
      {
        "gSize": 3,
        "lgSize": 3,
        "macFrac": 0,
        "maxFrac": 3,
        "minFrac": 0,
        "minInt": 1,
        "negPre": "-",
        "negSuf": "",
        "posPre": "",
        "posSuf": ""
      },
      {
        "gSize": 3,
        "lgSize": 3,
        "macFrac": 0,
        "maxFrac": 2,
        "minFrac": 2,
        "minInt": 1,
        "negPre": "\u200e(\u00a4",
        "negSuf": ")",
        "posPre": "\u200e\u00a4",
        "posSuf": ""
      }
    ]
  },
  "id": "fa",
  "pluralCat": function (n) {  return PLURAL_CATEGORY.OTHER;}
});
}]);