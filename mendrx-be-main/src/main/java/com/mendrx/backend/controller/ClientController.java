package com.mendrx.backend.controller;

import com.mendrx.backend.dto.ClientDTO;
import com.mendrx.backend.model.User;
import com.mendrx.backend.model.response.ApiResponse;
import com.mendrx.backend.model.response.PaginatedResponseModel;
import com.mendrx.backend.service.ClientService;
import com.mendrx.backend.service.JwtValidatorService;
import com.mendrx.backend.service.SlackNotificationService;
import com.mendrx.backend.service.UserService;
import com.mendrx.backend.util.LoggingUtils;
import org.hibernate.exception.ConstraintViolationException;
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

        import java.time.YearMonth;
import java.time.format.DateTimeParseException;
import java.util.Map;
import java.util.UUID;

@RestController
public class ClientController {

    private static final Logger logger = LoggerFactory.getLogger(ClientController.class);

    @Autowired
    private ClientService clientService;

    @Autowired
    private JwtValidatorService jwtValidatorService;

    @Autowired
    private UserService userService;

    @Autowired
    private SlackNotificationService slackNotificationService;

    @PostMapping("/clients")
    public ResponseEntity<ApiResponse<ClientDTO>> createClient(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody Map<String, String> request) {

        LoggingUtils.logInfo(logger, "/clients POST API invoked");

        String token = authHeader.replace("Bearer ", "");
        if (!jwtValidatorService.validateToken(token)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ApiResponse<>("UNAUTHORIZED", "Invalid or expired token"));
        }

