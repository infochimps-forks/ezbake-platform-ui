package ezbake.globalsearch.resource;

import ezbake.base.thrift.EzSecurityToken;
import ezbake.globalsearch.service.ServiceClient;
import ezbake.groups.thrift.EzGroupsConstants;
import ezbake.ins.thrift.gen.InternalNameService;
import ezbake.ins.thrift.gen.WebApplicationLink;
import org.apache.thrift.TException;
import org.codehaus.jettison.json.JSONArray;
import org.codehaus.jettison.json.JSONException;
import org.codehaus.jettison.json.JSONObject;

import javax.ws.rs.Consumes;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.ext.ContextResolver;
import java.util.Set;

@Path("chloe")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
public class ChloeResource extends GlobalSearchResourceBase {

    @GET
    public String getChloeWebApps(String originalRequest, @Context ContextResolver<ServiceClient> resource) throws JSONException {
        ServiceClient serviceClient = getFromContext(resource);
        JSONObject results = null;

        try {
            InternalNameService.Client insClient = getInsClient(serviceClient);
            results = new JSONObject();
            EzSecurityToken token = getSecurityToken(
                    serviceClient.getClientPool().getSecurityId(EzGroupsConstants.SERVICE_NAME),
                    serviceClient);

            try {
                JSONArray jsonWebApps = new JSONArray();
                Set<WebApplicationLink> apps = insClient.getChloeWebApps();
                for (WebApplicationLink app : apps) {
                    try {
                        if (!hasPermission(app, token, serviceClient)) {
                            continue;
                        }
                    } catch (TException e) {
                        final String msg = "An error occurred checking permissions.";
                        generateError(msg, e);
                    }
                    JSONObject jsonWebApplicationLink = new JSONObject();
                    jsonWebApplicationLink.put("appName", app.getAppName());
                    jsonWebApplicationLink.put("webUrl", app.getWebUrl());
                    jsonWebApps.put(jsonWebApplicationLink);
                }
                results.put("apps", jsonWebApps);

            } catch (IllegalArgumentException e) {
                generateError(e.getMessage(), e);
            } finally {
                freeServiceClient(insClient, serviceClient);
            }
        } catch (TException e) {
            generateError("Unable to convert thrift object to json.", e);
        }

        return results.toString();
    }
}
