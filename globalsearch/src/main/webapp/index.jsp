<%@ page import="ezbake.globalsearch.resource.ApiResource" %>
<%@ page import="ezbake.globalsearch.service.ServiceClient" %>
<%@ page import="ezbake.globalsearch.service.ServiceClientResolver" %>
<%!
    String getConfiguration(String property) {
        ServiceClientResolver resolver = new ServiceClientResolver();
        ApiResource resource = new ApiResource();
        ServiceClient client = resolver.getContext(resource.getClass());
        return client.getConfiguration().getProperty(property);
    }

    String mapBaseUrl = getConfiguration("gee.base2d");
    String mapsJson = getConfiguration("gee.maps");
%>
<!DOCTYPE html>
<html lang="en" ng-app="globalsearch">
<head>
    <meta charset="utf-8">
    <title>Welcome to Global Search</title>

    <!-- Classification banner component -->
    <!--[if lte IE 9]>
    <script src="components/bower_components/classification-banner/ie9-shim.js"></script>
    <![endif]-->
    <script src="components/bower_components/platform/platform.js" type="text/javascript"></script>
    <link rel="import" href="components/bower_components/classification-banner/classification-banner.html">

    <link rel="stylesheet" type="text/css" href="css/bootstrap.min.css">
    <link rel="stylesheet" type="text/css" href="css/reset.css">
    <link rel="stylesheet" type="text/css" href="css/chloe.css">
    <link rel="stylesheet" type="text/css" href="css/main.css">
    <link rel="stylesheet" type="text/css" href="css/sidebar.css">
    <link rel="stylesheet" type="text/css" href="css/query-builder.css">
    <link rel="stylesheet" type="text/css" href="css/search-images.css">
    <link rel="stylesheet" type="text/css" href="css/search-images-grid.css">
    <link rel="stylesheet" type="text/css" href="css/videos.css">
    <link rel="stylesheet" type="text/css" href="css/icomoon.css">
    <link rel="stylesheet" type="text/css" href="fonts/global-search-icons/style.css">
    <link rel="stylesheet" type="text/css" href="css/toaster.css">
    <link rel="stylesheet" type="text/css" href="components/bower_components/chosen/chosen.css">
    <script type="text/javascript">
        var GEE_BASE_URL = "<%= mapBaseUrl %>";
        var maps = JSON.parse('<%= mapsJson %>');
        var GEE_SERVER_URL = maps[0].url;
    </script>
</head>
<body>
<classification-banner></classification-banner>
<div id="app" ng-view></div>


<!-- Minified JavaScript configured with Gulp -->
<!-- build:js all-index.js -->
<!--
     NOTE: The Gulp build will remove everything from "build:js" in the line above
     this block, through "endbuild" below.  The "build section" (including this
     comment and all scripts within this section will be replaced by a single
     script tag, containing "app.min.js" which contains the minified content
     of scripts passed to the "gulp-usemin" plugin in Gulpfile.js
-->

<script src="lib/jquery/jquery-1.9.1.min.js" type="text/javascript"></script>
<script src="lib/external/swivl/stats.js" type="text/javascript"></script>
<script src="lib/jquery/jquery-ui-1.10.2.min.js"></script>
<script src="lib/jquery/jquery.cookie.js"></script>
<script src="lib/external/image-zoom.js"></script>
<script src="lib/angular/angular.js"></script>
<script src="lib/angular/angular-route.js"></script>
<script src="lib/angular/angular-resource.js"></script>
<script src="lib/angular/angular-mocks.js"></script>
<script src="js/app.js" type="text/javascript"></script>
<script src="components/bower_components/chosen/chosen.jquery.min.js" type="text/javascript"></script>
<script src="components/bower_components/angular-chosen-localytics/chosen.js" type="text/javascript"></script>
<script src="js/services/Search.js" type="text/javascript"></script>
<script src="js/services/SavedSearch.js" type="text/javascript"></script>
<!--
  Development resources:

  <script src="js/services/FakeREST.js" type="text/javascript"></script>
  <script src="js/services/FakeEzBakeWebServices.js" type="text/javascript"></script>
    -->

<script src="js/services/EzBakeWebServices.js" type="text/javascript"></script>
<script src="js/services/Map.js" type="text/javascript"></script>
<script src="js/services/ErrorService.js" type="text/javascript"></script>
<script src="js/controllers/WebSearchCtrl.js" type="text/javascript"></script>
<script src="js/controllers/QueryBuilderCtrl.js" type="text/javascript"></script>
<script src="js/filters.js" type="text/javascript"></script>
<script src="js/directives.js" type="text/javascript"></script>
<script src="lib/chloe/chloe.js" type="text/javascript"></script>
<script src="lib/bootstrap/ui-bootstrap-custom-directives.js"></script>
<script src="lib/bootstrap/bootstrap.js"></script>
<script src="lib/external/angular-ui/angular-ui-tpls.js" type="text/javascript"></script>
<script src="lib/angular/angular-animate.js" type="text/javascript"></script>
<script src="lib/angularjs-toaster/toaster.js" type="text/javascript"></script>

<!-- endbuild -->

<script src="lib/external/maps/openlayers/OpenLayers.js"></script>
<script type="text/javascript" src='<%= mapBaseUrl + "/maps/api/bootstrap_loader.js"%>'></script>
<script type="text/javascript" src='<%= mapBaseUrl + "/maps/api/fusion_map_obj_v3.js"%>'></script>
<script type="text/javascript" src='<%= mapBaseUrl + "/maps/api/fusion_maps_v3.js"%>'></script>
</body>
</html>
