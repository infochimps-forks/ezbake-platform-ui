package ezbake.ins.web;

import ezbake.common.properties.EzProperties;
import ezbake.configuration.EzConfiguration;
import ezbake.thrift.ThriftClientPool;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import ezbake.security.client.EzbakeSecurityClient;

import java.util.Properties;

public class ServiceClient {

    private ThriftClientPool pool;
    private EzProperties configuration;
    private EzbakeSecurityClient securityClient;
    
    protected static Logger logger = LoggerFactory.getLogger(ServiceClient.class);

    public ServiceClient() {
        try {
            logger.info("Instantiating new ServiceClient to get configuration, client pool, and security client");
            configuration = new EzProperties(new EzConfiguration().getProperties(), true);
            pool = new ThriftClientPool(configuration);
            securityClient = new EzbakeSecurityClient(configuration);
        } catch (Exception e) {
            logger.error("Error creating thrift client pool", e);
        }
    }

    public ServiceClient(ThriftClientPool pool, Properties configuration, EzbakeSecurityClient securityClient) {
        this.pool = pool;
        this.configuration = new EzProperties(configuration, true);
        this.securityClient = securityClient;
    }

    public ThriftClientPool getClientPool() {
        return pool;
    }

    public EzbakeSecurityClient getSecurityClient() {
        return securityClient;
    }

    public EzProperties getConfiguration() {
        return configuration;
    }
}
