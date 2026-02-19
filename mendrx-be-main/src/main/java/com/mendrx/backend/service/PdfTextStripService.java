package com.mendrx.backend.service;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import com.mendrx.backend.util.LoggingUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

@Service
public class PdfTextStripService {

    private static final Logger logger = LoggerFactory.getLogger(PdfTextStripService.class);

    /**
     * Extracts text content from a PDF file
     *
     * @param file MultipartFile containing PDF document
     * @return Extracted text as String, or empty string if extraction fails
     */
    public String extractTextFromPdf(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            return "";
        }

        try (PDDocument document = PDDocument.load(file.getInputStream())) {
            PDFTextStripper pdfStripper = new PDFTextStripper();
            return pdfStripper.getText(document);
        } catch (IOException e) {
            LoggingUtils.logError(logger, "Failed to extract text from PDF: {}", e.getMessage());
            return "";
        }
    }

}
