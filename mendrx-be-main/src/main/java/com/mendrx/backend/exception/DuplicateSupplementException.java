package com.mendrx.backend.exception;

public class DuplicateSupplementException extends RuntimeException {

  public DuplicateSupplementException() {
    super("Supplement with this name already exists");
  }

  public DuplicateSupplementException(String message) {
    super(message);
  }

  public DuplicateSupplementException(String message, Throwable cause) {
    super(message, cause);
  }
}