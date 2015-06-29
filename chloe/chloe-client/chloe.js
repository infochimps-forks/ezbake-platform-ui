window.chloe = (function() {

  var chloe = new function() {
    this.ws = undefined;
    this.appName = undefined;
    this.channelName = undefined;
    this.owner = undefined;
    this.init = function(app, channel, chloeUri, ownerId, callback) {
      this.ws = new WebSocket(chloeUri);
      this.appName = app;
      this.channelName = channel;
      this.owner = ownerId;

      // Web socket is closed if no data is sent within 60 seconds, so we're sending the server a ping
      // every 55 seconds to keep the web socket alive
      setInterval(function() {
        if (chloe.ws.readyState === 1) {
          var msg = { app: chloe.appName, channel: chloe.channelName, status: "keep-alive" };
          if (chloe.owner) {
            msg.ownerId = chloe.owner;
          }
          chloe.ws.send(JSON.stringify(msg));
        } else if (chloe.ws.readyState === 2 || chloe.ws.readyState === 3) {
          // If the web socket is closed or closing, reopen it
          var onopen = chloe.ws.onopen;
          var onmessage = chloe.ws.onmessage;
          var onclose = chloe.ws.onclose;
          var onerror = chloe.ws.onerror;
          chloe.ws = new WebSocket(chloeUri);
          chloe.ws.open = onopen;
          chloe.ws.onmessage = onmessage;
          chloe.ws.onclose = onclose;
          chloe.ws.onerror = onerror;
        }
      }, 55000);
      
      this.ws.onopen = function() {
        if (chloe.channelName) {
          var msg = { app: chloe.appName, channel: chloe.channelName };
          if (chloe.owner) {
            msg.ownerId = chloe.owner;
          }
          chloe.ws.send(JSON.stringify(msg));
        }
      };
      this.ws.onmessage = function(message) {
        message = JSON.parse(message.data);
        if (callback) {
          callback(message);
        }
      };
      this.ws.onclose = function(e) {
        console.log("Websocket closed: ");
        console.log(e);
      };
      this.ws.onerror = function(e) {
        console.log("Websocket error: ");
        console.log(e);
      };
    };
    this.share = function(appData) {
      var msg = { app: this.appName, channel: this.channelName, appData: appData };
      if (this.owner) {
        msg.ownerId = this.owner;
      }
      this.ws.send(JSON.stringify(msg));
    };
  };

  return chloe;
}());
