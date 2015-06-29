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
      "de.",
      "du."
    ],
    "DAY": [
      "vas\u00e1rnap",
      "h\u00e9tf\u0151",
      "kedd",
      "szerda",
      "cs\u00fct\u00f6rt\u00f6k",
      "p\u00e9ntek",
      "szombat"
    ],
    "MONTH": [
      "janu\u00e1r",
      "febru\u00e1r",
      "m\u00e1rcius",
      "\u00e1prilis",
      "m\u00e1jus",
      "j\u00fanius",
      "j\u00falius",
      "augusztus",
      "szeptember",
      "okt\u00f3ber",
      "november",
      "december"
    ],
    "SHORTDAY": [
      "V",
      "H",
      "K",
      "Sze",
      "Cs",
      "P",
      "Szo"
    ],
    "SHORTMONTH": [
      "jan.",
      "febr.",
      "m\u00e1rc.",
      "\u00e1pr.",
      "m\u00e1j.",
      "j\u00fan.",
      "j\u00fal.",
      "aug.",
      "szept.",
      "okt.",
      "nov.",
      "dec."
    ],
    "fullDate": "y. MMMM d., EEEE",
    "longDate": "y. MMMM d.",
    "medium": "yyyy.MM.dd. H:mm:ss",
    "mediumDate": "yyyy.MM.dd.",
    "mediumTime": "H:mm:ss",
    "short": "yyyy.MM.dd. H:mm",
    "shortDate": "yyyy.MM.dd.",
    "shortTime": "H:mm"
  },
  "NUMBER_FORMATS": {
    "CURRENCY_SYM": "Ft",
    "DECIMAL_SEP": ",",
    "GROUP_SEP": "\u00a0",
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
        "negPre": "-",
        "negSuf": "\u00a0\u00a4",
        "posPre": "",
        "posSuf": "\u00a0\u00a4"
      }
    ]
  },
  "id": "hu",
  "pluralCat": function (n) {  return PLURAL_CATEGORY.OTHER;}
});
}]);