package ezbake.replay;

import com.google.common.base.Joiner;
import com.google.common.collect.Sets;
import ezbake.base.thrift.EzSecurityToken;
import ezbake.base.thrift.EzSecurityTokenException;
import ezbake.configuration.EzConfiguration;
import ezbake.configuration.EzConfigurationLoaderException;
import ezbake.groups.thrift.EzGroups;
import ezbake.groups.thrift.EzGroupsConstants;
import ezbake.security.client.EzbakeSecurityClient;
import ezbake.thrift.ThriftClientPool;
import ezbakehelpers.ezconfigurationhelpers.application.EzBakeApplicationConfigurationHelper;
import org.apache.thrift.TException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.servlet.*;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Properties;
import java.util.Set;

public class AdminFilter implements Filter {
    private static final Logger log = LoggerFactory.getLogger(AdminFilter.class);
    private EzbakeSecurityClient security;
    public static final String NOT_AUTHORIZED_URL = "not_authorized.html";
    private Set<Long> currentGroupsMask;

    @Override
    public void init(FilterConfig filterConfig) throws ServletException {
        ThriftClientPool pool = null;
        EzGroups.Client groups = null;
        try {
            Properties props = new EzConfiguration().getProperties();
            pool = new ThriftClientPool(props);
            groups = pool.getClient(EzGroupsConstants.SERVICE_NAME, EzGroups.Client.class);
            String groupName = EzGroupsConstants.APP_GROUP + EzGroupsConstants.GROUP_NAME_SEP +
                    new EzBakeApplicationConfigurationHelper(props).getApplicationName();
            security = new EzbakeSecurityClient(props);

            // Get the groups mask for the current app for group-based filtering
            String ezgroupsSecurityId = pool.getSecurityId(EzGroupsConstants.SERVICE_NAME);
            currentGroupsMask = groups.getGroupsMask(security.fetchAppToken(ezgroupsSecurityId), Sets.newHashSet(groupName), null, null);
            log.debug("groups mask : " + Joiner.on(',').join(currentGroupsMask));
        } catch (EzConfigurationLoaderException e) {
            log.error("Could not retrieve ezconfiguration properties", e);
            throw new RuntimeException("Need ezconfiguration properties to start Filer", e);
        } catch (TException e) {
            log.error("Could not retrieve groups client", e);
            throw new RuntimeException("Could not retrieve groups client for admin filter", e);
        } finally {
            if (pool != null) {
                pool.returnToPool(groups);
                pool.close();
            }
        }
    }

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain) throws IOException, ServletException {
        String url = ((HttpServletRequest)request).getRequestURL().toString();

        // If someone isn't authorized to view the replay site, we at least need to provide them the ability to see the
        // error page as well as make it look nice for them :)
        if (isExcluded(url)) {
            chain.doFilter(request, response);
        } else {
            try {
                EzSecurityToken token = security.fetchTokenForProxiedUser();
                Set<Long> tokenGroupAuths = token.getAuthorizations().getPlatformObjectAuthorizations();
                log.debug("Token auths : " + Joiner.on(',').join(tokenGroupAuths));
                if (!Sets.intersection(tokenGroupAuths, currentGroupsMask).isEmpty()) {
                    chain.doFilter(request, response);
                } else {
                    HttpServletResponse httpResponse = (HttpServletResponse) response;
                    httpResponse.sendRedirect(NOT_AUTHORIZED_URL);
                }
            } catch (EzSecurityTokenException e) {
                log.error("Security exception thrown", e);
                throw new ServletException(e);
            }
        }
    }

    private boolean isExcluded(String url) {
        return url.contains(NOT_AUTHORIZED_URL) || url.contains("/images/") ||
                url.contains("/css/") || url.contains("/fonts/");
    }

    @Override
    public void destroy() {
        try {
            security.close();
        } catch (IOException e) {
            log.error("Could not shut down security client");
        }
    }
}
