/*   Copyright (C) 2013-2014 Computer Sciences Corporation
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

/*
    parsers/tokener.js
    Provides a tokener object which can tokenize based upon a regex pattern or string.
    Also provides built in regex patterns for ease of use and consistency.

    Usage:
    var tokens = tokener.create("This is some text to tokenize", tokener.whiteSpace);
    var token = tokens.next();
    while (token !== undefined) {
        console.log(token);
        token = tokens.next();
    }
}
*/
(function () {
    var tokener = {
        splitPatterns: {
            whiteSpace: /\s+/g,
            newline: /\n/g,
            characters: ""
        },
        create: function (input, pattern) {
            var self = Object.create(this);
            self.str = (input || "");
            self.tokens = [];
            self.currentIterator = -1;
            self.lastIterator = -1;

            self.str = self.str.trim();

            self.tokens = self.str.split(pattern);

            self.lastIterator = self.tokens.length;

            return self;
        },
        getTokens: function () {
            return this.tokens;
        },
        reset: function () {
            this.currentIterator = -1;
            return this;
        },
        next: function () {
            if (this.lastIterator === this.currentIterator) {
                return undefined;
            }
            this.currentIterator = this.currentIterator + 1;
            return this.tokens[this.currentIterator];
        },
        nextUntil: function (untils) {
            if (untils !== undefined && untils !== null) {
                if (Object.prototype.toString.call(untils) !== "[object Array]") {
                    untils = [untils];
                }
                var val = this.next();
                while (untils.indexOf(val) === -1 && val !== undefined) {
                    val = this.next();
                }
                return val;
            }
            return undefined;
        }
    };

    module.exports = tokener;
}())
