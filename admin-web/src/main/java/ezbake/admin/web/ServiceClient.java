/*   Copyright (C) 2013-2015 Computer Sciences Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License. */

package ezbake.admin.web;

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
