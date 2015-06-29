package ezbake.quarantine.rest;

/**
 * This is hacky and annoying and it's because Angular expects any array returned from .query()
 * to be an array of objects.
 */
public class PipelineIdWrapper {
    private String pipelineId;

    public PipelineIdWrapper(String pipelineId) {
        this.pipelineId = pipelineId;
    }

    public String getPipelineId() {
        return pipelineId;
    }
}
