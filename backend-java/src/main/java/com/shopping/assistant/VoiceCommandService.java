package com.shopping.assistant;

import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import java.util.List;
import java.util.Map;
import java.util.HashMap;

@Service
public class VoiceCommandService {
    
    private final RestTemplate restTemplate = new RestTemplate();
    private final String pythonApiUrl = System.getenv("PYTHON_API_URL") != null ? 
        System.getenv("PYTHON_API_URL") : "http://localhost:5000/api/command";

    public Map<String, Object> processCommand(String text, List<Item> currentItems) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        
        // Prepare payload with current items mapped for python
        List<Map<String, Object>> mappedItems = new java.util.ArrayList<>();
        for (Item item : currentItems) {
            Map<String, Object> map = new HashMap<>();
            map.put("item", item.getName());
            map.put("quantity", item.getQuantity());
            map.put("size", item.getUnit());
            map.put("category", item.getCategory());
            map.put("checked", item.isChecked());
            mappedItems.add(map);
        }
        
        Map<String, Object> payload = new HashMap<>();
        payload.put("text", text);
        payload.put("items", mappedItems);
        payload.put("history", List.of()); // Mock empty history for now
        
        HttpEntity<Map<String, Object>> request = new HttpEntity<>(payload, headers);
        
        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(pythonApiUrl, request, Map.class);
            return response.getBody();
        } catch (Exception e) {
            e.printStackTrace();
            Map<String, Object> fallback = new HashMap<>();
            fallback.put("items", currentItems);
            fallback.put("messages", List.of("Sorry, the NLP service is currently unreachable."));
            return fallback;
        }
    }
}
