package ezbake.quarantine.rest;

import ezbake.quarantine.thrift.EventWithCount;
import ezbake.quarantine.thrift.Quarantine;
import ezbake.quarantine.thrift.QuarantineEvent;

import java.util.Set;

/**
 * Created by nkhan on 5/21/14.
 */
public class PipeData {

    private static final int MAX_CHAR_LENGTH = 20;
    private long sum;
    private QuarantineEvent latestEvent;
    private Set<EventWithCount> eventWithCounts;

    public PipeData(long sum, QuarantineEvent latestEvent, Set<EventWithCount> eventWithCounts) {
        this.sum = sum;
        this.latestEvent = latestEvent;
        this.eventWithCounts = eventWithCounts;
    }

    public long getSum() {
        return sum;
    }

    public String getTruncatedEventText() {
        String eventText = latestEvent.getEvent();
        if (eventText == null) {
            return "";
        }
        if (eventText.length() > MAX_CHAR_LENGTH) {
            return eventText.substring(0, MAX_CHAR_LENGTH-1) + "...";
        } else {
            return eventText;
        }
    }

    public long getLatestEventTimeStamp(){
        return latestEvent.timestamp;
    }

    public Set<EventWithCount> getEventsWithCounts() {
        return eventWithCounts;
    }

    public boolean isSerializable(){
        return true;
    }
}
