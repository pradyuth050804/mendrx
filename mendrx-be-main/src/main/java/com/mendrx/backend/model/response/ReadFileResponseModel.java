package com.mendrx.backend.model.response;

import com.mendrx.backend.model.shared.ParameterData;
import com.mendrx.backend.model.shared.ParameterUnitMismatch;
import com.mendrx.backend.util.converter.ParameterDataUtils;

import java.util.List;
import java.util.Map;
import java.util.UUID;

public class ReadFileResponseModel {
    private Map<String,List<ParameterData>> data;
    private String message;
    private UUID reportId;
    private List<String> largelyDeviatedParams;
    private List<ParameterUnitMismatch> unitMismatches;

    public ReadFileResponseModel(List<ParameterData> dataList, String message, List<String> largelyDeviatedParams) {
        this.data = ParameterDataUtils.constructParameterDataListMap(dataList);
        this.message = message;
        this.largelyDeviatedParams = largelyDeviatedParams;
        this.unitMismatches = null;
    }

    public ReadFileResponseModel(List<ParameterData> dataList, String message, List<String> largelyDeviatedParams, List<ParameterUnitMismatch> unitMismatches) {
        this.data = ParameterDataUtils.constructParameterDataListMap(dataList);
        this.message = message;
        this.largelyDeviatedParams = largelyDeviatedParams;
        this.unitMismatches = unitMismatches;
    }

    // Getters and setters
    public Map<String,List<ParameterData>> getData() {
        return data;
    }

    public void setData(Map<String,List<ParameterData>> data) {
        this.data = data;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public UUID getReportId() {
        return reportId;
    }

    public void setReportId(UUID reportID) {
        this.reportId = reportID;
    }

    public List<String> getLargelyDeviatedParams() {
        return largelyDeviatedParams;
    }

    public void setLargelyDeviatedParams(List<String> largelyDeviatedParams) {
        this.largelyDeviatedParams = largelyDeviatedParams;
    }

    public List<ParameterUnitMismatch> getUnitMismatches() {
        return unitMismatches;
    }

    public void setUnitMismatches(List<ParameterUnitMismatch> unitMismatches) {
        this.unitMismatches = unitMismatches;
    }
}