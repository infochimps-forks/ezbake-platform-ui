$(document).ready(function() {
    // Set an interval to check the status for the current user every 6 seconds
    var interval = setInterval(getStatusForUser, 6000);

    // Set up the datepickers
    $('#start').datetimepicker({
        timeFormat: 'HH:mm:ss'
    });
    $('#end').datetimepicker({
        timeFormat: 'HH:mm:ss'
    });

    // Auto refresh toggle
    $(".refresh-toggle").click(function() {
        if ($(this).text() === "Auto Refresh ON") {
            clearInterval(interval);
            $(this).text("Auto Refresh OFF");
        } else {
            interval = setInterval(getStatusForUser, 6000);
            $(this).text("Auto Refresh ON");
        }
    });

    // Get the status when the page loads
    getStatusForUser();

    // When the replay button is clicked, validate the inputs and send the data to the replay endpoint
    $("#replayButton").click(function() {
        var topic = $("#topic").val();
        var uri = $("#uri").val();
        var start = $("#start").val();
        var end = $("#end").val();
        var latest = $("#replay_latest_only").val();
        var type = $("#replay_type").val();
        var interval = $("#replay_interval_minutes").val();

        if (topic.length == 0) {
            alert("Topic must be specified");
            return false;
        }
        if (uri.length == 0) {
            alert("uri must be specified");
            return false;
        }
        if (start.length == 0) {
            alert("Start time must be specified");
            return false;
        } else {
            start = start + " " + $("#TimeZone").val();
        }

        if (end === null || end === "") {
            alert("End time must be specified");
            return false;
        } else {
            end = end + " " + $("#TimeZone").val();
        }

        $("#insertstatus").text("Submitting request....");

        $.ajax({
            url : 'replay',
            type : "POST",
            data : {
                start: start,
                end: end,
                topic: topic,
                uri: uri,
                replay_latest: latest,
                type: type,
                replay_interval_minutes: interval
            },
            dataType: 'text',
            success : function(result) {
                setTimeout(function() {
                    // This needs to be more robust. I want to clear out the request status only when the
                    // status table is updated with a new row
                    getStatusForUserWithCallback(function(data) {
                        $("#requeststatus").text("");
                        $("#insertstatus").text("");
                        populateStatusTable(data);
                    })}, 4000);
            },
            error : function(obj, status, errMsg) {
                $("#requeststatus").html(status);
                $("#insertstatus").html(errMsg + " Try again later or contact an administrator.");
            }
        });
    });

    function getStatusForUser() {
        getStatusForUserWithCallback(populateStatusTable);
    }

    function getStatusForUserWithCallback(callback) {
        $.ajax({
            url: 'status',
            type: "GET",
            dataType: 'json',
            success: function(data) {
                callback(data);
            },
            error: function(xhr, status, error) {
                dropHistory();
            }
        });
    }

    function removeStatus(timestamp) {
        $.ajax({
           url: 'status?timestamp=' + timestamp,
           type: "DELETE",
           success: function(data) {
               getStatusForUser();
           }
       });
    }

    function populateStatusTable(data) {
        var html;
        if (data && data.replayHistory) {
            html  = "<table class='formatHTML5'>";
            html += "<thead><tr><td>Submit Time</td><td>Start</td><td>Finish</td><td>Uri</td><td>Topic</td><td>Total</td><td>Count</td><td>Status</td><td>Last Broadcast Version</td><td>Remove</td></tr></thead>";

            var key;
            var keys = new Array();
            for (key in data.replayHistory) {
                keys.push(key);
                }
            keys.sort().reverse();

            for (var i in keys) {
                key = keys[i];
                var entry = data.replayHistory[key];
                var submitTime = moment(new Date(+key)).format('HH:mm:ss MM/DD/YYYY Z');
                html += "<tr>";
                html += "<td>" + submitTime + "</td>";
                html += "<td>" + entry.start + "</td>";
                html += "<td>" + entry.finish + "</td>";
                html += "<td>" + entry.uri + "</td>";
                html += "<td>" + entry.topic + "</td>";
                html += "<td>" + entry.total + "</td>";
                html += "<td>" + entry.count + "</td>";
                html += "<td>" + entry.status + "</td>";
                html += "<td>" + entry.lastBroadcast + "</td>";
                html += "<td><a id=\"" + key + "\" class=\"remove-entry\">X</a></td>";
                html += "</tr>";
            }
            html += "</table>";

            $("#statusTable").html(html);
            $(".remove-entry").click(function() {
                removeStatus($(this).attr('id'));
            });
        } else {
            dropHistory();
        }
    }

    function dropHistory() {
        $("#statusTable").html("No history");
    }
});