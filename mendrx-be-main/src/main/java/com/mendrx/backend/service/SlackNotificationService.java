package com.mendrx.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mendrx.backend.model.Lead;
import com.mendrx.backend.util.LoggingUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;

@Service
public class SlackNotificationService {

    private static final Logger logger = LoggerFactory.getLogger(SlackNotificationService.class);

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private WebClient webClient;

    @Value("${slack.webhook.mendrx-leads.url}")
    private String webhookUrl;
    @Value("${slack.webhook.mendrx-error-notifications.url}")
    private String errorWebhookUrl;

    public void sendLeadNotification(Lead lead) {
        try {
            Map<String, Object> payload = buildSlackMessage(lead);

            webClient.post()
                    .uri(webhookUrl)
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(payload)
                    .retrieve()
                    .toBodilessEntity()
                    .subscribe(
                            response -> LoggingUtils.logInfo(logger, "Slack notification sent successfully"),
                            error -> LoggingUtils.logError(logger, "Error sending Slack notification: {}", error.getMessage())
                    );

        } catch (Exception e) {
            LoggingUtils.logError(logger, "Error creating Slack notification: {}", e.getMessage());
        }
    }

    private Map<String, Object> buildSlackMessage(Lead lead) {
        Map<String, Object> payload = new HashMap<>();

        // Set a nice formatted date
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
        String formattedDate = lead.getCreatedAt().format(formatter);

        // Create the main text
        String mainText =  "NEW LEAD:\n Free Trial Request";

        // Create blocks for rich formatting
        Map<String, Object> headerBlock = new HashMap<>();
        headerBlock.put("type", "header");
        Map<String, Object> headerText = new HashMap<>();
        headerText.put("type", "plain_text");
        headerText.put("text", mainText);
        headerBlock.put("text", headerText);

        Map<String, Object> sectionBlock = new HashMap<>();
        sectionBlock.put("type", "section");
        Map<String, Object> sectionText = new HashMap<>();
        sectionText.put("type", "mrkdwn");
        sectionText.put("text", "*Contact Details:*\n" +
                "• Email: " + lead.getEmail() + "\n" +
                "• Phone: " + lead.getPhone() + "\n" +
                "• Time: " + formattedDate);
        sectionBlock.put("text", sectionText);

        Map<String, Object> contextBlock = new HashMap<>();
        contextBlock.put("type", "context");
        Map<String, Object> contextElement = new HashMap<>();
        contextElement.put("type", "mrkdwn");
        contextElement.put("text", "_Please follow up with this lead as soon as possible to provide free trial credits._");
        contextBlock.put("elements", new Object[]{contextElement});

        Map<String, Object> dividerBlock = new HashMap<>();
        dividerBlock.put("type", "divider");

        // Create attachment with blocks
        Map<String, Object> attachment = new HashMap<>();
        attachment.put("blocks", new Object[]{headerBlock, sectionBlock, contextBlock, dividerBlock});
        attachment.put("color", "#36C5F0");
        payload.put("attachments", new Object[]{attachment});

        return payload;
    }

    public void sendErrorNotification(String apiEndpoint, String errorMessage, Throwable exception) {
        try {
            // Get the trace ID using our utility method
            String traceId = LoggingUtils.getRequestId();

            Map<String, Object> payload = buildErrorMessage(apiEndpoint, errorMessage, traceId, exception);

            webClient.post()
                    .uri(errorWebhookUrl)
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(payload)
                    .retrieve()
                    .toBodilessEntity()
                    .subscribe(
                            response -> LoggingUtils.logInfo(logger, "Error notification sent to Slack successfully"),
                            error -> LoggingUtils.logError(logger, "Failed to send error notification to Slack: {}", error.getMessage())
                    );

        } catch (Exception e) {
            LoggingUtils.logError(logger, "Error creating Slack error notification: {}", e.getMessage());
        }
    }

    private Map<String, Object> buildErrorMessage(String apiEndpoint, String errorMessage, String traceId, Throwable exception) {
        Map<String, Object> payload = new HashMap<>();

        // Create the main text
        String mainText = "⚠️ ERROR ALERT";

        // Format stack trace (limited to avoid exceeding Slack message limits)
        String stackTrace = "";
        if (exception != null) {
            StackTraceElement[] stackTraceElements = exception.getStackTrace();
            int maxElements = Math.min(5, stackTraceElements.length);
            StringBuilder sb = new StringBuilder();
            for (int i = 0; i < maxElements; i++) {
                sb.append("\n• ").append(stackTraceElements[i].toString());
            }
            if (stackTraceElements.length > maxElements) {
                sb.append("\n• ...");
            }
            stackTrace = sb.toString();
        }

        // Create blocks for rich formatting
        Map<String, Object> headerBlock = new HashMap<>();
        headerBlock.put("type", "header");
        Map<String, Object> headerText = new HashMap<>();
        headerText.put("type", "plain_text");
        headerText.put("text", mainText);
        headerBlock.put("text", headerText);

        Map<String, Object> sectionBlock = new HashMap<>();
        sectionBlock.put("type", "section");
        Map<String, Object> sectionText = new HashMap<>();
        sectionText.put("type", "mrkdwn");
        sectionText.put("text", "*API Endpoint:* " + apiEndpoint + "\n" +
                "*Error Message:* " + errorMessage + "\n" +
                "*Trace ID:* " + (traceId != null ? traceId : "N/A") + "\n" +
                "*Stack Trace:*" + stackTrace);
        sectionBlock.put("text", sectionText);

        Map<String, Object> dividerBlock = new HashMap<>();
        dividerBlock.put("type", "divider");

        // Create attachment with blocks
        Map<String, Object> attachment = new HashMap<>();
        attachment.put("blocks", new Object[]{headerBlock, sectionBlock, dividerBlock});
        attachment.put("color", "#FF0000"); // Red color for errors
        payload.put("attachments", new Object[]{attachment});

        return payload;
    }
}
