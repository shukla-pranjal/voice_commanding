package com.shopping.assistant;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.Optional;
import java.util.ArrayList;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class ShoppingListController {

    @Autowired
    private ItemRepository itemRepository;

    @Autowired
    private VoiceCommandService voiceCommandService;

    @GetMapping("/items")
    public List<Item> getAllItems() {
        return itemRepository.findAll();
    }

    @PostMapping("/items")
    public Item addItem(@RequestBody Item item) {
        return itemRepository.save(item);
    }

    @PutMapping("/items/{id}")
    public ResponseEntity<Item> updateItem(@PathVariable Long id, @RequestBody Item itemDetails) {
        Optional<Item> itemOptional = itemRepository.findById(id);
        if (itemOptional.isPresent()) {
            Item item = itemOptional.get();
            item.setName(itemDetails.getName());
            item.setQuantity(itemDetails.getQuantity());
            item.setUnit(itemDetails.getUnit());
            item.setUnitPrice(itemDetails.getUnitPrice());
            item.setChecked(itemDetails.isChecked());
            return ResponseEntity.ok(itemRepository.save(item));
        }
        return ResponseEntity.notFound().build();
    }

    @DeleteMapping("/items/{id}")
    public ResponseEntity<Void> deleteItem(@PathVariable Long id) {
        itemRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/items/clear")
    public ResponseEntity<Void> clearItems() {
        itemRepository.deleteAll();
        return ResponseEntity.ok().build();
    }

    @PostMapping("/voice-command")
    public ResponseEntity<Map<String, Object>> processVoiceCommand(@RequestBody Map<String, String> payload) {
        String transcript = payload.getOrDefault("transcript", "");
        String text = payload.getOrDefault("text", transcript); // Fallback for diff payload structures

        // The brainstormed feature: Recipe-to-Cart Mock Logic
        if (text.toLowerCase().startsWith("recipe:") || text.toLowerCase().startsWith("i want to make ")) {
            return processRecipeToCart(text);
        }

        List<Item> currentItems = itemRepository.findAll();
        
        // Pass to Python NLP Service
        Map<String, Object> response = voiceCommandService.processCommand(text, currentItems);
        
        // Update DB based on python response
        if (response.containsKey("items")) {
            List<Map<String, Object>> newItemsList = (List<Map<String, Object>>) response.get("items");
            
            // For simplicity, we clear and re-save if python mutated the list
            // In a real app we'd map changes accurately
            itemRepository.deleteAll();
            
            List<Item> savedItems = new ArrayList<>();
            for (Map<String, Object> itemData : newItemsList) {
                Item item = new Item();
                item.setName((String) itemData.get("item")); // Python uses 'item'
                item.setQuantity(itemData.containsKey("quantity") ? ((Number) itemData.get("quantity")).intValue() : 1);
                item.setUnit((String) itemData.get("size")); // Python uses 'size'
                item.setCategory((String) itemData.get("category"));
                item.setChecked(itemData.containsKey("checked") ? (Boolean) itemData.get("checked") : false);
                savedItems.add(itemRepository.save(item));
            }
            response.put("items", savedItems);
        }
        
        return ResponseEntity.ok(response);
    }
    
    // Brainstormed feature implementation
    private ResponseEntity<Map<String, Object>> processRecipeToCart(String text) {
        // Mock LLM Extraction for Hackathon
        List<Item> ingredients = new ArrayList<>();
        
        Item item1 = new Item();
        item1.setName("Tomato Paste");
        item1.setQuantity(2);
        item1.setUnit("cans");
        ingredients.add(itemRepository.save(item1));
        
        Item item2 = new Item();
        item2.setName("Lasagna Sheets");
        item2.setQuantity(1);
        item2.setUnit("box");
        ingredients.add(itemRepository.save(item2));

        Item item3 = new Item();
        item3.setName("Ricotta Cheese");
        item3.setQuantity(500);
        item3.setUnit("g");
        ingredients.add(itemRepository.save(item3));

        Map<String, Object> response = new HashMap<>();
        response.put("items", itemRepository.findAll());
        response.put("messages", List.of("Added lasagna ingredients: Tomato Paste, Lasagna Sheets, and Ricotta Cheese."));
        
        return ResponseEntity.ok(response);
    }
}
