package com.mendrx.backend.model.request;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class UpdateSupplementBrandGuidelineRequestModel {

    @NotBlank(message = "Supplement name is required")
    @Size(max = 255, message = "Supplement name must not exceed 255 characters")
    private String supplementName;

    @NotBlank(message = "Brand name is required")
    @Size(max = 255, message = "Brand name must not exceed 255 characters")
    private String brandName;

    @Size(max = 500, message = "Product link must not exceed 500 characters")
    private String productLink;

    private String guidelines;

    // Constructors
    public UpdateSupplementBrandGuidelineRequestModel() {}

    public UpdateSupplementBrandGuidelineRequestModel(String supplementName, String brandName, String productLink, String guidelines) {
        this.supplementName = supplementName;
        this.brandName = brandName;
        this.productLink = productLink;
        this.guidelines = guidelines;
    }

    // Getters and Setters
    public String getSupplementName() {
        return supplementName;
    }

    public void setSupplementName(String supplementName) {
        this.supplementName = supplementName;
    }

    public String getBrandName() {
        return brandName;
    }

    public void setBrandName(String brandName) {
        this.brandName = brandName;
    }

    public String getProductLink() {
        return productLink;
    }

    public void setProductLink(String productLink) {
        this.productLink = productLink;
    }

    public String getGuidelines() {
        return guidelines;
    }

    public void setGuidelines(String guidelines) {
        this.guidelines = guidelines;
    }
}