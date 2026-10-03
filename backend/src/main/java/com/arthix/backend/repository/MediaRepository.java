package com.arthix.backend.repository;

import com.arthix.backend.entity.MediaFile;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MediaRepository extends JpaRepository<MediaFile, String> {
}