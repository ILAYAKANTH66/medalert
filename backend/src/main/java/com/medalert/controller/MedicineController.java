package com.medalert.controller;

import com.medalert.dto.MedicineRequest;
import com.medalert.dto.MedicineResponse;
import com.medalert.service.MedicineService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/medicines")
@RequiredArgsConstructor
public class MedicineController {

    private final MedicineService medicineService;

    @PostMapping
    public ResponseEntity<MedicineResponse> createMedicine(
            @RequestBody MedicineRequest request,
            Authentication authentication
    ) {
        return ResponseEntity.ok(medicineService.createMedicine(authentication.getName(), request));
    }

    @GetMapping
    public ResponseEntity<List<MedicineResponse>> getMyMedicines(Authentication authentication) {
        return ResponseEntity.ok(medicineService.getMyMedicines(authentication.getName()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<MedicineResponse> getMedicine(
            @PathVariable Long id,
            Authentication authentication
    ) {
        return ResponseEntity.ok(medicineService.getMedicineById(id, authentication.getName()));
    }

    @PutMapping("/{id}")
    public ResponseEntity<MedicineResponse> updateMedicine(
            @PathVariable Long id,
            @RequestBody MedicineRequest request,
            Authentication authentication
    ) {
        return ResponseEntity.ok(medicineService.updateMedicine(id, authentication.getName(), request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteMedicine(
            @PathVariable Long id,
            Authentication authentication
    ) {
        medicineService.softDeleteMedicine(id, authentication.getName());
        return ResponseEntity.noContent().build();
    }
}
