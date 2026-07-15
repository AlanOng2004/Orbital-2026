package com.orbital.nusmaps.controller;

import com.orbital.nusmaps.dto.SearchResultResponse;
import com.orbital.nusmaps.service.RouteSearchIndexService;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/search")
public class SearchController {
    private final RouteSearchIndexService routeSearchIndexService;

    public SearchController(RouteSearchIndexService routeSearchIndexService) {
        this.routeSearchIndexService = routeSearchIndexService;
    }

    @GetMapping
    public List<SearchResultResponse> search(@RequestParam String query) {
        String trimmedQuery = query == null ? "" : query.trim();
        if (trimmedQuery.length() < 2) {
            return List.of();
        }
        return routeSearchIndexService.search(trimmedQuery);
    }
}
