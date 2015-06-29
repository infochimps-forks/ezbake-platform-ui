package ezbake.warehaus.domain.purge;

import java.util.ArrayList;
import java.util.List;

/**
 * Created by jpercivall on 10/24/14.
 */
public class PagedPurgeStates {

    private Long count;
    private List<PurgeState> purgeStates = new ArrayList<PurgeState>();

    public Long getCount() {
        return count;
    }

    public void setCount(Long count) {
        this.count = count;
    }

    public List<PurgeState> getPurgeStates() {
        return purgeStates;
    }

    public void setPurgeStates(List<PurgeState> purgeStates) {
        this.purgeStates = purgeStates;
    }
}
