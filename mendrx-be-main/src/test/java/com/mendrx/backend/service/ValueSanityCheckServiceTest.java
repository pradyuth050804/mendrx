package com.mendrx.backend.service;

import com.mendrx.backend.model.shared.ParameterData;
import com.mendrx.backend.model.shared.ParameterInfo;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ValueSanityCheckServiceTest {

    private final ValueSanityCheckService service = new ValueSanityCheckService();

    @Test
    void correctsT3TotalMultipliedByHundredInGroupedData() {
        ParameterData t3Total = new ParameterData("T3-Total", "11710.0", "ng/dL");
        t3Total.setParameterInfo(t3TotalInfo());

        List<String> highlighted = new ArrayList<>();
        int corrections = service.sanitizeParameterData(
                Map.of("Thyroid Health", List.of(t3Total)),
                highlighted);

        assertEquals(1, corrections);
        assertEquals("117.1", t3Total.getValue());
        assertTrue(highlighted.contains("T3-Total"));
    }

    @Test
    void correctsT3TotalMultipliedByHundredBeforeAnalysis() {
        ParameterData t3Total = new ParameterData("T3-Total", "11710.0", "ng/dL");
        List<ParameterData> parameters = List.of(t3Total);

        Map<String, ParameterInfo> optimalValues = new HashMap<>();
        optimalValues.put("T3-Total", t3TotalInfo());

        int corrections = service.sanitizeParameterData(parameters, optimalValues, null);

        assertEquals(1, corrections);
        assertEquals("117.1", t3Total.getValue());
        assertEquals("Thyroid Health", t3Total.getParameterInfo().getPanelName());
    }

    @Test
    void leavesPlausibleT3TotalUnchanged() {
        ParameterData t3Total = new ParameterData("T3-Total", "117.1", "ng/dL");
        t3Total.setParameterInfo(t3TotalInfo());

        int corrections = service.sanitizeParameterData(
                Map.of("Thyroid Health", List.of(t3Total)),
                new ArrayList<>());

        assertEquals(0, corrections);
        assertEquals("117.1", t3Total.getValue());
    }

    private ParameterInfo t3TotalInfo() {
        return new ParameterInfo(
                80.0,
                200.0,
                80.0,
                200.0,
                "Active thyroid hormone regulating metabolism",
                "Thyroid Health",
                false,
                60.0);
    }
}