        try {
            // Validate required fields
            String name = request.get("name");
            String phoneNumber = request.get("phoneNumber");
            String gender = request.get("gender");
            String birthMonthStr = request.get("birthMonth");
            String email = request.get("email"); // Optional

            if (name == null || name.trim().isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(new ApiResponse<>("INVALID_NAME", "Name is required"));
            }

            if (phoneNumber == null || phoneNumber.trim().isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(new ApiResponse<>("INVALID_PHONE", "Phone number is required"));
            }

            if(gender == null || gender.trim().isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(new ApiResponse<>("INVALID_GENDER", "Gender is required"));
            }

            if (birthMonthStr == null || birthMonthStr.trim().isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(new ApiResponse<>("INVALID_BIRTH_MONTH", "Birth month is required"));
            }

            YearMonth birthMonth;
            try {
                birthMonth = YearMonth.parse(birthMonthStr);
            } catch (DateTimeParseException e) {
                return ResponseEntity.badRequest()
                        .body(new ApiResponse<>("INVALID_BIRTH_MONTH_FORMAT", "Birth month should be in YYYY-MM format"));
            }

            User user = userService.getUserByToken(token);
            if (user == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(new ApiResponse<>("USER_NOT_FOUND", "User not found"));
            }

            ClientDTO clientDTO = clientService.createClient(user, name.trim(), phoneNumber.trim(), gender, birthMonth, email);
            return ResponseEntity.ok(new ApiResponse<>(clientDTO, "Client created successfully"));

        } catch (Exception e) {
            if (e.getCause() instanceof ConstraintViolationException
                    && e.getMessage().contains("uk_client_name_phone_gender")) {
                LoggingUtils.logError(logger, "Duplicate client creation attempted", "operation", "create_client", "phoneNumber", request.get("phoneNumber"), "error", e.getMessage());
                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body(new ApiResponse<>("DUPLICATE_CLIENT", "A client with the same name, phone number, and gender already exists"));
            } else {
                LoggingUtils.logError(logger, "Failed to create client", "operation", "create_client", "phoneNumber", request.get("phoneNumber"), "error", e.getMessage());
                slackNotificationService.sendErrorNotification("POST /clients - Client Creation Failed", 
                    "Failed to create client. Phone: " + request.get("phoneNumber") + ", Error: " + e.getMessage(), e);
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                        .body(new ApiResponse<>("CLIENT_CREATION_ERROR", "Error creating client: " + e.getMessage()));
            }
        }
    }

    @PutMapping("/clients/{id}")
    public ResponseEntity<ApiResponse<ClientDTO>> updateClient(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable UUID id,
            @RequestBody Map<String, String> request) {

        LoggingUtils.logInfo(logger, "/clients/{} API invoked", id);

        String token = authHeader.replace("Bearer ", "");
        if (!jwtValidatorService.validateToken(token)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ApiResponse<>("UNAUTHORIZED", "Invalid or expired token"));
        }

        try {
            // Validate required fields
            String name = request.get("name");
            String phoneNumber = request.get("phoneNumber");
            String gender = request.get("gender");
            String birthMonthStr = request.get("birthMonth");
            String email = request.get("email"); // Optional

            if (name == null || name.trim().isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(new ApiResponse<>("INVALID_NAME", "Name is required"));
            }

            if (phoneNumber == null || phoneNumber.trim().isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(new ApiResponse<>("INVALID_PHONE", "Phone number is required"));
            }

            if(gender == null || gender.trim().isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(new ApiResponse<>("INVALID_GENDER", "Gender is required"));
            }

            if (birthMonthStr == null || birthMonthStr.trim().isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(new ApiResponse<>("INVALID_BIRTH_MONTH", "Birth month is required"));
            }

            YearMonth birthMonth;
            try {
                birthMonth = YearMonth.parse(birthMonthStr);
            } catch (DateTimeParseException e) {
                return ResponseEntity.badRequest()
                        .body(new ApiResponse<>("INVALID_BIRTH_MONTH_FORMAT", "Birth month should be in YYYY-MM format"));
            }

            UUID userAuthId = jwtValidatorService.getSubjectFromToken(token);
            if (userAuthId == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(new ApiResponse<>("USER_NOT_FOUND", "User not found"));
            }

            ClientDTO clientDTO = clientService.updateClient(userAuthId, id, name.trim(), phoneNumber.trim(), gender, birthMonth, email);
            return ResponseEntity.ok(new ApiResponse<>(clientDTO, "Client updated successfully"));

        } catch (Exception e) {
            if (e.getCause() instanceof ConstraintViolationException
                    && e.getMessage().contains("uk_client_name_phone_gender")) {
                LoggingUtils.logError(logger, "Duplicate client update attempted", "operation", "update_client", "clientId", id.toString(), "phoneNumber", request.get("phoneNumber"), "error", e.getMessage());
                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body(new ApiResponse<>("DUPLICATE_CLIENT", "A client with the same name, phone number, and gender already exists"));
            } else {
                LoggingUtils.logError(logger, "Failed to update client", "operation", "update_client", "clientId", id.toString(), "error", e.getMessage());
                slackNotificationService.sendErrorNotification("PUT /clients/{id} - Client Update Failed", 
                    "Failed to update client ID: " + id + ", Error: " + e.getMessage(), e);
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                        .body(new ApiResponse<>("CLIENT_UPDATE_ERROR", "Error updating client: " + e.getMessage()));
            }
        }
    }

    @GetMapping("/clients")
    public ResponseEntity<ApiResponse<PaginatedResponseModel<ClientDTO>>> getClients(
            @RequestHeader("Authorization") String authHeader,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "name") String sortBy,
            @RequestParam(defaultValue = "asc") String sortDirection,
            @RequestParam(required = false) String clientSearch) {

        LoggingUtils.logInfo(logger, "/clients GET API invoked with page: {}, size: {}", page, size);

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

            Page<ClientDTO> clientPage = clientSearch != null && !clientSearch.trim().isEmpty()
                    ? clientService.searchClientsForUser(userAuthId, clientSearch.trim(), pageable)
                    : clientService.getClientsForUser(userAuthId, pageable);

            PaginatedResponseModel<ClientDTO> response = new PaginatedResponseModel<>();
            response.setContent(clientPage.getContent());
            response.setPageNumber(clientPage.getNumber());
            response.setPageSize(clientPage.getSize());
            response.setTotalElements(clientPage.getTotalElements());
            response.setTotalPages(clientPage.getTotalPages());
            response.setLast(clientPage.isLast());

            return ResponseEntity.ok(new ApiResponse<>(response));

        } catch (Exception e) {
            LoggingUtils.logError(logger, "Failed to fetch clients", "operation", "get_clients", "page", String.valueOf(page), "size", String.valueOf(size), "search", clientSearch, "error", e.getMessage());
            slackNotificationService.sendErrorNotification("GET /clients - Client Listing Failed", 
                "Failed to fetch clients list. Page: " + page + ", Size: " + size + ", Search: " + clientSearch + ", Error: " + e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ApiResponse<>("FETCH_ERROR", "Error fetching clients: " + e.getMessage()));
        }
    }

    @GetMapping("/clients/check")
    public ResponseEntity<ApiResponse<Map<String, Boolean>>> checkClients(
            @RequestHeader("Authorization") String authHeader) {

        LoggingUtils.logInfo(logger, "/clients/check API invoked");

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

            boolean hasClients = clientService.hasClients(userAuthId);
            Map<String, Boolean> response = Map.of("exists", hasClients);
            return ResponseEntity.ok(new ApiResponse<>(response));

        } catch (Exception e) {
            LoggingUtils.logError(logger, "Failed to check client existence", "operation", "check_clients", "error", e.getMessage());
            slackNotificationService.sendErrorNotification("GET /clients/check - Client Check Failed", 
                "Failed to check client existence. Error: " + e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ApiResponse<>("CHECK_ERROR", "Error checking clients: " + e.getMessage()));
        }
    }

    @DeleteMapping("/clients/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteClient(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable UUID id) {

        LoggingUtils.logInfo(logger, "/clients/{} delete API invoked", id);

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

            clientService.deleteClient(userAuthId, id);
            return ResponseEntity.ok(new ApiResponse<>(null, "Client deleted successfully"));

        } catch (Exception e) {
            LoggingUtils.logError(logger, "Failed to delete client", "operation", "delete_client", "clientId", id.toString(), "error", e.getMessage());
            slackNotificationService.sendErrorNotification("DELETE /clients/{id} - Client Deletion Failed", 
                "Failed to delete client ID: " + id + ", Error: " + e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ApiResponse<>("DELETE_ERROR", "Error deleting client: " + e.getMessage()));
        }
    }
}