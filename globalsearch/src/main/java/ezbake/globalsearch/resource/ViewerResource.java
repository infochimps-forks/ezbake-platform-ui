package ezbake.globalsearch.resource;

import com.sun.jersey.core.header.ContentDisposition;
import ezbake.globalsearch.service.ServiceClient;
import org.apache.commons.lang3.StringUtils;
import org.codehaus.jettison.json.JSONArray;
import org.codehaus.jettison.json.JSONException;
import org.codehaus.jettison.json.JSONObject;

import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import javax.ws.rs.ext.ContextResolver;
import java.io.UnsupportedEncodingException;
import java.net.URLDecoder;
import java.nio.charset.Charset;
import java.util.Iterator;

@Path("viewer")
public class ViewerResource extends GlobalSearchResourceBase {

    @GET
    @Path("export")
    public Response export(@QueryParam("uri") String uri, @Context ContextResolver<ServiceClient> resource) throws JSONException {
        ServiceClient serviceClient = getFromContext(resource);
        try {
            Charset utf8 = Charset.forName("UTF-8");
            uri = URLDecoder.decode(uri, utf8.name());
        } catch (UnsupportedEncodingException e) {
            generateError(e.getMessage(), e);
        }

        JSONObject result = getDocumentFromWarehaus(uri, serviceClient);
        String xml = "<?xml version=\"1.0\"?>\n<document>";
        xml += generateXml(result, 1);
        xml += "</document>\n";
        return buildResponse(xml, MediaType.APPLICATION_XML, "document.xml");
    }

    private Response buildResponse(Object responseObject, String mimeType, String fileName) {
        ContentDisposition contentDisposition = ContentDisposition.type("attachment")
                .fileName(fileName).build();

        return Response.ok(responseObject, mimeType)
                .type(mimeType)
                .header("Content-Disposition", contentDisposition)
                .build();
    }

    private String generateXml(JSONArray jsonArray, int tabs) throws JSONException {
        String xml = "\n";

        for (int index = 0; index < jsonArray.length(); index++) {
            xml += StringUtils.repeat('\t', tabs);
            xml += "<" + index + ">";
            if (jsonArray.get(index) instanceof JSONObject) {
                xml += generateXml(jsonArray.getJSONObject(index), tabs + 1);
                xml += StringUtils.repeat('\t', tabs);
            } else if (jsonArray.get(index) instanceof JSONArray) {
                xml += generateXml(jsonArray.getJSONArray(index), tabs + 1);
                xml += StringUtils.repeat('\t', tabs);
            } else {
                xml += jsonArray.getString(index);
            }
            xml += "</" + index + ">\n";
        }
        return xml;
    }

    private String generateXml(JSONObject jsonObject, int tabs) throws JSONException {
        String xml = "\n";
        Iterator<?> keys = jsonObject.keys();

        while (keys.hasNext()) {
            String property = (String) keys.next();
            xml += StringUtils.repeat('\t', tabs);
            xml += "<" + property + ">";

            if (jsonObject.get(property) instanceof JSONObject) {
                xml += generateXml(jsonObject.getJSONObject(property), tabs + 1);
                xml += StringUtils.repeat('\t', tabs);
            } else if (jsonObject.get(property) instanceof JSONArray) {
                xml += generateXml(jsonObject.getJSONArray(property), tabs + 1);
                xml += StringUtils.repeat('\t', tabs);
            } else {
                xml += jsonObject.getString(property);
            }
            xml += "</" + property + ">\n";
        }
        return xml;
    }
}
