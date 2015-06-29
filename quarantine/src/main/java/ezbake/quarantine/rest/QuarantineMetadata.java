package ezbake.quarantine.rest;

import ezbake.quarantine.thrift.QuarantineEvent;
import ezbake.quarantine.thrift.QuarantineResult;

import java.util.List;

/**
 * Created by nkhan on 4/30/14.
 */
public class QuarantineMetadata {

   private QuarantineResult result;

    public QuarantineMetadata(QuarantineResult result) {
        this.result = result;
    }

    public String getId() {
        return result.getId();
    }

    public String getObjectStatus() {
        return result.getStatus().toString();
    }

    public String getPipelineId(){
        return result.getObject().getPipelineId();
    }

    public String getPipeId(){
        return result.getObject().getPipeId();
    }

    public boolean isSerializable(){
        return result.getObject().isSerializable();
    }

    public String getFormalVisibility(){
        return result.getObject().getVisibility().getFormalVisibility();
    }

    public List<QuarantineEvent> getEvents(){
        return result.getEvents();
    }
}
