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
    parsers/tokener.spec.js
    Unit tests for tokener.js
}
*/
(function () {
    var expect = require("chai").expect;
    var tokener = require("./tokener")

    describe("Parsers - Tokener", function () {
        it("Tokens properly ignore all whitespace.", function (done) {
            var myTokens = tokener.create("this is a test       omg weee    test", tokener.splitPatterns.whiteSpace);
            expect(myTokens.nextUntil("test")).to.equal("test");
            expect(myTokens.next()).to.equal("omg");
            expect(myTokens.nextUntil("test")).to.equal("test");
            expect(myTokens.next()).to.equal(undefined);
            myTokens.reset();
            expect(myTokens.next()).to.equal("this");
            done();
        });

        it("Tokens properly tokens on each character", function (done) {
            var myTokens = tokener.create("this is a test       omg weee    test", tokener.splitPatterns.characters);
            expect(myTokens.nextUntil("t")).to.equal("t");
            expect(myTokens.next()).to.equal("h");
            expect(myTokens.nextUntil("o")).to.equal("o");
            myTokens.reset();
            expect(myTokens.next()).to.equal("t");
            done();
        });
    });
}());
