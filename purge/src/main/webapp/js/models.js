wh.model = wh.model || {};
wh.model.entry = function(data) {
   var modelObject = {
         
      /**
       * @description
       * Sets this instance's attributes with the values from the given data
       * object.
       * 
       * @param data The object which is used to construct this instance.
       */
      setObject : function(data) {
         
         var data = data || {};
         
         this.uri = data.uri || "";
         this.versions = data.versions || [];
         this.metadata = [];
         
         data.metadata = data.metadata || {};
         for (var mapKey in data.metadata) {
            this.metadata.push({
               key : mapKey,
               value : data.metadata[mapKey]
            });
         }
      }
         
   };
   modelObject.setObject(data);
   return modelObject;
};

/**
 * @description
 * Constructs a purge result object with the data given. If no data is given
 * then return an object with the default values.
 * 
 * @param   data {Object} Optional
 */
wh.model.purgeResult = {};
wh.model.purgeResult.create = function(data) {
   
   data = data || {};
   return {
      purgeId : data.purgeId || "",
      urisNotFound : data.urisNotFound || [],
      name : data.name || "",
      description : data.description || "",
      reset : function() {
         this.purgeId = "";
         this.urisNotFound = [];
      },
      hasUrisNotFound : function() {
         return (this.urisNotFound) ? this.urisNotFound.length > 0 : false;
      }
   };
};

/**
 * @description
 * Represents the object used for submitting a purge request.
 */
wh.model.purge = {};
wh.model.purge.create = function() {
   
   return {
      name : "",
      description : "",
      ssrs : [],
      reset : function() {
         this.name = "";
         this.description = "";
         this.ssrs = [];
      },
      setSsrs : function(ssrList) {
         this.ssrs = (ssrList) ? ssrList : []; 
      },
      /**
       * @description
       * Converts this instance into a purge submit object. Specifically,
       * the list of SSRs are converted into a list of URIs.
       */
      asPurgeObject : function() {
         function convertSsrsToUris(ssrs) {
            var uris = [];
            for (var i = 0; i < ssrs.length; i++) {
               if (!wh.isEmpty(ssrs[i].uri)) uris.push(ssrs[i].uri);
            }
            return uris;
         }
         
         return {
            name : this.name,
            description : this.description,
            uris : convertSsrsToUris(this.ssrs)
         };
      }
   };
};

/**
 * @description
 * Constructs an SSR object.
 * 
 * @param   ssr {Object} ezbake.base.thrift.SSR
 */
wh.model.ssr = {};
wh.model.ssr.create = function(ssr) {
   
   function asDate(ssrDate) {
      if (!ssrDate || !ssrDate.date || !ssrDate.date.month || !ssrDate.date.day || !ssrDate.date.year) {
         return null;
      }
      var hour = 0, minute = 0, second = 0, millisecond = 0;
      if (ssrDate.time) {
         hour = ssrDate.time.hour || 0;
         minute = ssrDate.time.minute || 0;
         second = ssrDate.time.second || 0;
         millisecond = ssrDate.time.millisecond || 0;
      }
      return new Date(ssrDate.date.year, ssrDate.date.month - 1, ssrDate.date.day, hour, minute, second, millisecond); 
   }
   
   function getExternalCommunityVisibility(ssr) {
      var visibility = "";
      if (ssr && ssr.visibility && ssr.visibility.advancedMarkings &&
            ssr.visibility.advancedMarkings.externalCommunityVisibility) {
         visibility = ssr.visibility.advancedMarkings.externalCommunityVisibility;
      }
      return visibility;
   }
   
   function findValueForKey(metadata, keyName) {
      if (metadata && metadata.tags) {
         for (var key in metadata.tags) {
            if (key == keyName) return metadata.tags[key];
         }
      }
      return null;
   }
   
   ssr = ssr || {};
   var modelObject = {
      select : function() {
         this.isSelected = true;
      },
      deselect : function() {
         this.isSelected = false;
      }
   };
   modelObject.isSelected = false;
   modelObject.uri = ssr.uri || "";
   modelObject.timestamp = asDate(ssr.resultDate);
   modelObject.formalVisibility = ssr.visibility ? (ssr.visibility.formalVisibility || "") : "";
   modelObject.extCommunityVisibility = getExternalCommunityVisibility(ssr);
   modelObject.usp = findValueForKey(ssr.metaData, "usp");
   modelObject.exemption = findValueForKey(ssr.metaData, "exemption");
   return modelObject;
};
wh.model.ssr.getMockData = function() {
   return [
       {"uri":"DEV://social/chirp:475858716546592768","visibility":{"formalVisibility":"U", "advancedMarkings":{"externalCommunityVisibility":"U"}},"snippet":"RT@nanokamel82: اليوم مصر . علمانية نصرانية يهودية \nباغتصاب السيسي للحكم \nاموال الخليج تقتل الاسلام في مصر \n.. لن يموت اسلامنا خليج العهر …","resultDate":{"date":{"month":6,"day":8,"year":2014},"time":{"hour":4,"minute":35,"second":33,"millisecond":0,"tz":{"hour":0,"minute":0,"afterUTC":0}}}},
       {"uri":"DEV://social/chirp:475858716546592804","visibility":{"formalVisibility":"U", "advancedMarkings":{"externalCommunityVisibility":"U"}},"resultDate":{"date":{"month":6,"day":9,"year":2014},"time":{"hour":4,"minute":35,"second":33,"millisecond":0,"tz":{"hour":0,"minute":0,"afterUTC":0}}},"metaData":{"tags":{"fake":"true","usp":"true","exemption":"12"}}},
       {"uri":"DEV://social/chirp:475858716546593119","visibility":{"formalVisibility":"U", "advancedMarkings":{"externalCommunityVisibility":"U"}},"resultDate":{"date":{"month":6,"day":10,"year":2014},"time":{"hour":5,"minute":12,"second":55,"millisecond":0,"tz":{"hour":0,"minute":0,"afterUTC":0}}},"metaData":{"tags":{"usp":"true"}}},
       {"uri":"DEV://social/chirp:475858716546594222","visibility":{"formalVisibility":"U", "advancedMarkings":{"externalCommunityVisibility":"U"}},"resultDate":{"date":{"month":6,"day":12,"year":2014},"time":{"hour":12,"minute":1,"second":12,"millisecond":0,"tz":{"hour":0,"minute":0,"afterUTC":0}}},"metaData":{"tags":{"usp":"false","exemption":"5"}}},
    ];
};