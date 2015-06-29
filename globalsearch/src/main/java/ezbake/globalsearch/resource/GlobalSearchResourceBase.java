package ezbake.globalsearch.resource;

import com.google.common.collect.Sets;
import com.sun.jersey.core.spi.factory.ResponseBuilderImpl;
import ezbake.base.thrift.EzSecurityToken;
import ezbake.base.thrift.EzSecurityTokenException;
import ezbake.base.thrift.SSR;
import ezbake.base.thrift.Visibility;
import ezbake.common.ins.INSUtility;
import ezbake.configuration.EzConfigurationLoaderException;
import ezbake.globalsearch.service.ServiceClient;
import ezbake.groups.thrift.EzGroups;
import ezbake.groups.thrift.EzGroupsConstants;
import ezbake.ins.thrift.gen.InternalNameService;
import ezbake.ins.thrift.gen.InternalNameServiceConstants;
import ezbake.ins.thrift.gen.WebApplicationLink;
import ezbake.security.client.EzbakeSecurityClient;
import ezbake.services.search.SSRSearchResult;
import ezbake.services.search.ssrService;
import ezbake.services.search.SsrServiceConstants;
import ezbake.util.AuditEvent;
import ezbake.util.AuditEventType;
import ezbake.util.AuditLogger;
import ezbake.warehaus.ViewId;
import ezbake.warehaus.WarehausService;
import ezbake.warehaus.WarehausServiceConstants;
import org.apache.thrift.TException;
import org.apache.thrift.TSerializer;
import org.apache.thrift.TServiceClient;
import org.apache.thrift.protocol.TSimpleJSONProtocol;
import org.apache.thrift.transport.TTransportException;
import org.codehaus.jettison.json.JSONArray;
import org.codehaus.jettison.json.JSONException;
import org.codehaus.jettison.json.JSONObject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.ws.rs.WebApplicationException;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import javax.ws.rs.ext.ContextResolver;
import java.io.UnsupportedEncodingException;
import java.net.URLDecoder;
import java.net.URLEncoder;
import java.nio.charset.Charset;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Set;

public class GlobalSearchResourceBase {
    protected static Logger logger = LoggerFactory.getLogger(GlobalSearchResourceBase.class);
    protected static AuditLogger auditLogger;

    protected static final String C2V_JAR_PATH_PROPERTY = "globalsearch.c2v.jarpath";
    protected static final String C2V_DEFAULT_PATH = "";
    protected static final String C2V_CLASSNAME_PROPERTY = "globalsearch.c2v.classname";
    protected static final String C2V_DEFAULT_CLASSNAME = "";

    public GlobalSearchResourceBase() {
        if (auditLogger == null) {
            try {
                auditLogger = AuditLogger.getDefaultAuditLogger(GlobalSearchResourceBase.class);
            } catch (EzConfigurationLoaderException e) {
                throw new WebApplicationException(Response.Status.INTERNAL_SERVER_ERROR);
            }
        }
    }

    protected EzSecurityToken getSecurityToken(String securityId, ServiceClient serviceClient) {
        EzbakeSecurityClient securityClient = getSecurityClient(serviceClient);

        EzSecurityToken token = null;
        try {
            token = (securityId == null || securityId.isEmpty()) ?
                    securityClient.fetchTokenForProxiedUser() : securityClient.fetchTokenForProxiedUser(securityId);
        } catch (EzSecurityTokenException e) {
            generateError("Error retrieving security token", e);
        }

        return token;

    }

    protected ssrService.Client getSsrClient(ServiceClient serviceClient) throws TException {
        return serviceClient.getClientPool().getClient(SsrServiceConstants.SERVICE_NAME, ssrService.Client.class);
    }

    protected InternalNameService.Client getInsClient(ServiceClient serviceClient) throws TException {
        return serviceClient.getClientPool().getClient(InternalNameServiceConstants.SERVICE_NAME, InternalNameService.Client.class);
    }

    protected WarehausService.Client getWarehausClient(ServiceClient serviceClient) throws TException {
        return serviceClient.getClientPool().getClient(WarehausServiceConstants.SERVICE_NAME, WarehausService.Client.class);
    }

    private EzGroups.Client getEzGroupsClient(ServiceClient serviceClient) throws TException {
        return serviceClient.getClientPool().getClient(EzGroupsConstants.SERVICE_NAME, EzGroups.Client.class);
    }

    protected void freeServiceClient(TServiceClient client, ServiceClient serviceClient) {
        serviceClient.getClientPool().returnToPool(client);
    }

    protected <T extends TServiceClient> T invalidateServiceClient(T client, ServiceClient serviceClient, Exception ex) {
        if (ex.getClass().getName().equals(TTransportException.class.getName())) {
            return invalidateServiceClient(client, serviceClient);
        } else {
            return client;
        }
    }

    protected <T extends TServiceClient> T invalidateServiceClient(T client, ServiceClient serviceClient) {
        serviceClient.getClientPool().returnBrokenToPool(client);
        return null;
    }

    protected EzbakeSecurityClient getSecurityClient(ServiceClient resource) {
        return resource.getSecurityClient();
    }

    protected boolean hasPermission(WebApplicationLink link, EzSecurityToken token, ServiceClient serviceClient) throws TException {
        boolean retVal;

        String groupName = link.getRequiredGroupName();
        if (groupName == null || groupName.isEmpty()) {
            retVal = true;
        } else {
            // Make sure the user is in the required group
            EzGroups.Client ezGroupsClient = getEzGroupsClient(serviceClient);
            try {
                Set<String> groupNames = new HashSet<>();
                groupNames.add(groupName);
                Set<Long> groupMask = ezGroupsClient.getGroupsMask(token, groupNames, null, null);
                Set<Long> userGroups = token.getAuthorizations().getPlatformObjectAuthorizations();
                retVal = Sets.intersection(groupMask, userGroups).size() > 0;
            } finally {
                freeServiceClient(ezGroupsClient, serviceClient);
            }
        }

        return retVal;
    }

