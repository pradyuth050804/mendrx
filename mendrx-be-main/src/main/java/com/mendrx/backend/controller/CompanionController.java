package com.mendrx.backend.controller;

import com.mendrx.backend.model.Client;
import com.mendrx.backend.model.Report;
import com.mendrx.backend.model.SnDPlan;
import com.mendrx.backend.dto.ClientDTO;
import com.mendrx.backend.model.response.ApiResponse;
import com.mendrx.backend.model.response.CompanionReportDTO;
import com.mendrx.backend.repository.ClientRepository;
import com.mendrx.backend.repository.ReportRepository;
import com.mendrx.backend.service.JwtValidatorService;
import com.mendrx.backend.service.ReportService;
import com.mendrx.backend.service.SnDPlanService;
import com.mendrx.backend.util.LoggingUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Optional;

@RestController
@RequestMapping("/companion")
public class CompanionController {

    private static final Logger logger = LoggerFactory.getLogger(CompanionController.class);

    @Autowired
    private JwtValidatorService jwtValidatorService;

    @Autowired
    private ClientRepository clientRepository;

    @Autowired
    private ReportRepository reportRepository;

    @Autowired
    private SnDPlanService snDPlanService;

    @Autowired
    private ReportService reportService;

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<ClientDTO>> getMe(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        LoggingUtils.logInfo(logger, "/companion/me API invoked");

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ApiResponse<>("UNAUTHORIZED", "Authorization token required"));
        }

        String token = authHeader.replace("Bearer ", "");
        if (!jwtValidatorService.validateToken(token)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ApiResponse<>("UNAUTHORIZED", "Invalid or expired token"));
        }

        String email = jwtValidatorService.getEmailFromToken(token);
        if (email == null || email.isBlank()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new ApiResponse<>("EMAIL_NOT_FOUND", "Verified email not found in token"));
        }

        Optional<Client> clientOpt = clientRepository.findFirstByEmailIgnoreCase(email.trim());
        if (clientOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(new ApiResponse<>("CLIENT_NOT_FOUND", "No client profile is linked to this email. Please contact your practitioner."));
        }

        return ResponseEntity.ok(new ApiResponse<>(new ClientDTO(clientOpt.get())));
    }

    @GetMapping("/my-plan")
    public ResponseEntity<ApiResponse<SnDPlan>> getMyPlan(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @org.springframework.web.bind.annotation.RequestParam(value = "identifier", required = false) String identifier) {
        LoggingUtils.logInfo(logger, "/companion/my-plan API invoked");

        String email = null;
        String phone = null;

        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.replace("Bearer ", "");
            if (!jwtValidatorService.validateToken(token)) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(new ApiResponse<>("UNAUTHORIZED", "Invalid or expired token"));
            }
            email = jwtValidatorService.getEmailFromToken(token);
            phone = jwtValidatorService.getPhoneFromToken(token);
        } else if (identifier == null) {
             return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                     .body(new ApiResponse<>("UNAUTHORIZED", "Authorization token or identifier required"));
        }

        try {
            Optional<Client> clientOpt = Optional.empty();

            if (phone != null && !phone.isBlank()) {
                clientOpt = clientRepository.findFirstByPhoneNumber(phone);
            }

            if (clientOpt.isEmpty() && email != null && !email.isBlank()) {
                clientOpt = clientRepository.findFirstByEmailIgnoreCase(email);
            }

            // Fallback for testing using identifier (name or phone)
            if (clientOpt.isEmpty() && identifier != null && !identifier.isBlank()) {
                clientOpt = clientRepository.findFirstByPhoneNumber(identifier);
                if (clientOpt.isEmpty()) {
                    clientOpt = clientRepository.findFirstByName(identifier);
                }
            }

            if (clientOpt.isEmpty()) {
                LoggingUtils.logWarn(logger, "Client not found for companion auth email: {}, phone: {}, identifier: {}", email, phone, identifier);
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(new ApiResponse<>("CLIENT_NOT_FOUND", "Client profile not found in our records. Please contact your practitioner."));
            }

            Client client = clientOpt.get();

            Optional<Report> reportOpt = reportRepository.findFirstByClientIdOrderByUpdatedAtDesc(client.getId());

            if (reportOpt.isEmpty()) {
                LoggingUtils.logWarn(logger, "No report found for client: {}", client.getId());
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(new ApiResponse<>("REPORT_NOT_FOUND", "No reports found for this profile."));
            }

            Report latestReport = reportOpt.get();

            SnDPlan plan = snDPlanService.getSnDPlan(latestReport.getId());

            if (plan == null) {
                LoggingUtils.logWarn(logger, "SnD plan not found for report ID: {}", latestReport.getId());
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(new ApiResponse<>("PLAN_NOT_FOUND", "Diet plan not found for the latest report."));
            }

            LoggingUtils.logInfo(logger, "Successfully fetched SnD plan for companion client: {}", client.getId());
            return ResponseEntity.ok(new ApiResponse<>(plan));

        } catch (Exception e) {
            LoggingUtils.logError(logger, "Error fetching companion SnD plan: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ApiResponse<>("FETCH_ERROR", "Error fetching plan: " + e.getMessage()));
        }
    }

    @GetMapping("/my-report")
    public ResponseEntity<ApiResponse<CompanionReportDTO>> getMyReport(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @org.springframework.web.bind.annotation.RequestParam(value = "identifier", required = false) String identifier) {
        LoggingUtils.logInfo(logger, "/companion/my-report API invoked");

        String email = null;
        String phone = null;

        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.replace("Bearer ", "");
            if (!jwtValidatorService.validateToken(token)) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(new ApiResponse<>("UNAUTHORIZED", "Invalid or expired token"));
            }
            email = jwtValidatorService.getEmailFromToken(token);
            phone = jwtValidatorService.getPhoneFromToken(token);
        } else if (identifier == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ApiResponse<>("UNAUTHORIZED", "Authorization token or identifier required"));
        }

        try {
            Optional<Client> clientOpt = Optional.empty();

            if (phone != null && !phone.isBlank()) {
                clientOpt = clientRepository.findFirstByPhoneNumber(phone);
            }

            if (clientOpt.isEmpty() && email != null && !email.isBlank()) {
                clientOpt = clientRepository.findFirstByEmailIgnoreCase(email);
            }

            // Fallback for testing using identifier (name or phone)
            if (clientOpt.isEmpty() && identifier != null && !identifier.isBlank()) {
                clientOpt = clientRepository.findFirstByPhoneNumber(identifier);
                if (clientOpt.isEmpty()) {
                    clientOpt = clientRepository.findFirstByName(identifier);
                }
            }

            if (clientOpt.isEmpty()) {
                LoggingUtils.logWarn(logger, "Client not found for companion auth email: {}, phone: {}, identifier: {}", email, phone, identifier);
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(new ApiResponse<>("CLIENT_NOT_FOUND", "Client profile not found in our records. Please contact your practitioner."));
            }

            Client client = clientOpt.get();

            Optional<Report> reportOpt = reportRepository.findFirstByClientIdOrderByUpdatedAtDesc(client.getId());

            if (reportOpt.isEmpty()) {
                LoggingUtils.logWarn(logger, "No report found for client: {}", client.getId());
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(new ApiResponse<>("REPORT_NOT_FOUND", "No reports found for this profile."));
            }

            Report latestReport = reportOpt.get();

            CompanionReportDTO reportDto = reportService.getCompanionReport(latestReport.getId());

            if (reportDto == null) {
                LoggingUtils.logWarn(logger, "Could not get companion report DTO for report ID: {}", latestReport.getId());
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(new ApiResponse<>("REPORT_FETCH_ERROR", "Error retrieving report details."));
            }

            LoggingUtils.logInfo(logger, "Successfully fetched report for companion client: {}", client.getId());
            return ResponseEntity.ok(new ApiResponse<>(reportDto));

        } catch (Exception e) {
            LoggingUtils.logError(logger, "Error fetching companion report: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ApiResponse<>("FETCH_ERROR", "Error fetching report: " + e.getMessage()));
        }
    }
}
