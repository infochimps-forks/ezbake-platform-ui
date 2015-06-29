package ezbake.globalsearch.resource;

import com.google.gson.Gson;
import ezbake.base.thrift.DateTime;
import ezbake.base.thrift.EzSecurityToken;
import ezbake.base.thrift.Visibility;
import ezbake.data.elastic.thrift.IndexResponse;
import ezbake.data.elastic.thrift.PercolateQuery;
import ezbake.globalsearch.service.ServiceClient;
import ezbake.services.search.PercolatorHitInbox;
import ezbake.services.search.PercolatorInboxPeek;
import ezbake.services.search.ssrService;
import ezbake.services.search.SsrServiceConstants;
import ezbake.util.AuditEvent;
import org.apache.commons.lang3.time.DateFormatUtils;
import org.apache.thrift.TException;
import org.codehaus.jettison.json.JSONException;
import org.codehaus.jettison.json.JSONObject;

import javax.ws.rs.Consumes;
import javax.ws.rs.DELETE;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.PUT;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.ext.ContextResolver;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Collections;
import java.util.Comparator;
import java.util.Date;
import java.util.List;
import java.util.Map;

/**
 * Created by fyan on 10/20/14.
 */
@Path("savedSearch")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
public class SavedSearchResource extends GlobalSearchResourceBase {

    @GET
    public String getAllSavedSearch(@Context ContextResolver<ServiceClient> resource) {
        List<SavedSearchRecord> savedSearchRecordList = new ArrayList<>();
        ServiceClient serviceClient = getFromContext(resource);

        try {
            ssrService.Client ssrClient = getSsrClient(serviceClient);
            EzSecurityToken token = getSecurityToken(serviceClient.getClientPool().getSecurityId(SsrServiceConstants.SERVICE_NAME), serviceClient);
            AuditEvent auditEvent = AuditEvent.event("getAllSavedSearch", token);

            Map<String, PercolatorInboxPeek> inbox;
            try {
                inbox = ssrClient.peekMainPercolatorInbox(token);

                logger.debug("**** main inbox = " + inbox.toString());

                for (Map.Entry<String, PercolatorInboxPeek> entry : inbox.entrySet()) {
                    String percolatorId = entry.getKey();
                    PercolatorInboxPeek inboxPeek = entry.getValue();

                    SavedSearchRecord record = new SavedSearchRecord(percolatorId, inboxPeek.getName(), getSearchTerm(inboxPeek.getSearchText()));
                    record.hasUpdates = inboxPeek.getCountOfHits() > 0;
                    if (record.hasUpdates) {
                        record.updateDate = new Date(convertFromThriftDateTime(inboxPeek.getLastFlushed()));
                    }
                    savedSearchRecordList.add(record);
                }

                // sort by name
                Collections.sort(savedSearchRecordList, new Comparator<SavedSearchRecord>() {
                    @Override
                    public int compare(SavedSearchRecord o1, SavedSearchRecord o2) {
                        return o1.name.compareTo(o2.name);
                    }
                });
            } catch (Exception e) {
                auditEvent.failed();
                generateError("Error peek main percolator inbox.", e);
            } finally {
                freeServiceClient(ssrClient, serviceClient);
            }
        } catch (TException e) {
            generateError("There was an error retrieving saved search.", e);
        }

        Gson gson = new Gson();
        return gson.toJson(savedSearchRecordList);
    }

