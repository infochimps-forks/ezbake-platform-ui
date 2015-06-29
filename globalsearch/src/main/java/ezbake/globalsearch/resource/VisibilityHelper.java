package ezbake.globalsearch.resource;

import ezbake.base.thrift.Visibility;
import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * No-op implementation for Open-Source right now
 */
public class VisibilityHelper {
    private static Logger logger = LoggerFactory.getLogger(VisibilityHelper.class);
    private static String v2cClassName;
    private static VisibilityReflector reflector = null;

    // load the VisibilityToClassification class if not done yet
    public static void loadConverterClass(String jarPath, String className) {
        if (StringUtils.isNotBlank(jarPath)) {
            if (reflector == null) {
                reflector = new VisibilityReflector(jarPath);
            }
        }
        v2cClassName = className;
    }

    // get short visibility markings string from the converter class
    public static String getShortMarkings(Visibility visibility) {
        String result = "";

        try {
            if (reflector != null) {
                result = reflector.getShortMarkings(visibility);
            }
        } catch (Throwable e) {
            logger.error("Error get portion marking via reflection", e);
        }

        return result;
    }

    // get full visibility marking string from the converter class
    public static String getFullMarkings(Visibility visibility) {
        String result = "";

        try {
            if (reflector != null) {
                result = reflector.getFullMarkings(visibility);
            }
        } catch (Throwable e) {
            logger.error("Error get classification via reflection", e);
        }

        return result;
    }

    static class VisibilityReflector {
        private VisibilityReflector(String jarPath) {

        }

        private String getShortMarkings(Visibility visibility) {
            return "";
        }

        private String getFullMarkings(Visibility visibility) {
            return visibility.getFullTextVisibility();
        }
    }
}
