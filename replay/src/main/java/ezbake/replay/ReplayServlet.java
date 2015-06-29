package ezbake.replay;

import com.google.common.base.Strings;
import ezbake.base.thrift.EzSecurityToken;
import ezbake.base.thrift.EzSecurityTokenException;
import ezbake.configuration.EzConfiguration;
import ezbake.configuration.EzConfigurationLoaderException;
import ezbake.security.client.EzbakeSecurityClient;
import ezbake.thrift.ThriftClientPool;
import ezbake.warehaus.GetDataType;
import org.apache.commons.lang.IncompleteArgumentException;
import org.apache.commons.lang.StringUtils;
import org.apache.thrift.TException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import ezbake.base.thrift.DateTime;

import java.text.ParseException;
import java.util.Enumeration;
import javax.servlet.ServletConfig;
import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.PrintWriter;
import java.io.IOException;
import java.util.Properties;
import java.util.UUID;

/**
 *
 */
@WebServlet("/replay")
public class ReplayServlet extends HttpServlet {
    private static final Logger logger = LoggerFactory.getLogger(ReplayServlet.class);
    private ThriftClientPool pool;
    private EzbakeSecurityClient securityClient;

    @Override
    public void init(ServletConfig config) throws ServletException {
        super.init(config);
        try {
            Properties props = new EzConfiguration().getProperties();
            pool = new ThriftClientPool(props);
            securityClient = new EzbakeSecurityClient(props);
        } catch (EzConfigurationLoaderException e) {
            logger.error("Could not load EzConfiguration", e);
            throw new RuntimeException("Need ezconfiguration properties for servlect to load", e);
        }
    }
    protected void doPost(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        ProcessRequest(request, response);
    }

    protected void doGet(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        ProcessRequest(request, response);
    }


    protected void ProcessRequest(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        String start = request.getParameter("start");
        String end = request.getParameter("end");
        String uri = request.getParameter("uri");
        String topic = request.getParameter("topic");
        String debug = request.getParameter("debug");
        String typeParameter = request.getParameter("type");
        GetDataType type = Strings.isNullOrEmpty(typeParameter) ? GetDataType.PARSED : GetDataType.valueOf(typeParameter);
        boolean replayLatestOnly = Boolean.parseBoolean(request.getParameter("replay_latest"));
        int replayIntervalMinutes = Integer.parseInt(request.getParameter("replay_interval_minutes"));
        DateTime ezStartDateTime = null;
        DateTime ezEndDateTime = null;

        PrintWriter out = response.getWriter();

        try {

            response.setContentType("text/html");
            if (StringUtils.isNotEmpty(debug))
            {
                out.println("Request Headers<hr/>");
                Enumeration<String> headerNames = request.getHeaderNames();
                while (headerNames.hasMoreElements()) {
                    String headerName = headerNames.nextElement();
                    out.print("Header Name: <em>" + headerName);
                    String headerValue = request.getHeader(headerName);
                    out.print("</em>, Header Value: <em>" + headerValue);
                    out.println("</em><br/>");
                }
                return;
            }
            if (Strings.isNullOrEmpty(start))
                start = null;
            if (Strings.isNullOrEmpty(end))
                end = null;

            if (Strings.isNullOrEmpty(uri))
                uri = null;

            if (Strings.isNullOrEmpty(topic))
                throw new IncompleteArgumentException("missing topic");

            if (start != null)
                ezStartDateTime = Replay.convertDate(start);

            if (end != null)
                ezEndDateTime = Replay.convertDate(end);
            EzSecurityToken token = securityClient.fetchTokenForProxiedUser();


            logger.info("Replay request from {}, for URI {}, broadcasting to topic {}", 
                    token.getTokenPrincipal().getName(), uri, topic);
            // Since we are broadcasting just generate a random groupId
            String groupId = UUID.randomUUID().toString();
            String status = Replay.replayRequest(pool, uri, ezStartDateTime, ezEndDateTime, topic, groupId, replayLatestOnly, token, type, replayIntervalMinutes);

            out.println(status);

        } catch (ParseException e) {
            logger.error("Issue parsing dates", e);
            throw new ServletException(e);
        } catch (EzSecurityTokenException e) {
            logger.error("Exception thrown attempting to retrieve security token", e);
            throw new ServletException(e);
        } catch (TException e) {
            logger.error("Thrift exception thrown by replay", e);
            throw new ServletException(e);
        }
    }

}
