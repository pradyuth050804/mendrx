package com.mendrx.backend.controller;

import java.io.IOException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mendrx.backend.exception.AIResponseFailedException;
import com.mendrx.backend.model.Client;
import com.mendrx.backend.model.Report;
import com.mendrx.backend.model.User;
import com.mendrx.backend.model.request.AnalysisRequestModel;
import com.mendrx.backend.model.request.ComparisonRequestModel;
import com.mendrx.backend.model.request.UpdateNotesRequestModel;
import com.mendrx.backend.model.request.UpdateReasonRequestModel;
import com.mendrx.backend.model.response.*;
import com.mendrx.backend.model.shared.ExtractionResult;
import com.mendrx.backend.service.*;
import com.mendrx.backend.util.LoggingUtils;
import com.mendrx.backend.util.TrackerData;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
public class ReportAnalysisController {

    private static final Logger logger = LoggerFactory.getLogger(ReportAnalysisController.class);

    private static final int CREDITS_PER_ANALYSIS = 100;
    
    @Autowired
    private ParameterExtractionPromptService parameterExtractionPromptService;

    @Autowired
    private CsvToJsonService csvToJsonService;

    @Autowired
    private JwtValidatorService jwtValidatorService;

    @Autowired
    private UserService userService;

    @Autowired
    private ReportService reportService;

    @Autowired
    private RcaService rcaService;

    @Autowired
    private ComparisonService comparisonService;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private ClientService clientService;

    @Autowired
    private MultiTrackerFileService multiTrackerFileService;

    @Autowired
    private PdfTextStripService pdfTextStripService;

    @Autowired
    private SlackNotificationService slackNotificationService;

    @Autowired
    private ValueSanityCheckService valueSanityCheckService;


