package ezbake.replay;

import ezbake.base.thrift.EzSecurityToken;
import ezbake.base.thrift.EzSecurityTokenException;
import ezbake.configuration.EzConfiguration;
import ezbake.configuration.EzConfigurationLoaderException;
import ezbake.security.client.EzbakeSecurityClient;
import ezbake.thrift.ThriftClientPool;
import org.apache.commons.lang.StringUtils;
import org.apache.thrift.TException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.servlet.ServletConfig;
import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.io.PrintWriter;
import java.util.Properties;

/**
 * Created with IntelliJ IDEA.
 * User: dchambers
 * Date: 3/4/14
 * Time: 3:55 PM
 * To change this template use File | Settings | File Templates.
 */
@WebServlet("/status")
public class StatusServlet extends HttpServlet {

    private static final Logger logger = LoggerFactory.getLogger(StatusServlet.class);
    private ThriftClientPool pool;
    private EzbakeSecurityClient securityClient;

    @Override
    public void init(ServletConfig config) throws ServletException {
        super.init(config);
        Properties props;
        try {
            props = new EzConfiguration().getProperties();
            pool = new ThriftClientPool(props);
            securityClient = new EzbakeSecurityClient(props);
        } catch (EzConfigurationLoaderException e) {
            logger.error("Could not load EzConfiguration", e);
            throw new RuntimeException("Need ezconfiguration properties for servlect to load", e);
        }
    }
    protected void doPost(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {

        ProcessRequest(response);
    }

    @Override
    protected void doDelete(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
        String timestamp = request.getParameter("timestamp");
        ReplayService.Client replayService = null;
        try {
            EzSecurityToken token = securityClient.fetchTokenForProxiedUser();
            replayService = pool.getClient("replay", ReplayService.Client.class);
            logger.info("Deleting history at {} for {}", timestamp, token.getTokenPrincipal().getPrincipal());
            replayService.removeUserHistory(token, Long.parseLong(timestamp));
        } catch (TException e) {
            logger.error("Failed to delete user history", e);
            throw new ServletException(e);
        } finally {
            if (replayService != null) {
                pool.returnToPool(replayService);
            }
        }
    }

    protected void doGet(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        ProcessRequest(response);
    }

    protected void ProcessRequest(HttpServletResponse response)
            throws ServletException, IOException {

        ReplayService.Client replayService = null;

        PrintWriter out;

        response.setContentType("application/json");
        out = response.getWriter();

        try {
            EzSecurityToken token = securityClient.fetchTokenForProxiedUser();
            replayService = pool.getClient("replay", ReplayService.Client.class);

            String status = Replay.jsonStatusRequest(token, replayService);

            if (StringUtils.isNotEmpty(status)) {
                out.print(status);
                out.flush();
            }

        } catch (EzSecurityTokenException e) {
            logger.error(e.getMessage());
            throw new ServletException(e);
        } catch (TException e) {
            logger.error(e.getMessage());
            throw new ServletException(e);
        } finally {
            if (replayService != null) {
                pool.returnToPool(replayService);
            }
        }
    }
}
