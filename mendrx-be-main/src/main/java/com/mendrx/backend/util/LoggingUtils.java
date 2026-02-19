package com.mendrx.backend.util;

import org.slf4j.Logger;
import org.slf4j.MDC;

public class LoggingUtils {

    public static final String TRACE_ID_KEY = "traceId";

    /**
     * Get the current request ID from MDC or return "unknown" if not available
     * @return The trace ID or "unknown"
     */
    public static String getRequestId() {
        return MDC.get(TRACE_ID_KEY) != null ? MDC.get(TRACE_ID_KEY) : "unknown";
    }

    public static void logError(Logger logger, String message, Throwable throwable) {
        logger.error("[TraceID: {}] {} - {}", getRequestId(), message, throwable.getMessage(), throwable);
    }

    public static void logError(Logger logger, String message, Object... args) {
        logger.error("[TraceID: {}] " + message, getRequestIdWithArgs(args));
    }

    public static void logInfo(Logger logger, String message, Object... args) {
        logger.info("[TraceID: {}] " + message, getRequestIdWithArgs(args));
    }

    public static void logWarn(Logger logger, String message, Object... args) {
        logger.warn("[TraceID: {}] " + message, getRequestIdWithArgs(args));
    }

    public static void logDebug(Logger logger, String message, Object... args) {
        logger.debug("[TraceID: {}] " + message, getRequestIdWithArgs(args));
    }

    /**
     * Prepends the request ID to the array of arguments
     */
    private static Object[] getRequestIdWithArgs(Object... args) {
        Object[] newArgs = new Object[args.length + 1];
        newArgs[0] = getRequestId();
        System.arraycopy(args, 0, newArgs, 1, args.length);
        return newArgs;
    }
}