    private long convertFromThriftDateTime(DateTime date) {
        final Calendar calendar = Calendar.getInstance(java.util.TimeZone.getTimeZone("UTC"));
        calendar.set(date.getDate().getYear(), date.getDate().getMonth() - 1, date.getDate().getDay(), 0, 0, 0);
        calendar.set(Calendar.MILLISECOND, 0);
        if (date.getTime() != null) {
            calendar.add(Calendar.HOUR_OF_DAY, date.getTime().getHour());
            calendar.add(Calendar.MINUTE, date.getTime().getMinute());
            if (date.getTime().isSetSecond()) {
                calendar.add(Calendar.SECOND, date.getTime().getSecond());
            }
            if (date.getTime().isSetMillisecond()) {
                calendar.add(Calendar.MILLISECOND, date.getTime().getMillisecond());
            }
            if (date.getTime().getTz().isAfterUTC()) {
                calendar.add(Calendar.HOUR_OF_DAY, 0 - date.getTime().getTz().getHour());
                calendar.add(Calendar.MINUTE, 0 - date.getTime().getTz().getMinute());
            } else {
                calendar.add(Calendar.HOUR_OF_DAY, date.getTime().getTz().getHour());
                calendar.add(Calendar.MINUTE, date.getTime().getTz().getMinute());
            }
        }
        return calendar.getTime().getTime();
    }

    // parse {"query":{"query_string":{"query":"if"}}}
    private String getSearchTerm(String searchString) throws JSONException {
        JSONObject object = new JSONObject(searchString);
        return object.getJSONObject("query").getJSONObject("query_string").getString("query");
    }

    @GET
    @Path("/{id}")
    public String getSavedSearchUpdates(@PathParam("id") String id, @Context ContextResolver<ServiceClient> resource) throws JSONException {
        ServiceClient serviceClient = getFromContext(resource);
        JSONObject result = new JSONObject();

        // Load the VisibilityToClassification class from the jar at configured path.
        String c2vJarPath = serviceClient.getConfiguration().getPath(C2V_JAR_PATH_PROPERTY, C2V_DEFAULT_PATH);
        VisibilityHelper.loadConverterClass(c2vJarPath, serviceClient.getConfiguration().getProperty(C2V_CLASSNAME_PROPERTY, C2V_DEFAULT_CLASSNAME));

        try {
            ssrService.Client ssrClient = getSsrClient(serviceClient);
            EzSecurityToken token = getSecurityToken(serviceClient.getClientPool().getSecurityId(SsrServiceConstants.SERVICE_NAME), serviceClient);
            AuditEvent auditEvent = AuditEvent.event("getSavedSearchUpdates", token)
                    .arg("id", id);

            try {
                PercolatorHitInbox response = ssrClient.getAndFlushPercolatorInbox(id, token);

                logger.debug("getAndFlushPercolatorInbox response = " + response.toString());

                result = convertToJson(response.getHits(), serviceClient);

                // saved search status
                result.put("exceedsLimit", response.isExceedLimit());
                Date flushDate = new Date(convertFromThriftDateTime(response.getLastFlushed()));
                result.put("lastFlushed", DateFormatUtils.format(flushDate, "EEE, MMM dd yyyy HH:mm:ss"));

            } catch (Exception e) {
                auditEvent.failed();
                generateError("Error get percolator inbox.", e);
            } finally {
                freeServiceClient(ssrClient, serviceClient);
            }
        } catch (TException e) {
            generateError("There was an error saving the search.", e);
        }

        return result.toString();
    }

