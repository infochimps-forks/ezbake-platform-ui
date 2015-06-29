package ezbake.globalsearch.resource;

import ezbake.base.thrift.EzSecurityToken;
import ezbake.data.elastic.thrift.Page;
import ezbake.data.elastic.thrift.Query;
import ezbake.globalsearch.service.ServiceClient;
import ezbake.services.search.SSRSearchResult;
import ezbake.services.search.ssrService;
import ezbake.services.search.SsrServiceConstants;
import ezbake.util.AuditEvent;
import ezbake.util.AuditEventType;
import org.apache.thrift.TException;
import org.codehaus.jettison.json.JSONException;
import org.codehaus.jettison.json.JSONObject;

import javax.ws.rs.Consumes;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.ext.ContextResolver;

@Path("ssr")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
public class ApiResource extends GlobalSearchResourceBase {

    @POST
    public String search(String originalRequest, @Context ContextResolver<ServiceClient> resource) throws JSONException {
        ServiceClient serviceClient = getFromContext(resource);
        String queryJson;
        JSONObject jsonRequest = new JSONObject(originalRequest);

        // Load the VisibilityToClassification class from the jar at configured path.
        String c2vJarPath = serviceClient.getConfiguration().getPath(C2V_JAR_PATH_PROPERTY, C2V_DEFAULT_PATH);
        VisibilityHelper.loadConverterClass(c2vJarPath, serviceClient.getConfiguration().getProperty(C2V_CLASSNAME_PROPERTY, C2V_DEFAULT_CLASSNAME));

        try {
            queryJson = jsonRequest.getJSONObject("query").toString();
        } catch (JSONException e) {
            queryJson = jsonRequest.getString("query");
        }

        int pageOffset = jsonRequest.getInt("pageOffset");
        short pageSize = (short) jsonRequest.getInt("pageSize");

        JSONObject result = null;

        try {
            ssrService.Client ssrClient = getSsrClient(serviceClient);
            Query query = new Query().setSearchString(queryJson).setPage(new Page().setPageSize(pageSize).setOffset(pageOffset));
            EzSecurityToken token = getSecurityToken(
                    serviceClient.getClientPool().getSecurityId(SsrServiceConstants.SERVICE_NAME),
                    serviceClient);
            AuditEvent auditEvent = AuditEvent.event(AuditEventType.AuditAndLogDataAccess.name(), token)
                    .arg("queryJson", queryJson)
                    .arg("pageOffset", pageOffset)
                    .arg("pageSize", pageSize);
            SSRSearchResult searchResult = null;
            try {
                searchResult = ssrClient.searchSSR(query, token);
            } catch (Exception e) {
                auditEvent.failed();
                generateError("Error querying the SSR service.", e);
            } finally {
                freeServiceClient(ssrClient, serviceClient);
            }
            try {
                result = convertToJson(searchResult, serviceClient);
            } catch (JSONException e) {
                generateError("Error converting SSR to JSON.", e);
            }
        } catch (TException e) {
            generateError("There was an error executing the search.", e);
        }

        return result.toString();
    }

}
