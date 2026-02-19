package com.mendrx.backend.exception;

public class SupplementBrandGuidelineNotFoundException extends RuntimeException {

    public SupplementBrandGuidelineNotFoundException() {
        super("Supplement brand guideline not found");
    }

    public SupplementBrandGuidelineNotFoundException(String message) {
        super(message);
    }

    public SupplementBrandGuidelineNotFoundException(String message, Throwable cause) {
        super(message, cause);
    }
}
