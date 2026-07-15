package com.orbital.nusmaps.implement;

import com.orbital.nusmaps.dto.RouteNodeOptionResponse;
import com.orbital.nusmaps.dto.SearchResultResponse;
import com.orbital.nusmaps.dto.SearchResultResponse.SearchResultType;
import com.orbital.nusmaps.model.Building;
import com.orbital.nusmaps.model.BuildingAlias;
import com.orbital.nusmaps.model.Faculty;
import com.orbital.nusmaps.model.FacultyAlias;
import com.orbital.nusmaps.model.Floorplan;
import com.orbital.nusmaps.model.Node;
import com.orbital.nusmaps.model.NodeAlias;
import com.orbital.nusmaps.repository.BuildingRepository;
import com.orbital.nusmaps.repository.FacultyRepository;
import com.orbital.nusmaps.repository.NodeRepository;
import com.orbital.nusmaps.service.RouteSearchIndexService;
import jakarta.annotation.PostConstruct;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.atomic.AtomicLong;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RouteSearchIndexServiceImpl implements RouteSearchIndexService {
    private static final int SEARCH_LIMIT = 12;

    private final NodeRepository nodeRepository;
    private final BuildingRepository buildingRepository;
    private final FacultyRepository facultyRepository;
    private volatile SearchSnapshot snapshot = SearchSnapshot.empty();

    public RouteSearchIndexServiceImpl(
            NodeRepository nodeRepository,
            BuildingRepository buildingRepository,
            FacultyRepository facultyRepository
    ) {
        this.nodeRepository = nodeRepository;
        this.buildingRepository = buildingRepository;
        this.facultyRepository = facultyRepository;
    }

    @Override
    @PostConstruct
    @Transactional(readOnly = true)
    public void rebuild() {
        Map<Long, SearchDocument> documentsByKey = new LinkedHashMap<>();
        Map<Long, RouteNodeOptionResponse> routeNodesById = new LinkedHashMap<>();
        LevenshteinTrie primaryTrie = new LevenshteinTrie();
        LevenshteinTrie aliasTrie = new LevenshteinTrie();
        LevenshteinTrie routePrimaryTrie = new LevenshteinTrie();
        LevenshteinTrie routeAliasTrie = new LevenshteinTrie();
        AtomicLong sequence = new AtomicLong();

        for (Faculty faculty : facultyRepository.findAllSearchFaculties()) {
            SearchDocument document = toFacultyDocument(faculty);
            if (document == null) {
                continue;
            }
            addDocument(documentsByKey, primaryTrie, aliasTrie, document, sequence);
        }

        Map<Long, List<String>> buildingAliasesById = new HashMap<>();
        for (Building building : buildingRepository.findAllSearchBuildings()) {
            buildingAliasesById.put(building.getBuildingId(), getBuildingAliases(building));
            SearchDocument document = toBuildingDocument(building);
            if (document == null) {
                continue;
            }
            addDocument(documentsByKey, primaryTrie, aliasTrie, document, sequence);
        }

        for (Node node : nodeRepository.findAllRouteSearchNodes()) {
            SearchDocument document = toNodeDocument(node, buildingAliasesById);
            if (document == null) {
                continue;
            }
            addDocument(documentsByKey, primaryTrie, aliasTrie, document, sequence);
            routeNodesById.put(document.nodeId(), toRouteNodeOption(document));
            addRouteDocument(routePrimaryTrie, routeAliasTrie, document, sequence);
        }

        snapshot = new SearchSnapshot(primaryTrie, aliasTrie, routePrimaryTrie, routeAliasTrie, documentsByKey, routeNodesById);
    }

    @Override
    public List<SearchResultResponse> search(String query) {
        String normalizedQuery = normalize(query);
        if (normalizedQuery.length() < 2) {
            return List.of();
        }

        SearchSnapshot currentSnapshot = snapshot;
        Map<Long, RankedDocument> rankedDocuments = searchDocuments(currentSnapshot, normalizedQuery, null);

        return rankedDocuments.values().stream()
                .sorted()
                .limit(SEARCH_LIMIT)
                .map(hit -> toSearchResultResponse(currentSnapshot.documentsByKey.get(hit.documentKey()), hit.matchSource()))
                .filter(Objects::nonNull)
                .toList();
    }

    @Override
    public List<RouteNodeOptionResponse> searchRouteNodes(String query, String buildingQuery) {
        String normalizedQuery = normalize(query);
        if (normalizedQuery.length() < 2) {
            return List.of();
        }

        SearchSnapshot currentSnapshot = snapshot;
        String normalizedBuildingQuery = normalize(buildingQuery);
        Map<Long, RankedDocument> rankedDocuments =
                searchRouteDocuments(currentSnapshot, normalizedQuery, normalizedBuildingQuery);

        return rankedDocuments.values().stream()
                .sorted()
                .limit(SEARCH_LIMIT)
                .map(hit -> currentSnapshot.routeNodesById.get(hit.routeNodeId()))
                .filter(Objects::nonNull)
                .toList();
    }

    private static Map<Long, RankedDocument> searchDocuments(
            SearchSnapshot snapshot,
            String normalizedQuery,
            String normalizedBuildingQuery
    ) {
        int maxDistance = maxDistance(normalizedQuery);
        Map<Long, RankedDocument> rankedDocuments = new LinkedHashMap<>();

        addGeneralHits(rankedDocuments, snapshot.primaryTrie.search(normalizedQuery, maxDistance));
        if (rankedDocuments.size() < SEARCH_LIMIT) {
            addGeneralHits(rankedDocuments, snapshot.aliasTrie.search(normalizedQuery, maxDistance));
        }

        return rankedDocuments;
    }

    private static Map<Long, RankedDocument> searchRouteDocuments(
            SearchSnapshot snapshot,
            String normalizedQuery,
            String normalizedBuildingQuery
    ) {
        int maxDistance = maxDistance(normalizedQuery);
        Map<Long, RankedDocument> rankedDocuments = new LinkedHashMap<>();

        addRouteHits(rankedDocuments, snapshot.routePrimaryTrie.search(normalizedQuery, maxDistance), normalizedBuildingQuery);
        if (rankedDocuments.size() < SEARCH_LIMIT) {
            addRouteHits(rankedDocuments, snapshot.routeAliasTrie.search(normalizedQuery, maxDistance), normalizedBuildingQuery);
        }

        return rankedDocuments;
    }

    private static void addDocument(
            Map<Long, SearchDocument> documentsByKey,
            LevenshteinTrie primaryTrie,
            LevenshteinTrie aliasTrie,
            SearchDocument document,
            AtomicLong sequence
    ) {
        documentsByKey.put(document.key(), document);

        primaryTrie.insert(document.label(), new SearchEntry(document, MatchSource.NAME, sequence.getAndIncrement()));
        primaryTrie.insert(document.dualLabel(), new SearchEntry(document, MatchSource.DUAL_NAME, sequence.getAndIncrement()));

        for (String alias : document.aliases()) {
            aliasTrie.insert(alias, new SearchEntry(document, MatchSource.ALIAS, sequence.getAndIncrement()));
        }
    }

    private static void addRouteDocument(
            LevenshteinTrie routePrimaryTrie,
            LevenshteinTrie routeAliasTrie,
            SearchDocument document,
            AtomicLong sequence
    ) {
        routePrimaryTrie.insert(document.label(), new SearchEntry(document, MatchSource.NAME, sequence.getAndIncrement()));
        routePrimaryTrie.insert(document.dualLabel(), new SearchEntry(document, MatchSource.DUAL_NAME, sequence.getAndIncrement()));
        routePrimaryTrie.insert(document.buildingName(), new SearchEntry(document, MatchSource.BUILDING_NAME, sequence.getAndIncrement()));
        routePrimaryTrie.insert(document.facultyName(), new SearchEntry(document, MatchSource.FACULTY_NAME, sequence.getAndIncrement()));

        for (String alias : document.aliases()) {
            routeAliasTrie.insert(alias, new SearchEntry(document, MatchSource.ALIAS, sequence.getAndIncrement()));
        }
        for (String alias : document.buildingAliases()) {
            routeAliasTrie.insert(alias, new SearchEntry(document, MatchSource.ALIAS, sequence.getAndIncrement()));
        }
    }

    private static void addGeneralHits(
            Map<Long, RankedDocument> rankedDocuments,
            List<SearchHit> hits
    ) {
        for (SearchHit hit : hits) {
            RankedDocument candidate = RankedDocument.from(hit);
            rankedDocuments.merge(candidate.documentKey(), candidate, RankedDocument::best);
        }
    }

    private static void addRouteHits(
            Map<Long, RankedDocument> rankedDocuments,
            List<SearchHit> hits,
            String normalizedBuildingQuery
    ) {
        for (SearchHit hit : hits) {
            SearchDocument document = hit.entry().document();
            if (!matchesRouteNodeFilter(document, normalizedBuildingQuery)) {
                continue;
            }

            RankedDocument candidate = RankedDocument.from(hit);
            rankedDocuments.merge(candidate.documentKey(), candidate, RankedDocument::best);
        }
    }

    private static boolean matchesRouteNodeFilter(SearchDocument document, String normalizedBuildingQuery) {
        if (normalizedBuildingQuery == null || normalizedBuildingQuery.isBlank()) {
            return document.type() == SearchResultType.NODE;
        }
        return document.type() == SearchResultType.NODE
                && document.buildingSearchTerms().contains(normalizedBuildingQuery);
    }

    private static SearchDocument toFacultyDocument(Faculty faculty) {
        if (faculty == null || faculty.getFacultyId() == null || isBlank(faculty.getFacultyName())) {
            return null;
        }

        List<String> aliases = faculty.getAliases().stream()
                .map(FacultyAlias::getFacultyAlias)
                .filter(RouteSearchIndexServiceImpl::isNotBlank)
                .distinct()
                .toList();

        SearchResultResponse response = new SearchResultResponse(
                SearchResultType.FACULTY,
                faculty.getFacultyId(),
                faculty.getFacultyName(),
                null,
                "Faculty",
                null,
                faculty.getFacultyId(),
                null,
                null,
                null,
                null,
                null,
                null,
                faculty.getFacultyPolygon(),
                aliases
        );

        return new SearchDocument(
                documentKey(SearchResultType.FACULTY, faculty.getFacultyId()),
                SearchResultType.FACULTY,
                null,
                null,
                faculty.getFacultyId(),
                faculty.getFacultyName(),
                null,
                null,
                null,
                null,
                List.of(),
                aliases,
                List.of(),
                false,
                response
        );
    }

    private static SearchDocument toBuildingDocument(Building building) {
        if (building == null || building.getBuildingId() == null || isBlank(building.getBuildingName())) {
            return null;
        }

        Faculty faculty = building.getFaculty();
        List<String> aliases = getBuildingAliases(building);

        String secondaryLabel = faculty == null || isBlank(faculty.getFacultyName())
                ? "Building"
                : faculty.getFacultyName();

        SearchResultResponse response = new SearchResultResponse(
                SearchResultType.BUILDING,
                building.getBuildingId(),
                building.getBuildingName(),
                null,
                secondaryLabel,
                null,
                faculty == null ? null : faculty.getFacultyId(),
                building.getBuildingId(),
                null,
                null,
                null,
                null,
                null,
                building.getBuildingPolygon(),
                aliases
        );

        return new SearchDocument(
                documentKey(SearchResultType.BUILDING, building.getBuildingId()),
                SearchResultType.BUILDING,
                null,
                building.getBuildingId(),
                faculty == null ? null : faculty.getFacultyId(),
                building.getBuildingName(),
                null,
                null,
                null,
                faculty == null ? null : faculty.getFacultyName(),
                List.of(),
                aliases,
                List.of(),
                false,
                response
        );
    }

    private static SearchDocument toNodeDocument(Node node, Map<Long, List<String>> buildingAliasesById) {
        if (!isSearchableNode(node)) {
            return null;
        }

        Floorplan floorplan = node.getFloorplan();
        Building building = floorplan.getBuilding();
        Faculty faculty = node.getFaculty() == null ? building.getFaculty() : node.getFaculty();
        List<String> aliases = node.getAliases().stream()
                .map(NodeAlias::getNodeAlias)
                .filter(RouteSearchIndexServiceImpl::isNotBlank)
                .distinct()
                .toList();

        List<String> buildingSearchTerms = new ArrayList<>();
        buildingSearchTerms.add(normalize(building.getBuildingName()));
        List<String> buildingAliases = buildingAliasesById.getOrDefault(building.getBuildingId(), List.of());
        buildingAliases.stream()
                .map(RouteSearchIndexServiceImpl::normalize)
                .filter(RouteSearchIndexServiceImpl::isNotBlank)
                .forEach(buildingSearchTerms::add);
        String facultyName = faculty == null ? null : faculty.getFacultyName();

        SearchResultResponse response = new SearchResultResponse(
                SearchResultType.NODE,
                node.getNodeId(),
                node.getNodeName(),
                node.getDualName(),
                formatSecondaryLabel(building.getBuildingName(), floorplan.getLevel(), node.getNodeType()),
                null,
                faculty == null ? null : faculty.getFacultyId(),
                building.getBuildingId(),
                node.getNodeId(),
                floorplan.getLevel(),
                floorplan.getImageUrl(),
                node.getXCoordinate(),
                node.getYCoordinate(),
                node.getRoomPolygon(),
                aliases
        );

        return new SearchDocument(
                documentKey(SearchResultType.NODE, node.getNodeId()),
                SearchResultType.NODE,
                node.getNodeId(),
                building.getBuildingId(),
                faculty == null ? null : faculty.getFacultyId(),
                node.getNodeName(),
                node.getDualName(),
                building.getBuildingName(),
                node.getNodeType().name(),
                facultyName,
                buildingAliases,
                aliases,
                buildingSearchTerms.stream().distinct().toList(),
                node.getNodeType() == Node.NodeType.Room,
                response
        );
    }

    private static List<String> getBuildingAliases(Building building) {
        if (building == null || building.getAliases() == null) {
            return List.of();
        }
        return building.getAliases().stream()
                .map(BuildingAlias::getBuildingAlias)
                .filter(RouteSearchIndexServiceImpl::isNotBlank)
                .distinct()
                .toList();
    }

    private static RouteNodeOptionResponse toRouteNodeOption(SearchDocument document) {
        SearchResultResponse response = document.response();
        return new RouteNodeOptionResponse(
                response.nodeId(),
                response.label(),
                response.dualLabel(),
                document.buildingName(),
                response.secondaryLabel(),
                document.nodeType(),
                response.floorLevel(),
                response.floorImageUrl(),
                response.x(),
                response.y(),
                response.aliases()
        );
    }

    private static SearchResultResponse toSearchResultResponse(SearchDocument document, String matchSource) {
        if (document == null) {
            return null;
        }
        SearchResultResponse response = document.response();
        return new SearchResultResponse(
                response.type(),
                response.id(),
                response.label(),
                response.dualLabel(),
                response.secondaryLabel(),
                matchSource,
                response.facultyId(),
                response.buildingId(),
                response.nodeId(),
                response.floorLevel(),
                response.floorImageUrl(),
                response.x(),
                response.y(),
                response.polygon(),
                response.aliases()
        );
    }

    private static boolean isSearchableNode(Node node) {
        return node != null
                && node.getNodeId() != null
                && isNotBlank(node.getNodeName())
                && node.getFloorplan() != null
                && node.getFloorplan().getBuilding() != null
                && node.getFloorplan().getLevel() != null
                && node.getXCoordinate() != null
                && node.getYCoordinate() != null
                && node.getNodeType() != Node.NodeType.Corridor
                && node.getNodeType() != Node.NodeType.Junction;
    }

    private static String formatSecondaryLabel(String buildingName, Integer level, Node.NodeType nodeType) {
        return buildingName + " " + formatFloorLabel(level) + " • " + nodeType.name();
    }

    private static String formatFloorLabel(Integer level) {
        if (level == null) {
            return "";
        }
        if (level == 0) {
            return "B1";
        }
        return "L" + level;
    }

    private static int maxDistance(String normalizedQuery) {
        int length = normalizedQuery.length();
        if (length <= 2) {
            return 0;
        }
        if (length <= 5) {
            return 1;
        }
        if (length <= 10) {
            return 2;
        }
        return 3;
    }

    private static String normalize(String value) {
        if (value == null) {
            return "";
        }
        String stripped = Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");
        return stripped.toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", " ")
                .trim()
                .replaceAll("\\s+", " ");
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private static boolean isNotBlank(String value) {
        return value != null && !value.isBlank();
    }

    private static long documentKey(SearchResultType type, Long id) {
        return ((long) type.ordinal() << 56) | id;
    }

    private record SearchSnapshot(
            LevenshteinTrie primaryTrie,
            LevenshteinTrie aliasTrie,
            LevenshteinTrie routePrimaryTrie,
            LevenshteinTrie routeAliasTrie,
            Map<Long, SearchDocument> documentsByKey,
            Map<Long, RouteNodeOptionResponse> routeNodesById
    ) {
        private static SearchSnapshot empty() {
            return new SearchSnapshot(
                    new LevenshteinTrie(),
                    new LevenshteinTrie(),
                    new LevenshteinTrie(),
                    new LevenshteinTrie(),
                    Map.of(),
                    Map.of()
            );
        }
    }

    private record SearchDocument(
            Long key,
            SearchResultType type,
            Long nodeId,
            Long buildingId,
            Long facultyId,
            String label,
            String dualLabel,
            String buildingName,
            String nodeType,
            String facultyName,
            List<String> buildingAliases,
            List<String> aliases,
            List<String> buildingSearchTerms,
            boolean room,
            SearchResultResponse response
    ) {}

    private enum MatchSource {
        NAME(0),
        DUAL_NAME(0),
        BUILDING_NAME(1),
        FACULTY_NAME(2),
        ALIAS(4);

        private final int priority;

        MatchSource(int priority) {
            this.priority = priority;
        }
    }

    private record SearchEntry(
            SearchDocument document,
            MatchSource source,
            long sequence
    ) {}

    private record SearchHit(
            SearchEntry entry,
            String matchedText,
            int distance,
            int matchPriority
    ) {}

    private record RankedDocument(
            Long documentKey,
            Long routeNodeId,
            int typePriority,
            int matchPriority,
            int distance,
            int sourcePriority,
            String matchSource,
            boolean room,
            String label,
            int matchLength,
            long sequence
    ) implements Comparable<RankedDocument> {
        private static RankedDocument from(SearchHit hit) {
            SearchDocument document = hit.entry().document();
            return new RankedDocument(
                    document.key(),
                    document.nodeId(),
                    typePriority(document.type()),
                    hit.matchPriority(),
                    hit.distance(),
                    hit.entry().source().priority,
                    hit.entry().source().name(),
                    document.room(),
                    document.label(),
                    hit.matchedText().length(),
                    hit.entry().sequence()
            );
        }

        private static RankedDocument best(RankedDocument left, RankedDocument right) {
            return left.compareTo(right) <= 0 ? left : right;
        }

        @Override
        public int compareTo(RankedDocument other) {
            return Comparator
                    .comparingInt(RankedDocument::matchPriority)
                    .thenComparingInt(RankedDocument::distance)
                    .thenComparingInt(RankedDocument::sourcePriority)
                    .thenComparingInt(RankedDocument::typePriority)
                    .thenComparing(RankedDocument::room, Comparator.reverseOrder())
                    .thenComparing(RankedDocument::label, String.CASE_INSENSITIVE_ORDER)
                    .thenComparingInt(RankedDocument::matchLength)
                    .thenComparingLong(RankedDocument::sequence)
                    .compare(this, other);
        }

        private static int typePriority(SearchResultType type) {
            return switch (type) {
                case FACULTY -> 0;
                case BUILDING -> 1;
                case NODE -> 2;
            };
        }
    }

    private static final class LevenshteinTrie {
        private static final int EXACT_MATCH = 0;
        private static final int PREFIX_MATCH = 1;
        private static final int CONTAINS_MATCH = 2;
        private static final int FUZZY_MATCH = 3;

        private final TrieNode root = new TrieNode();
        private final List<StoredEntry> entries = new ArrayList<>();

        private void insert(String text, SearchEntry entry) {
            String normalizedText = normalize(text);
            if (normalizedText.isBlank()) {
                return;
            }

            StoredEntry storedEntry = new StoredEntry(normalizedText, entry);
            entries.add(storedEntry);
            TrieNode current = root;
            for (int index = 0; index < normalizedText.length(); index++) {
                char character = normalizedText.charAt(index);
                current = current.children.computeIfAbsent(character, ignored -> new TrieNode());
            }
            current.entries.add(storedEntry);
        }

        private List<SearchHit> search(String query, int maxDistance) {
            List<SearchHit> hits = new ArrayList<>();
            for (StoredEntry entry : entries) {
                if (entry.text().equals(query)) {
                    hits.add(new SearchHit(entry.entry(), entry.text(), 0, EXACT_MATCH));
                } else if (entry.text().startsWith(query)) {
                    hits.add(new SearchHit(entry.entry(), entry.text(), 0, PREFIX_MATCH));
                } else if (entry.text().contains(query)) {
                    hits.add(new SearchHit(entry.entry(), entry.text(), 0, CONTAINS_MATCH));
                }
            }

            int[] initialRow = new int[query.length() + 1];
            for (int index = 0; index < initialRow.length; index++) {
                initialRow[index] = index;
            }

            for (Map.Entry<Character, TrieNode> child : root.children.entrySet()) {
                search(child.getValue(), child.getKey(), query, initialRow, maxDistance, hits);
            }
            return hits;
        }

        private void search(
                TrieNode node,
                char character,
                String query,
                int[] previousRow,
                int maxDistance,
                List<SearchHit> hits
        ) {
            int[] currentRow = new int[query.length() + 1];
            currentRow[0] = previousRow[0] + 1;

            int bestDistance = currentRow[0];
            for (int column = 1; column < currentRow.length; column++) {
                int insertCost = currentRow[column - 1] + 1;
                int deleteCost = previousRow[column] + 1;
                int replaceCost = previousRow[column - 1] + (query.charAt(column - 1) == character ? 0 : 1);
                currentRow[column] = Math.min(Math.min(insertCost, deleteCost), replaceCost);
                bestDistance = Math.min(bestDistance, currentRow[column]);
            }

            int distance = currentRow[query.length()];
            if (distance <= maxDistance) {
                for (StoredEntry entry : node.entries) {
                    hits.add(new SearchHit(entry.entry(), entry.text(), distance, FUZZY_MATCH));
                }
            }

            if (bestDistance <= maxDistance) {
                for (Map.Entry<Character, TrieNode> child : node.children.entrySet()) {
                    search(child.getValue(), child.getKey(), query, currentRow, maxDistance, hits);
                }
            }
        }
    }

    private static final class TrieNode {
        private final Map<Character, TrieNode> children = new HashMap<>();
        private final List<StoredEntry> entries = new ArrayList<>();
    }

    private record StoredEntry(String text, SearchEntry entry) {}
}
