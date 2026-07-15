package com.orbital.nusmaps.service;

import com.orbital.nusmaps.dto.RouteNodeOptionResponse;
import com.orbital.nusmaps.dto.SearchResultResponse;
import java.util.List;

public interface RouteSearchIndexService {
    List<SearchResultResponse> search(String query);

    List<RouteNodeOptionResponse> searchRouteNodes(String query, String buildingQuery);

    void rebuild();
}