    @PostMapping("/readfile")
    public ResponseEntity<ApiResponse<ReadFileResponseModel>> readFile(
            @RequestHeader("Authorization") String authHeader,
            @RequestParam("files") MultipartFile[] files,
            @RequestParam UUID clientId,
            @RequestParam String reportDate,
            @RequestParam(required = false) Integer height,
            @RequestParam(required = false) Double weight,
            @RequestParam(required = false) Double waist,
            @RequestParam(required = false) String diet,
            @RequestParam(required = false) List<String> lifestyleHabits,
            @RequestParam(required = false) List<String> existingConditions,
            @RequestParam(value = "client_history_questionnaire", required = false) MultipartFile clientHistoryPDF) {

        LoggingUtils.logInfo(logger, "/readfile API invoked for client: {}", clientId);

        String token = authHeader.replace("Bearer ", "");
        if (!jwtValidatorService.validateToken(token)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ApiResponse<>("UNAUTHORIZED", "Invalid or expired token"));
        }
        try {
            // Get user from token
            User user = userService.getUserByToken(token);
            if (user == null) {
                LoggingUtils.logWarn(logger, "User not found for token during /readfile");
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(new ApiResponse<>("USER_NOT_FOUND", "User not found"));
            } else if (user.getCredits() < CREDITS_PER_ANALYSIS) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(new ApiResponse<>("INSUFFICIENT_CREDITS",
                                String.format("Insufficient credits. %d credits are required per analysis",
                                        CREDITS_PER_ANALYSIS)));
            } else if (user.getSubscriptionExpiry().isBefore(LocalDateTime.now())) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(new ApiResponse<>("SUBSCRIPTION_EXPIRED",
                                "Subscription expired. Please renew your subscription"));
            }

            // Get client
            Client client = clientService.getClientById(clientId);
            if (client == null) {
                LoggingUtils.logWarn(logger, "Client not found: {}", clientId);
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(new ApiResponse<>("CLIENT_NOT_FOUND", "Client not found"));
            }

            ExtractionResult extractionResult = parameterExtractionPromptService.getResponse(files, user.getParent().getId());

            // Convert CSV to JSON
            ReadFileResponseModel readFileResponseModel = csvToJsonService
                    .convertCsvToReadFileResponseModel(extractionResult.getCsvData(),
                            client.getGender(),
                            "Please verify the extracted data, especially the yellow highlighted ones, edit by clicking on values if required & confirm to initiate analysis.", 
                            user.getParent().getId(),
                            extractionResult.getUnitMismatches());

            if(readFileResponseModel.getData().isEmpty()) {
                throw new AIResponseFailedException("Failed to extract parameters");
            }

            // Sanity-check extracted values against optimal ranges and auto-correct implausible ones
            valueSanityCheckService.sanitizeParameterData(
                    readFileResponseModel.getData(),
                    readFileResponseModel.getLargelyDeviatedParams());

            LocalDateTime parsedReportDate = LocalDate.parse(reportDate).atStartOfDay();

            String clientHistory = pdfTextStripService.extractTextFromPdf(clientHistoryPDF);

            Report report = reportService.createReport(user, client, parsedReportDate,
                    height, weight, waist, diet, lifestyleHabits, existingConditions, clientHistory);

            readFileResponseModel.setReportId(report.getId());

            return ResponseEntity.ok(new ApiResponse<>(readFileResponseModel));

        } catch (AIResponseFailedException e) {
            LoggingUtils.logError(logger, "AI response failed during /readfile for client: {}", clientId, e.getMessage());
            slackNotificationService.sendErrorNotification("/readfile", "AI response failed during parameter extraction", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ApiResponse<>("AI_RESPONSE_FAILED", "Error occurred while processing file. Please retry later."));
        } catch (Exception e) {
            LoggingUtils.logError(logger, "Error occurred while /readfile for client: {}", clientId, e.getMessage());
            slackNotificationService.sendErrorNotification("/readfile", "Unexpected error during file processing", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ApiResponse<>("FILE_PROCESSING_ERROR",
                            "Error occurred while processing file: " + e.getMessage()));
        }
    }

    @PostMapping("/analyse")
    public ResponseEntity<ApiResponse<AnalysisResponseModel>> analyseReport(@RequestHeader("Authorization") String authHeader,
                                           @RequestBody AnalysisRequestModel analysisRequest) {

        LoggingUtils.logInfo(logger, "/analyse API invoked for report: {}", analysisRequest.getReportId());

        String token = authHeader.replace("Bearer ", "");
        if (!jwtValidatorService.validateToken(token)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ApiResponse<>("UNAUTHORIZED", "Invalid or expired token"));
        }

        try {
            User user= userService.getUserByToken(token);
            if (user == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(new ApiResponse<>("USER_NOT_FOUND", "User not found"));
            } else if (user.getCredits()< CREDITS_PER_ANALYSIS) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(new ApiResponse<>("INSUFFICIENT_CREDITS", String.format("Insufficient credits. %d credits are required per analysis", CREDITS_PER_ANALYSIS)));
            } else if (user.getSubscriptionExpiry().isBefore(LocalDateTime.now())) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(new ApiResponse<>("SUBSCRIPTION_EXPIRED", "Subscription expired. Please renew your subscription"));
            }

            Report report = reportService.getReportForUser(analysisRequest.getReportId());
            if(report == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(new ApiResponse<>("REPORT_NOT_FOUND", "Report not found"));
            }

            if (!report.getUser().getId().equals(user.getId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(new ApiResponse<>("FORBIDDEN", "You do not have permission to access this report"));
            }

            report = rcaService.analyseBloodReport(report, analysisRequest.getBloodReportData(), report.getUser().getParent().getId());

            user = userService.deductCredits(user, CREDITS_PER_ANALYSIS);

            AnalysisResponseModel analysisResponseModel = new AnalysisResponseModel();
            analysisResponseModel.setReport(report);
            analysisResponseModel.setConsumedCredits(CREDITS_PER_ANALYSIS);
            analysisResponseModel.setUpdatedCredits(user.getCredits());

            return ResponseEntity.ok(new ApiResponse<>(analysisResponseModel));
        }
        catch (AIResponseFailedException e) {
            LoggingUtils.logError(logger, "AI response failed for report: {}", analysisRequest.getReportId(), e.getMessage());
            slackNotificationService.sendErrorNotification("/analyse", "AI response failed during report analysis", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ApiResponse<>("AI_RESPONSE_FAILED", "AI response failed. Please retry."));
        } catch (Exception e) {
            LoggingUtils.logError(logger, "Analysis error for report: {}", analysisRequest.getReportId(), e.getMessage());
            slackNotificationService.sendErrorNotification("/analyse", "Unexpected error during report analysis", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ApiResponse<>("ANALYSIS_ERROR", "Error occurred during analysis: " + e.getMessage()));
        }
    }

    @GetMapping("/parameter-comments")
    public ResponseEntity<ApiResponse<ParameterCommentsResponseModel>> getParameterComments(
            @RequestHeader("Authorization") String authHeader) {

        LoggingUtils.logInfo(logger, "/parameter-comments API invoked");

        String token = authHeader.replace("Bearer ", "");
        if (!jwtValidatorService.validateToken(token)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ApiResponse<>("UNAUTHORIZED", "Invalid or expired token"));
        }

        try {
            User user = userService.getUserByToken(token);
            if (user == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(new ApiResponse<>("USER_NOT_FOUND", "User not found"));
            }

            TrackerData trackerData = multiTrackerFileService.getTrackerData(user.getParent().getId());

            ParameterCommentsResponseModel responseModel = new ParameterCommentsResponseModel();
            responseModel.setHighParameterComments(trackerData.getParameterHighComments());
            responseModel.setLowParameterComments(trackerData.getParameterLowComments());

            return ResponseEntity.ok(new ApiResponse<>(responseModel));

        } catch (Exception e) {
            LoggingUtils.logError(logger, "Error occurred while /parameter-comments", e);
            slackNotificationService.sendErrorNotification("/parameter-comments", "Failed to fetch parameter comments", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ApiResponse<>("PARAMETER_COMMENTS_FETCH_ERROR",
                            "Error occurred while fetching parameter comments: " + e.getMessage()));
        }
    }

    @PutMapping("/update-reason")
    public ResponseEntity<ApiResponse<Void>> updateReason(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody UpdateReasonRequestModel updateRequest) {

        LoggingUtils.logInfo(logger, "/update-reason API invoked for report: {}", updateRequest.getReportId());

        String token = authHeader.replace("Bearer ", "");
        if (!jwtValidatorService.validateToken(token)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ApiResponse<>("UNAUTHORIZED", "Invalid or expired token"));
        }

        try {
            // Get user from token
            UUID userAuthId = jwtValidatorService.getSubjectFromToken(token);
            if (userAuthId == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(new ApiResponse<>("USER_NOT_FOUND", "User not found"));
            }

            // Parse reportId from string to UUID
            UUID reportId;
            try {
                reportId = UUID.fromString(updateRequest.getReportId());
            } catch (IllegalArgumentException e) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(new ApiResponse<>("INVALID_REPORT_ID", "Invalid report ID format"));
            }

            // Get report
            Report report = reportService.getReportForUser(reportId);
            if (report == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(new ApiResponse<>("REPORT_NOT_FOUND", "Report not found"));
            }

            // Verify user owns the report
            if (!report.getUser().getAuthId().equals(userAuthId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(new ApiResponse<>("FORBIDDEN", "You do not have permission to access this report"));
            }

            // Validate input
            if (updateRequest.getParameterName() == null || updateRequest.getParameterName().trim().isEmpty()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(new ApiResponse<>("INVALID_PARAMETER", "Parameter name cannot be empty"));
            }

            reportService.updateBloodMarkerReason(
                    report,
                    updateRequest.getParameterName(),
                    updateRequest.getReason()
            );

            return ResponseEntity.ok(new ApiResponse<>("Reason updated successfully"));

        } catch (Exception e) {
            LoggingUtils.logError(logger, "Error occurred while /update-reason for report: {}", updateRequest.getReportId(), e.getMessage());
            slackNotificationService.sendErrorNotification("/update-reason", "Failed to update reason for report: " + updateRequest.getReportId(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ApiResponse<>("UPDATE_ERROR", "Error occurred while updating reason: " + e.getMessage()));
        }
    }

    @PutMapping("/update-notes")
    public ResponseEntity<ApiResponse<Void>> updateNotes(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody UpdateNotesRequestModel updateRequest) {

        LoggingUtils.logInfo(logger, "/update-notes API invoked for report: {}", updateRequest.getReportId());

        String token = authHeader.replace("Bearer ", "");
        if (!jwtValidatorService.validateToken(token)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ApiResponse<>("UNAUTHORIZED", "Invalid or expired token"));
        }

        try {
            UUID userAuthId = jwtValidatorService.getSubjectFromToken(token);
            if (userAuthId == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(new ApiResponse<>("USER_NOT_FOUND", "User not found"));
            }

            UUID reportId = UUID.fromString(updateRequest.getReportId());

            boolean updated = reportService.updateNotes(reportId, userAuthId, updateRequest.getNotes());

            if (!updated) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(new ApiResponse<>("UPDATE_FAILED", "Report not found or access denied"));
            }

            return ResponseEntity.ok(new ApiResponse<>("Notes updated successfully"));

        } catch (Exception e) {
            LoggingUtils.logError(logger, "Error occurred while /update-notes for report: {}", updateRequest.getReportId(), e.getMessage());
            slackNotificationService.sendErrorNotification("/update-notes", "Failed to update notes for report: " + updateRequest.getReportId(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ApiResponse<>("UPDATE_ERROR", "Error occurred while updating notes: " + e.getMessage()));
        }
    }

    @GetMapping("/reports/metadata")
    public ResponseEntity<ApiResponse<PaginatedResponseModel<ReportMetadataResponseModel>>> getReportMetadata(
            @RequestHeader("Authorization") String authHeader,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "updatedAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDirection,
            @RequestParam(required = false) String clientSearch) {

        LoggingUtils.logInfo(logger, "/reports/metadata API invoked with page: {}, size: {}", page, size);

        String token = authHeader.replace("Bearer ", "");
        if (!jwtValidatorService.validateToken(token)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ApiResponse<>("UNAUTHORIZED", "Invalid or expired token"));
        }

        try {
            UUID userAuthId = jwtValidatorService.getSubjectFromToken(token);
            if (userAuthId == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(new ApiResponse<>("USER_NOT_FOUND", "User not found"));
            }

            Sort.Direction direction = Sort.Direction.fromString(sortDirection);
            Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortBy));

            Page<ReportMetadataResponseModel> reportPage = clientSearch != null && !clientSearch.trim().isEmpty()
                    ? reportService.getUserReportMetadataByClientSearch(userAuthId, clientSearch.trim(), pageable)
                    : reportService.getUserReportMetadata(userAuthId, pageable);

            PaginatedResponseModel<ReportMetadataResponseModel> response = new PaginatedResponseModel<>();
            response.setContent(reportPage.getContent());
            response.setPageNumber(reportPage.getNumber());
            response.setPageSize(reportPage.getSize());
            response.setTotalElements(reportPage.getTotalElements());
            response.setTotalPages(reportPage.getTotalPages());
            response.setLast(reportPage.isLast());

            return ResponseEntity.ok(new ApiResponse<>(response));

        } catch (Exception e) {
            LoggingUtils.logError(logger, "Error occurred while /reports/metadata", e);
            slackNotificationService.sendErrorNotification("/reports/metadata", "Failed to fetch report metadata", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ApiResponse<>("FETCH_ERROR", "Error occurred while fetching reports: " + e.getMessage()));
        }
    }

    @GetMapping("/reports/{reportId}")
    public ResponseEntity<ApiResponse<Report>> getReport(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable String reportId) {

        LoggingUtils.logInfo(logger, "/reports/{} API invoked", reportId);

        String token = authHeader.replace("Bearer ", "");
        if (!jwtValidatorService.validateToken(token)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ApiResponse<>("UNAUTHORIZED", "Invalid or expired token"));
        }

        try {
            UUID userAuthId = jwtValidatorService.getSubjectFromToken(token);
            if (userAuthId == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(new ApiResponse<>("USER_NOT_FOUND", "User not found"));
            }

            UUID reportUuid;
            try {
                reportUuid = UUID.fromString(reportId);
            } catch (IllegalArgumentException e) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(new ApiResponse<>("INVALID_REPORT_ID", "Invalid report ID format"));
            }

            Report report = reportService.getDetailedReport(reportUuid, userAuthId);

            if (report == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(new ApiResponse<>("REPORT_NOT_FOUND", "Report not found or access denied"));
            }

            return ResponseEntity.ok(new ApiResponse<>(report));

        } catch (Exception e) {
            LoggingUtils.logError(logger, "Error occurred while /reports/{}", reportId, e.getMessage());
            slackNotificationService.sendErrorNotification("/reports/{reportId}", "Failed to fetch report: " + reportId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ApiResponse<>("FETCH_ERROR", "Error occurred while fetching report: " + e.getMessage()));
        }
    }

    @PostMapping("/reports/compare")
    public ResponseEntity<ApiResponse<ComparisonResponseModel>> compareReports(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody ComparisonRequestModel request) {

        LoggingUtils.logInfo(logger, "/reports/compare API invoked with {} reports", request.getReportIds().size());

        String token = authHeader.replace("Bearer ", "");
        if (!jwtValidatorService.validateToken(token)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ApiResponse<>("UNAUTHORIZED", "Invalid or expired token"));
        }

        try {
            UUID userAuthId = jwtValidatorService.getSubjectFromToken(token);
            if (userAuthId == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(new ApiResponse<>("USER_NOT_FOUND", "User not found"));
            }

            List<String> reportIds = request.getReportIds();
            if (reportIds == null || reportIds.isEmpty() || reportIds.size() < 2 || reportIds.size() > 4) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(new ApiResponse<>("INVALID_REQUEST", "Please provide 2-4 report IDs for comparison"));
            }

            List<Report> reports = new ArrayList<>();
            for (String reportId : reportIds) {
                Report report = reportService.getDetailedReport(UUID.fromString(reportId), userAuthId);
                if (report == null) {
                    return ResponseEntity.status(HttpStatus.NOT_FOUND)
                            .body(new ApiResponse<>("REPORT_NOT_FOUND", "Report not found: " + reportId));
                }
                if (report.getBloodMarkers() == null || report.getBloodMarkers().isEmpty()) {
                    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                            .body(new ApiResponse<>("INVALID_REPORT", "Report has no blood markers: " + reportId));
                }
                reports.add(report);
            }
            boolean singleClient = reports.stream()
                    .map(report -> report.getClient().getId())
                    .distinct()
                    .count() == 1;

            ComparisonResponseModel comparison = singleClient ?
                    comparisonService.compareReports(reports) :
                    comparisonService.compareReportsMultiClient(reports);

            return ResponseEntity.ok(new ApiResponse<>(comparison));

        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new ApiResponse<>("INVALID_REPORT_ID", "Invalid report ID format: " + e.getMessage()));
        } catch (Exception e) {
            LoggingUtils.logError(logger, "Error occurred while /reports/compare with report IDs: {}", request.getReportIds(), e.getMessage());
            slackNotificationService.sendErrorNotification("/reports/compare", "Failed to compare reports: " + request.getReportIds(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ApiResponse<>("COMPARISON_ERROR", "Error occurred during comparison: " + e.getMessage()));
        }
    }

    @DeleteMapping("/reports/batch-delete")
    public ResponseEntity<ApiResponse<Void>> batchDeleteReports(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody Map<String, List<String>> request) {

        LoggingUtils.logInfo(logger, "/reports/batch-delete API invoked");

        String token = authHeader.replace("Bearer ", "");
        if (!jwtValidatorService.validateToken(token)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ApiResponse<>("UNAUTHORIZED", "Invalid or expired token"));
        }

        try {
            UUID userAuthId = jwtValidatorService.getSubjectFromToken(token);
            if (userAuthId == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(new ApiResponse<>("USER_NOT_FOUND", "User not found"));
            }

            List<String> reportIds = request.get("reportIds");
            if (reportIds == null || reportIds.isEmpty()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(new ApiResponse<>("INVALID_REQUEST", "No report IDs provided"));
            }

            reportService.deleteReports(reportIds.stream()
                    .map(UUID::fromString)
                    .collect(Collectors.toList()), userAuthId);

            return ResponseEntity.ok(new ApiResponse<>("Reports deleted successfully"));
        } catch (Exception e) {
            LoggingUtils.logError(logger, "Error occurred while /reports/batch-delete for report IDs: {}", request.get("reportIds"), e.getMessage());
            slackNotificationService.sendErrorNotification("/reports/batch-delete", "Failed to batch delete reports: " + request.get("reportIds"), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ApiResponse<>("DELETE_ERROR", "Error deleting reports: " + e.getMessage()));
        }
    }
}