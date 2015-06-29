angular.module('globalsearch.fakeREST', ['ngMockE2E']).run(function ($injector) {
    var $httpBackend = $injector.get('$httpBackend');

    $httpBackend.whenGET(/partials/).passThrough();
    $httpBackend.whenGET(/\/ezbake-webservice\/ezconfiguration/).respond(function () {
        return [200, {
            "web.application.security.banner.text": "This system is classified up to UNCLASSIFIED. Any markings of SECRET or TOP SECRET are for test data only.",
            "web.application.security.banner.background.color": "green",
            "gee.base2d": "https://geeserv/",
            "web.application.metrics.endpoint": "https://stats",
            "web.application.metrics.siteid": "app_stats",
            "web.application.chloe.endpoint": "/chloe/",
            "web.application.security.banner.text.color": "white",
            "web.application.external.domain": "ezbake"
        }];
    });

    $httpBackend.whenGET(/ezbake-webservice\/user/).respond(function () {
        return [200, {
            "principal": "CN=User Test, OU=People, OU=CSC, O=U.S. Government, C=US",
            "citizenship": "",
            "firstName": "Test",
            "lastName": "User",
            "organization": "",
            "name": "Test User",
            "id": ""
        }];
    });

    $httpBackend.whenGET("api/chloe/").respond(function (method, url, data, headers) {
        return [200, {
            apps: [{
                appName: "Test 1",
                webUrl: "/test/1"
            }, {
                appName: "Test 2",
                webUrl: "/test/2"
            }, {
                appName: "Test 3",
                webUrl: "/test/3"
            }, {
                appName: "Test 4",
                webUrl: "/test/4"
            }, {
                appName: "Test 5",
                webUrl: "/test/5"
            }, {
                appName: "Test 6",
                webUrl: "/test/6"
            }, {
                appName: "Test 7",
                webUrl: "/test/7"
            }, {
                appName: "Test 8",
                webUrl: "/test/8"
            }]
        }, headers];
    });

    $httpBackend.whenPOST("api/download").respond(function (method, url, data, headers) {
        var ssr;
        for (var i = 0; i < records.length; i++) {
            if (records[i].uri === decodeURIComponent(data)) {
                ssr = records[i];
                break;
            }
        }
        return [200, ssr, headers];
    });

    var snippets = [
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed tincidunt, dolor ac congue laoreet, ligula dui vehicula diam, in egestas ligula diam at erat. Nullam a gravida augue. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. Nullam non tellus dapibus, placerat tortor in, hendrerit sem. Vivamus dignissim erat ac diam aliquet, at sodales justo pulvinar. Nam sed mi porta, ultrices erat at, pulvinar augue. Vivamus quis rhoncus odio, a gravida libero. Sed elementum, augue nec convallis aliquam",
        "Ut ultrices tortor felis, sodales fermentum massa placerat sit amet. Phasellus viverra tincidunt facilisis. Fusce fringilla tincidunt ullamcorper. Interdum et malesuada fames ac ante ipsum primis in faucibus. Integer commodo nibh sit amet enim sollicitudin mattis. Morbi gravida orci a urna feugiat vulputate. Proin viverra id erat sed convallis. Vivamus condimentum mauris a justo euismod sollicitudin. Interdum et malesuada fames ac ante ipsum primis in faucibus. Cras ornare, odio sit amet pulvinar posuere, ipsum metus porta erat, eu euismod lacus tellus semper orci. Cum sociis natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Praesent cursus neque sed ligula varius pretium. Duis metus magna, viverra id semper vitae, eleifend nec est. ",
        "Fusce sed adipiscing lacus. In eget nibh ut lectus sagittis tincidunt. Aliquam in velit magna. Praesent aliquam imperdiet est id tincidunt. Donec vitae posuere massa. Duis sed enim accumsan, faucibus massa vel, pellentesque turpis. In mollis placerat arcu at aliquet. ",
        "Aenean ut purus quis odio egestas elementum a a orci. Phasellus est tortor, scelerisque a lectus at, eleifend accumsan metus. Cras eget metus quis elit rhoncus tempus. Cras nibh purus, luctus id laoreet sed, feugiat ut massa. Vestibulum consequat ac diam et facilisis. Vestibulum rhoncus diam non dolor laoreet ornare. Phasellus ac nunc et libero euismod porttitor sed in magna. Integer viverra gravida nisl. Etiam gravida purus diam, et blandit tellus tincidunt id. Nam vitae venenatis nisl. In sit amet erat eget tortor volutpat faucibus id nec eros. In sed felis lectus. ",
        "Fusce ac ipsum mollis, fermentum sapien et, euismod nunc. Nullam lobortis ultricies justo. Vivamus et convallis nisi. Vestibulum commodo magna eget lorem eleifend tristique. Proin et molestie dolor. Donec vestibulum congue commodo. Nulla in augue sed lacus scelerisque ornare vitae id mi. Pellentesque euismod nunc semper viverra ornare. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia Curae; ",
        "Aenean nulla nisl, aliquam non bibendum eget, consectetur et metus. Vestibulum sagittis suscipit dolor. Donec bibendum nisl sed turpis tincidunt euismod. Phasellus eu lacus suscipit, placerat nulla id, laoreet lectus. Ut a auctor dolor. Aliquam ornare odio vitae felis adipiscing, vel aliquet diam iaculis. Vivamus ac euismod sem. Cras eget nulla eu libero hendrerit porttitor id et dui. Nunc in odio erat. Donec leo sapien, sagittis ac varius ac, vehicula in odio. Nulla iaculis cursus nunc, nec tempus massa commodo nec. ",
        "Sed a ullamcorper justo, nec dictum neque. Ut ultricies mattis elementum. Duis accumsan sem eu auctor viverra. Nulla dapibus varius purus in sagittis. Sed et dapibus velit. Maecenas consectetur urna et turpis faucibus, eget posuere velit ornare. Cras luctus turpis nec libero accumsan sagittis. Maecenas fringilla ultrices arcu id adipiscing. Integer sit amet nulla in felis sagittis lacinia lacinia ac sapien. Aliquam erat volutpat. In bibendum sapien nec velit dignissim, in luctus nisi blandit. Pellentesque faucibus tincidunt molestie. Aliquam viverra leo ut vestibulum faucibus. Vestibulum quis nunc rhoncus, fringilla lorem sit amet, pretium felis. Duis vitae vulputate sapien, et facilisis neque. ",
        "Integer eu consequat quam. Donec nibh arcu, suscipit ut dui ut, rhoncus semper metus. Nulla porta porta sapien nec tristique. Nunc porttitor dolor quis urna ultricies posuere. Quisque a bibendum eros. Duis laoreet enim purus, a sodales purus tempor at. In pulvinar nisl vel magna vulputate tristique. Mauris aliquam nisl felis, eget vulputate justo malesuada et. Quisque porttitor, enim eu aliquam posuere, lectus arcu fermentum arcu, sed facilisis leo eros eget nulla. Curabitur at lorem lacus. Aenean euismod hendrerit elit, at luctus augue faucibus a. Etiam condimentum condimentum massa, sed pretium lacus faucibus in. Sed id diam id neque dictum scelerisque. ",
        "Cras posuere diam eget purus imperdiet, id molestie purus dapibus. In at pharetra leo, quis porttitor lectus. Donec non dictum orci. Nulla aliquet, nunc nec feugiat aliquam, purus purus imperdiet erat, vitae vehicula justo ligula ut orci. Vestibulum ut est euismod, mattis felis at, egestas sem. In quis consequat nisl. Vestibulum elit massa, adipiscing sit amet convallis a, pulvinar quis turpis. Suspendisse ullamcorper, urna quis tristique aliquam, urna lacus vestibulum odio, nec adipiscing ligula magna et ipsum. ",
        "Donec adipiscing elementum bibendum. Integer sit amet mauris nulla. Nam et cursus odio, sit amet vehicula massa. Suspendisse convallis auctor nibh. In eget feugiat massa, in dignissim felis. Maecenas ac leo libero. Cras eu egestas lectus. Fusce massa velit, hendrerit nec ipsum in, consequat feugiat diam. Ut ut turpis at tortor posuere lacinia non sit amet nunc. ",
        "Nunc dolor ante, pellentesque vel est et, blandit lacinia massa. Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Vestibulum gravida nisi vel leo facilisis congue. Nulla rhoncus augue ac tempor mollis. Mauris accumsan eros mollis turpis aliquet euismod. Etiam sollicitudin ipsum pretium commodo lacinia. Nulla et lectus ipsum. Phasellus consectetur mauris nunc, eu posuere tellus auctor sit amet. Praesent lectus turpis, malesuada nec neque sed, tempus scelerisque ipsum. Suspendisse auctor ultricies adipiscing. Sed egestas fringilla blandit. Nullam tempus risus augue, a viverra augue rutrum at. Nunc sem tortor, faucibus et cursus a, cursus sed mi. Nulla commodo quam eros. Mauris sed tempor ipsum. ",
        "Pellentesque sed adipiscing est. Mauris sit amet blandit nisl. Curabitur ornare purus leo, in porttitor metus viverra vitae. Nam rhoncus mollis augue sed elementum. Nam gravida, orci vel interdum rhoncus, turpis mauris mattis nisi, sit amet faucibus odio orci dignissim sapien. Nunc eros nunc, iaculis pellentesque ultrices at, ornare eget lacus. Etiam hendrerit consectetur tellus id luctus. Cras sit amet tincidunt mi. Nam interdum nibh nec erat condimentum pharetra. Suspendisse euismod nibh risus, sit amet luctus turpis sollicitudin sed. Sed at aliquet dui. In hac habitasse platea dictumst. Donec non vehicula urna, et feugiat augue. Sed a rutrum arcu. Pellentesque quis enim et elit feugiat congue quis nec metus. ",
        "Curabitur posuere commodo odio ac tempor. Mauris aliquet lacus id est sodales bibendum. Sed a massa luctus, vestibulum eros non, fermentum eros. Praesent id erat cursus, blandit lorem eget, accumsan sem. Proin eget tempor lacus, et vestibulum sem. Sed et nibh at ipsum blandit sodales vitae eget lacus. In rutrum ipsum interdum mauris luctus auctor. Sed ac felis gravida, pellentesque lacus quis, lacinia tellus. Ut auctor diam libero, in pulvinar tellus convallis ut. In ligula ligula, consectetur sit amet lacinia non, ornare at magna. Donec interdum nisi sed erat pretium, eget vestibulum massa pellentesque. ",
        "Maecenas sollicitudin enim vitae justo pharetra hendrerit. Aliquam ornare purus non tellus fringilla, pretium interdum tellus varius. Aenean a est dui. Sed commodo eu ligula id sollicitudin. Praesent dolor justo, placerat ut ultrices vel, pharetra quis sapien. Nulla euismod nisi eget vulputate ultrices. Cras sit amet dolor gravida nulla sagittis iaculis quis id metus. In mollis tortor vel ante euismod, in tristique nunc blandit. In ac eros mi. Curabitur et turpis at ipsum mattis hendrerit eget ut augue. ",
        "Mauris porttitor lobortis tellus sit amet laoreet. In faucibus et nisi sit amet viverra. Suspendisse tellus diam, viverra ac rutrum sed, sodales eu urna. Nulla justo lorem, malesuada sed nisl vitae, laoreet condimentum felis. Quisque ac ultrices libero. Aliquam sollicitudin consectetur lorem, et cursus mauris facilisis viverra. Fusce eu magna quis lorem auctor iaculis. Proin tincidunt sollicitudin enim nec posuere. Etiam pharetra eros imperdiet sapien tincidunt hendrerit. Phasellus vestibulum cursus risus, eget tincidunt erat faucibus sit amet. Phasellus sed ligula nunc. In ultrices at mi vitae tristique. Quisque non diam eleifend, lobortis nulla ac, tincidunt enim. ",
        "Ut nec elit eu odio elementum pharetra a non diam. Mauris vehicula consequat aliquet. Nunc purus nunc, auctor in est ut, pulvinar convallis dui. Aliquam sit amet elit tellus. Duis suscipit id lorem quis malesuada. Cras id ante sit amet diam molestie dictum. Nunc vitae nibh sollicitudin, mollis sem at, vestibulum purus. Nulla interdum aliquam arcu, eget sodales odio facilisis eu. Integer eget fringilla nibh, vitae gravida lectus. In hac habitasse platea dictumst. ",
        "Mauris quis rutrum nisl. Aenean turpis sapien, rutrum non nunc ac, viverra sollicitudin urna. Sed ut arcu volutpat, congue libero sit amet, iaculis tellus. Donec ac nunc ligula. Aenean non feugiat dui. Cras sodales tincidunt mauris a tincidunt. Vivamus suscipit lorem ut velit condimentum, non blandit libero accumsan. Aliquam erat volutpat. ",
        "Ut volutpat orci ut mauris placerat ullamcorper. Nulla facilisi. Donec lacinia, turpis sit amet sagittis vulputate, metus enim euismod ligula, non fermentum augue tortor aliquam ante. Praesent pretium suscipit dui sit amet venenatis. Fusce eu placerat ipsum. Nulla suscipit tincidunt odio, ac pharetra arcu porttitor a. Suspendisse at volutpat ligula, in luctus justo. Vestibulum accumsan congue dignissim. Nam feugiat consectetur facilisis. Suspendisse in arcu eleifend, mollis felis non, rhoncus nisl. ",
        "Phasellus egestas, odio ac convallis posuere, odio lectus viverra est, in pulvinar sapien eros non ipsum. Mauris nulla ipsum, sagittis sed porttitor id, pharetra at est. Praesent vel consectetur augue. Vestibulum lectus leo, mattis sit amet pellentesque et, convallis ut lorem. Mauris a tincidunt quam, et imperdiet sapien. Quisque cursus libero arcu, sit amet molestie magna vehicula ut. Nulla gravida lacus a justo mollis cursus. Proin elementum leo quis ligula facilisis sagittis. Praesent lectus quam, interdum ut erat nec, posuere luctus dolor. Quisque eget lectus ut dui lacinia cursus in posuere enim. Aliquam nec turpis nec justo consequat lobortis in id dui. Aliquam bibendum fringilla bibendum. Sed ultricies aliquet sem, mattis gravida eros ornare dictum. ",
        "Nam imperdiet, ligula eget viverra vestibulum, metus ipsum aliquet arcu, vel rhoncus felis metus ac sem. Nullam vel aliquet massa, eget venenatis leo. Aliquam eu nibh quis dolor vehicula ultrices vitae consequat ante. Suspendisse rhoncus nibh eu luctus ornare. Maecenas hendrerit scelerisque risus id bibendum. Donec id sapien ut leo pharetra ultrices. Praesent magna mauris, pulvinar id lorem non, placerat venenatis arcu. Suspendisse feugiat molestie orci, et consectetur magna ultricies non. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia Curae; ",
        "Donec ornare rhoncus elementum. Suspendisse aliquam arcu et libero ornare, at mollis est eleifend. Sed a diam ut dui iaculis pretium non et purus. Pellentesque ut pellentesque dolor. Vestibulum egestas urna commodo, placerat turpis sed, sodales nunc. Integer lobortis cursus pretium. Maecenas facilisis neque nec elit iaculis rutrum. Sed ut adipiscing purus, auctor pharetra purus. Sed id justo in turpis vestibulum malesuada. Proin vulputate eros eu sem bibendum, sed semper augue auctor. Nulla vehicula elit arcu, non porta metus dapibus vitae. In molestie purus mattis nunc sodales, sit amet consectetur nisl bibendum. Nulla facilisi. Quisque iaculis ultrices nibh, vitae vulputate nibh congue vitae. ",
        "Proin imperdiet ut sem ultricies semper. Proin a tincidunt nunc. Etiam eu viverra risus. Mauris sem sapien, hendrerit quis ultricies vel, interdum quis odio. In id est quis felis rutrum facilisis sed a leo. Duis sit amet elit posuere, hendrerit nulla eget, dapibus eros. Cras nulla turpis, egestas sit amet metus a, auctor facilisis purus. ",
        "Mauris congue odio ut purus posuere, a porttitor nunc tempor. Etiam in egestas augue. Proin purus urna, ornare nec massa ut, condimentum ultrices neque. Nunc consequat sem eget nisi porta viverra. Integer convallis sem eu orci lobortis tempus. Donec non sollicitudin ante, at mattis dolor. Sed et eros eget arcu gravida sollicitudin. Pellentesque aliquam risus non gravida blandit. ",
        "Praesent id velit vitae sapien consequat adipiscing. Maecenas ac velit porttitor, auctor nibh ut, egestas risus. Aenean quis ullamcorper purus. Vestibulum aliquam mauris eget enim venenatis convallis. Maecenas cursus neque augue, eu sodales leo commodo sit amet. Mauris est velit, tempus eleifend nulla vel, eleifend feugiat nibh. Cum sociis natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Nulla ultricies mauris nisl, in adipiscing ligula dapibus quis. Proin laoreet magna lorem, vel tempor orci sagittis a. Aenean iaculis fermentum magna non rhoncus. Vivamus molestie, sapien vel scelerisque tincidunt, ante orci interdum odio, non ultricies mi libero sed nisl. ",
        "Nunc arcu elit, rutrum et dapibus non, tempus pulvinar nibh. Donec iaculis est sed pharetra suscipit. Nulla lacus lectus, commodo in volutpat semper, rutrum vel nibh. Suspendisse vitae ornare metus. Phasellus tincidunt ligula id nunc porttitor, vitae malesuada lacus accumsan. Suspendisse bibendum laoreet odio quis suscipit. Quisque pellentesque nibh in urna bibendum, in laoreet nisl pellentesque. Vestibulum et cursus turpis. In suscipit malesuada faucibus. Etiam interdum sagittis mauris sodales blandit. Aliquam erat volutpat. Praesent aliquam fringilla risus, ac aliquet turpis mollis in. In sodales, turpis eu tincidunt volutpat, orci mauris commodo mi, vel venenatis nibh leo ut metus. ",
        "Aliquam erat volutpat. Morbi ac purus vestibulum, cursus quam non, vehicula neque. Nullam mollis sit amet turpis in condimentum. Cras diam tellus, scelerisque at nulla quis, tempor pellentesque magna. Mauris mollis sem mi, vitae lobortis neque sagittis vitae. Praesent sagittis leo ac ante placerat tincidunt. Aenean rutrum, elit ut fermentum ultrices, quam est malesuada nisl, at tristique neque augue et arcu. Duis venenatis, nisi lacinia scelerisque viverra, diam urna venenatis lacus, in sollicitudin purus justo sed lorem. Pellentesque ornare quam in lectus facilisis sodales. Sed urna lectus, pharetra sed egestas sit amet, consequat luctus odio. Pellentesque eleifend et ipsum ac varius. ",
        "In hac habitasse platea dictumst. Vivamus sit amet sem suscipit, viverra est dapibus, porttitor erat. Donec pharetra arcu eu leo congue condimentum. Suspendisse euismod volutpat vestibulum. Proin bibendum diam justo, eget aliquet erat sagittis at. Mauris eget purus augue. Donec tempor porta porta. Nam rutrum adipiscing nibh non pulvinar. Curabitur nec auctor sapien. Aliquam feugiat odio orci, quis tempus dui semper ac. Integer id consectetur diam, nec tincidunt sapien. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. Proin at quam a enim iaculis scelerisque eu tempor neque. Praesent non tortor id mi tincidunt tristique non eu mauris. Pellentesque diam odio, scelerisque in erat sed, iaculis pulvinar velit. Ut auctor viverra est, eget eleifend ante posuere ac. ",
        "Fusce sodales nisi vitae dignissim mollis. Mauris tempus volutpat nunc, vel iaculis purus interdum quis. Nunc condimentum vitae massa non imperdiet. Nullam porttitor semper nisl, non rutrum dolor rhoncus eu. Quisque fermentum lacinia arcu vitae tempus. Donec fermentum magna libero, quis pulvinar dui mollis eu. Interdum et malesuada fames ac ante ipsum primis in faucibus. Sed in odio at justo pretium aliquam. Phasellus venenatis faucibus lectus, vitae tempus urna dictum consequat. Ut ornare eleifend felis, a consectetur sapien scelerisque ut. Nam tristique nisl ut arcu laoreet, sed dictum massa condimentum. ",
        "Quisque convallis fringilla metus. Interdum et malesuada fames ac ante ipsum primis in faucibus. Quisque diam nisi, commodo in scelerisque quis, cursus eget nulla. Suspendisse pellentesque est at sem rutrum, ut vestibulum mi pretium. Nam vitae molestie orci. In varius, sapien ac ullamcorper sodales, urna nulla vulputate ante, quis interdum nisl mi ut arcu. Nam at fermentum turpis. ",
        "Phasellus id tortor laoreet, mattis nunc sit amet, porttitor neque. Donec aliquet, dui sed luctus fringilla, nunc nisi ultricies dolor, ac condimentum felis erat placerat risus. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. Sed molestie, diam sit amet luctus vestibulum, nibh justo consequat magna, eu venenatis tortor enim id risus. Etiam sit amet ipsum luctus, vehicula elit congue, mattis arcu. Donec vitae mollis quam, adipiscing varius orci. Quisque quis mattis tortor, id consectetur turpis. Nulla id pretium odio. Suspendisse potenti. Sed consequat lorem sit amet cursus tristique. Praesent varius, risus nec volutpat imperdiet, tortor magna imperdiet felis, sit amet adipiscing arcu lacus vitae tellus. Vivamus et faucibus lacus. ",
        "Etiam aliquam semper pulvinar. Vivamus vehicula est turpis, ut consequat lectus condimentum et. Curabitur feugiat posuere porta. Nunc consequat, sapien in ullamcorper pulvinar, orci ipsum facilisis diam, fringilla lobortis turpis eros ut erat. Etiam laoreet iaculis lorem. Suspendisse suscipit malesuada neque. Integer molestie vestibulum mauris a ultricies. In viverra sem a justo porta, sit amet gravida urna lacinia. Morbi pharetra euismod sodales. Aliquam non mi tincidunt, pharetra magna ullamcorper, viverra diam. Proin eu pellentesque purus. "
    ];

    var generateSSRs = function (howMany) {
        var SSRs = [];
        for (var i = 0; i < howMany; i++) {
            var randomSnippetIndex = Math.floor(Math.random() * snippets.length);
            var latitude = Math.floor(Math.random() * 20) + 30; //keep it in the USA 50 - 70 degrees
            var longitude = Math.floor(Math.random() * -60) + -60; //in the USA -60 to -120 degrees
            var ssr = {
                "uri": "dummy:\/\/data\/" + (i + 1),
                "security": {},
                "title": "Web Result " + (i % 20 + 1) + ". Page " + (Math.floor(i / 20) + 1) + ".",
                "snippet": snippets[randomSnippetIndex],
                "resultDate": {
                    "date": {
                        "month": 6,
                        "day": 10,
                        "year": 2014
                    }
                },
                "coordinate": {
                    "latitude": latitude,
                    "longitude": longitude
                },
                "prefix": "dummy:\/\/data\/",
                "id": i % 20 + 1,
                "webApplicationLinks": []
            };
            var randomWebApplicationLinksCount = Math.floor(Math.random() * 4);
            for (var j = 1; j <= randomWebApplicationLinksCount; j++) {
                ssr.webApplicationLinks.push({appName: "Test " + j, webUrl: "/test/" + j});
            }
            SSRs.push(ssr);
        }
        return SSRs;
    };

    var howMany = 500;
    var records = generateSSRs(howMany);

    $httpBackend.whenPOST("api/ssr/").respond(function (method, url, data, headers) {
        data = JSON.parse(data);
        var start = data.pageOffset;
        var end = start + data.pageSize;

        var facets = {
            "Report Date": {
                "field": "_ssr_date",
                "facetValues": [{
                    "count": 0,
                    "value": {"doubleValue": 1.4052816E12},
                    "label": "Last 24 Hours"
                }, {
                    "count": 0,
                    "value": {"doubleValue": 1.4051952E12},
                    "label": "Last 48 Hours"
                }, {
                    "count": 0,
                    "value": {"doubleValue": 1.4051088E12},
                    "label": "Last 72 Hours"
                }, {
                    "count": 0,
                    "value": {"doubleValue": 1.4047632E12},
                    "label": "Last Week"
                }, {
                    "count": 0,
                    "value": {"doubleValue": 1.402776E12},
                    "label": "Last 30 Days"
                }, {
                    "count": 0,
                    "value": {"doubleValue": 1.397592E12},
                    "label": "Last 90 Days"
                }, {
                    "count": 0,
                    "value": {"doubleValue": 1.397592E12},
                    "label": "Last Year"
                }]
            },
            "Report Type": {
                "field": "_ssr_type",
                "facetValues": [{
                    "count": 0,
                    "value": {"stringValue": "dummy:TEST1"},
                    "label": "TEST1:test"
                }, {
                    "count": 0,
                    "value": {"stringValue": "dummy:TEST2"},
                    "label": "TEST2:test"
                }, {
                    "count": 0,
                    "value": {"stringValue": "dummy:TEST3"},
                    "label": "TEST3:test"
                }]
            }
        };

        return [200, {
            totalHits: howMany,
            pageSize: data.pageSize,
            matchingRecords: records.slice(start, end),
            facets: facets
        }, headers];

    });


    // saved searches
    var savedSearchUri = "api/savedSearch";
    var savedSearchResults = [
        {
            "id": 1,
            "name": "test 1",
            "searchTerm": "search term test #1",
            "hasUpdates": true,
            "updateDate": new Date()
        }, {
            "id": 2,
            "name": "test 2",
            "searchTerm": "search term test #2",
            "hasUpdates": true,
            "updateDate": new Date()
        }];
    var nextId = 3;
    // get percolator inbox
    $httpBackend.whenGET(new RegExp(savedSearchUri + "\/[0-9]+")).respond(function (method, url, data, headers) {
        var hits = 15;
        return [200, {
            totalHits: hits,
            pageSize: hits,
            matchingRecords: records.slice(0, hits)
        }, headers];
    });
    // get main inbox
    $httpBackend.whenGET(savedSearchUri).respond(function () {
        return [200, savedSearchResults, {}];
    });
    // add
    $httpBackend.whenPUT(savedSearchUri).respond(function (method, url, data) {
        var record = angular.fromJson(data);
        record.id = nextId++;
        record.hasUpdates = false;
        savedSearchResults.push(record);
        return [200, record, {}];
    });
    // update
    $httpBackend.whenPOST(savedSearchUri).respond(function(method, url, data) {
        var record = angular.fromJson(data);
        var index = -1;
        for (var i = 0; i < savedSearchResults.length; i++) {
            if (savedSearchResults[i].id === record.id) {
                index = i;
                break;
            }
        }
        if (index > -1) {
            savedSearchResults[index] = record;
            return [200, {success: true}, {}];
        } else {
            return [500, "record not found", {}];
        }
    });
    // delete
    $httpBackend.whenDELETE(new RegExp(savedSearchUri + "\/[0-9]+")).respond(function(method, url) {
        var id = url.substr(url.lastIndexOf('/') + 1);
        var index = -1;
        for (var i = 0; i < savedSearchResults.length; i++) {
            if (savedSearchResults[i].id == id) {
                index = i;
                break;
            }
        }
        if (index > -1) {
            savedSearchResults.splice(index, 1);
            return [200, {success: true}, {}];
        } else {
            return [500, "record not found", {}];
        }
    });

});

