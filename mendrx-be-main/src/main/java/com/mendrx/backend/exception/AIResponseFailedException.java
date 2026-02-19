package com.mendrx.backend.exception;

public class AIResponseFailedException extends Exception {
  public AIResponseFailedException(String message) {
    super(message);
  }

  public AIResponseFailedException(String message, Throwable cause) {
    super(message, cause);
  }
}
