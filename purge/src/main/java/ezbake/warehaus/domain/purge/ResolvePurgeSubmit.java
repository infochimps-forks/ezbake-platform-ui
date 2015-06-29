package ezbake.warehaus.domain.purge;

/**
 * Created by jpercivall on 10/9/14.
 */
public class ResolvePurgeSubmit {
    private Long purgeId;
    private String resolveNote;

    public Long getPurgeId() {
        return purgeId;
    }

    public void setPurgeId(Long purgeId) {
        this.purgeId = purgeId;
    }

    public String getResolveNote() {
        return resolveNote;
    }

    public void setResolveNote(String resolveNote) {
        this.resolveNote = resolveNote;
    }
}