    @PUT
    public String addSavedSearch(String originalRequest, @Context ContextResolver<ServiceClient> resource) throws JSONException {
        ServiceClient serviceClient = getFromContext(resource);
        JSONObject jsonRequest = new JSONObject(originalRequest);

        String name = jsonRequest.getString("name");
        String searchTerm = jsonRequest.getString("searchTerm");
        String queryString = jsonRequest.getJSONObject("query").toString();

        SavedSearchRecord record = null;
        try {
            ssrService.Client ssrClient = getSsrClient(serviceClient);
            EzSecurityToken token = getSecurityToken(serviceClient.getClientPool().getSecurityId(SsrServiceConstants.SERVICE_NAME), serviceClient);
            AuditEvent auditEvent = AuditEvent.event("addSavedSearch", token)
                    .arg("name", name)
                    .arg("searchTerm", searchTerm);

            PercolateQuery query = new PercolateQuery();
            query.setQueryDocument(queryString);
            query.setVisibility(new Visibility().setFormalVisibility(token.getAuthorizationLevel()));

            try {
                IndexResponse response = ssrClient.putPercolateQuery(name, query, token);

                logger.debug("putPercolateQuery response = " + response.toString());
                if (response.isSuccess()) {
                    record = new SavedSearchRecord(response.get_id(), name, searchTerm);
                } else {
                    throw new Exception("Failed to save search");
                }
            } catch (Exception e) {
                auditEvent.failed();
                // TODO: how can we display more specific error message returned from SSR service?
                // It seems apache thrift swallowed the original error message and replaced with "Internal error processing putPercolateQuery"
                generateError("Error put percolator query. Please make sure your search is not too broad.", e);
            } finally {
                freeServiceClient(ssrClient, serviceClient);
            }
        } catch (TException e) {
            generateError("There was an error saving the search.", e);
        }

        Gson gson = new Gson();
        return gson.toJson(record);

    }

    @POST
    public String updateSavedSearch(String originalRequest, @Context ContextResolver<ServiceClient> resource) throws JSONException {
        ServiceClient serviceClient = getFromContext(resource);
        JSONObject jsonRequest = new JSONObject(originalRequest);
        boolean success = false;

        String id = jsonRequest.getString("id");
        String name = jsonRequest.getString("name");

        try {
            ssrService.Client ssrClient = getSsrClient(serviceClient);
            EzSecurityToken token = getSecurityToken(serviceClient.getClientPool().getSecurityId(SsrServiceConstants.SERVICE_NAME), serviceClient);
            AuditEvent auditEvent = AuditEvent.event("updateSavedSearch", token)
                    .arg("id", id)
                    .arg("name", name);

            try {
                IndexResponse response = ssrClient.updatePercolateInbox(name, id, token);
                logger.debug("updatePercolateInbox response = " + response.toString());
                success = response.isSuccess();

                if (!success) {
                    throw new Exception("Failed to update percolate inbox");
                }
            } catch (Exception e) {
                auditEvent.failed();
                generateError("Error update percolate inbox.", e);
            } finally {
                freeServiceClient(ssrClient, serviceClient);
            }
        } catch (TException e) {
            generateError("There was an error updating the saved search.", e);
        }

        JSONObject result = new JSONObject();
        result.put("success", success);

        return result.toString();
    }

    @DELETE
    @Path("/{id}")
    public String deleteSavedSearch(@PathParam("id") String id, @Context ContextResolver<ServiceClient> resource) throws JSONException {
        ServiceClient serviceClient = getFromContext(resource);
        boolean success = false;

        try {
            ssrService.Client ssrClient = getSsrClient(serviceClient);
            EzSecurityToken token = getSecurityToken(serviceClient.getClientPool().getSecurityId(SsrServiceConstants.SERVICE_NAME), serviceClient);
            AuditEvent auditEvent = AuditEvent.event("deleteSavedSearch", token).
                    arg("id", id);

            try {
                success = ssrClient.deletePercolateQuery(id, token);
                logger.debug("deletePercolateQuery response = " + success);

                if (!success) {
                    throw new Exception("Failed to delete percolate query");
                }
            } catch (Exception e) {
                auditEvent.failed();
                generateError("Error delete percolator query.", e);
            } finally {
                freeServiceClient(ssrClient, serviceClient);
            }
        } catch (TException e) {
            generateError("There was an error deleting the saved search.", e);
        }

        JSONObject result = new JSONObject();
        result.put("success", success);

        return result.toString();
    }

    private class SavedSearchRecord {
        public String id;
        public String name;
        public String searchTerm;
        public boolean hasUpdates;
        public Date updateDate;

        public SavedSearchRecord(String id, String name, String searchTerm) {
            this.id = id;
            this.name = name;
            this.searchTerm = searchTerm;
        }
    }
}
