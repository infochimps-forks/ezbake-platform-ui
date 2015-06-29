'use strict';

describe('Registration filters', function(){
  beforeEach(module('registration.filters'));

  it('uriExample with prefix', inject(function(uriExampleFilter) {
    var webAppLink = {webUrl: "http://some.domain.org/cnn/{uri}", includePrefix: true};
    var actualUri = uriExampleFilter(webAppLink, "NEWS://cnn")
    var expectedUri = "http://some.domain.org/cnn/NEWS%3A%2F%2Fcnn%2F12345"
    expect(actualUri).toBe(expectedUri);
  }));

  it('uriExample without prefix', inject(function(uriExampleFilter) {
    var webAppLink = {webUrl: "http://some.domain.org/cnn/{uri}", includePrefix: false};
    var actualUri = uriExampleFilter(webAppLink, "NEWS://cnn")
    var expectedUri = "http://some.domain.org/cnn/12345"
    expect(actualUri).toBe(expectedUri);
  }));
});