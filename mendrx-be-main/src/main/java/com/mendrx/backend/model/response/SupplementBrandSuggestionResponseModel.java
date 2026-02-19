package com.mendrx.backend.model.response;

public class SupplementBrandSuggestionResponseModel {
    private String supplementName;
    private String brandName;
    private String productLink;
    private String guidelines;

    // Constructors
    public SupplementBrandSuggestionResponseModel() {}

    public SupplementBrandSuggestionResponseModel(String supplementName, String brandName, String productLink, String guidelines) {
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
