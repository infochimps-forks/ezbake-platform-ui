package ezbake.globalsearch.service;

import ezbake.common.properties.EzProperties;
import ezbake.configuration.EzConfiguration;
import ezbake.ins.thrift.gen.WebApplicationLink;
import ezbake.security.client.EzbakeSecurityClient;
import ezbake.thrift.ThriftClientPool;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.Properties;
import java.util.Set;

public class ServiceClient {
    private final String CACHE_TIMEOUT_PROPERTY_KEY = "globalsearch.cache.timeout.milliseconds";
    private final long DEFAULT_CACHE_TIMEOUT_MILLISECONDS = 1000 * 60 * 60;

    private static Logger logger = LoggerFactory.getLogger(ServiceClient.class);
    private static ThriftClientPool pool;
    private static EzbakeSecurityClient securityClient;
    private static EzProperties configuration;
    private static Map<String, Set<WebApplicationLink>> cache;
    private static Date cacheExpires;
    private static long cacheTimeoutMilliseconds;

    public ServiceClient() {
        try {
            configuration = new EzProperties(new EzConfiguration().getProperties(), true);
            cacheTimeoutMilliseconds = configuration.getLong(CACHE_TIMEOUT_PROPERTY_KEY, DEFAULT_CACHE_TIMEOUT_MILLISECONDS);
            securityClient = new EzbakeSecurityClient(configuration);
            pool = new ThriftClientPool(configuration);
            InvalidateCache();
        } catch (Exception e) {
            logger.error("Error creating thrift client pool - ", e.getMessage());
        }
    }

    public ServiceClient(ThriftClientPool pool, Properties configuration, EzbakeSecurityClient securityClient) {
        this.pool = pool;
        this.configuration = new EzProperties(configuration, true);
        this.cacheTimeoutMilliseconds = this.configuration.getLong(CACHE_TIMEOUT_PROPERTY_KEY, DEFAULT_CACHE_TIMEOUT_MILLISECONDS);
        this.securityClient = securityClient;
    }

    public EzProperties getConfiguration() {
        return configuration;
    }

    public EzbakeSecurityClient getSecurityClient() {
        return securityClient;
    }

    public ThriftClientPool getClientPool() {
        return pool;
    }

    public Map<String, Set<WebApplicationLink>> getCache() {
        Date now = new Date();
        if (now.after(cacheExpires)) {
            InvalidateCache();
        }
        return cache;
    }

    private void InvalidateCache() {
        cache = new HashMap<>();
        cacheExpires = new Date(System.currentTimeMillis() + cacheTimeoutMilliseconds);
    }
}