    protected ServiceClient getFromContext(ContextResolver<ServiceClient> context) {
        return context.getContext(ServiceClient.class);
    }

    protected JSONObject getDocumentFromWarehaus(String uri, ServiceClient serviceClient) {
        JSONObject result = null;
        try {
            WarehausService.Client warehausClient = getWarehausClient(serviceClient);
            ViewId id = new ViewId(uri, "SSR", "JSON");
            EzSecurityToken token = getSecurityToken(
                    serviceClient.getClientPool().getSecurityId(WarehausServiceConstants.SERVICE_NAME),
                    serviceClient);
            AuditEvent auditEvent = AuditEvent.event(AuditEventType.AuditAndLogDataAccess.name(), token)
                    .arg("uri", uri);
            try {
                String warehausJson = new String(warehausClient.getLatestView(id, token).getPacket());
                result = new JSONObject(warehausJson);
            } catch (Exception e) {
                auditEvent.failed();
                generateError("Unable to retrieve document from the data warehaus.", e);
            } finally {
                auditLogger.logEvent(auditEvent);
                freeServiceClient(warehausClient, serviceClient);
            }
        } catch (TException e) {
            generateError("Unable to retrieve document from the data warehaus.", e);
        }
        return result;
    }

    protected void generateError(String message, Exception e) throws WebApplicationException {
        logger.error(message, e);
        throw new WebApplicationException(new ResponseBuilderImpl()
                .status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(message)
                .type(MediaType.APPLICATION_JSON)
                .build());
    }

    protected JSONObject convertToJson(SSRSearchResult searchResult, ServiceClient serviceClient) throws JSONException {
        TSerializer serializer = new TSerializer(new TSimpleJSONProtocol.Factory());
        try {
            InternalNameService.Client insClient = getInsClient(serviceClient);
            HashMap<String, Visibility> visibilities = new HashMap<String, Visibility>();
            for (SSR ssr : searchResult.getMatchingRecords()) {
                visibilities.put(ssr.getUri(), ssr.getVisibility());
            }

            JSONObject results = new JSONObject(serializer.toString(searchResult));
            EzSecurityToken token = getSecurityToken(
                    serviceClient.getClientPool().getSecurityId(EzGroupsConstants.SERVICE_NAME),
                    serviceClient);
            try {
                // Enrich the search results with information about what apps can open each URI
                JSONArray matchingRecords = results.getJSONArray("matchingRecords");
                for (int i = 0; i < matchingRecords.length(); i++) {
                    JSONObject record = matchingRecords.getJSONObject(i);
                    String uri = record.getString("uri");
                    String prefix = null;
                    try {
                        prefix = INSUtility.getUriPrefix(uri);
                    } catch (IllegalArgumentException e) {
                        generateError(String.format("%s: %s", e.getMessage(), uri), e);
                    }
                    record.put("prefix", prefix);

                    // Add the visibility strings to the json object
                    Visibility visibility = visibilities.get(uri);
                    record.put("portionMarking", VisibilityHelper.getShortMarkings(visibility));
                    record.put("fullTextVisibility", VisibilityHelper.getFullMarkings(visibility));

                    Set<WebApplicationLink> webApplicationLinks = Sets.newHashSet();
                    if (!serviceClient.getCache().containsKey(prefix)) {
                        try {
                            webApplicationLinks = insClient.getWebAppsForUri(prefix);
                            serviceClient.getCache().put(prefix, webApplicationLinks);
                        } catch (TException e) {
                            logger.error("Error getWebAppsForUri uri = " + prefix, e);
                        }
                    } else {
                        webApplicationLinks = serviceClient.getCache().get(prefix);
                    }

                    JSONArray jsonWebApplicationLinks = new JSONArray();
                    for (WebApplicationLink link : webApplicationLinks) {
                        try {
                            if (!hasPermission(link, token, serviceClient)) {
                                continue;
                            }
                        } catch (TException e) {
                            final String msg = "An error occurred checking permissions.";
                            generateError(msg, e);
                        }
                        String webUrl = uri;
                        if (!link.isIncludePrefix()) {
                            webUrl = webUrl.replace(prefix, "");
                        }
                        try {
                            Charset utf8 = Charset.forName("UTF-8");
                            webUrl = URLEncoder.encode(URLDecoder.decode(webUrl, utf8.name()), utf8.name());
                        } catch (UnsupportedEncodingException e) {
                            generateError(e.getMessage(), e);
                        }

                        JSONObject jsonWebApplicationLink = new JSONObject();
                        jsonWebApplicationLink.put("appName", link.getAppName());
                        jsonWebApplicationLink.put("webUrl", link.getWebUrl().replace("{uri}", webUrl));
                        jsonWebApplicationLinks.put(jsonWebApplicationLink);
                    }
                    record.put("webApplicationLinks", jsonWebApplicationLinks);
                }
            } finally {
                freeServiceClient(insClient, serviceClient);
            }

            return results;
        } catch (TException e) {
            // FIXME: Narrow the scope of this try/catch block so we can log
            // a more appropriate message
            final String msg = "An error occurred handling the SSR SearchResult.";
            generateError(msg, e);
        }
        return null;
    }
}
