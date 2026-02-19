package com.mendrx.backend.filter;

import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.UUID;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class RequestTraceFilter extends OncePerRequestFilter {

    public static final String TRACE_ID = "traceId";

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        try {
            // Generate or extract trace ID
            String traceId = extractOrGenerateTraceId(request);
            MDC.put(TRACE_ID, traceId);

            // Add trace ID as response header for debugging
            response.addHeader("X-Trace-ID", traceId);

            // Continue with the request
            filterChain.doFilter(request, response);
        } finally {
            // Always clear the MDC after request completes
            MDC.clear();
        }
    }

    private String extractOrGenerateTraceId(HttpServletRequest request) {
        // Check if client provided a trace ID
        String traceId = request.getHeader("X-Trace-ID");

        // If not, generate a new one
        if (traceId == null || traceId.trim().isEmpty()) {
            traceId = UUID.randomUUID().toString();
        }

        return traceId;
    }
}
