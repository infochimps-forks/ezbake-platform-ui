package ezbake.warehaus.resource;

import java.util.HashSet;
import java.util.Set;

import javax.ws.rs.core.Application;

public class ResourceRegister extends Application {

    @Override
    public Set<Class<?>> getClasses() {
        Set<Class<?>> classes = new HashSet<Class<?>>();
        classes.add(EntryResource.class);
        classes.add(PingResource.class);
        classes.add(PurgeResource.class);
        return classes;
    }

}

