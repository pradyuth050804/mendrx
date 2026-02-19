package com.mendrx.backend.model.response;

public class ApiResponse<T> {
    private boolean success;
    private String message;
    private T data;
    private String errorCode;

    // Constructor for success response
    public ApiResponse(T data) {
        this.success = true;
        this.data = data;
        this.message = "Operation successful";
    }

    public ApiResponse() {
        this.success = true;
        this.message = "Operation successful";
    }

    public ApiResponse(String message) {
        this.success = true;
        this.message = message;
        this.data = null;
    }

    public ApiResponse(T data, String message) {
        this.success = true;
        this.data = data;
        this.message = message;
    }

    // Constructor for error response
    public ApiResponse(String errorCode, String message) {
        this.success = false;
        this.errorCode = errorCode;
        this.message = message;
    }

    // Getters and setters
    public boolean isSuccess() {
        return success;
    }

    public void setSuccess(boolean success) {
        this.success = success;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public T getData() {
        return data;
    }

    public void setData(T data) {
        this.data = data;
    }

    public String getErrorCode() {
        return errorCode;
    }

    public void setErrorCode(String errorCode) {
        this.errorCode = errorCode;
    }
}
