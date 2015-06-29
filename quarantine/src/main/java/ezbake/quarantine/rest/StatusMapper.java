package ezbake.quarantine.rest;

import java.util.List;
import java.util.Set;

/**
 * Created by nkhan on 5/23/14.
 */
public class StatusMapper {

    private String status;
    private String comment;
    private List<String> ids;

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getComment() {
        return comment;
    }

    public void setComment(String comment) {
        this.comment = comment;
    }

    public List<String> getIds() {
        return ids;
    }

    public void setIds(List<String> ids) {
        this.ids = ids;
    }
}
