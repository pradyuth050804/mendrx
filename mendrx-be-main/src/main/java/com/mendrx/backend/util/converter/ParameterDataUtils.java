package com.mendrx.backend.util.converter;

import com.mendrx.backend.model.shared.ParameterData;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

public final class ParameterDataUtils {
    public static Map<String, List<ParameterData>> constructParameterDataListMap(List<ParameterData> parameterDataList) {
        return parameterDataList.stream()
                .filter(parameterData -> {
                    return parameterData.getParameterInfo()!=null && parameterData.getParameterInfo().getPanelName()!=null;
                })
                .collect(Collectors.groupingBy(
                        parameterData -> parameterData.getParameterInfo().getPanelName()
                ));
    }
}
