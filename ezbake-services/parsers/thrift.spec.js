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
    parsers/thrift.spec.js
    Unit tests for thrift.js
}
*/
(function () {
    var expect = require("chai").expect;
    var parser = require("./thrift")

    describe("Parsers - Thrift", function () {
        it("Eventing - 'ready' works as expected with thrift supplied as string.", function (done) {
            var myParser = parser.create({ thrift: "", lazy: true }).on("ready", function () {
                done();
            });
        });

        it("Eventing - 'ready' works as expected with thrift supplied as a file to be read in.", function (done) {
            var myParser = parser.create({ file: './parsers/example.thrift', lazy: true }).on("ready", function () {
                done();
            });
        });

        it("Eventing - 'parsed' works as expected with thrift supplied as a string.", function (done) {
            var myParser = parser.create({ thrift: "", lazy: false }).on("parsed", function () {
                done();
            });
        });

        it("Eventing - 'parsed' works as expected with thrift supplied as a file to be read in.", function (done) {
            var myParser = parser.create({ file: './parsers/example.thrift', lazy: false }).on("parsed", function () {
                done();
            });
        });

        it("Parsing - a non-undefined value is returned from a parsing attempt of a valid thrift file", function (done) {
            var myParser = parser.create({ file: './parsers/example.thrift', lazy: true }).on("ready", function () {
                myParser.parse(function (err, result) {
                    expect(err).to.equal(undefined);
                    expect(result).to.not.equal(undefined);
                    done();
                });
            });
        });

        it("Parsing - comments are properly stripped", function (done) {
            var myParser = parser.create({ file: './parsers/example.thrift', lazy: true }).on("ready", function () {
                myParser.parse(function (err, result) {
                    myParser.getRawThrift(function (err2, raw) {
                        expect(err2).to.equal(undefined);
                        expect(raw).to.not.equal(undefined);
                        expect(raw).to.not.equal("undefined");
                        expect(raw.indexOf("Comment1")).to.equal(-1);
                        expect(raw.indexOf("Comment2")).to.equal(-1);
                        done();
                    });
                });
            });
        });

        it("Parsing - returns valid meta data containing the supplied filename", function (done) {
            var myParser = parser.create({ file: './parsers/example.thrift', lazy: true }).on("ready", function () {
                myParser.parse(function (err, result) {
                    expect(err).to.equal(undefined);
                    expect(result.meta.filename).to.equal('./parsers/example.thrift');
                    done();
                });
            });
        });

        it("Parsing - returns valid namespace data", function (done) {
            var myParser = parser.create({ file: './parsers/example.thrift', lazy: true }).on("ready", function () {
                myParser.parse(function (err, result) {
                    expect(err).to.equal(undefined);
                    myParser.getJSONOverview(function (err2, result2) {
                        expect(result2.namespace.java).to.not.equal(undefined);
                        expect(result2.namespace.java).to.equal("com.example.org");
                        done();
                    });
                });
            });
        });

        it("Parsing - returns valid typedef data", function (done) {
            var myParser = parser.create({ file: './parsers/example.thrift', lazy: true }).on("ready", function () {
                myParser.parse(function (err, result) {
                    expect(err).to.equal(undefined);
                    myParser.getJSONOverview(function (err2, result2) {
                        expect(result2.typedef.string).to.not.equal(undefined);
                        done();
                    });
                });
            });
        });

        it("Parsing - returns valid enum data", function (done) {
            var myParser = parser.create({ file: './parsers/example.thrift', lazy: true }).on("ready", function () {
                myParser.parse(function (err, result) {
                    expect(err).to.equal(undefined);
                    myParser.getJSONOverview(function (err2, result2) {
                        expect(result2.enum.testNum).to.not.equal(undefined);
                        expect(result2.enum.testNum.ONE).to.equal(1);

                        expect(result2.enum.aNum).to.not.equal(undefined);
                        expect(result2.enum.aNum.TEST).to.equal(1);

                        expect(result2.enum.sNum).to.not.equal(undefined);
                        expect(result2.enum.sNum.SINGLE).to.equal(0);

                        done();
                    });
                });
            });
        });

        it("Parsing - returns valid service data", function (done) {
            var myParser = parser.create({ file: './parsers/example.thrift', lazy: true }).on("ready", function () {
                myParser.parse(function (err, result) {
                    expect(err).to.equal(undefined);
                    myParser.getJSONOverview(function (err2, result2) {
                        expect(result2.service.Tester.getName.returns).to.equal("string");
                        expect(result2.service.Tester.getOptions).to.not.equal(undefined);
                        expect(result2.service.Tester.getOptions.params.length).to.equal(1);
                        expect(result2.service.Tester.getOptions.returns).to.equal("map<string,string>");
                        expect(result2.service.Testing.createGroup.params.length).to.equal(4);
                        expect(result2.service.Testing.createGroup.params[0].name).to.equal("token");
                        expect(result2.service.Testing.createGroup.params[1].name).to.equal("parent");
                        expect(result2.service.Testing.createGroup.params[2].name).to.equal("name");
                        expect(result2.service.Testing.createGroup.params[3].name).to.equal("parentGroupInheritance");
                        expect(result2.service.Testing.createGroup.throws.length).to.equal(3);
                        expect(result2.service.Testing.deactivateGroup.params.length).to.equal(3);
                        expect(result2.service.Testing.deactivateGroup.params[1].type).to.equal("string");
                        expect(result2.service.Testing.deactivateGroup.params[2].type).to.equal("bool");
                        done();
                    });
                });
            });
        });
    });
}());
